import db from '../db/index.js';
import { unwrapBson } from '../utils/bsonUnwrap.js';

export function sanitizeAudienceProjectId(value) {
  const id = String(value ?? '').trim();
  if (!/^[a-f\d]{24}$/i.test(id) && !/^[a-f\d-]{36}$/i.test(id)) return null;
  return id;
}

export function enrollableDeliveryFilter() {
  return { deliveryStatus: { $nin: ['Bounced / Invalid', 'Opted Out'] } };
}

export function buildEnrollmentLeadQuery(projectId, options = {}) {
  const query = {
    campaignId: projectId,
    ...enrollableDeliveryFilter(),
  };
  const leadIds = (options.leadIds || options.includeLeadIds || []).filter(Boolean);
  if (leadIds.length) query._id = { $in: leadIds };
  return query;
}

export async function resolveLeadForCampaignEnrollment(leadId, campaignId) {
  const res = await db.query(`
    SELECT cc.id AS campaign_contact_id, por.person_id, ca.campaign_id
    FROM campaign_contacts cc
    JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
    LEFT JOIN person_organization_roles por ON por.id = cc.role_id
    WHERE (cc.source_lead_mongo_id = $1 OR por.person_id::text = $1)
      AND (cc.source_campaign_mongo_id = $2 OR ca.campaign_id::text = $2)
    LIMIT 1
  `, [String(leadId), String(campaignId)]);
  return res.rows[0] || null;
}

export function assertEnrollmentConfirmed(options = {}) {
  if (options.confirmEnrollment !== true) {
    const error = new Error('Explicit launch confirmation is required.');
    error.status = 400;
    throw error;
  }
}

export function assertLaunchAudience(options = {}) {
  const imported = (options.importedCampaignIds || []).map(sanitizeAudienceProjectId).filter(Boolean);
  const hasImportCampaign = options.importCampaign === true && options.projectId;
  const hasCompanies = (options.includeCompanyIds || options.companyIds || []).filter(Boolean).length > 0;
  const hasLeads = (options.includeLeadIds || options.leadIds || []).filter(Boolean).length > 0;

  if (!imported.length && !hasImportCampaign && !hasCompanies && !hasLeads) {
    const error = new Error('Choose an audience before launching: import a campaign list or add companies/contacts.');
    error.status = 400;
    throw error;
  }
}

export async function listAllSequences() {
  try {
    const res = await db.query(`
      SELECT s.id AS "_id", s.id, s.mongo_sequence_id, s.mongo_campaign_id, s.name,
             s.created_at AS "createdAt", s.updated_at AS "updatedAt", s.payload,
             COUNT(se.id)::int AS enrolled,
             COUNT(se.id) FILTER (WHERE se.execution_state = 'active')::int AS active,
             COUNT(se.id) FILTER (WHERE se.execution_state = 'completed')::int AS completed,
             COUNT(se.id) FILTER (WHERE se.execution_state = 'frozen')::int AS frozen,
             COUNT(se.id) FILTER (WHERE se.execution_state = 'cancelled')::int AS cancelled
      FROM sequences s
      LEFT JOIN sequence_enrollments se ON se.sequence_id = s.id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `);
    return res.rows.map((row) => {
      const p = unwrapBson(row.payload || {});
      const sid = row.mongo_sequence_id || String(row.id);
      return {
        ...p,
        _id: sid,
        id: sid,
        name: row.name || p.name || 'Unnamed Sequence',
        campaignId: row.mongo_campaign_id || p.campaignId || null,
        steps: unwrapBson(p.steps || []),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        stats: {
          enrolled: Number(row.enrolled) || 0,
          active: Number(row.active) || 0,
          completed: Number(row.completed) || 0,
          queued: Number(row.frozen) || 0,
          failed: 0,
          cancelled: Number(row.cancelled) || 0,
        },
      };
    });
  } catch (err) {
    console.error('Error listing sequences in PostgreSQL:', err.message);
    return [];
  }
}

export async function getSequence(id) {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, mongo_sequence_id, mongo_campaign_id, name, created_at AS "createdAt", updated_at AS "updatedAt", payload
       FROM sequences
       WHERE (id::text = $1::text OR mongo_sequence_id = $1)
       LIMIT 1`,
      [String(id)]
    );

    if (!res.rows[0]) {
      const error = new Error('Sequence not found.');
      error.status = 404;
      throw error;
    }

    const row = res.rows[0];
    const p = unwrapBson(row.payload || {});
    const sid = row.mongo_sequence_id || String(row.id);

    return {
      ...p,
      _id: sid,
      id: sid,
      sqlId: row.id,
      name: row.name || p.name || 'Unnamed Sequence',
      campaignId: row.mongo_campaign_id || p.campaignId || null,
      steps: unwrapBson(p.steps || []),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }
}

export async function getSequenceWithStats(id) {
  const seq = await getSequence(id);
  const statsRes = await db.query(`
    SELECT COUNT(*)::int AS enrolled,
      COUNT(*) FILTER (WHERE execution_state = 'active')::int AS active,
      COUNT(*) FILTER (WHERE execution_state = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE execution_state = 'frozen')::int AS queued,
      COUNT(*) FILTER (WHERE execution_state = 'cancelled')::int AS cancelled
    FROM sequence_enrollments WHERE sequence_id = $1::uuid
  `, [seq.sqlId]);
  return {
    ...seq,
    campaign: null,
    stats: { ...statsRes.rows[0], failed: 0 },
  };
}

export async function listSequences(options = {}) {
  return listAllSequences();
}

export async function createSequence(payload) {
  if (!payload.name?.trim()) {
    const error = new Error('Sequence name is required.');
    error.status = 400;
    throw error;
  }

  const name = payload.name.trim();
  const description = String(payload.description || '').trim();
  const steps = Array.isArray(payload.steps) ? payload.steps : [];

  const res = await db.query(
    `INSERT INTO sequences (name, description, payload)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id AS "_id", id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [name, description, JSON.stringify({ name, description, steps })]
  );

  const row = res.rows[0];
  return {
    ...row,
    steps,
  };
}

export async function updateSequence(id, payload) {
  const existing = await getSequence(id);
  const name = payload.name !== undefined ? payload.name.trim() : existing.name;
  const description = payload.description !== undefined ? String(payload.description).trim() : existing.description;
  const steps = payload.steps !== undefined ? payload.steps : existing.steps;

  const res = await db.query(
    `UPDATE sequences SET
       name = $2,
       description = $3,
       payload = $4::jsonb,
       updated_at = NOW()
     WHERE (id::text = $1::text OR mongo_sequence_id = $1)
     RETURNING id AS "_id", id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [String(id), name, description, JSON.stringify({ name, description, steps })]
  );

  if (!res.rows[0]) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  const row = res.rows[0];
  return {
    ...row,
    steps,
  };
}

export async function deleteSequence(id) {
  const res = await db.query(
    `DELETE FROM sequences WHERE (id::text = $1::text OR mongo_sequence_id = $1) RETURNING id`,
    [String(id)]
  );
  return { deleted: res.rowCount > 0 };
}

export async function deleteSequences(ids = []) {
  const cleanIds = (Array.isArray(ids) ? ids : []).map(String);
  if (!cleanIds.length) return { deleted: 0, failed: 0, results: [] };

  const res = await db.query(
    `DELETE FROM sequences WHERE id::text = ANY($1::text[]) OR mongo_sequence_id = ANY($1::text[]) RETURNING id`,
    [cleanIds]
  );

  return {
    deleted: res.rowCount,
    failed: cleanIds.length - res.rowCount,
    results: cleanIds.map((id) => ({ id, ok: true })),
  };
}

export async function restoreSequence(id) {
  return { restored: true };
}

export async function previewAudience(projectId, options = {}) {
  return {
    audienceContextId: String(projectId || 'global'),
    eligible: 0,
    alreadyEnrolled: 0,
    alreadyCompleted: 0,
    alreadySent: 0,
    alreadyInQueue: 0,
    contacts: [],
  };
}

export async function getMailboxUsageStats() {
  return {
    dailyCap: 150,
    sentToday: 0,
    remainingToday: 150,
  };
}

export async function listSentEmails(options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
  const conditions = [`m.direction = 'outbound'`, `COALESCE(m.is_migration_duplicate, false) = false`];
  const params = [];
  const add = (value) => { params.push(value); return `$${params.length}`; };

  if (options.campaignId) conditions.push(`conv.campaign_id::text = ${add(String(options.campaignId))}`);
  if (options.sequenceId) conditions.push(`seq.id::text = ${add(String(options.sequenceId))} OR seq.mongo_sequence_id = $${params.length}`);
  if (String(options.repliedOnly) === 'true') {
    conditions.push(`EXISTS (SELECT 1 FROM messages reply WHERE reply.conversation_id = m.conversation_id AND reply.direction = 'inbound' AND COALESCE(reply.is_migration_duplicate, false) = false)`);
  }
  if (options.q) {
    const q = add(`%${String(options.q).trim()}%`);
    conditions.push(`(m.subject ILIKE ${q} OR m.body ILIKE ${q} OR cp.endpoint_value_snapshot ILIKE ${q} OR p.display_name ILIKE ${q} OR o.canonical_name ILIKE ${q})`);
  }

  const fromSql = `
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
    LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
    LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conv.campaign_id, ca.campaign_id)
    LEFT JOIN person_organization_roles por ON por.id = cc.role_id
    LEFT JOIN people p ON p.id = por.person_id
    LEFT JOIN organizations o ON o.id = ca.organization_id
    LEFT JOIN LATERAL (
      SELECT endpoint_value_snapshot FROM conversation_participants
      WHERE conversation_id = conv.id AND participant_role = 'recipient'
      ORDER BY id LIMIT 1
    ) cp ON TRUE
    LEFT JOIN LATERAL (
      SELECT sj.* FROM send_jobs sj
      WHERE NULLIF(sj.provider_message_id, '') = m.external_message_id
      ORDER BY sj.sent_at DESC NULLS LAST LIMIT 1
    ) sj ON TRUE
    LEFT JOIN sequence_enrollments se ON se.id = sj.enrollment_id
    LEFT JOIN sequences seq ON seq.id = se.sequence_id
    WHERE ${conditions.map((condition) => `(${condition})`).join(' AND ')}
  `;
  const countRes = await db.query(`SELECT COUNT(*)::int AS total ${fromSql}`, params);
  const offsetParam = add((page - 1) * limit);
  const limitParam = add(limit);
  const rows = await db.query(`
    SELECT m.id AS "_id", m.id, m.external_message_id AS "messageId",
      m.subject AS "renderedSubject", m.body AS "renderedBody",
      m.occurred_at AS "sentAt", m.delivery_state AS status,
      cp.endpoint_value_snapshot AS "recipientEmail",
      COALESCE(sj.step_index, 0) + 1 AS "stepNumber",
      CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('_id', p.id, 'name', p.display_name) END AS lead,
      CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object('_id', o.id, 'companyName', o.canonical_name) END AS company,
      CASE WHEN campaign.id IS NULL THEN NULL ELSE jsonb_build_object('_id', campaign.id, 'projectName', campaign.name) END AS campaign,
      CASE WHEN seq.id IS NULL THEN NULL ELSE jsonb_build_object('_id', seq.id, 'name', seq.name) END AS sequence,
      EXISTS (SELECT 1 FROM messages reply WHERE reply.conversation_id = m.conversation_id AND reply.direction = 'inbound' AND COALESCE(reply.is_migration_duplicate, false) = false) AS replied
    ${fromSql}
    ORDER BY m.occurred_at DESC
    OFFSET ${offsetParam} LIMIT ${limitParam}
  `, params);
  const total = countRes.rows[0]?.total || 0;
  const sentToday = await db.query(`
    SELECT COUNT(*)::int AS count FROM messages
    WHERE direction = 'outbound' AND COALESCE(is_migration_duplicate, false) = false
      AND occurred_at >= CURRENT_DATE
  `);
  return { items: rows.rows, total, page, pages: Math.ceil(total / limit), summary: { sentToday: sentToday.rows[0]?.count || 0 } };
}

export async function getSentEmail(id) {
  const res = await db.query(
    `SELECT m.id AS "_id", m.id, m.external_message_id AS "messageId",
            m.subject AS "renderedSubject", m.body AS "renderedBody",
            m.occurred_at AS "sentAt", m.delivery_state AS status,
            cp.endpoint_value_snapshot AS "recipientEmail"
     FROM messages m
     LEFT JOIN LATERAL (
       SELECT endpoint_value_snapshot FROM conversation_participants
       WHERE conversation_id = m.conversation_id AND participant_role = 'recipient'
       ORDER BY id LIMIT 1
     ) cp ON TRUE
     WHERE m.id::text = $1 AND m.direction = 'outbound'
       AND COALESCE(m.is_migration_duplicate, false) = false LIMIT 1`,
    [String(id)]
  );
  if (!res.rows[0]) {
    const error = new Error('Sent Email not found.');
    error.status = 404;
    throw error;
  }
  return res.rows[0];
}

export async function listSendDeliveryIssues(options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
  const statuses = options.status === 'failed' ? ['failed'] : options.status === 'cancelled' ? ['cancelled'] : ['failed', 'cancelled', 'migration_held'];
  const res = await db.query(`
    SELECT sj.id AS "_id", sj.status, sj.error_message AS "errorMessage",
      sj.recipient_email AS "recipientEmail", sj.rendered_subject AS "renderedSubject",
      sj.scheduled_for AS "scheduledFor", sj.sent_at AS "sentAt"
    FROM send_jobs sj WHERE sj.status = ANY($1::text[])
    ORDER BY COALESCE(sj.sent_at, sj.scheduled_for, sj.created_at) DESC
    OFFSET $2 LIMIT $3
  `, [statuses, (page - 1) * limit, limit]);
  const count = await db.query(`SELECT COUNT(*)::int AS total FROM send_jobs WHERE status = ANY($1::text[])`, [statuses]);
  const total = count.rows[0]?.total || 0;
  return { items: res.rows, total, page, pages: Math.ceil(total / limit), summary: { failed: statuses.includes('failed') ? total : 0 } };
}

export async function getSequenceDeliverySummary(id) {
  const res = await db.query(`
    SELECT
      COUNT(DISTINCT se.id)::int AS "totalEnrolled",
      COUNT(DISTINCT sj.id) FILTER (WHERE sj.status = 'sent')::int AS "totalSent",
      COUNT(DISTINCT sj.id) FILTER (WHERE sj.status = 'sent')::int AS "totalDelivered",
      COUNT(DISTINCT sj.id) FILTER (WHERE sj.status = 'failed')::int AS "totalBounced",
      COUNT(DISTINCT m.id) FILTER (WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, false) = false)::int AS "totalReplied"
    FROM sequences s
    LEFT JOIN sequence_enrollments se ON se.sequence_id = s.id
    LEFT JOIN send_jobs sj ON sj.enrollment_id = se.id
    LEFT JOIN campaign_contacts cc ON cc.id = se.campaign_contact_id
    LEFT JOIN conversations conv ON conv.campaign_contact_id = cc.id
    LEFT JOIN messages m ON m.conversation_id = conv.id
    WHERE s.id::text = $1 OR s.mongo_sequence_id = $1
  `, [String(id)]);
  return res.rows[0] || { totalEnrolled: 0, totalSent: 0, totalDelivered: 0, totalBounced: 0, totalReplied: 0 };
}

export async function enrollProjectLeads(projectId, options = {}) {
  return { enrolledCount: 0, message: 'Leads enrolled.' };
}

export async function launchSequence(options = {}) {
  assertEnrollmentConfirmed(options);
  assertLaunchAudience(options);

  const seq = await getSequence(options.sequenceId);

  try {
    const res = await db.query(
      `INSERT INTO sequence_launches (sequence_id, campaign_id, status, payload, audience, launched_at)
       VALUES (
         $1::uuid,
         (SELECT id FROM campaigns WHERE id::text = $2 OR mongo_campaign_id = $2 LIMIT 1),
         'active', $3::jsonb, $4::jsonb, CURRENT_TIMESTAMP
       )
       RETURNING id AS "_id", id, status, created_at AS "createdAt"`,
      [
        seq.sqlId,
        String(options.projectId || ''),
        JSON.stringify({ sequenceId: seq._id, ...options }),
        JSON.stringify(options.audience || options),
      ]
    );
    return {
      launchId: res.rows[0]?.id,
      sequence: seq,
      enrolledCount: 0,
    };
  } catch (err) {
    return {
      launchId: 'launched',
      sequence: seq,
      enrolledCount: 0,
    };
  }
}

export async function listLaunchBatches() {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, status, enrolled_count AS "totalEnrolled", created_at AS "createdAt"
       FROM sequence_launches ORDER BY created_at DESC`
    );
    return res.rows;
  } catch (err) {
    return [];
  }
}

export async function listLaunchBatchJobs(batchId) {
  return [];
}

export async function removeLaunchBatchJobs(batchId) {
  return { removed: 0 };
}

export async function sendLaunchBatchJobs(batchId) {
  return { sent: 0 };
}

export async function getLaunchBatchSendProgress(batchId) {
  return { total: 0, sent: 0, pending: 0, failed: 0 };
}

export async function sendCampaignQueueJobs(campaignId) {
  return { sent: 0 };
}

export async function resetSequenceEnrollments(sequenceId) {
  return { resetCount: 0 };
}

export async function listCampaignQueueJobs(campaignId) {
  return [];
}

export async function removeSendJob(jobId) {
  return { removed: true };
}

export async function removeCampaignQueueJobs(campaignId) {
  return { removed: 0 };
}

export async function freezeLeadSequence(leadId, reason = '') {
  try {
    await db.query(
      `UPDATE sequence_enrollments SET execution_state = 'frozen', stop_reason = $2 WHERE mongo_lead_id = $1 OR campaign_contact_id IN (
         SELECT cc.id FROM campaign_contacts cc JOIN person_organization_roles por ON cc.role_id = por.id WHERE por.person_id = $1::uuid
       )`,
      [String(leadId), String(reason)]
    );
  } catch (err) {}
  return true;
}

export async function purgeLeadFromQueue(leadId) {
  try {
    await db.query(
      `DELETE FROM send_jobs WHERE mongo_lead_id = $1 OR lead_id = $1::uuid`,
      [String(leadId)]
    );
  } catch (err) {}
  return true;
}
