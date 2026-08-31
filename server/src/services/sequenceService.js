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
  const hasImportCampaign = Boolean(options.projectId) || (options.importCampaign === true && options.projectId);
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
      `SELECT id AS "_id", id, mongo_sequence_id, mongo_campaign_id, campaign_id, name, description,is_active,steps,flow_graph,audience,version,
              created_at AS "createdAt", updated_at AS "updatedAt", payload
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
      campaignId: row.campaign_id || row.mongo_campaign_id || p.campaignId || null,
      steps: unwrapBson(row.steps?.length ? row.steps : p.steps || []),
      flowGraph: row.flow_graph || p.flowGraph || null,
      audience: row.audience || p.audience || {},
      isActive: row.is_active === true,
      version: row.version || 0,
      description: row.description || p.description || '',
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

export async function createSequence(projectIdOrPayload, maybePayload) {
  const payload = maybePayload || projectIdOrPayload || {};
  const projectId = maybePayload ? projectIdOrPayload : payload.campaignId;
  if (!payload.name?.trim()) {
    const error = new Error('Sequence name is required.');
    error.status = 400;
    throw error;
  }

  const name = payload.name.trim();
  const description = String(payload.description || '').trim();
  const steps = Array.isArray(payload.steps) ? payload.steps : [];

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const campaign = projectId ? await client.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(projectId)]) : { rows: [] };
    const res = await client.query(
      `INSERT INTO sequences(name,description,payload,steps,flow_graph,audience,campaign_id,version,is_active,updated_at)
       VALUES($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::uuid,1,FALSE,NOW())
       RETURNING id AS "_id",id,name,description,campaign_id AS "campaignId",created_at AS "createdAt",updated_at AS "updatedAt"`,
      [name, description, JSON.stringify({ ...payload, name, description, steps }), JSON.stringify(steps), JSON.stringify(payload.flowGraph || null), JSON.stringify(payload.audience || {}), campaign.rows[0]?.id || null],
    );
    const version = await client.query(`INSERT INTO sequence_versions(sequence_id,version_number,published_at) VALUES($1::uuid,1,NOW()) RETURNING id`, [res.rows[0].id]);
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index] || {};
      await client.query(
        `INSERT INTO sequence_steps(sequence_version_id,step_number,step_type,delay_days,template_subject,template_body,delay_amount,delay_unit,payload)
         VALUES($1::uuid,$2,'email',$3,$4,$5,$6,$7,$8::jsonb)`,
        [version.rows[0].id, index + 1, step.delayUnit === 'days' ? Number(step.dayDelay || 0) : 0, step.subjectTemplate || '', step.bodyTemplate || '', Number(step.dayDelay || 0), step.delayUnit || 'days', JSON.stringify(step)],
      );
    }
    if (payload.transactionOptions?.rollbackOnly) await client.query('ROLLBACK'); else await client.query('COMMIT');
    return { ...res.rows[0], steps, flowGraph: payload.flowGraph || null, audience: payload.audience || {}, isActive: false };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function updateSequence(id, payload) {
  const existing = await getSequence(id);
  const name = payload.name !== undefined ? payload.name.trim() : existing.name;
  const description = payload.description !== undefined ? String(payload.description).trim() : existing.description;
  const steps = payload.steps !== undefined ? payload.steps : existing.steps;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [String(existing.sqlId || id)]);
    const nextVersion = await client.query(
      `SELECT COALESCE(MAX(sv.version_number),0)+1 AS value FROM sequence_versions sv JOIN sequences s ON s.id=sv.sequence_id
       WHERE s.id::text=$1 OR s.mongo_sequence_id=$1`, [String(id)],
    );
    const campaign = payload.campaignId ? await client.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(payload.campaignId)]) : { rows: [] };
    const res = await client.query(
      `UPDATE sequences SET name=$2,description=$3,payload=$4::jsonb,steps=$5::jsonb,flow_graph=$6::jsonb,
         audience=$7::jsonb,campaign_id=COALESCE($8::uuid,campaign_id),version=$9,updated_at=NOW()
       WHERE id::text=$1 OR mongo_sequence_id=$1
       RETURNING id AS "_id",id,name,description,campaign_id AS "campaignId",version,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [String(id), name, description, JSON.stringify({ ...payload, name, description, steps }), JSON.stringify(steps), JSON.stringify(payload.flowGraph ?? existing.flowGraph ?? null), JSON.stringify(payload.audience ?? existing.audience ?? {}), campaign.rows[0]?.id || null, Number(nextVersion.rows[0]?.value) || 1],
    );
    if (!res.rows.length) throw Object.assign(new Error('Sequence not found.'), { status: 404 });
    const version = await client.query(`INSERT INTO sequence_versions(sequence_id,version_number,published_at) VALUES($1::uuid,$2,NOW()) RETURNING id`, [res.rows[0].id, res.rows[0].version]);
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index] || {};
      await client.query(
        `INSERT INTO sequence_steps(sequence_version_id,step_number,step_type,delay_days,template_subject,template_body,delay_amount,delay_unit,payload)
         VALUES($1::uuid,$2,'email',$3,$4,$5,$6,$7,$8::jsonb)`,
        [version.rows[0].id, index + 1, step.delayUnit === 'days' ? Number(step.dayDelay || 0) : 0, step.subjectTemplate || '', step.bodyTemplate || '', Number(step.dayDelay || 0), step.delayUnit || 'days', JSON.stringify(step)],
      );
    }
    if (payload.transactionOptions?.rollbackOnly) await client.query('ROLLBACK'); else await client.query('COMMIT');
    return { ...res.rows[0], steps, flowGraph: payload.flowGraph ?? existing.flowGraph ?? null, audience: payload.audience ?? existing.audience ?? {} };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function deleteSequence(id) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const seqRes = await client.query(
      `SELECT id FROM sequences WHERE (id::text = $1::text OR mongo_sequence_id = $1) LIMIT 1`,
      [String(id)]
    );
    const sqlId = seqRes.rows[0]?.id;
    if (sqlId) {
      await client.query(`
        UPDATE campaign_contacts cc
        SET outreach_focus_state = 'pending',
            delivery_state = CASE WHEN cc.delivery_state = 'Emailed Outbound' THEN NULL ELSE cc.delivery_state END
        WHERE cc.id IN (
          SELECT se.campaign_contact_id FROM sequence_enrollments se
          WHERE se.sequence_id = $1::uuid
        )
        AND NOT EXISTS (
          SELECT 1 FROM messages m
          JOIN conversations conv ON conv.id = m.conversation_id
          WHERE conv.campaign_contact_id = cc.id AND m.direction = 'outbound'
        )
      `, [sqlId]);

      await client.query(`DELETE FROM send_jobs WHERE enrollment_id IN (SELECT id FROM sequence_enrollments WHERE sequence_id = $1::uuid)`, [sqlId]);
      await client.query(`DELETE FROM sequence_enrollments WHERE sequence_id = $1::uuid`, [sqlId]);
      await client.query(`DELETE FROM sequences WHERE id = $1::uuid`, [sqlId]);
    }
    await client.query('COMMIT');
    return { deleted: Boolean(sqlId) };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSequences(ids = []) {
  const cleanIds = (Array.isArray(ids) ? ids : []).map(String);
  if (!cleanIds.length) return { deleted: 0, failed: 0, results: [] };

  let deletedCount = 0;
  for (const id of cleanIds) {
    try {
      const res = await deleteSequence(id);
      if (res.deleted) deletedCount++;
    } catch {
      /* continue */
    }
  }

  return {
    deleted: deletedCount,
    failed: cleanIds.length - deletedCount,
    results: cleanIds.map((id) => ({ id, ok: true })),
  };
}

export async function restoreSequence(id) {
  return { restored: true };
}

// The one blocked reason a user can override by ticking the contact at import.
export const HOLD_REASON = 'campaign_focus_hold';

function idList(...values) {
  return values.flat().filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
}

async function resolveSequenceSqlId(sequenceId) {
  if (!sequenceId) return null;
  const result = await db.query(`SELECT id FROM sequences WHERE id::text=$1 OR mongo_sequence_id=$1 LIMIT 1`, [String(sequenceId)]);
  return result.rows[0]?.id || null;
}

export async function previewAudience(projectId, options = {}) {
  const campaignIds = idList(projectId, options.importedCampaignIds);
  const companyIds = idList(options.companyIds, options.includeCompanyIds);
  const leadIds = idList(options.leadIds, options.includeLeadIds);
  const excludeCompanyIds = idList(options.excludeCompanyIds);
  const excludeLeadIds = idList(options.excludeLeadIds);
  const isImportAll = Boolean(options.importCampaign || options.importedCampaignIds?.length > 0);
  const consentedLeadIds = idList(...Object.values(options.campaignSelections || {}));
  const sequenceSqlId = await resolveSequenceSqlId(options.sequenceId);
  if (!campaignIds.length && !companyIds.length && !leadIds.length) {
    return { audienceContextId: String(projectId || 'global'), eligible: 0, netNew: 0, alreadyEnrolled: 0, alreadyCompleted: 0, alreadySent: 0, alreadyInQueue: 0, blocked: 0, sample: [], contacts: [] };
  }
  const params = [campaignIds, companyIds, leadIds, sequenceSqlId];
  const result = await db.query(`
    SELECT cc.id AS "campaignContactId",p.id AS "leadId",p.display_name AS name,por.title AS designation,
           o.id AS "companyId",o.canonical_name AS "companyName",ca.campaign_id AS "campaignId",c.name AS "campaignName",
           email.normalized_value AS email,cc.delivery_state AS "deliveryStatus",cc.outreach_focus_state AS "focusState",
           existing.id AS "enrollmentId",existing.execution_state AS "enrollmentState",
           COALESCE(job_stats.sent_count,0)::int AS "sentCount",COALESCE(job_stats.queue_count,0)::int AS "queueCount",
           CASE
             WHEN email.normalized_value IS NULL THEN 'missing_email'
             WHEN suppression.endpoint IS NOT NULL THEN 'suppressed'
             WHEN COALESCE(cc.delivery_state,'') IN('Bounced / Invalid','Opted Out') THEN 'delivery_blocked'
             WHEN COALESCE(cc.outreach_focus_state,'pending') NOT IN('pending','active_manual')
                  AND EXISTS (SELECT 1 FROM messages m JOIN conversations conv ON conv.id = m.conversation_id WHERE conv.campaign_contact_id = cc.id AND m.direction = 'outbound')
                  THEN 'campaign_focus_hold'
             ELSE NULL
           END AS "blockedReason"
    FROM campaign_contacts cc
    JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
    JOIN campaigns c ON c.id=ca.campaign_id
    JOIN organizations o ON o.id=ca.organization_id AND o.archived_at IS NULL
    JOIN person_organization_roles por ON por.id=cc.role_id
    JOIN people p ON p.id=por.person_id AND p.archived_at IS NULL
    LEFT JOIN LATERAL(SELECT normalized_value FROM person_contact_methods WHERE person_id=p.id AND type='email' AND COALESCE(validity,'valid')<>'invalid' ORDER BY preferred DESC NULLS LAST,created_at LIMIT 1)email ON TRUE
    LEFT JOIN LATERAL(SELECT endpoint FROM endpoint_suppressions WHERE LOWER(endpoint)=LOWER(email.normalized_value) LIMIT 1)suppression ON TRUE
    LEFT JOIN LATERAL(
      SELECT se.id,se.execution_state FROM sequence_enrollments se
      WHERE se.sequence_id=$4::uuid AND se.campaign_contact_id=cc.id
        AND se.reset_at IS NULL
      ORDER BY se.created_at DESC LIMIT 1
    )existing ON $4::uuid IS NOT NULL
    LEFT JOIN LATERAL(
      SELECT COUNT(*) FILTER(WHERE sj.status='sent') AS sent_count,
             COUNT(*) FILTER(WHERE sj.status IN('pending','processing','failed')) AS queue_count
      FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id
      WHERE se.sequence_id=$4::uuid AND se.campaign_contact_id=cc.id AND se.reset_at IS NULL
    )job_stats ON $4::uuid IS NOT NULL
    WHERE (
      (CARDINALITY($1::text[])>0 AND (ca.campaign_id::text=ANY($1::text[]) OR c.mongo_campaign_id=ANY($1::text[])))
      OR (CARDINALITY($1::text[])=0 AND (
        (CARDINALITY($2::text[])>0 AND o.id::text=ANY($2::text[]))
        OR (CARDINALITY($3::text[])>0 AND p.id::text=ANY($3::text[]))
      ))
    )
      AND (CARDINALITY($2::text[])=0 OR o.id::text=ANY($2::text[]))
      AND (CARDINALITY($3::text[])=0 OR p.id::text=ANY($3::text[]))
    ORDER BY p.display_name,ca.campaign_id
  `, params);
  // Manual excludes are resolved here (not in the WHERE clause) so an excluded
  // contact still comes back in the list — as ineligible — instead of vanishing,
  // which left no row in the UI to toggle back in.
  const excludedCompanySet = new Set(excludeCompanyIds.map(String));
  const excludedLeadSet = new Set(excludeLeadIds.map(String));
  const consentedLeadSet = new Set(consentedLeadIds.map(String));
  const contacts = result.rows.map((row) => {
    const alreadySent = row.sentCount > 0 || row.enrollmentState === 'completed';
    const alreadyInQueue = row.queueCount > 0;
    const alreadyEnrolled = Boolean(row.enrollmentId);
    const manuallyExcluded = excludedCompanySet.has(String(row.companyId)) || excludedLeadSet.has(String(row.leadId));
    // Only the campaign hold is overridable. Missing email, suppression and
    // bounced/opted-out are consent or deliverability facts, not preferences.
    const holdOverridden = (row.blockedReason === HOLD_REASON) && (isImportAll || consentedLeadSet.has(String(row.leadId)));
    const blockedReason = holdOverridden ? null : row.blockedReason;
    const eligible = !blockedReason && !manuallyExcluded;
    return {
      ...row,
      blockedReason,
      holdOverridden,
      originalBlockedReason: row.blockedReason,
      manuallyExcluded,
      eligible,
      alreadySent,
      alreadyInQueue,
      alreadyEnrolled,
      netNew: eligible && !alreadySent && !alreadyInQueue && !alreadyEnrolled,
    };
  });
  const count = (predicate) => contacts.filter(predicate).length;
  const response = {
    audienceContextId: String(projectId || 'global'),
    eligible: count((row) => row.eligible),
    netNew: count((row) => row.netNew),
    alreadyEnrolled: count((row) => row.alreadyEnrolled),
    alreadyCompleted: count((row) => row.enrollmentState === 'completed'),
    alreadySent: count((row) => row.alreadySent),
    alreadyInQueue: count((row) => row.alreadyInQueue),
    blocked: count((row) => !row.eligible),
    // Mid-conversation contacts about to receive automated mail — surfaced so the
    // launch confirmation can say so out loud before anything actually sends.
    holdOverridden: count((row) => row.holdOverridden && row.netNew),
    sample: contacts.slice(0, 25),
  };
  if (options.full) response.contacts = contacts;
  return response;
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

  if (options.campaignId) {
    const campVal = add(String(options.campaignId));
    conditions.push(`(conv.campaign_id::text = ${campVal} OR ca.campaign_id::text = ${campVal})`);
  }
  if (options.sequenceId) conditions.push(`seq.id::text = ${add(String(options.sequenceId))} OR seq.mongo_sequence_id = $${params.length}`);

  const replyType = String(options.replyType || '').toLowerCase();
  if (replyType === 'ooo' || options.replyIntent === 'OOO') {
    conditions.push(`EXISTS (SELECT 1 FROM messages reply WHERE reply.conversation_id = m.conversation_id AND reply.direction = 'inbound' AND COALESCE(reply.is_migration_duplicate, false) = false AND reply.suggested_intent = 'OOO')`);
  } else if (replyType === 'direct' || replyType === 'human') {
    conditions.push(`EXISTS (SELECT 1 FROM messages reply WHERE reply.conversation_id = m.conversation_id AND reply.direction = 'inbound' AND COALESCE(reply.is_migration_duplicate, false) = false AND COALESCE(reply.suggested_intent, 'Neutral') != 'OOO')`);
  } else if (String(options.repliedOnly) === 'true' || replyType === 'replied') {
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
    LEFT JOIN LATERAL (
      SELECT reply.id, reply.suggested_intent AS intent, reply.occurred_at, reply.subject, reply.body
      FROM messages reply
      WHERE reply.conversation_id = m.conversation_id AND reply.direction = 'inbound'
        AND COALESCE(reply.is_migration_duplicate, false) = false
      ORDER BY reply.occurred_at DESC LIMIT 1
    ) reply_meta ON TRUE
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
      reply_meta.id IS NOT NULL AS replied,
      CASE
        WHEN reply_meta.id IS NULL THEN NULL
        WHEN reply_meta.intent = 'OOO' THEN 'OOO'
        WHEN reply_meta.intent = 'Opt Out' THEN 'Opt Out'
        ELSE 'Neutral'
      END AS "replyIntent",
      reply_meta.occurred_at AS "repliedAt",
      LEFT(COALESCE(reply_meta.body, ''), 140) AS "replySnippet"
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
            cp.endpoint_value_snapshot AS "recipientEmail",
            CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('_id', p.id, 'name', p.display_name) END AS lead,
            CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object('_id', o.id, 'companyName', o.canonical_name) END AS company,
            CASE WHEN campaign.id IS NULL THEN NULL ELSE jsonb_build_object('_id', campaign.id, 'projectName', campaign.name) END AS campaign
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

export async function enrollProjectLeads(projectId, sequenceIdOrOptions, maybeOptions = {}) {
  const sequenceId = typeof sequenceIdOrOptions === 'string' ? sequenceIdOrOptions : sequenceIdOrOptions?.sequenceId;
  const options = typeof sequenceIdOrOptions === 'string' ? maybeOptions : sequenceIdOrOptions || {};
  return launchSequence(sequenceId, { ...options, projectId });
}

function delayMs(amount, unit = 'days') {
  const value = Math.max(0, Number(amount) || 0);
  if (unit === 'minutes') return value * 60000;
  if (unit === 'hours') return value * 3600000;
  return value * 86400000;
}

export async function launchSequence(sequenceId, options = {}) {
  assertEnrollmentConfirmed(options);
  const seq = await getSequence(sequenceId);
  const projectId = options.projectId || seq.campaignId || null;
  assertLaunchAudience({ ...options, projectId });
  const preview = await previewAudience(projectId, { ...options, sequenceId: seq.sqlId, full: true });
  const candidates = (preview.contacts || []).filter((row) => row.netNew);
  if (!candidates.length) {
    const updatePending = await db.query(`
      UPDATE send_jobs sj
      SET manual_send = FALSE, status = 'pending', updated_at = NOW()
      FROM sequence_enrollments se
      WHERE sj.enrollment_id = se.id
        AND se.sequence_id = $1::uuid
        AND sj.status IN ('pending', 'failed')
      RETURNING sj.id
    `, [seq.sqlId]);
    if (updatePending.rowCount > 0) {
      const { kickSendQueue } = await import('./sendWorker.js');
      kickSendQueue().catch(() => {});
    }
    return {
      launchBatchId: null, launchId: null,
      enrolled: updatePending.rowCount || preview.alreadyInQueue || 0,
      enrolledCount: updatePending.rowCount || preview.alreadyInQueue || 0,
      skippedAlreadySent: preview.alreadySent,
      skippedInQueue: Math.max(0, (preview.alreadyInQueue || 0) - (updatePending.rowCount || 0)),
      skippedBlocked: preview.blocked, eligible: preview.eligible,
    };
  }

  const client = await db.getClient();
  let launchId;
  let enrolled = 0;
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [String(seq.sqlId)]);
    let version = await client.query(`SELECT id FROM sequence_versions WHERE sequence_id=$1::uuid ORDER BY version_number DESC LIMIT 1`, [seq.sqlId]);
    if (!version.rows.length) {
      version = await client.query(`INSERT INTO sequence_versions(sequence_id,version_number,published_at) VALUES($1::uuid,1,NOW()) RETURNING id`, [seq.sqlId]);
    }
    const firstStep = await client.query(
      `SELECT id,step_number,delay_amount,delay_unit,delay_days,template_subject,template_body,payload
       FROM sequence_steps WHERE sequence_version_id=$1::uuid ORDER BY step_number LIMIT 1`, [version.rows[0].id],
    );
    if (!firstStep.rows.length) throw Object.assign(new Error('Save at least one email step before launching.'), { status: 400 });
    const campaign = projectId ? await client.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(projectId)]) : { rows: [] };
    const launch = await client.query(
      `INSERT INTO sequence_launches(sequence_id,campaign_id,status,payload,audience,enrolled_count,restarted_count,merged_count,launched_at,launched_by_user_id)
       VALUES($1::uuid,$2::uuid,'queued',$3::jsonb,$4::jsonb,0,0,0,NOW(),$5::uuid) RETURNING id`,
      [seq.sqlId, campaign.rows[0]?.id || null, JSON.stringify({ sequenceId: seq._id, ...options }), JSON.stringify(options), options.actor?.userId || null],
    );
    launchId = launch.rows[0].id;
    const step = firstStep.rows[0];
    const scheduledFor = new Date(Date.now() + delayMs(step.delay_amount ?? step.delay_days, step.delay_unit || 'days'));
    const candidatePayload = candidates.map((contact) => ({
      campaign_contact_id: contact.campaignContactId,
      lead_id: contact.leadId,
      campaign_id: contact.campaignId,
      email: contact.email,
      // Recorded per job so the send worker honours the same decision the user
      // made at import; otherwise it re-applies the hold and the job sits pending.
      hold_override: Boolean(contact.holdOverridden),
    }));
    const effectiveFromEmail = options.fromEmail || seq.fromEmail || seq.from_email || null;
    const effectiveFromName = options.fromName || seq.fromName || seq.from_name || null;
    const inserted = await client.query(`
      WITH input AS(
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS candidate(campaign_contact_id uuid,lead_id uuid,campaign_id uuid,email text,hold_override boolean)
      ),new_enrollments AS(
        INSERT INTO sequence_enrollments(campaign_contact_id,sequence_version_id,execution_state,enrolled_at,lead_id,campaign_id,sequence_id,launch_batch_id,current_step_index,next_send_at,frozen,payload)
        SELECT candidate.campaign_contact_id,$2::uuid,'active',NOW(),candidate.lead_id,candidate.campaign_id,$3::uuid,$4::uuid,0,$5,FALSE,'{"source":"runtime_launch"}'::jsonb
        FROM input candidate WHERE NOT EXISTS(
          SELECT 1 FROM sequence_enrollments existing WHERE existing.sequence_id=$3::uuid
            AND existing.campaign_contact_id=candidate.campaign_contact_id AND existing.reset_at IS NULL
            AND (existing.execution_state<>'cancelled' OR EXISTS(SELECT 1 FROM send_jobs sent WHERE sent.enrollment_id=existing.id AND sent.status='sent'))
        ) RETURNING id,campaign_contact_id,lead_id,campaign_id
      )
      INSERT INTO send_jobs(lead_id,campaign_id,enrollment_id,step_index,status,scheduled_for,recipient_email,rendered_subject,rendered_body,immediate_launch,manual_send,idempotency_key,payload)
      SELECT enrollment.lead_id,enrollment.campaign_id,enrollment.id,0,'pending',$5,input.email,$6,$7,FALSE,FALSE,
             $4::text||':'||enrollment.campaign_contact_id::text||':0',
             jsonb_build_object('launchBatchId',$4::text,'sequenceId',$3::text,'holdOverride',COALESCE(input.hold_override,FALSE),'fromEmail',$8::text,'fromName',$9::text)
      FROM new_enrollments enrollment JOIN input ON input.campaign_contact_id=enrollment.campaign_contact_id
      ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING id
    `, [JSON.stringify(candidatePayload), version.rows[0].id, seq.sqlId, launchId, scheduledFor, step.template_subject || '', step.template_body || '', effectiveFromEmail, effectiveFromName]);
    enrolled = inserted.rowCount;
    await client.query(`UPDATE sequence_launches SET enrolled_count=$2,updated_at=NOW() WHERE id=$1::uuid`, [launchId, enrolled]);
    await client.query(`UPDATE sequences SET is_active=TRUE,updated_at=NOW() WHERE id=$1::uuid`, [seq.sqlId]);
    if (options.transactionOptions?.rollbackOnly) await client.query('ROLLBACK'); else await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }

  if (enrolled > 0) {
    const { kickSendQueue } = await import('./sendWorker.js');
    kickSendQueue().catch(() => {});
  }

  return {
    launchBatchId: launchId, launchId, enrolled, enrolledCount: enrolled,
    skippedAlreadySent: preview.alreadySent, skippedInQueue: preview.alreadyInQueue,
    skippedBlocked: preview.blocked, eligible: preview.eligible,
    holdOverridden: preview.holdOverridden, dryRun: Boolean(options.transactionOptions?.rollbackOnly),
  };
}

export async function listLaunchBatches(options = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));
  const params = [];
  let where = `WHERE sl.status<>'historical'`;
  if (options.sequenceId) { params.push(String(options.sequenceId)); where += ` AND (s.id::text=$${params.length} OR s.mongo_sequence_id=$${params.length})`; }
  if (options.campaignId) { params.push(String(options.campaignId)); where += ` AND (sl.campaign_id::text=$${params.length} OR EXISTS(SELECT 1 FROM sequence_enrollments se WHERE se.launch_batch_id=sl.id AND se.campaign_id::text=$${params.length}))`; }
  if (options.launchBatchId) { params.push(String(options.launchBatchId)); where += ` AND sl.id::text=$${params.length}`; }
  const total = await db.query(`SELECT COUNT(*)::int AS count FROM sequence_launches sl JOIN sequences s ON s.id=sl.sequence_id ${where}`, params);
  params.push(limit, (page - 1) * limit);
  const res = await db.query(`
    SELECT sl.id AS "_id",sl.id,sl.status,sl.audience,sl.enrolled_count AS "enrolledCount",sl.restarted_count AS "restartedCount",
           sl.launched_at AS "launchedAt",s.id AS "sequenceId",s.name AS "sequenceName",
           COALESCE(c.name,'Mixed / selected audience') AS "campaignName",
           jsonb_build_object(
             'queued',COUNT(sj.id) FILTER(WHERE sj.status IN('pending','processing','failed')),
             'sent',COUNT(sj.id) FILTER(WHERE sj.status='sent'),
             'failed',COUNT(sj.id) FILTER(WHERE sj.status='failed'),
             'cancelled',COUNT(sj.id) FILTER(WHERE sj.status='cancelled')
           ) AS stats
    FROM sequence_launches sl JOIN sequences s ON s.id=sl.sequence_id LEFT JOIN campaigns c ON c.id=sl.campaign_id
    LEFT JOIN sequence_enrollments se ON se.launch_batch_id=sl.id LEFT JOIN send_jobs sj ON sj.enrollment_id=se.id
    ${where} GROUP BY sl.id,s.id,c.name ORDER BY sl.launched_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return { items: res.rows.map((row) => ({ ...row, audienceLists: row.campaignName ? [row.campaignName] : [] })), total: total.rows[0]?.count || 0, page, pages: Math.ceil((total.rows[0]?.count || 0) / limit) };
}

export async function listLaunchBatchJobs(batchId, options = {}) {
  const params = [batchId];
  let status = '';
  if (options.status) { params.push(options.status); status = `AND sj.status=$2`; }
  const result = await db.query(`
    SELECT sj.id AS "_id",sj.id,sj.status,sj.step_index AS "stepIndex",sj.scheduled_for AS "scheduledFor",sj.sent_at AS "sentAt",
           sj.recipient_email AS "recipientEmail",sj.rendered_subject AS "renderedSubject",sj.error_message AS "errorMessage",
           jsonb_build_object('_id',p.id,'name',p.display_name,'email',sj.recipient_email) AS "leadId",
           -- Why a pending job is not going out. Without this a blocked job just
           -- reads "pending" forever and clicking Send appears to do nothing.
           CASE WHEN sj.status<>'pending' THEN NULL
                WHEN se.reset_at IS NOT NULL OR se.execution_state NOT IN('active','processing') THEN 'enrollment_inactive'
                WHEN sup.endpoint IS NOT NULL THEN 'suppressed'
                WHEN NOT COALESCE((sj.payload->>'holdOverride')::boolean,FALSE)
                     AND COALESCE(cc.outreach_focus_state,'pending') NOT IN('pending','active_manual') THEN 'campaign_focus_hold'
                WHEN sj.scheduled_for IS NOT NULL AND sj.scheduled_for>NOW() THEN 'not_due_yet'
                WHEN COALESCE(sj.manual_send,FALSE) THEN 'awaiting_manual_release'
                ELSE NULL END AS "blockedReason"
    FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id JOIN people p ON p.id=se.lead_id
    JOIN campaign_contacts cc ON cc.id=se.campaign_contact_id
    LEFT JOIN LATERAL(SELECT endpoint FROM endpoint_suppressions WHERE LOWER(endpoint)=LOWER(sj.recipient_email) LIMIT 1) sup ON TRUE
    WHERE se.launch_batch_id=$1::uuid ${status} ORDER BY sj.created_at,sj.step_index`, params,
  );
  return { items: result.rows, total: result.rowCount };
}

export async function removeLaunchBatchJobs(batchId, options = {}) {
  const ids = idList(options.jobIds);
  const result = await db.query(
    `UPDATE send_jobs sj SET status='cancelled',error_message='Removed from Outbox by user',updated_at=NOW()
     WHERE sj.enrollment_id IN(SELECT id FROM sequence_enrollments WHERE launch_batch_id=$1::uuid)
       AND sj.status IN('pending','failed') AND ($2::boolean OR sj.id::text=ANY($3::text[])) RETURNING sj.id`,
    [batchId, options.all === true, ids],
  );
  return { removed: result.rowCount };
}

export async function sendLaunchBatchJobs(batchId, options = {}) {
  const maxCount = Math.min(1000, Math.max(1, Number(options.maxCount) || 1000));
  const jobs = await db.query(
    `WITH selected AS(SELECT sj.id FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id
       WHERE se.launch_batch_id=$1::uuid AND sj.status IN('pending','failed') ORDER BY sj.created_at LIMIT $2)
     UPDATE send_jobs sj SET status='pending',manual_send=FALSE,error_message='',updated_at=NOW()
     FROM selected WHERE sj.id=selected.id RETURNING sj.id`, [batchId, maxCount],
  );
  if (jobs.rowCount) await db.query(`UPDATE sequence_launches SET status='active',updated_at=NOW() WHERE id=$1::uuid`, [batchId]);
  if (jobs.rowCount) { const { kickSendQueue } = await import('./sendWorker.js'); kickSendQueue({ force: true }).catch(() => {}); }

  // Releasing a job is not the same as it being sendable — the worker applies its
  // own guards. Report the difference instead of claiming success for jobs that
  // will silently sit pending forever.
  const blocked = await db.query(`
    SELECT COUNT(*)::int AS n FROM send_jobs sj
    JOIN sequence_enrollments se ON se.id=sj.enrollment_id
    JOIN campaign_contacts cc ON cc.id=se.campaign_contact_id
    WHERE se.launch_batch_id=$1::uuid AND sj.status='pending'
      AND (se.reset_at IS NOT NULL OR se.execution_state NOT IN('active','processing')
        OR (NOT COALESCE((sj.payload->>'holdOverride')::boolean,FALSE)
            AND COALESCE(cc.outreach_focus_state,'pending') NOT IN('pending','active_manual')))`, [batchId]);
  const blockedCount = blocked.rows[0]?.n || 0;
  const sendable = Math.max(0, jobs.rowCount - blockedCount);

  let message;
  if (!jobs.rowCount) message = 'Nothing left to send.';
  else if (!blockedCount) message = `${jobs.rowCount} email(s) released to the safe send worker.`;
  else if (!sendable) message = `None of these can send: ${blockedCount} held (recipient replied, paused, or enrollment inactive). Re-import and select them to send anyway.`;
  else message = `${sendable} email(s) released. ${blockedCount} held (recipient replied, paused, or enrollment inactive) and will not send.`;

  return { started: sendable > 0, running: sendable > 0, queued: sendable, remaining: sendable, blocked: blockedCount, message };
}

export async function getLaunchBatchSendProgress(batchId) {
  const { getHourlySendCount, getMsUntilHourlyLimitResumes } = await import('./sendWorker.js');
  const hourlySent = await getHourlySendCount();
  const hourlyCap = Number(process.env.MAILBOX_HOURLY_CAP) || 199;
  const rateLimited = hourlySent >= hourlyCap;
  const resumesInMs = rateLimited ? await getMsUntilHourlyLimitResumes() : 0;

  const result = await db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE sj.status='sent')::int AS sent,
    COUNT(*) FILTER(WHERE sj.status IN('pending','processing'))::int AS pending,COUNT(*) FILTER(WHERE sj.status='failed')::int AS failed,
    COUNT(*) FILTER(WHERE sj.status='processing')::int AS processing,
    COUNT(*) FILTER(WHERE sj.status='pending' AND COALESCE(sj.manual_send,FALSE)=FALSE AND COALESCE(sj.scheduled_for,NOW())<=NOW())::int AS due
    FROM send_jobs sj JOIN sequence_enrollments se ON se.id=sj.enrollment_id WHERE se.launch_batch_id=$1::uuid`, [batchId]);
  const row = result.rows[0];

  const infoRes = await db.query(
    `SELECT sl.id, sl.launched_at AS "launchedAt", s.name AS "sequenceName", COALESCE(c.name, 'Mixed Audience') AS "campaignName", c.id AS "campaignId"
     FROM sequence_launches sl
     JOIN sequences s ON s.id = sl.sequence_id
     LEFT JOIN campaigns c ON c.id = sl.campaign_id
     WHERE sl.id::text = $1::text LIMIT 1`,
    [batchId]
  );
  const info = infoRes.rows[0] || null;

  return {
    ...row,
    running: Number(row.processing) > 0 || Number(row.due) > 0,
    hourlySent,
    hourlyCap,
    rateLimited,
    resumesInMs,
    info,
    lastError: null,
  };
}

export async function sendCampaignQueueJobs(campaignId, options = {}) {
  const campaign = await db.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(campaignId)]);
  if (!campaign.rows.length) throw Object.assign(new Error('Campaign not found.'), { status: 404 });
  const maxCount = Math.min(1000, Math.max(1, Number(options.maxCount) || 1000));
  const result = await db.query(`WITH selected AS(SELECT id FROM send_jobs WHERE campaign_id=$1::uuid AND status IN('pending','failed') ORDER BY created_at LIMIT $2)
    UPDATE send_jobs sj SET status='pending',manual_send=FALSE,error_message='',updated_at=NOW() FROM selected WHERE sj.id=selected.id RETURNING sj.id`, [campaign.rows[0].id, maxCount]);
  if (result.rowCount) { const { kickSendQueue } = await import('./sendWorker.js'); kickSendQueue().catch(() => {}); }
  return { sent: 0, queued: result.rowCount, started: result.rowCount > 0 };
}

export async function resetSequenceEnrollments(sequenceId, leadIds = []) {
  const sequenceSqlId = await resolveSequenceSqlId(sequenceId);
  if (!sequenceSqlId) throw Object.assign(new Error('Sequence not found.'), { status: 404 });
  const ids = idList(leadIds);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE sequence_enrollments SET reset_at=NOW(),execution_state='cancelled',stop_reason='manual resend reset',updated_at=NOW()
      WHERE sequence_id=$1::uuid AND reset_at IS NULL AND (CARDINALITY($2::text[])=0 OR lead_id::text=ANY($2::text[])) RETURNING id`, [sequenceSqlId, ids]);
    const enrollmentIds = result.rows.map((row) => row.id);
    if (enrollmentIds.length) await client.query(
      `UPDATE send_jobs SET status='cancelled',error_message='Enrollment reset for deliberate resend',updated_at=NOW()
       WHERE enrollment_id=ANY($1::uuid[]) AND status IN('pending','failed','processing')`, [enrollmentIds],
    );
    await client.query('COMMIT');
    return { reset: result.rowCount, resetCount: result.rowCount };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function listCampaignQueueJobs(campaignId, options = {}) {
  const campaign = await db.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(campaignId)]);
  if (!campaign.rows.length) return [];
  const params = [campaign.rows[0].id];
  let filter = '';
  if (options.status) { params.push(options.status); filter = `AND sj.status=$2`; }
  return (await db.query(`SELECT sj.id AS "_id",sj.*,p.display_name AS "leadName" FROM send_jobs sj LEFT JOIN people p ON p.id=sj.lead_id
    WHERE sj.campaign_id=$1::uuid ${filter} ORDER BY sj.created_at DESC`, params)).rows;
}

export async function removeSendJob(jobId) {
  const result = await db.query(`UPDATE send_jobs SET status='cancelled',error_message='Removed by user',updated_at=NOW() WHERE id=$1::uuid AND status IN('pending','failed') RETURNING id`, [jobId]);
  return { removed: result.rowCount > 0 };
}

export async function removeCampaignQueueJobs(campaignId, options = {}) {
  const campaign = await db.query(`SELECT id FROM campaigns WHERE id::text=$1 OR mongo_campaign_id=$1 LIMIT 1`, [String(campaignId)]);
  if (!campaign.rows.length) return { removed: 0 };
  const ids = idList(options.jobIds);
  const result = await db.query(`UPDATE send_jobs SET status='cancelled',error_message='Removed by user',updated_at=NOW()
    WHERE campaign_id=$1::uuid AND status IN('pending','failed') AND ($2::boolean OR id::text=ANY($3::text[])) RETURNING id`, [campaign.rows[0].id, options.all === true, ids]);
  return { removed: result.rowCount };
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

export async function cleanupOrphanedSequenceStates() {
  try {
    await db.query(`
      DELETE FROM send_jobs
      WHERE enrollment_id IS NOT NULL
        AND (
          enrollment_id NOT IN (SELECT id FROM sequence_enrollments)
          OR enrollment_id IN (
            SELECT id FROM sequence_enrollments
            WHERE sequence_id IS NOT NULL AND sequence_id NOT IN (SELECT id FROM sequences)
          )
        )
    `);

    await db.query(`
      DELETE FROM sequence_enrollments
      WHERE sequence_id IS NOT NULL
        AND sequence_id NOT IN (SELECT id FROM sequences)
    `);

    await db.query(`
      UPDATE campaign_contacts cc
      SET outreach_focus_state = 'pending',
          delivery_state = CASE WHEN cc.delivery_state = 'Emailed Outbound' THEN NULL ELSE cc.delivery_state END
      WHERE (cc.outreach_focus_state NOT IN ('pending', 'active_manual') OR cc.delivery_state = 'Emailed Outbound')
        AND NOT EXISTS (
          SELECT 1 FROM sequence_enrollments se
          WHERE se.campaign_contact_id = cc.id AND se.reset_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM messages m
          JOIN conversations conv ON conv.id = m.conversation_id
          WHERE conv.campaign_contact_id = cc.id AND m.direction = 'outbound'
        )
    `);

    await db.query(`
      UPDATE send_jobs
      SET manual_send = FALSE
      WHERE status = 'pending' AND manual_send = TRUE
    `);
  } catch (err) {
    console.warn('[CRM] Orphan sequence state cleanup warning:', err.message);
  }
}
