import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Sequence } from '../models/Sequence.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';
import { Suppression } from '../models/Suppression.js';
import { generateSequenceEmail } from './openaiService.js';
import { createTransporter, getBaseUrl, getFromIdentity } from './mailTransport.js';
import {
  getGstDayBounds,
  getNextUaeBusinessWindow,
  isWithinUaeBusinessHours,
  randomSendDelayMs,
} from '../utils/uaeBusinessHours.js';

const POLL_INTERVAL_MS = 5000;

let pollTimer = null;
let isProcessing = false;
let nextAllowedSendAt = 0;

function renderEmailHtml({ body, leadId, stepIndex }) {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const pixel = `${baseUrl}/api/track/open/${leadId}/${stepIndex}`;
  const escapedBody = String(body || '')
    .split(/\r?\n/)
    .map((line) =>
      line.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    )
    .join('<br>');

  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#1A1715;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;padding:24px;">${escapedBody}</div>
    <img src="${pixel}" width="1" height="1" alt="" style="display:none;" />
  </body></html>`;
}

async function getDailySendCount() {
  const { start, end } = getGstDayBounds();
  return SendJob.countDocuments({ status: 'sent', sentAt: { $gte: start, $lt: end } });
}

function computeScheduledFor(enrollment, extraDelayMs = 0) {
  let runAt = enrollment.nextSendAt ? new Date(enrollment.nextSendAt) : new Date();
  if (!isWithinUaeBusinessHours(runAt)) {
    runAt = getNextUaeBusinessWindow(runAt);
  }
  return new Date(runAt.getTime() + extraDelayMs);
}

async function rescheduleJob(job, runAt, reason) {
  job.status = 'pending';
  job.scheduledFor = runAt;
  job.errorMessage = reason;
  await job.save();
}

async function processSendJobRecord(job) {
  const enrollment = await SequenceEnrollment.findById(job.enrollmentId);
  if (!enrollment || enrollment.frozen) {
    job.status = 'cancelled';
    job.errorMessage = 'frozen or missing enrollment';
    await job.save();
    return;
  }

  const lead = await Lead.findById(job.leadId);
  if (!lead) {
    job.status = 'cancelled';
    job.errorMessage = 'lead missing';
    await job.save();
    return;
  }

  const blockedStatuses = ['Bounced / Invalid', 'Opted Out', 'Replied'];
  if (blockedStatuses.includes(lead.deliveryStatus)) {
    enrollment.frozen = true;
    await enrollment.save();
    job.status = 'cancelled';
    job.errorMessage = lead.deliveryStatus;
    await job.save();
    return;
  }

  const suppressed = await Suppression.findOne({ email: lead.email });
  if (suppressed) {
    lead.deliveryStatus = 'Opted Out';
    await lead.save();
    enrollment.frozen = true;
    await enrollment.save();
    job.status = 'cancelled';
    job.errorMessage = 'suppressed';
    await job.save();
    return;
  }

  const dailyCap = Number(process.env.MAILBOX_DAILY_CAP) || 150;
  if ((await getDailySendCount()) >= dailyCap) {
    await rescheduleJob(job, getNextUaeBusinessWindow(new Date(Date.now() + 86400000)), 'daily cap');
    return;
  }

  if (!isWithinUaeBusinessHours()) {
    await rescheduleJob(job, getNextUaeBusinessWindow(), 'outside business hours');
    return;
  }

  const [sequence, company, project] = await Promise.all([
    Sequence.findById(enrollment.sequenceId),
    Company.findById(lead.companyId),
    ProjectCampaign.findById(enrollment.campaignId),
  ]);

  const step = sequence?.steps?.[enrollment.currentStepIndex];
  if (!step) {
    enrollment.completedAt = new Date();
    await enrollment.save();
    job.status = 'sent';
    job.sentAt = new Date();
    await job.save();
    return;
  }

  try {
    const generated = await generateSequenceEmail({ lead, company, step });
    const { fromEmail, fromName } = getFromIdentity(project);
    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: lead.email,
      subject: generated.subject,
      html: renderEmailHtml({
        body: generated.body,
        leadId: lead._id,
        stepIndex: enrollment.currentStepIndex,
      }),
    });

    lead.deliveryStatus = 'Emailed Outbound';
    lead.lastMessageId = String(result.messageId || '').trim();
    lead.financialMetrics.tokensConsumed += generated.tokensUsed;
    lead.financialMetrics.calculatedAiCostUSD += generated.costUsd;
    lead.trackingMetrics.emailsDeliveredCount += 1;
    await lead.save();

    if (project) {
      project.financialLedger.accumulatedOpenAiCost =
        (project.financialLedger.accumulatedOpenAiCost || 0) + generated.costUsd;
      project.recalculateCosts();
      await project.save();
    }

    job.status = 'sent';
    job.sentAt = new Date();
    job.errorMessage = '';
    await job.save();

    enrollment.lastSentAt = new Date();
    enrollment.currentStepIndex += 1;

    const nextStep = sequence.steps[enrollment.currentStepIndex];
    if (nextStep) {
      const delayDays = nextStep.dayDelay || 0;
      enrollment.nextSendAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);
      await enrollment.save();
      await scheduleEnrollmentJob(enrollment, randomSendDelayMs());
    } else {
      enrollment.completedAt = new Date();
      await enrollment.save();
    }

    nextAllowedSendAt = Date.now() + randomSendDelayMs();
  } catch (error) {
    job.status = 'failed';
    job.errorMessage = error.message || 'SMTP send failed';
    await job.save();
    console.error('Send job failed:', job._id, error.message);
  }
}

async function pollSendQueue() {
  if (isProcessing || Date.now() < nextAllowedSendAt) {
    return;
  }

  const job = await SendJob.findOneAndUpdate(
    { status: 'pending', scheduledFor: { $lte: new Date() } },
    { $set: { status: 'processing' } },
    { sort: { scheduledFor: 1 }, new: true }
  );

  if (!job) {
    return;
  }

  isProcessing = true;
  try {
    await processSendJobRecord(job);
  } catch (error) {
    console.error('Send queue poll error:', error.message);
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

export async function scheduleEnrollmentJob(enrollment, delayMs = 0) {
  const scheduledFor = computeScheduledFor(enrollment, delayMs);

  const existing = await SendJob.findOne({
    enrollmentId: enrollment._id,
    stepIndex: enrollment.currentStepIndex,
    status: { $in: ['pending', 'processing'] },
  });

  if (existing) {
    existing.scheduledFor = scheduledFor;
    existing.status = 'pending';
    await existing.save();
    return existing;
  }

  return SendJob.create({
    leadId: enrollment.leadId,
    enrollmentId: enrollment._id,
    stepIndex: enrollment.currentStepIndex,
    status: 'pending',
    scheduledFor,
  });
}

export async function cancelLeadJobs(leadId) {
  await SendJob.updateMany(
    { leadId, status: { $in: ['pending', 'processing'] } },
    { $set: { status: 'cancelled', errorMessage: 'lead cancelled' } }
  );
}

export function startSendWorker() {
  if (pollTimer) {
    return;
  }

  pollTimer = setInterval(() => {
    pollSendQueue().catch((err) => console.error('Send queue error:', err.message));
  }, POLL_INTERVAL_MS);

  pollSendQueue().catch(() => {});
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
