import db from '../db/index.js';
import { normalizeEmail } from '../utils/normalizeDomain.js';
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
import { renderEmailHtml, getEmailAttachments } from '../utils/emailTemplateRenderer.js';

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
    await db.query(
      `UPDATE send_jobs SET status='failed',error_message='Delivery status was uncertain after worker interruption; review before retrying',updated_at=NOW()
       WHERE status='processing' AND processing_started_at<NOW()-INTERVAL '30 minutes'`
    );
  } catch (err) {
    console.warn('[SendWorker] Stale recovery warning:', err.message);
  }
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

export async function getHourlySendCount() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const res = await db.query(
    `SELECT COUNT(*) FROM messages WHERE direction = 'outbound' AND occurred_at >= $1`,
    [oneHourAgo]
  );
  return Number(res.rows[0]?.count) || 0;
}

export async function getMsUntilHourlyLimitResumes() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const res = await db.query(
    `SELECT MIN(occurred_at) as oldest FROM messages WHERE direction = 'outbound' AND occurred_at >= $1`,
    [oneHourAgo]
  );
  if (!res.rows[0]?.oldest) return 60 * 60 * 1000;
  const oldestTime = new Date(res.rows[0].oldest).getTime();
  const resumeTime = oldestTime + 60 * 60 * 1000 + 1000;
  return Math.max(2000, resumeTime - Date.now());
}

function renderTemplate(value, context) {
  return String(value || '').replace(/{{\s*([^}]+)\s*}}/g, (_match, rawKey) => {
    const key = String(rawKey).trim().toLowerCase();
    if (['name','first_name','firstname'].includes(key)) return context.firstName;
    if (['full_name','fullname'].includes(key)) return context.personName;
    if (['company','company_name','companyname'].includes(key)) return context.companyName;
    return '';
  });
}

function stepDelayMs(step = {}) {
  const amount = Math.max(0, Number(step.delay_amount ?? step.delay_days) || 0);
  if (step.delay_unit === 'minutes') return amount * 60000;
  if (step.delay_unit === 'hours') return amount * 3600000;
  return amount * 86400000;
}

async function processSendJob(jobId, { force = false } = {}) {
  const client = await db.getClient();
  let context;
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT sj.*,se.campaign_contact_id,se.sequence_version_id,se.sequence_id,se.launch_batch_id,se.execution_state,se.reset_at,
             cc.outreach_focus_state,ca.organization_id,ca.campaign_id,por.person_id,p.display_name AS person_name,
             o.canonical_name AS company_name,c.name AS campaign_name,c.from_email AS campaign_from_email,c.from_name AS campaign_from_name,
             s.payload AS sequence_payload,
             pcm.id AS contact_method_id,
             step.step_number,step.template_subject,step.template_body
      FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id
      JOIN campaign_contacts cc ON cc.id=se.campaign_contact_id JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
      JOIN person_organization_roles por ON por.id=cc.role_id JOIN people p ON p.id=por.person_id
      JOIN organizations o ON o.id=ca.organization_id LEFT JOIN campaigns c ON c.id=ca.campaign_id
      LEFT JOIN sequences s ON s.id=se.sequence_id
      LEFT JOIN person_contact_methods pcm ON pcm.person_id=p.id AND pcm.type='email' AND LOWER(pcm.normalized_value)=LOWER(sj.recipient_email)
      JOIN sequence_steps step ON step.sequence_version_id=se.sequence_version_id AND step.step_number=sj.step_index+1
      WHERE sj.id=$1::uuid FOR UPDATE OF sj`, [jobId]);
    context = result.rows[0];
    if (!context) throw Object.assign(new Error('Send job not found.'), { status: 404 });
    if (context.status === 'sent') { await client.query('ROLLBACK'); client.release(); return { id: jobId, status: 'sent', skipped: true }; }
    if (!['pending','failed'].includes(context.status)) throw Object.assign(new Error(`Send job is ${context.status}.`), { status: 409 });
    if (!force && context.manual_send) throw Object.assign(new Error('This email is still held for manual batch release.'), { status: 409 });
    if (!force && context.scheduled_for && new Date(context.scheduled_for) > new Date()) throw Object.assign(new Error('This email is not due yet.'), { status: 409 });
    if (context.reset_at || !['active','processing'].includes(context.execution_state)) throw Object.assign(new Error('Enrollment is no longer active.'), { status: 409 });
    // A hold_override stamped at launch means the user explicitly selected this
    // mid-conversation contact at import, so the campaign hold is already decided.
    if (!context.payload?.holdOverride
      && !['pending','active_manual'].includes(context.outreach_focus_state || 'pending')) throw Object.assign(new Error('Campaign contact is held by campaign follow-up coordination.'), { status: 409 });
    const suppressed = await client.query(`SELECT 1 FROM endpoint_suppressions WHERE LOWER(endpoint)=LOWER($1) LIMIT 1`, [context.recipient_email]);
    if (suppressed.rows.length) {
      await client.query(`UPDATE send_jobs SET status='cancelled',error_message='Recipient is suppressed',updated_at=NOW() WHERE id=$1::uuid`, [jobId]);
      await client.query(`UPDATE sequence_enrollments SET execution_state='stopped',stop_reason='suppressed',updated_at=NOW() WHERE id=$1::uuid`, [context.enrollment_id]);
      await client.query('COMMIT');
      client.release();
      return { id: jobId, status: 'cancelled', reason: 'suppressed' };
    }
    await client.query(`UPDATE send_jobs SET status='processing',processing_started_at=NOW(),attempt_count=attempt_count+1,error_message='',updated_at=NOW() WHERE id=$1::uuid`, [jobId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); client.release(); throw error; }
  client.release();

  try {
    const personName = context.person_name || 'there';
    const templateContext = { personName, firstName: personName.split(/\s+/)[0] || personName, companyName: context.company_name || '' };
    const subject = renderTemplate(context.rendered_subject || context.template_subject, templateContext);
    const body = renderTemplate(context.rendered_body || context.template_body, templateContext);
    const templateType = context.payload?.templateType || (context.campaign_name?.toLowerCase().includes('graduation') ? 'graduations' : (context.campaign_name?.toLowerCase().includes('fitout') ? 'fitouts' : 'exhibitions'));
    const jobPayload = context.payload || {};
    const seqPayload = context.sequence_payload || {};
    const sequenceFromEmail = jobPayload.fromEmail || seqPayload.fromEmail || seqPayload.from_email;
    const sequenceFromName = jobPayload.fromName || seqPayload.fromName || seqPayload.from_name;
    const { fromEmail, fromName, fromTitle } = getFromIdentity({
      fromEmail: sequenceFromEmail || context.campaign_from_email,
      fromName: sequenceFromName || context.campaign_from_name,
      name: context.campaign_name,
      id: context.campaign_id,
    });
    const sent = await sendAuthenticatedMail({
      fromName,
      fromEmail,
      to: context.recipient_email,
      subject,
      text: body,
      html: renderEmailHtml({
        body,
        subject,
        leadId: context.person_id,
        stepIndex: context.step_index,
        templateType,
        personName,
        companyName: context.company_name,
        inlineCid: false,
        senderName: fromName,
        senderEmail: fromEmail,
        senderTitle: fromTitle,
      }),
      campaignId: context.campaign_id,
    });
    const providerMessageId = String(sent?.messageId || '').trim();
    const finish = await db.getClient();
    try {
      await finish.query('BEGIN');
      const conversation = await finish.query(
        `INSERT INTO conversations(channel,external_thread_id,subject,campaign_contact_id,campaign_id)
         VALUES('email',$1,$2,$3::uuid,$4::uuid) RETURNING id`,
        [providerMessageId || null, subject, context.campaign_contact_id, context.campaign_id],
      );
      if (context.contact_method_id) {
        await finish.query(
          `INSERT INTO conversation_participants(conversation_id,person_contact_method_id,participant_role,endpoint_type_snapshot,endpoint_value_snapshot)
           VALUES($1::uuid,$2::uuid,'recipient','email',$3)`, [conversation.rows[0].id, context.contact_method_id, context.recipient_email],
        );
      } else {
        await finish.query(
          `INSERT INTO conversation_participants(conversation_id,participant_role,endpoint_type_snapshot,endpoint_value_snapshot)
           VALUES($1::uuid,'recipient','email',$2)`, [conversation.rows[0].id, context.recipient_email],
        );
      }
      await finish.query(
        `INSERT INTO messages(conversation_id,direction,channel,external_message_id,subject,body,delivery_state,occurred_at)
         VALUES($1::uuid,'outbound','email',$2,$3,$4,'sent',NOW())`, [conversation.rows[0].id, providerMessageId || null, subject, body],
      );
      await finish.query(`UPDATE send_jobs SET status='sent',sent_at=NOW(),provider_message_id=$2,rendered_subject=$3,rendered_body=$4,updated_at=NOW() WHERE id=$1::uuid`, [jobId, providerMessageId, subject, body]);
      const next = await finish.query(
        `SELECT step_number,delay_amount,delay_unit,delay_days,template_subject,template_body FROM sequence_steps
         WHERE sequence_version_id=$1::uuid AND step_number>$2 ORDER BY step_number LIMIT 1`, [context.sequence_version_id, context.step_number],
      );
      if (next.rows.length) {
        const nextStep = next.rows[0];
        const scheduled = new Date(Date.now() + stepDelayMs(nextStep));
        await finish.query(
          `INSERT INTO send_jobs(lead_id,campaign_id,enrollment_id,step_index,status,scheduled_for,recipient_email,rendered_subject,rendered_body,manual_send,idempotency_key,payload)
           VALUES($1::uuid,$2::uuid,$3::uuid,$4,'pending',$5,$6,$7,$8,FALSE,$9,$10::jsonb) ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
          [context.person_id, context.campaign_id, context.enrollment_id, nextStep.step_number - 1, scheduled, context.recipient_email, nextStep.template_subject || '', nextStep.template_body || '', `${context.enrollment_id}:${nextStep.step_number - 1}`, JSON.stringify({ source: 'sequence_step_advance' })],
        );
        await finish.query(`UPDATE sequence_enrollments SET current_step_index=$2,next_send_at=$3,last_sent_at=NOW(),updated_at=NOW() WHERE id=$1::uuid`, [context.enrollment_id, nextStep.step_number - 1, scheduled]);
      } else {
        await finish.query(`UPDATE sequence_enrollments SET execution_state='completed',completed_at=NOW(),last_sent_at=NOW(),updated_at=NOW() WHERE id=$1::uuid`, [context.enrollment_id]);
      }
      if (context.launch_batch_id) {
        await finish.query(`UPDATE sequence_launches launch SET status=CASE WHEN EXISTS(
          SELECT 1 FROM sequence_enrollments se JOIN send_jobs sj ON sj.enrollment_id=se.id
          WHERE se.launch_batch_id=launch.id AND sj.status IN('pending','processing','failed')
        ) THEN 'active' ELSE 'completed' END,completed_at=CASE WHEN NOT EXISTS(
          SELECT 1 FROM sequence_enrollments se JOIN send_jobs sj ON sj.enrollment_id=se.id
          WHERE se.launch_batch_id=launch.id AND sj.status IN('pending','processing','failed')
        ) THEN NOW() ELSE NULL END,updated_at=NOW() WHERE launch.id=$1::uuid`, [context.launch_batch_id]);
      }
      await finish.query(`UPDATE campaign_contacts SET lead_state='Emailed Outbound',delivery_state='Emailed Outbound' WHERE id=$1::uuid`, [context.campaign_contact_id]);
      await finish.query('COMMIT');
    } catch (error) { await finish.query('ROLLBACK').catch(() => {}); throw error; } finally { finish.release(); }
    if (context.campaign_id) await syncAutoCampaignStatus(context.campaign_id);
    return { id: jobId, status: 'sent', providerMessageId };
  } catch (error) {
    await db.query(`UPDATE send_jobs SET status='failed',error_message=$2,updated_at=NOW() WHERE id=$1::uuid AND status='processing'`, [jobId, String(error.message || error).slice(0, 1000)]).catch(() => {});
    throw error;
  }
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
  const { fromEmail, fromName, fromTitle } = getFromIdentity(campaign);

  const templateType = step?.templateType || (campaign?.name?.toLowerCase().includes('graduation') ? 'graduations' : (campaign?.name?.toLowerCase().includes('fitout') ? 'fitouts' : 'exhibitions'));
  const attachments = getEmailAttachments(templateType);

  console.log(`[SendWorker] Invoking sendAuthenticatedMail for "${generated.subject}" to ${targetEmail}...`);
  const result = await sendAuthenticatedMail({
    fromName,
    fromEmail,
    to: targetEmail,
    subject: generated.subject,
    text: body,
    html: renderEmailHtml({
      body,
      subject: generated.subject,
      leadId: person.id,
      stepIndex: enrollment.current_step_index || 0,
      templateType,
      personName: person.display_name,
      companyName: organization?.canonical_name,
      inlineCid: false,
      senderName: fromName,
      senderEmail: fromEmail,
      senderTitle: fromTitle,
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

async function pollSendQueue({ force = false, maxJobs = 10 } = {}) {
  if (isProcessing) {
    return;
  }
  if (!force && Date.now() < nextAllowedSendAt) {
    return;
  }

  isProcessing = true;
  try {
    let processedInThisRun = 0;
    while (processedInThisRun < maxJobs) {
      const hourlyCap = Number(process.env.MAILBOX_HOURLY_CAP) || 199;
      const currentHourlyCount = await getHourlySendCount();
      if (currentHourlyCount >= hourlyCap) {
        const waitMs = await getMsUntilHourlyLimitResumes();
        console.warn(`[SendWorker] Hourly SMTP rate limit reached (${currentHourlyCount}/${hourlyCap}). Pausing worker for ${Math.ceil(waitMs / 60000)} minute(s)...`);
        nextAllowedSendAt = Date.now() + waitMs;
        break;
      }

      const dailyCap = Number(process.env.MAILBOX_DAILY_CAP) || 500;
      const currentDailyCount = await getDailySendCount();
      if (currentDailyCount >= dailyCap) {
        console.warn(`[SendWorker] Daily send limit reached (${currentDailyCount}/${dailyCap}).`);
        nextAllowedSendAt = Date.now() + 60000;
        break;
      }

      if (process.env.ENFORCE_UAE_BUSINESS_HOURS === 'true' && !force && !isWithinUaeBusinessHours()) {
        nextAllowedSendAt = Date.now() + 60000;
        break;
      }

      const job = await db.query(`SELECT sj.id FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id
        JOIN campaign_contacts cc ON cc.id=se.campaign_contact_id
        WHERE sj.status='pending' AND COALESCE(sj.manual_send,FALSE)=FALSE AND COALESCE(sj.scheduled_for,NOW())<=NOW()
          AND se.execution_state='active' AND se.reset_at IS NULL
          AND (COALESCE(cc.outreach_focus_state,'pending') IN('pending','active_manual')
               OR COALESCE((sj.payload->>'holdOverride')::boolean,FALSE))
        ORDER BY sj.scheduled_for NULLS FIRST,sj.created_at LIMIT 1`);
      if (!job.rows.length) {
        break;
      }

      await processSendJob(job.rows[0].id, { force });
      processedInThisRun += 1;

      if (processedInThisRun < maxJobs) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    const delayMs = Number(process.env.DELAY_BETWEEN_EMAILS_MS) || 2000;
    nextAllowedSendAt = Date.now() + delayMs;
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

export function kickSendQueue(options = { force: true }) {
  nextAllowedSendAt = 0;
  return pollSendQueue(options);
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
  return processSendJob(jobId, { force: true });
}

const MAX_BATCH_SEND_COUNT = 100;

export async function sendPendingJobsBatch(jobIds = [], options = {}) {
  const ids = Array.isArray(jobIds) ? jobIds.slice(0, MAX_BATCH_SEND_COUNT) : [];
  const results = [];
  for (const id of ids) {
    try { results.push({ id, ok: true, result: await processSendJob(id, { force: true }) }); }
    catch (error) { results.push({ id, ok: false, error: error.message }); }
  }
  return { sent: results.filter((row) => row.ok).length, failed: results.filter((row) => !row.ok).length, skipped: 0, processed: results.length, maxPerRequest: MAX_BATCH_SEND_COUNT, results };
}
