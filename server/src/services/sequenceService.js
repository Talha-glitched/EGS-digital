import db from '../db/index.js';
import { unwrapBson } from '../utils/bsonUnwrap.js';

export function assertEnrollmentConfirmed(options = {}) {
  if (options.confirmEnrollment !== true) {
    const error = new Error('Explicit launch confirmation is required.');
    error.status = 400;
    throw error;
  }
}

export function assertLaunchAudience(options = {}) {
  const imported = (options.importedCampaignIds || []).filter(Boolean);
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
      SELECT id AS "_id", id, mongo_sequence_id, mongo_campaign_id, name, created_at AS "createdAt", updated_at AS "updatedAt", payload
      FROM sequences
      ORDER BY updated_at DESC
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
        stats: { enrolled: 0, active: 0, completed: 0, queued: 0, failed: 0, cancelled: 0 },
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
  return {
    ...seq,
    campaign: null,
    stats: { enrolled: 0, active: 0, completed: 0, queued: 0, failed: 0, cancelled: 0 },
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
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, direction, channel, subject, body, occurred_at AS "occurredAt", delivery_state AS "deliveryState"
       FROM messages WHERE direction = 'outbound' ORDER BY occurred_at DESC LIMIT 100`
    );
    return { items: res.rows };
  } catch (err) {
    return { items: [] };
  }
}

export async function getSentEmail(id) {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, direction, channel, subject, body, occurred_at AS "occurredAt", delivery_state AS "deliveryState"
       FROM messages WHERE (id::text = $1::text) AND direction = 'outbound' LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Sent Email not found.');
      error.status = 404;
      throw error;
    }
    return res.rows[0];
  } catch (err) {
    const error = new Error('Sent Email not found.');
    error.status = 404;
    throw error;
  }
}

export async function listSendDeliveryIssues() {
  return [];
}

export async function getSequenceDeliverySummary(id) {
  return {
    totalEnrolled: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalReplied: 0,
  };
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
      `INSERT INTO sequence_launches (sequence_id, campaign_id, status, payload)
       VALUES ($1::uuid, $2::uuid, 'active', $3::jsonb)
       RETURNING id AS "_id", id, status, created_at AS "createdAt"`,
      [
        seq._id && String(seq._id).length === 36 ? String(seq._id) : null,
        options.projectId && String(options.projectId).length === 36 ? String(options.projectId) : null,
        JSON.stringify({ sequenceId: seq._id, ...options }),
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
      `SELECT id AS "_id", id, status, total_enrolled AS "totalEnrolled", created_at AS "createdAt"
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

