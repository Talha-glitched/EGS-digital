import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Sequence } from '../models/Sequence.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';
import { Suppression } from '../models/Suppression.js';
import { getSendTargetEmail, getBlastSendEmails } from '../utils/contactEmails.js';
import { normalizeEmail } from '../utils/normalizeDomain.js';
import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
import { hasLeadReceivedSequenceStep } from '../utils/sequenceSendGuards.js';
import {
  findFlowNode,
  isShortFlowDelay,
  nodeToEmailStep,
  normalizeFlowGraph,
  resolveEntryNodeId,
  resolveNextEmailTarget,
} from '../utils/sequenceFlowExecutor.js';
import { generateSequenceEmail } from './openaiService.js';
import { getBaseUrl, getFromIdentity, isPublicTrackableUrl, sendAuthenticatedMail } from './mailTransport.js';
import {
  getGstDayBounds,
  getNextUaeBusinessWindow,
  isWithinUaeBusinessHours,
  randomSendDelayMs,
} from '../utils/uaeBusinessHours.js';
import { parseStepDelay } from '../utils/sequenceDelay.js';
import { syncAutoCampaignStatus } from './projectService.js';

const POLL_INTERVAL_MS = 5000;

let pollTimer = null;
let isProcessing = false;
let nextAllowedSendAt = 0;

async function recoverStaleProcessingJobs() {
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
  await SendJob.updateMany(
    { status: 'processing', updatedAt: { $lt: staleBefore } },
    { $set: { status: 'failed', errorMessage: 'Worker stopped before send completion; review before retrying.' } }
  );
}

function renderEmailHtml({ body, leadId, stepIndex }) {
  const escapedBody = String(body || '')
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    )
    .join('<br>');

  let pixel = '';
  if (isPublicTrackableUrl()) {
    const baseUrl = getBaseUrl().replace(/\/$/, '');
    pixel = `<img src="${baseUrl}/api/track/open/${leadId}/${stepIndex}" width="1" height="1" alt="" style="display:none;" />`;
  }

  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#1A1715;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">${escapedBody}</div>
    ${pixel}
  </body></html>`;
}

/** @deprecated Kept for tests; no longer appends footer to outbound mail. */
export function withOptOutFooter(body) {
  return String(body || '').trim();
}

async function getDailySendCount() {
  const { start, end } = getGstDayBounds();
  return SendJob.countDocuments({ status: 'sent', sentAt: { $gte: start, $lt: end } });
}

function computeScheduledFor(enrollment, extraDelayMs = 0, { immediate = false } = {}) {
  let runAt = enrollment.nextSendAt ? new Date(enrollment.nextSendAt) : new Date();
  if (!immediate && !isWithinUaeBusinessHours(runAt)) {
    runAt = getNextUaeBusinessWindow(runAt);
  }
  return new Date(runAt.getTime() + extraDelayMs);
}

function shouldSkipBusinessHours(job) {
  return !!job.immediateLaunch;
}

async function rescheduleJob(job, runAt, reason) {
  job.status = 'pending';
  job.scheduledFor = runAt;
  job.errorMessage = reason;
  await job.save();
}

async function completeEnrollment(enrollment, job, reason = '') {
  enrollment.completedAt = new Date();
  enrollment.currentNodeId = null;
  await enrollment.save();
  if (job) {
    job.status = 'cancelled';
    job.errorMessage = reason || 'sequence complete';
    await job.save();
  }
}

async function deliverSequenceEmail({
  job,
  enrollment,
  lead,
  company,
  project,
  step,
  targetEmail,
}) {
  console.log(`[SendWorker] Generating sequence email content...`);
  const generated = await generateSequenceEmail({ lead, company, step });
  const body = String(generated.body || '').trim();
  const { fromEmail, fromName } = getFromIdentity(project);

  console.log(`[SendWorker] Invoking sendAuthenticatedMail for "${generated.subject}"...`);
  const result = await sendAuthenticatedMail({
    fromName,
    fromEmail,
    to: targetEmail,
    subject: generated.subject,
    text: body,
    html: renderEmailHtml({
      body,
      leadId: lead._id,
      stepIndex: enrollment.currentStepIndex,
    }),
    campaignId: lead.campaignId,
  });
  const messageId = String(result?.messageId || '').trim();

  lead.deliveryStatus = 'Emailed Outbound';
  if (messageId) {
    lead.lastMessageId = messageId;
  }
  lead.financialMetrics.tokensConsumed += generated.tokensUsed;
  lead.financialMetrics.calculatedAiCostUSD += generated.costUsd;
  lead.trackingMetrics.emailsDeliveredCount += 1;
  await lead.save();

  if (lead.campaignId) {
    await syncAutoCampaignStatus(lead.campaignId);
  }

  if (project) {
    const usdToAed = Number(process.env.OPENAI_USD_TO_AED) || 3.6725;
    project.financialLedger.accumulatedOpenAiCost =
      (project.financialLedger.accumulatedOpenAiCost || 0) + (generated.costUsd * usdToAed);
    project.recalculateCosts();
    await project.save();
  }

  job.status = 'sent';
  job.sentAt = new Date();
  job.recipientEmail = targetEmail;
  job.providerMessageId = messageId;
  job.renderedSubject = generated.subject;
  job.renderedBody = body;
  job.errorMessage = '';
  if (!job.campaignId && (lead.campaignId || enrollment.campaignId)) {
    job.campaignId = lead.campaignId || enrollment.campaignId;
  }
  await job.save();

  enrollment.lastSentAt = new Date();
  await enrollment.save();

  return { generated, body, messageId };
}

/** Advance enrollment only after every distinct-address job for this step is finished. */
async function maybeAdvanceAfterBlast(enrollment, job) {
  const openSiblings = await SendJob.countDocuments({
    enrollmentId: enrollment._id,
    stepIndex: job.stepIndex,
    status: { $in: ['pending', 'processing'] },
  });
  if (openSiblings > 0) {
    return false;
  }

  if (enrollment.currentStepIndex <= job.stepIndex) {
    enrollment.currentStepIndex = job.stepIndex + 1;
    await enrollment.save();
  }
  return true;
}

async function scheduleNextFlowStep(enrollment, flowGraph, lead) {
  const target = resolveNextEmailTarget(flowGraph, enrollment.currentNodeId, lead);

  if (target.completed || !target.nodeId) {
    console.log(`[SendWorker] Enrollment ${enrollment._id} completed flow graph.`);
    enrollment.completedAt = new Date();
    enrollment.currentNodeId = null;
    await enrollment.save();
    return;
  }

  enrollment.currentNodeId = target.nodeId;
  enrollment.nextSendAt = new Date(Date.now() + target.delayMs);
  await enrollment.save();

  const jitter = target.delayMs > 0 ? randomSendDelayMs() : 0;
  const immediate = isShortFlowDelay(target.delayMs);
  console.log(
    `[SendWorker] Scheduling next flow node ${target.nodeId} for enrollment ${enrollment._id} in ${Math.round((target.delayMs + jitter) / 1000)}s`,
  );
  await scheduleEnrollmentJob(enrollment, jitter, { immediate });
}

async function processFlowGraphJob(job, enrollment, lead, sequence, company, project, targetEmail) {
  const flowGraph = normalizeFlowGraph(sequence.flowGraph);
  if (!flowGraph) {
    return false;
  }

  let nodeId = enrollment.currentNodeId || resolveEntryNodeId(flowGraph);
  if (!nodeId) {
    await completeEnrollment(enrollment, job, 'flow entry missing');
    return true;
  }

  const target = resolveNextEmailTarget(flowGraph, nodeId, lead);
  if (target.completed || !target.nodeId) {
    await completeEnrollment(enrollment, job, target.stopReason || 'flow complete');
    return true;
  }

  const emailNode = findFlowNode(flowGraph, target.nodeId);
  if (!emailNode || emailNode.type !== 'email') {
    await completeEnrollment(enrollment, job, 'next email node missing');
    return true;
  }

  enrollment.currentNodeId = target.nodeId;
  await enrollment.save();

  const step = nodeToEmailStep(emailNode);
  await deliverSequenceEmail({
    job,
    enrollment,
    lead,
    company,
    project,
    step,
    targetEmail,
  });

  const advanced = await maybeAdvanceAfterBlast(enrollment, job);
  if (advanced) {
    enrollment.currentNodeId = getNextNodeAfterEmail(flowGraph, target.nodeId);
    await enrollment.save();
    await scheduleNextFlowStep(enrollment, flowGraph, lead);
  }

  nextAllowedSendAt = Date.now() + randomSendDelayMs();
  return true;
}

function getNextNodeAfterEmail(flowGraph, emailNodeId) {
  return flowGraph.edges.find((edge) => edge.from === emailNodeId && edge.branch === 'default')?.to
    || flowGraph.edges.find((edge) => edge.from === emailNodeId)?.to
    || null;
}

async function processLinearStepJob(job, enrollment, lead, sequence, company, project, targetEmail) {
  const step = sequence?.steps?.[enrollment.currentStepIndex];
  if (!step) {
    console.log(`[SendWorker] Job ${job._id} cancelled: sequence step ${enrollment.currentStepIndex} missing.`);
    await completeEnrollment(enrollment, job, 'sequence step missing');
    return;
  }

  await deliverSequenceEmail({
    job,
    enrollment,
    lead,
    company,
    project,
    step,
    targetEmail,
  });

  const advanced = await maybeAdvanceAfterBlast(enrollment, job);
  if (!advanced) {
    nextAllowedSendAt = Date.now() + randomSendDelayMs();
    return;
  }

  const nextStep = sequence.steps[enrollment.currentStepIndex];
  if (nextStep) {
    const delayMs = parseStepDelay(nextStep);
    enrollment.nextSendAt = new Date(Date.now() + delayMs);
    await enrollment.save();
    console.log(
      `[SendWorker] Scheduling next step (${enrollment.currentStepIndex}) for enrollment ${enrollment._id} in ${Math.round(delayMs / 1000)}s`,
    );
    await scheduleEnrollmentJob(enrollment, randomSendDelayMs(), {
      immediate: isShortFlowDelay(delayMs),
    });
  } else {
    console.log(`[SendWorker] Enrollment ${enrollment._id} completed all steps!`);
    enrollment.completedAt = new Date();
    await enrollment.save();
  }

  nextAllowedSendAt = Date.now() + randomSendDelayMs();
}

async function processSendJobRecord(job) {
  console.log(`[SendWorker] Processing SendJob ${job._id} (Lead: ${job.leadId}, Enrollment: ${job.enrollmentId})`);
  const enrollment = await SequenceEnrollment.findById(job.enrollmentId);
  if (!enrollment || enrollment.frozen) {
    const reason = !enrollment ? 'enrollment not found' : 'enrollment is frozen';
    console.log(`[SendWorker] Job ${job._id} cancelled: ${reason}`);
    job.status = 'cancelled';
    job.errorMessage = reason;
    await job.save();
    return;
  }

  const lead = await Lead.findById(job.leadId);
  if (!lead) {
    console.log(`[SendWorker] Job ${job._id} cancelled: lead missing.`);
    job.status = 'cancelled';
    job.errorMessage = 'lead missing';
    await job.save();
    return;
  }

  const blockedStatuses = ['Bounced / Invalid', 'Opted Out'];
  if (blockedStatuses.includes(lead.deliveryStatus)) {
    console.log(`[SendWorker] Job ${job._id} cancelled: lead status is blocked (${lead.deliveryStatus})`);
    enrollment.frozen = true;
    await enrollment.save();
    job.status = 'cancelled';
    job.errorMessage = lead.deliveryStatus;
    await job.save();
    return;
  }

  const targetEmail = normalizeEmail(job.recipientEmail)
    || getSendTargetEmail(lead, {
      vendor: job.metadata?.emailVendor || lead.primarySource,
    });
  if (!targetEmail) {
    console.error(`[SendWorker] Job ${job._id} failed: No valid target email address found for lead.`);
    job.status = 'failed';
    job.errorMessage = 'No valid target email address found for lead.';
    await job.save();
    await maybeAdvanceAfterBlast(enrollment, job);
    return;
  }

  const suppressed = await Suppression.findOne({ email: targetEmail });
  if (suppressed) {
    console.log(`[SendWorker] Job ${job._id} cancelled: email ${targetEmail} is suppressed.`);
    job.status = 'cancelled';
    job.errorMessage = 'suppressed';
    await job.save();
    // Other address variants for this POC should still send.
    const advanced = await maybeAdvanceAfterBlast(enrollment, job);
    if (advanced) {
      const sequence = await Sequence.findById(enrollment.sequenceId);
      if (sequence) {
        const nextStep = sequence.steps?.[enrollment.currentStepIndex];
        if (nextStep) {
          await scheduleEnrollmentJob(enrollment, randomSendDelayMs(), {
            immediate: isShortFlowDelay(parseStepDelay(nextStep)),
          });
        } else {
          enrollment.completedAt = new Date();
          await enrollment.save();
        }
      }
    }
    return;
  }

  if (!job.immediateLaunch) {
    const dailyCap = Number(process.env.MAILBOX_DAILY_CAP) || 150;
    const currentDailyCount = await getDailySendCount();
    if (currentDailyCount >= dailyCap) {
      const nextWindow = getNextUaeBusinessWindow(new Date(Date.now() + 86400000));
      console.log(`[SendWorker] Job ${job._id} rescheduled: daily cap of ${dailyCap} reached (current count: ${currentDailyCount}). Rescheduling for: ${nextWindow}`);
      await rescheduleJob(job, nextWindow, 'daily cap');
      return;
    }

    if (!shouldSkipBusinessHours(job) && !isWithinUaeBusinessHours()) {
      const nextWindow = getNextUaeBusinessWindow();
      console.log(`[SendWorker] Job ${job._id} rescheduled: outside business hours. Rescheduling for: ${nextWindow}`);
      await rescheduleJob(job, nextWindow, 'outside business hours');
      return;
    }
  }

  const [sequence, company, project] = await Promise.all([
    Sequence.findById(enrollment.sequenceId),
    Company.findById(lead.companyId),
    ProjectCampaign.findById(enrollment.campaignId),
  ]);

  try {
    const usedFlowGraph = await processFlowGraphJob(
      job,
      enrollment,
      lead,
      sequence,
      company,
      project,
      targetEmail,
    );
    if (usedFlowGraph) {
      console.log(`[SendWorker] Job ${job._id} processed via flow graph.`);
      return;
    }
    await processLinearStepJob(job, enrollment, lead, sequence, company, project, targetEmail);
    console.log(`[SendWorker] Job ${job._id} successfully sent and recorded.`);
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error.message || 'SMTP send failed';
    await job.save();
    console.error('[SendWorker] Send job failed:', job._id, error);
  }
}

async function pollSendQueue() {
  if (isProcessing) {
    return;
  }
  if (Date.now() < nextAllowedSendAt) {
    return;
  }

  const job = await SendJob.findOneAndUpdate(
    { status: 'pending', scheduledFor: { $lte: new Date() }, manualSend: { $ne: true } },
    { $set: { status: 'processing' } },
    { sort: { scheduledFor: 1 }, new: true }
  );

  if (!job) {
    return;
  }

  console.log(`[SendWorker] Found pending send job ${job._id} scheduled for ${job.scheduledFor}. Acquiring lock and processing...`);
  isProcessing = true;
  try {
    await processSendJobRecord(job);
  } catch (error) {
    console.error(`[SendWorker] Send queue poll error during job ${job._id}:`, error);
    if (job.status === 'processing') {
      job.status = 'pending';
      job.scheduledFor = new Date(Date.now() + 60000);
      job.errorMessage = error.message;
      await job.save();
    }
  } finally {
    isProcessing = false;
  }
}

export async function scheduleEnrollmentJob(enrollment, delayMs = 0, { immediate = false, manualSend = false } = {}) {
  const scheduledFor = computeScheduledFor(enrollment, delayMs, { immediate });
  const stepIndex = enrollment.currentStepIndex;

  const existingPending = await SendJob.find({
    enrollmentId: enrollment._id,
    stepIndex,
    status: { $in: ['pending', 'processing'] },
  });

  if (existingPending.length) {
    for (const existing of existingPending) {
      existing.scheduledFor = scheduledFor;
      existing.status = 'pending';
      existing.immediateLaunch = immediate;
      existing.manualSend = manualSend;
      await existing.save();
    }
    return existingPending[0];
  }

  const lead = await Lead.findById(enrollment.leadId).lean();
  // Send every distinct address for this POC (exact duplicates already removed).
  const emails = getBlastSendEmails(lead);
  if (!emails.length) {
    return SendJob.create({
      leadId: enrollment.leadId,
      enrollmentId: enrollment._id,
      stepIndex,
      status: 'pending',
      scheduledFor,
      immediateLaunch: immediate,
      manualSend,
    });
  }

  const staggerMs = 1500;
  const jobs = await SendJob.insertMany(
    emails.map((email, index) => ({
      leadId: enrollment.leadId,
      enrollmentId: enrollment._id,
      stepIndex,
      status: 'pending',
      scheduledFor: new Date(scheduledFor.getTime() + index * staggerMs),
      recipientEmail: email,
      immediateLaunch: immediate,
      manualSend,
    })),
  );
  return jobs[0];
}

export async function cancelLeadJobs(leadId) {
  await SendJob.updateMany(
    { leadId, status: { $in: ['pending', 'processing'] } },
    { $set: { status: 'cancelled', errorMessage: 'lead cancelled' } }
  );
}

export function kickSendQueue() {
  return pollSendQueue();
}

export function startSendWorker() {
  if (pollTimer) {
    return;
  }

  console.log(`[SendWorker] Starting send worker background interval (${POLL_INTERVAL_MS}ms)...`);
  pollTimer = setInterval(() => {
    pollSendQueue().catch((err) => console.error('[SendWorker] Send queue background poll error:', err));
  }, POLL_INTERVAL_MS);

  recoverStaleProcessingJobs()
    .then(() => console.log('[SendWorker] Completed recoverStaleProcessingJobs.'))
    .catch((err) => console.error('[SendWorker] Send queue recovery failed:', err));

  pollSendQueue().catch((err) => console.error('[SendWorker] Initial pollSendQueue failed:', err));
}

export function stopSendWorker() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export async function shutdownSendWorker() {
  stopSendWorker();
}

export async function sendJobNow(jobId) {
  const job = await SendJob.findById(jobId);
  if (!job) {
    throw new Error('Send job not found');
  }
  if (job.status === 'sent') {
    return job;
  }

  const enrollment = await SequenceEnrollment.findById(job.enrollmentId);
  const recipient = normalizeEmail(job.recipientEmail);
  // Only skip the exact same address — other variants for this POC still send.
  if (enrollment && recipient) {
    const alreadySentThisAddress = await SendJob.findOne({
      enrollmentId: enrollment._id,
      stepIndex: job.stepIndex,
      status: 'sent',
      recipientEmail: recipient,
      _id: { $ne: job._id },
    }).select('_id').lean();

    if (alreadySentThisAddress) {
      job.status = 'cancelled';
      job.errorMessage = 'Skipped — this exact address already received this sequence step.';
      await job.save();
      const advanced = await maybeAdvanceAfterBlast(enrollment, job);
      if (advanced) {
        const sequence = await Sequence.findById(enrollment.sequenceId);
        const flowGraph = normalizeFlowGraph(sequence?.flowGraph);
        if (flowGraph) {
          const nodeId = enrollment.currentNodeId || resolveEntryNodeId(flowGraph);
          if (nodeId) {
            enrollment.currentNodeId = getNextNodeAfterEmail(flowGraph, nodeId);
            await enrollment.save();
          }
          const lead = await Lead.findById(job.leadId);
          if (lead) await scheduleNextFlowStep(enrollment, flowGraph, lead);
        } else {
          const nextStep = sequence?.steps?.[enrollment.currentStepIndex];
          if (nextStep) {
            const delayMs = parseStepDelay(nextStep);
            enrollment.nextSendAt = new Date(Date.now() + delayMs);
            await enrollment.save();
            await scheduleEnrollmentJob(enrollment, randomSendDelayMs(), {
              immediate: isShortFlowDelay(delayMs),
            });
          } else {
            enrollment.completedAt = new Date();
            await enrollment.save();
          }
        }
      }
      return job;
    }
  } else if (
    enrollment
    && !recipient
    && await hasLeadReceivedSequenceStep(job.leadId, enrollment.sequenceId, job.stepIndex)
  ) {
    // Legacy jobs without recipientEmail — keep contact-level skip.
    job.status = 'cancelled';
    job.errorMessage = 'Skipped — this contact already received this sequence step.';
    await job.save();
    return job;
  }

  // Force bypass checks
  job.immediateLaunch = true;
  job.status = 'processing';
  await job.save();

  try {
    await processSendJobRecord(job);
    const updated = await SendJob.findById(jobId);
    if (updated.status === 'failed') {
      throw new Error(updated.errorMessage || 'SMTP send failed');
    }
    return updated;
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error.message;
    await job.save();
    throw error;
  }
}

const RESEND_SEND_DELAY_MS = Number(process.env.RESEND_SEND_DELAY_MS) || 150;

export async function sendPendingJobsBatch(jobIds = [], options = {}) {
  const maxCount = capResendBatchSize(options.maxCount);
  const ids = [...new Set((Array.isArray(jobIds) ? jobIds : []).map(String))].slice(0, maxCount);

  const results = [];
  for (let index = 0; index < ids.length; index += 1) {
    const jobId = ids[index];
    try {
      const job = await SendJob.findById(jobId).select('status').lean();
      if (!job) {
        results.push({ id: jobId, ok: false, skipped: true, message: 'Job not found.' });
        continue;
      }
      if (!['pending', 'failed'].includes(job.status)) {
        results.push({ id: jobId, ok: false, skipped: true, message: `Job is ${job.status}.` });
        continue;
      }
      await sendJobNow(jobId);
      results.push({ id: jobId, ok: true });
      if (index < ids.length - 1 && RESEND_SEND_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, RESEND_SEND_DELAY_MS));
      }
    } catch (error) {
      results.push({ id: jobId, ok: false, message: error.message || 'Send failed.' });
    }
  }

  return {
    sent: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok && !row.skipped).length,
    skipped: results.filter((row) => row.skipped).length,
    processed: ids.length,
    maxPerRequest: RESEND_MAX_EMAILS_PER_REQUEST,
    results,
  };
}
