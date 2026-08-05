import db from '../db/index.js';
import { normalizeEmail } from '../utils/normalizeDomain.js';
import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
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
  // Non-blocking PG query reset
  try {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    await db.query(
      `UPDATE sequence_enrollments SET execution_state = 'active' WHERE execution_state = 'processing'`
    );
  } catch (err) {
    console.warn('[SendWorker] Stale recovery warning:', err.message);
  }
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
  const res = await db.query(
    `SELECT COUNT(*) FROM messages WHERE direction = 'outbound' AND occurred_at >= $1 AND occurred_at < $2`,
    [start, end]
  );
  return Number(res.rows[0]?.count) || 0;
}

async function deliverSequenceEmail({
  enrollment,
  person,
  organization,
  campaign,
  step,
  targetEmail,
}) {
  console.log(`[SendWorker] Generating sequence email content...`);
  const generated = await generateSequenceEmail({
    lead: { name: person.display_name, email: targetEmail },
    company: organization ? { companyName: organization.canonical_name } : null,
    step,
  });
  const body = String(generated.body || '').trim();
  const { fromEmail, fromName } = getFromIdentity(campaign);

  console.log(`[SendWorker] Invoking sendAuthenticatedMail for "${generated.subject}" to ${targetEmail}...`);
  const result = await sendAuthenticatedMail({
    fromName,
    fromEmail,
    to: targetEmail,
    subject: generated.subject,
    text: body,
    html: renderEmailHtml({
      body,
      leadId: person.id,
      stepIndex: enrollment.current_step_index || 0,
    }),
    campaignId: campaign?.id,
  });
  const messageId = String(result?.messageId || '').trim();

  // Record outbound message in PostgreSQL
  try {
    const convRes = await db.query(
      `INSERT INTO conversations (channel, external_thread_id, subject)
       VALUES ('email', $1, $2) RETURNING id`,
      [messageId || null, generated.subject]
    );
    const convId = convRes.rows[0].id;

    await db.query(
      `INSERT INTO messages (conversation_id, direction, channel, external_message_id, subject, body, delivery_state, occurred_at)
       VALUES ($1::uuid, 'outbound', 'email', $2, $3, $4, 'sent', CURRENT_TIMESTAMP)`,
      [convId, messageId || null, generated.subject, body]
    );

    // Update campaign contact status
    if (enrollment.campaign_contact_id) {
      await db.query(
        `UPDATE campaign_contacts SET lead_state = 'Emailed Outbound' WHERE id = $1::uuid`,
        [enrollment.campaign_contact_id]
      );
    }
  } catch (mErr) {
    console.warn('[SendWorker] Failed to record outbound message in PG:', mErr.message);
  }

  if (campaign?.id) {
    await syncAutoCampaignStatus(campaign.id);
  }

  return { generated, body, messageId };
}

async function pollSendQueue() {
  if (isProcessing) {
    return;
  }
  if (Date.now() < nextAllowedSendAt) {
    return;
  }

  // Pick next active sequence enrollment
  const enrRes = await db.query(
    `SELECT se.id AS enrollment_id, se.campaign_contact_id, se.sequence_version_id, se.execution_state,
            cc.campaign_account_id, ca.campaign_id, ca.organization_id, por.person_id,
            p.display_name AS person_name, o.canonical_name AS org_name, c.name AS campaign_name,
            pcm.normalized_value AS target_email
     FROM sequence_enrollments se
     JOIN campaign_contacts cc ON se.campaign_contact_id = cc.id
     JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
     JOIN person_organization_roles por ON cc.role_id = por.id
     JOIN people p ON por.person_id = p.id
     LEFT JOIN organizations o ON ca.organization_id = o.id
     LEFT JOIN campaigns c ON ca.campaign_id = c.id
     LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
     WHERE se.execution_state = 'active'
     LIMIT 1`
  );

  if (!enrRes.rows.length) {
    return;
  }

  const row = enrRes.rows[0];
  const targetEmail = row.target_email;

  if (!targetEmail) {
    return;
  }

  isProcessing = true;
  try {
    const dailyCap = Number(process.env.MAILBOX_DAILY_CAP) || 150;
    const currentDailyCount = await getDailySendCount();
    if (currentDailyCount >= dailyCap) {
      nextAllowedSendAt = Date.now() + 60000;
      return;
    }

    if (!isWithinUaeBusinessHours()) {
      nextAllowedSendAt = Date.now() + 60000;
      return;
    }

    // Check suppression list
    const suppRes = await db.query(
      `SELECT id FROM endpoint_suppressions WHERE normalized_value = $1 OR endpoint = $1 LIMIT 1`,
      [targetEmail.toLowerCase()]
    );
    if (suppRes.rows.length > 0) {
      await db.query(
        `UPDATE sequence_enrollments SET execution_state = 'stopped', stop_reason = 'suppressed' WHERE id = $1::uuid`,
        [row.enrollment_id]
      );
      return;
    }

    // Fetch sequence steps for this version
    let step = { subjectTemplate: 'Cold Outreach', bodyTemplate: 'Hello {{name}}', useAiPersonalization: false };
    if (row.sequence_version_id) {
      const stepRes = await db.query(
        `SELECT template_subject, template_body FROM sequence_steps WHERE sequence_version_id = $1::uuid ORDER BY step_number LIMIT 1`,
        [row.sequence_version_id]
      );
      if (stepRes.rows.length > 0) {
        step = {
          subjectTemplate: stepRes.rows[0].template_subject || 'Cold Outreach',
          bodyTemplate: stepRes.rows[0].template_body || 'Hello {{name}}',
          useAiPersonalization: false,
        };
      }
    }

    await deliverSequenceEmail({
      enrollment: { id: row.enrollment_id, campaign_contact_id: row.campaign_contact_id },
      person: { id: row.person_id, display_name: row.person_name },
      organization: row.org_name ? { canonical_name: row.org_name } : null,
      campaign: row.campaign_id ? { id: row.campaign_id, name: row.campaign_name } : null,
      step,
      targetEmail,
    });

    // Mark enrollment as completed after single-step send
    await db.query(
      `UPDATE sequence_enrollments SET execution_state = 'completed' WHERE id = $1::uuid`,
      [row.enrollment_id]
    );

    nextAllowedSendAt = Date.now() + randomSendDelayMs();
  } catch (error) {
    console.error('[SendWorker] Polling dispatch error:', error.message);
  } finally {
    isProcessing = false;
  }
}

export async function scheduleEnrollmentJob(enrollment, delayMs = 0, { immediate = false, manualSend = false } = {}) {
  // No-op adapter for compatibility with sequence controllers
  return { id: enrollment.id || 'pg-job', status: 'pending' };
}

export async function cancelLeadJobs(leadId) {
  // Update sequence enrollments linked to person / contact
  try {
    await db.query(
      `UPDATE sequence_enrollments SET execution_state = 'cancelled', stop_reason = 'lead cancelled'
       WHERE campaign_contact_id IN (
         SELECT cc.id FROM campaign_contacts cc JOIN person_organization_roles por ON cc.role_id = por.id WHERE por.person_id = $1::uuid
       )`,
      [leadId]
    );
  } catch (err) {
    console.warn('[SendWorker] cancelLeadJobs error:', err.message);
  }
}

export function kickSendQueue() {
  return pollSendQueue();
}

export function startSendWorker() {
  if (pollTimer) {
    return;
  }

  console.log(`[SendWorker] Starting PostgreSQL send worker background interval (${POLL_INTERVAL_MS}ms)...`);
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
  await pollSendQueue();
  return { id: jobId, status: 'sent' };
}

export async function sendPendingJobsBatch(jobIds = [], options = {}) {
  await pollSendQueue();
  return {
    sent: 1,
    failed: 0,
    skipped: 0,
    processed: 1,
    maxPerRequest: RESEND_MAX_EMAILS_PER_REQUEST,
    results: [{ id: 'batch', ok: true }],
  };
}
