import db from '../db/index.js';
import { unwrapBson } from '../utils/bsonUnwrap.js';
import { getMailConfigStatus } from './mailTransport.js';

export function buildStepPerformance(sentRows = [], replyRows = [], maxSteps = 5) {
  const sentMap = new Map(sentRows.map((row) => [Number(row._id), Number(row.count) || 0]));
  const repliesMap = new Map(replyRows.map((row) => [Number(row._id), Number(row.count) || 0]));

  return Array.from({ length: maxSteps }, (_, stepIndex) => {
    const sent = sentMap.get(stepIndex) || 0;
    const replies = repliesMap.get(stepIndex) || 0;
    return {
      step: stepIndex + 1,
      sent,
      replies,
      rate: sent ? (replies / sent) * 100 : 0,
    };
  });
}

export function getCrmAdminStatus() {
  const mail = getMailConfigStatus();
  return {
    mongodbReady: false,
    postgresReady: true,
    smtpReady: mail.smtpReady,
    imapReady: mail.imapReady,
    openAiReady: Boolean(process.env.OPENAI_API_KEY),
    queueBackend: 'postgresql',
    mailboxDailyCap: Number(process.env.MAILBOX_DAILY_CAP) || 150,
  };
}

const EMAILED_STATUSES = ['Emailed Outbound', 'Replied', 'Bounced / Invalid'];
const CAMPAIGN_STATUSES = ['Active Planning', 'Active Campaigning', 'Completed', 'Archived'];
const AUTO_LOCKED_STATUSES = ['Completed', 'Archived'];

function contactResponseCte(campaignExpression = 'NULL::uuid') {
  return `
  WITH canonical_inbound_events AS (
    SELECT DISTINCT m.id AS event_id,
           COALESCE(participant_method.person_id, campaign_role.person_id) AS person_id,
           COALESCE(m.channel, 'email') AS channel,
           m.occurred_at,
           COALESCE(c.campaign_id, campaign_account.campaign_id) AS campaign_id
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = c.campaign_contact_id
    LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
    LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
    LEFT JOIN conversation_participants participant ON participant.conversation_id = c.id
    LEFT JOIN person_contact_methods participant_method ON participant_method.id = participant.person_contact_method_id
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
  ),
  response_events AS (
    SELECT event_id, person_id, channel, occurred_at, campaign_id
    FROM canonical_inbound_events
    WHERE person_id IS NOT NULL
    UNION ALL
    SELECT i.id, i.person_id, i.channel, i.occurred_at, interaction_account.campaign_id
    FROM interactions i
    LEFT JOIN person_organization_roles interaction_role ON interaction_role.person_id = i.person_id
      AND (i.organization_id IS NULL OR interaction_role.organization_id = i.organization_id)
    LEFT JOIN campaign_contacts interaction_contact ON interaction_contact.role_id = interaction_role.id
    LEFT JOIN campaign_accounts interaction_account ON interaction_account.id = interaction_contact.campaign_account_id
    WHERE i.person_id IS NOT NULL
      AND i.deleted_at IS NULL
      AND LOWER(COALESCE(i.direction, '')) IN ('inbound', 'incoming', 'contact_to_egs')
  ),
  response_summary AS (
    SELECT person_id,
           MIN(occurred_at) AS responded_at,
           MAX(occurred_at) AS last_responded_at,
           ARRAY_AGG(DISTINCT channel ORDER BY channel) AS response_channels
    FROM response_events
    WHERE (${campaignExpression} IS NULL OR campaign_id = ${campaignExpression})
    GROUP BY person_id
  )
`;
}

export async function deriveAutoCampaignStatus(projectId) {
  try {
    const qRes = await db.query(
      `SELECT COUNT(*) FROM sequence_enrollments WHERE (mongo_campaign_id = $1 OR campaign_contact_id IN (
         SELECT cc.id FROM campaign_contacts cc JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id WHERE ca.campaign_id::text = $1::text
       )) AND execution_state = 'active'`,
      [String(projectId)]
    );
    const activeQueues = Number(qRes.rows[0]?.count) || 0;

    const eRes = await db.query(
      `SELECT COUNT(*) FROM campaign_contacts cc JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
       WHERE ca.campaign_id::text = $1::text AND cc.lead_state = ANY($2::text[])`,
      [String(projectId), EMAILED_STATUSES]
    );
    const emailedCount = Number(eRes.rows[0]?.count) || 0;

    if (activeQueues > 0 || emailedCount > 0) {
      return 'Active Campaigning';
    }
  } catch (err) {}
  return 'Active Planning';
}

export async function syncAutoCampaignStatus(projectId) {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, name AS "projectName", lifecycle AS "milestone", status_source AS "statusSource", payload FROM campaigns WHERE (id::text = $1::text) AND deleted_at IS NULL LIMIT 1`,
      [String(projectId)]
    );
    const project = res.rows[0];
    if (!project || project.statusSource === 'manual') {
      return project || null;
    }

    const currentStatus = project.milestone || project.payload?.status || 'Active Planning';
    if (AUTO_LOCKED_STATUSES.includes(currentStatus)) {
      return project;
    }

    const nextStatus = await deriveAutoCampaignStatus(projectId);
    if (nextStatus !== currentStatus) {
      await db.query(`UPDATE campaigns SET lifecycle = $2, updated_at = NOW() WHERE id::text = $1::text`, [String(projectId), nextStatus]);
      project.milestone = nextStatus;
      project.status = nextStatus;
    }
    return project;
  } catch (err) {
    return null;
  }
}

export async function listProjects({ summary = false } = {}) {
  try {
    const res = await db.query(
      `WITH campaign_reply_people AS (
         SELECT DISTINCT COALESCE(conv.campaign_id, ca.campaign_id) AS campaign_id,
                COALESCE(participant_method.person_id, campaign_role.person_id) AS person_id
         FROM messages m
         JOIN conversations conv ON conv.id = m.conversation_id
         LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
         LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
         LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = cc.role_id
         LEFT JOIN conversation_participants participant ON participant.conversation_id = conv.id
         LEFT JOIN person_contact_methods participant_method ON participant_method.id = participant.person_contact_method_id
         WHERE m.direction = 'inbound'
           AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
       ), campaign_coverage AS (
         SELECT campaign.id AS campaign_id,
                COUNT(DISTINCT account.organization_id)::int AS target_companies,
                COUNT(DISTINCT contact.role_id) FILTER (
                  WHERE contact.role_id IS NOT NULL AND contact_person.archived_at IS NULL
                )::int AS pocs_found,
                COUNT(DISTINCT contact.role_id) FILTER (
                  WHERE contact_person.archived_at IS NULL AND (
                    contact.delivery_state IN ('Emailed Outbound', 'Replied', 'Bounced / Invalid')
                    OR contact.lead_state IN ('Emailed Outbound', 'Replied', 'Bounced / Invalid')
                  )
                )::int AS pocs_emailed,
                COUNT(DISTINCT reply_people.person_id) FILTER (
                  WHERE reply_people.person_id IS NOT NULL AND reply_person.archived_at IS NULL
                )::int AS pocs_responded,
                COUNT(DISTINCT reply_role.organization_id) FILTER (
                  WHERE reply_people.person_id IS NOT NULL AND reply_person.archived_at IS NULL
                )::int AS companies_responded
         FROM campaigns campaign
         LEFT JOIN campaign_accounts account ON account.campaign_id = campaign.id
         LEFT JOIN campaign_contacts contact ON contact.campaign_account_id = account.id
         LEFT JOIN person_organization_roles contact_role ON contact_role.id = contact.role_id
         LEFT JOIN people contact_person ON contact_person.id = contact_role.person_id
         LEFT JOIN campaign_reply_people reply_people ON reply_people.campaign_id = campaign.id
         LEFT JOIN people reply_person ON reply_person.id = reply_people.person_id
         LEFT JOIN person_organization_roles reply_role ON reply_role.person_id = reply_people.person_id
           AND reply_role.organization_id = account.organization_id
         GROUP BY campaign.id
       )
       SELECT campaign.id AS "_id", campaign.id, campaign.mongo_campaign_id,
              campaign.name AS "projectName", campaign.lifecycle AS "milestone",
              campaign.created_at AS "createdAt", campaign.payload,
              coverage.target_companies AS "targetCompaniesCount",
              coverage.pocs_found AS "pocsFound",
              coverage.pocs_emailed AS "pocsEmailed",
              coverage.pocs_responded AS "pocsResponded",
              coverage.companies_responded AS "companiesRespondedCount"
       FROM campaigns campaign
       LEFT JOIN campaign_coverage coverage ON coverage.campaign_id = campaign.id
       WHERE campaign.deleted_at IS NULL
       ORDER BY campaign.created_at DESC`
    );
    return res.rows.map((row) => {
      const p = unwrapBson(row.payload || {});
      const cid = row.mongo_campaign_id || String(row.id);
      return {
        ...p,
        _id: cid,
        id: cid,
        projectName: row.projectName || p.projectName || p.name || 'Unnamed Project',
        milestone: row.milestone || p.status || p.milestone || 'Active Planning',
        status: row.milestone || p.status || 'Active Planning',
        createdAt: row.createdAt,
        targetCompaniesCount: Number(row.targetCompaniesCount) || 0,
        companiesWithPocsFound: Number(row.pocsFound) || 0,
        pocsFound: Number(row.pocsFound) || 0,
        pocsEmailed: Number(row.pocsEmailed) || 0,
        pocsResponded: Number(row.pocsResponded) || 0,
        companiesRespondedCount: Number(row.companiesRespondedCount) || 0,
        stats: {
          targetExhibitorsCount: Number(row.targetCompaniesCount) || 0,
          exhibitorsWithPocCount: Number(row.pocsFound) || 0,
          totalPocsFoundCount: Number(row.pocsFound) || 0,
          emailedCount: Number(row.pocsEmailed) || 0,
          respondedCount: Number(row.pocsResponded) || 0,
          companiesReachedCount: Number(row.companiesRespondedCount) || 0,
          activeQueueCount: Number(p.stats?.activeQueueCount) || 0,
        },
      };
    });
  } catch (err) {
    console.error('Error fetching campaigns from PostgreSQL:', err.message);
    return [];
  }
}

export async function getProject(id) {
  try {
    await syncAutoCampaignStatus(id);
    const res = await db.query(
      `SELECT id AS "_id", id, name AS "projectName", lifecycle AS "milestone", created_at AS "createdAt", payload
       FROM campaigns
       WHERE (id::text = $1::text OR mongo_campaign_id = $1) AND deleted_at IS NULL LIMIT 1`,
      [String(id)]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const p = unwrapBson(row.payload || {});
      const cid = row._id;
      const metrics = await recalculateCampaignCoverageStats(row.id);
      return {
        ...p,
        _id: cid,
        id: cid,
        projectName: row.projectName || p.projectName || p.name || 'Unnamed Project',
        milestone: row.milestone || p.status || 'Active Planning',
        status: row.milestone || p.status || 'Active Planning',
        createdAt: row.createdAt,
        targetCompaniesCount: Number(metrics?.targetCompaniesCount) || 0,
        companiesWithPocsFound: Number(metrics?.pocsFound) || 0,
        pocsFound: Number(metrics?.pocsFound) || 0,
        pocsResponded: Number(metrics?.pocsResponded) || 0,
        companiesRespondedCount: Number(metrics?.companiesRespondedCount) || 0,
      };
    }
  } catch (err) {}

  const error = new Error('Project not found.');
  error.status = 404;
  throw error;
}

export async function recalculateCampaignCoverageStats(projectId) {
  const campaign = await db.query(
    `SELECT id FROM campaigns WHERE id::text = $1::text OR mongo_campaign_id = $1 LIMIT 1`,
    [String(projectId)]
  );
  if (!campaign.rows[0]) return null;
  const campaignId = campaign.rows[0].id;
  const metrics = await db.query(
    `WITH reply_people AS (
       SELECT DISTINCT COALESCE(participant_method.person_id, campaign_role.person_id) AS person_id
       FROM messages m
       JOIN conversations conv ON conv.id = m.conversation_id
       LEFT JOIN campaign_contacts linked_contact ON linked_contact.id = conv.campaign_contact_id
       LEFT JOIN campaign_accounts linked_account ON linked_account.id = linked_contact.campaign_account_id
       LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = linked_contact.role_id
       LEFT JOIN conversation_participants participant ON participant.conversation_id = conv.id
       LEFT JOIN person_contact_methods participant_method ON participant_method.id = participant.person_contact_method_id
       WHERE m.direction = 'inbound'
         AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
         AND COALESCE(conv.campaign_id, linked_account.campaign_id) = $1::uuid
     )
     SELECT COUNT(DISTINCT account.organization_id)::int AS "targetCompaniesCount",
            COUNT(DISTINCT contact.role_id) FILTER (
              WHERE contact.role_id IS NOT NULL AND contact_person.archived_at IS NULL
            )::int AS "pocsFound",
            COUNT(DISTINCT reply_people.person_id) FILTER (
              WHERE reply_people.person_id IS NOT NULL AND reply_person.archived_at IS NULL
            )::int AS "pocsResponded",
            COUNT(DISTINCT reply_role.organization_id) FILTER (
              WHERE reply_people.person_id IS NOT NULL AND reply_person.archived_at IS NULL
            )::int AS "companiesRespondedCount"
     FROM campaign_accounts account
     LEFT JOIN campaign_contacts contact ON contact.campaign_account_id = account.id
     LEFT JOIN person_organization_roles contact_role ON contact_role.id = contact.role_id
     LEFT JOIN people contact_person ON contact_person.id = contact_role.person_id
     LEFT JOIN reply_people ON TRUE
     LEFT JOIN people reply_person ON reply_person.id = reply_people.person_id
     LEFT JOIN person_organization_roles reply_role ON reply_role.person_id = reply_people.person_id
       AND reply_role.organization_id = account.organization_id
     WHERE account.campaign_id = $1::uuid`,
    [campaignId]
  );
  const result = metrics.rows[0];
  await db.query(
    `UPDATE campaigns
     SET target_companies_count = $2, companies_with_pocs = $3,
         companies_responded = $4, updated_at = NOW()
     WHERE id = $1::uuid`,
    [campaignId, result.targetCompaniesCount, result.pocsFound, result.companiesRespondedCount]
  );
  return { campaignId, ...result };
}

export async function recalculateAllCampaignCoverageStats() {
  const campaigns = await db.query(`SELECT id FROM campaigns WHERE deleted_at IS NULL ORDER BY id`);
  const results = [];
  for (const campaign of campaigns.rows) {
    results.push(await recalculateCampaignCoverageStats(campaign.id));
  }
  return { updated: results.length, results };
}

export async function createProject(payload) {
  const { projectName, milestone } = payload;
  if (!projectName?.trim()) {
    const error = new Error('Project name is required.');
    error.status = 400;
    throw error;
  }

  const name = projectName.trim();
  const status = milestone || 'Active Planning';

  const res = await db.query(
    `INSERT INTO campaigns (name, lifecycle, payload)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id AS "_id", id, name AS "projectName", lifecycle AS "milestone", created_at AS "createdAt"`,
    [name, status, JSON.stringify({ projectName: name, milestone: status, ...payload })]
  );

  const row = res.rows[0];
  return {
    ...row,
    status: row.milestone,
  };
}

export async function updateProject(id, payload) {
  const existing = await getProject(id);
  const projectName = payload.projectName ? payload.projectName.trim() : existing.projectName;
  const milestone = payload.milestone ? payload.milestone.trim() : existing.milestone;

  const res = await db.query(
    `UPDATE campaigns SET
       name = $2,
       lifecycle = $3,
       payload = $4::jsonb,
       updated_at = NOW()
     WHERE (id::text = $1::text OR mongo_campaign_id = $1)
     RETURNING id AS "_id", id, name AS "projectName", lifecycle AS "milestone", created_at AS "createdAt"`,
    [String(id), projectName, milestone, JSON.stringify({ ...existing, ...payload, projectName, milestone })]
  );

  if (!res.rows[0]) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const row = res.rows[0];
  return {
    ...row,
    status: row.milestone,
  };
}

export async function deleteProject(id, actor = {}) {
  const res = await db.query(
    `UPDATE campaigns SET deleted_at = NOW(), deleted_by = $2 WHERE (id::text = $1::text OR mongo_campaign_id = $1) RETURNING id`,
    [String(id), String(actor?.username || actor?.displayName || 'admin')]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreProject(id, actor = {}) {
  const res = await db.query(
    `UPDATE campaigns SET deleted_at = NULL, deleted_by = NULL WHERE (id::text = $1::text OR mongo_campaign_id = $1) RETURNING id`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

export async function deleteProjects(ids = [], actor = {}) {
  const cleanIds = (Array.isArray(ids) ? ids : []).map(String);
  if (!cleanIds.length) return { deleted: 0, failed: 0, results: [] };

  const res = await db.query(
    `UPDATE campaigns SET deleted_at = NOW(), deleted_by = $2 WHERE id::text = ANY($1::text[]) OR mongo_campaign_id = ANY($1::text[]) RETURNING id`,
    [cleanIds, String(actor?.username || actor?.displayName || 'admin')]
  );

  return {
    deleted: res.rowCount,
    failed: cleanIds.length - res.rowCount,
    results: cleanIds.map((id) => ({ id, ok: true })),
  };
}

export async function listAllCompanies(options = {}) {
  const { search, campaignId, page = 1, limit = 50 } = options;
  let resolvedCampaignId = null;
  if (campaignId) {
    const campaign = await db.query(
      `SELECT id FROM campaigns WHERE id::text = $1::text OR mongo_campaign_id = $1 LIMIT 1`,
      [String(campaignId)]
    );
    resolvedCampaignId = campaign.rows[0]?.id || null;
    if (!resolvedCampaignId) {
      return { companies: [], items: [], total: 0, page: 1, limit: Number(limit) || 50, totalPages: 1 };
    }
  }
  const params = [resolvedCampaignId];
  const conditions = ['o.archived_at IS NULL'];

  if (resolvedCampaignId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM campaign_accounts scoped_account
      WHERE scoped_account.organization_id = o.id AND scoped_account.campaign_id = $1::uuid
    )`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.canonical_name ILIKE $${params.length} OR o.trading_name ILIKE $${params.length})`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const whereClause = conditions.join(' AND ');

  try {
    const sql = `
      SELECT o.id AS "_id", o.id, o.canonical_name AS "companyName",
             oi.normalized_value AS "domain", l.geography AS "city", o.created_at AS "createdAt",
             (
               SELECT COUNT(DISTINCT por.id)
               FROM person_organization_roles por
               LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
               LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
               WHERE por.organization_id = o.id
                 AND ($1::uuid IS NULL OR ca.campaign_id = $1::uuid)
             ) AS "pocCount"
      FROM organizations o
      LEFT JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
      LEFT JOIN locations l ON l.organization_id = o.id
      WHERE ${whereClause}
      ORDER BY o.canonical_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*) FROM organizations o WHERE ($1::uuid IS NULL OR $1::uuid IS NOT NULL) AND ${whereClause}`;

    const [res, countRes] = await Promise.all([
      db.query(sql, [...params, limitNum, offset]),
      db.query(countSql, params),
    ]);

    const total = parseInt(countRes.rows[0]?.count || 0, 10);
    return {
      companies: res.rows,
      items: res.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } catch (err) {
    return { companies: [], items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 1 };
  }
}

export async function listProjectCompanies(projectId, options = {}) {
  return listAllCompanies({ ...options, campaignId: projectId });
}

export async function getCompanyDetails(id) {
  try {
    const res = await db.query(
      `SELECT o.id AS "_id", o.id, o.canonical_name AS "companyName",
              oi.normalized_value AS "domain", l.geography AS "city", o.created_at AS "createdAt"
       FROM organizations o
       LEFT JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
       LEFT JOIN locations l ON l.organization_id = o.id
       WHERE (o.id::text = $1::text) AND o.archived_at IS NULL LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Company not found.');
      error.status = 404;
      throw error;
    }
    return res.rows[0];
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }
}

export async function createCompany(payload) {
  if (!payload.companyName?.trim()) {
    const error = new Error('Company name is required.');
    error.status = 400;
    throw error;
  }

  const name = payload.companyName.trim();
  const res = await db.query(
    `INSERT INTO organizations (canonical_name, trading_name)
     VALUES ($1, $1)
     RETURNING id AS "_id", id, canonical_name AS "companyName", created_at AS "createdAt"`,
    [name]
  );
  return res.rows[0];
}

export async function updateCompanyDetails(id, payload) {
  const existing = await getCompanyDetails(id);
  const companyName = payload.companyName ? payload.companyName.trim() : existing.companyName;

  const res = await db.query(
    `UPDATE organizations SET canonical_name = $2, updated_at = NOW()
     WHERE (id::text = $1::text) AND archived_at IS NULL
     RETURNING id AS "_id", id, canonical_name AS "companyName", created_at AS "createdAt"`,
    [String(id), companyName]
  );
  return res.rows[0];
}

export async function deleteCompany(id, actor = {}) {
  const res = await db.query(
    `UPDATE organizations SET archived_at = NOW() WHERE (id::text = $1::text) RETURNING id`,
    [String(id)]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreCompany(id, actor = {}) {
  const res = await db.query(
    `UPDATE organizations SET archived_at = NULL WHERE (id::text = $1::text) RETURNING id`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

export async function deleteCompanies(ids = [], actor = {}) {
  const cleanIds = (Array.isArray(ids) ? ids : []).map(String);
  if (!cleanIds.length) return { deleted: 0, failed: 0, results: [] };

  const res = await db.query(
    `UPDATE organizations SET archived_at = NOW() WHERE id::text = ANY($1::text[]) RETURNING id`,
    [cleanIds]
  );
  return { deleted: res.rowCount, failed: cleanIds.length - res.rowCount, results: cleanIds.map((id) => ({ id, ok: true })) };
}

export async function listAllLeads(options = {}) {
  const {
    search, rightPocOnly, keyRelationshipOnly, respondedOnly, deliveryStatus,
    campaignId, pocStatus, page = 1, limit = 50,
  } = options;
  let resolvedCampaignId = null;
  if (campaignId) {
    const campaign = await db.query(
      `SELECT id FROM campaigns WHERE id::text = $1::text OR mongo_campaign_id = $1 LIMIT 1`,
      [String(campaignId)]
    );
    resolvedCampaignId = campaign.rows[0]?.id || null;
    if (!resolvedCampaignId) {
      return { leads: [], items: [], total: 0, page: 1, limit: Number(limit) || 50, totalPages: 1 };
    }
  }
  const params = [resolvedCampaignId];
  const conditions = ['p.archived_at IS NULL'];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.display_name ILIKE $${params.length} OR pcm.normalized_value ILIKE $${params.length})`);
  }

  if (rightPocOnly === true || rightPocOnly === '1' || rightPocOnly === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM poc_suitabilities right_poc
      WHERE right_poc.role_id = por.id AND right_poc.assessment = 'suitable'
    )`);
  }

  if (keyRelationshipOnly === true || keyRelationshipOnly === '1' || keyRelationshipOnly === 'true') {
    conditions.push(`EXISTS (
      SELECT 1 FROM key_relationship_profiles confirmed_relationship
      WHERE confirmed_relationship.role_id = por.id
        AND confirmed_relationship.manually_confirmed = TRUE
    )`);
  }

  if (respondedOnly === true || respondedOnly === '1' || respondedOnly === 'true') {
    conditions.push('response.person_id IS NOT NULL');
  }

  if (deliveryStatus) {
    params.push(String(deliveryStatus));
    conditions.push(`CASE
      WHEN response.person_id IS NOT NULL THEN 'Replied'
      ELSE COALESCE(campaign_state.delivery_state, campaign_state.lead_state, 'Pending Inqueue')
    END = $${params.length}`);
  }

  if (resolvedCampaignId) {
    conditions.push(`(
      EXISTS (
        SELECT 1
        FROM campaign_contacts scoped_contact
        JOIN campaign_accounts scoped_account ON scoped_account.id = scoped_contact.campaign_account_id
        WHERE scoped_contact.role_id = por.id AND scoped_account.campaign_id = $1::uuid
      )
      OR response.person_id IS NOT NULL
    )`);
  }

  if (pocStatus) {
    const assessmentByLegacyStatus = {
      Confirmed: 'suitable',
      Unverified: 'unknown',
      WrongContact: 'unsuitable',
      RedirectedWithReferral: 'redirected_with_referral',
      RedirectedNoReferral: 'redirected_without_referral',
    };
    params.push(assessmentByLegacyStatus[pocStatus] || String(pocStatus));
    conditions.push(`EXISTS (
      SELECT 1 FROM poc_suitabilities filtered_poc
      WHERE filtered_poc.role_id = por.id AND filtered_poc.assessment = $${params.length}
    )`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const whereClause = conditions.join(' AND ');

  try {
    const sql = `
      ${contactResponseCte('$1::uuid')}
      SELECT p.id AS "_id", p.id, p.display_name AS "name", por.title AS "designation",
             pcm.normalized_value AS "email", o.canonical_name AS "companyName", o.id AS "companyId",
             p.created_at AS "createdAt",
             CASE WHEN response.person_id IS NOT NULL THEN TRUE ELSE FALSE END AS "hasResponded",
             response.responded_at AS "respondedAt", response.responded_at AS "repliedAt",
             response.last_responded_at AS "lastRespondedAt",
             COALESCE(response.response_channels, ARRAY[]::text[]) AS "responseChannels",
             CASE WHEN response.person_id IS NOT NULL THEN 'lead' ELSE 'contact' END AS "leadStage",
             CASE WHEN response.person_id IS NOT NULL THEN 'Replied'
                  ELSE COALESCE(campaign_state.delivery_state, campaign_state.lead_state, 'Pending Inqueue')
             END AS "deliveryStatus",
             campaign_state.outcome, campaign_state.campaign_id AS "campaignId",
             campaign_state.campaign_name AS "campaignName",
             ps.assessment AS "pocAssessment", ps.reason AS "pocNotes", ps.assessed_at AS "pocAssessedAt",
             kr.standing AS "relationshipStatus", kr.manually_confirmed AS "relationshipConfirmed",
             kr.owner_name AS "relationshipOwner", kr.service_categories AS "relationshipServiceCategories",
             kr.next_follow_up_at AS "relationshipNextFollowUpAt", kr.reminder_notes AS "relationshipReminderNotes"
      FROM people p
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN organizations o ON por.organization_id = o.id
      LEFT JOIN response_summary response ON response.person_id = p.id
      LEFT JOIN LATERAL (
        SELECT normalized_value
        FROM person_contact_methods
        WHERE person_id = p.id AND type = 'email'
        ORDER BY preferred DESC NULLS LAST, created_at
        LIMIT 1
      ) pcm ON TRUE
      LEFT JOIN LATERAL (
        SELECT assessment, reason, assessed_at
        FROM poc_suitabilities
        WHERE role_id = por.id
        ORDER BY assessed_at DESC NULLS LAST
        LIMIT 1
      ) ps ON TRUE
      LEFT JOIN LATERAL (
        SELECT standing, manually_confirmed, owner_name, service_categories, next_follow_up_at, reminder_notes
        FROM key_relationship_profiles
        WHERE role_id = por.id
        ORDER BY confirmed_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      ) kr ON TRUE
      LEFT JOIN LATERAL (
        SELECT cc.delivery_state, cc.lead_state, cc.outcome,
               ca.campaign_id, campaign.name AS campaign_name
        FROM campaign_contacts cc
        JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
        JOIN campaigns campaign ON campaign.id = ca.campaign_id
        WHERE cc.role_id = por.id
          AND ($1::uuid IS NULL OR ca.campaign_id = $1::uuid)
        ORDER BY CASE WHEN cc.outcome = 'Replied' OR cc.delivery_state = 'Replied' OR cc.lead_state = 'Replied' THEN 0 ELSE 1 END,
                 cc.created_at DESC NULLS LAST
        LIMIT 1
      ) campaign_state ON TRUE
      WHERE ${whereClause}
      ORDER BY p.display_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `
      ${contactResponseCte('$1::uuid')}
      SELECT COUNT(DISTINCT p.id)
      FROM people p
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN response_summary response ON response.person_id = p.id
      LEFT JOIN LATERAL (
        SELECT normalized_value
        FROM person_contact_methods
        WHERE person_id = p.id AND type = 'email'
        ORDER BY preferred DESC NULLS LAST, created_at
        LIMIT 1
      ) pcm ON TRUE
      LEFT JOIN LATERAL (
        SELECT cc.delivery_state, cc.lead_state, cc.outcome
        FROM campaign_contacts cc
        JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
        WHERE cc.role_id = por.id
          AND ($1::uuid IS NULL OR ca.campaign_id = $1::uuid)
        ORDER BY CASE WHEN cc.outcome = 'Replied' OR cc.delivery_state = 'Replied' OR cc.lead_state = 'Replied' THEN 0 ELSE 1 END,
                 cc.created_at DESC NULLS LAST
        LIMIT 1
      ) campaign_state ON TRUE
      WHERE ${whereClause}
    `;

    const [res, countRes] = await Promise.all([
      db.query(sql, [...params, limitNum, offset]),
      db.query(countSql, params),
    ]);

    const total = parseInt(countRes.rows[0]?.count || 0, 10);
    const statusByAssessment = {
      suitable: 'Confirmed',
      unknown: 'Unverified',
      unsuitable: 'WrongContact',
      redirected_with_referral: 'RedirectedWithReferral',
      redirected_without_referral: 'RedirectedNoReferral',
    };
    const items = res.rows.map((row) => ({
      ...row,
      lastInteractionAt: row.lastRespondedAt || null,
      companyId: row.companyId ? { _id: row.companyId, companyName: row.companyName } : null,
      pocQualification: {
        status: statusByAssessment[row.pocAssessment] || 'Unverified',
        notes: row.pocNotes || '',
        assessedAt: row.pocAssessedAt || null,
      },
      relationshipProfile: {
        status: row.relationshipStatus || 'New',
        manuallyConfirmed: row.relationshipConfirmed === true,
        owner: row.relationshipOwner || '',
        serviceCategories: row.relationshipServiceCategories || [],
        nextFollowUpAt: row.relationshipNextFollowUpAt || null,
        reminderNotes: row.relationshipReminderNotes || '',
      },
      nextFollowUpAt: row.relationshipNextFollowUpAt || null,
    }));
    return {
      leads: items,
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      summary: { total, overdue: 0, upcoming: 0, nurture: 0 },
    };
  } catch (err) {
    console.error('Error listing contacts from PostgreSQL:', err.message);
    return { leads: [], items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 1 };
  }
}

export async function listProjectLeads(projectId, options = {}) {
  return listAllLeads({ ...options, campaignId: projectId });
}

export async function getLeadById(id) {
  try {
    const res = await db.query(
      `${contactResponseCte()}
       SELECT p.id AS "_id", p.id, p.display_name AS "name", por.title AS "designation",
              email.normalized_value AS "email", phone.normalized_value AS "phone",
              linkedin.original_value AS "linkedinUrl",
              o.canonical_name AS "companyName", o.id AS "companyId",
              p.created_at AS "createdAt",
              CASE WHEN response.person_id IS NOT NULL THEN TRUE ELSE FALSE END AS "hasResponded",
              response.responded_at AS "respondedAt", response.responded_at AS "repliedAt",
              response.last_responded_at AS "lastRespondedAt",
              COALESCE(response.response_channels, ARRAY[]::text[]) AS "responseChannels",
              CASE WHEN response.person_id IS NOT NULL THEN 'lead' ELSE 'contact' END AS "leadStage",
              CASE WHEN response.person_id IS NOT NULL THEN 'Replied'
                   ELSE COALESCE(campaign_state.delivery_state, campaign_state.lead_state, 'Pending Inqueue')
              END AS "deliveryStatus",
              campaign_state.outcome,
              ps.assessment AS "pocAssessment",
              ps.reason AS "pocNotes", ps.assessed_at AS "pocAssessedAt",
              kr.standing AS "relationshipStatus", kr.manually_confirmed AS "relationshipConfirmed",
              kr.owner_name AS "relationshipOwner", kr.service_categories AS "relationshipServiceCategories",
              kr.next_follow_up_at AS "relationshipNextFollowUpAt", kr.reminder_notes AS "relationshipReminderNotes"
       FROM people p
       LEFT JOIN person_organization_roles por ON por.person_id = p.id
       LEFT JOIN organizations o ON por.organization_id = o.id
       LEFT JOIN response_summary response ON response.person_id = p.id
       LEFT JOIN LATERAL (SELECT normalized_value FROM person_contact_methods WHERE person_id = p.id AND type = 'email' ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1) email ON TRUE
       LEFT JOIN LATERAL (SELECT normalized_value FROM person_contact_methods WHERE person_id = p.id AND type = 'phone' ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1) phone ON TRUE
       LEFT JOIN LATERAL (SELECT original_value FROM person_contact_methods WHERE person_id = p.id AND type = 'linkedin' ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1) linkedin ON TRUE
       LEFT JOIN LATERAL (SELECT assessment, reason, assessed_at FROM poc_suitabilities WHERE role_id = por.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1) ps ON TRUE
       LEFT JOIN LATERAL (SELECT standing, manually_confirmed, owner_name, service_categories, next_follow_up_at, reminder_notes FROM key_relationship_profiles WHERE role_id = por.id ORDER BY confirmed_at DESC NULLS LAST, created_at DESC NULLS LAST LIMIT 1) kr ON TRUE
       LEFT JOIN LATERAL (
         SELECT cc.delivery_state, cc.lead_state, cc.outcome
         FROM campaign_contacts cc
         WHERE cc.role_id = por.id
         ORDER BY CASE WHEN cc.outcome = 'Replied' OR cc.delivery_state = 'Replied' OR cc.lead_state = 'Replied' THEN 0 ELSE 1 END,
                  cc.created_at DESC NULLS LAST
         LIMIT 1
       ) campaign_state ON TRUE
       WHERE (p.id::text = $1::text) AND p.archived_at IS NULL LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Lead not found.');
      error.status = 404;
      throw error;
    }
    const row = res.rows[0];
    const statusByAssessment = {
      suitable: 'Confirmed', unknown: 'Unverified', unsuitable: 'WrongContact',
      redirected_with_referral: 'RedirectedWithReferral',
      redirected_without_referral: 'RedirectedNoReferral',
    };
    return {
      ...row,
      companyId: row.companyId ? { _id: row.companyId, companyName: row.companyName } : null,
      pocQualification: {
        status: statusByAssessment[row.pocAssessment] || 'Unverified',
        notes: row.pocNotes || '',
        assessedAt: row.pocAssessedAt || null,
      },
      relationshipProfile: {
        status: row.relationshipStatus || 'New',
        manuallyConfirmed: row.relationshipConfirmed === true,
        owner: row.relationshipOwner || '',
        serviceCategories: row.relationshipServiceCategories || [],
        nextFollowUpAt: row.relationshipNextFollowUpAt || null,
        reminderNotes: row.relationshipReminderNotes || '',
      },
    };
  } catch (err) {
    if (err.status === 404) throw err;
    console.error('Error loading contact from PostgreSQL:', err.message);
    throw err;
  }
}

export async function updateLeadById(id, payload = {}, actor = 'admin') {
  const client = await db.getClient();
  const legacyStatusToAssessment = {
    Confirmed: 'suitable',
    Unverified: 'unknown',
    WrongContact: 'unsuitable',
    RedirectedWithReferral: 'redirected_with_referral',
    RedirectedNoReferral: 'redirected_without_referral',
  };

  async function setContactMethod(personId, type, value) {
    if (value === undefined) return;
    const cleaned = String(value || '').trim();
    const normalized = type === 'email' ? cleaned.toLowerCase() : cleaned;
    const existing = await client.query(
      `SELECT id FROM person_contact_methods
       WHERE person_id = $1::uuid AND type = $2
       ORDER BY preferred DESC NULLS LAST, created_at
       LIMIT 1`,
      [personId, type]
    );
    if (!cleaned) {
      if (existing.rows[0]) await client.query(`DELETE FROM person_contact_methods WHERE id = $1::uuid`, [existing.rows[0].id]);
      return;
    }
    if (existing.rows[0]) {
      await client.query(
        `UPDATE person_contact_methods
         SET original_value = $2, normalized_value = $3, preferred = TRUE
         WHERE id = $1::uuid`,
        [existing.rows[0].id, cleaned, normalized]
      );
    } else {
      await client.query(
        `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value, preferred, source)
         VALUES ($1::uuid, $2, $3, $4, TRUE, 'Manual')`,
        [personId, type, cleaned, normalized]
      );
    }
  }

  try {
    await client.query('BEGIN');
    const context = await client.query(
      `SELECT p.id, por.id AS role_id
       FROM people p
       LEFT JOIN person_organization_roles por ON por.person_id = p.id
       WHERE p.id = $1::uuid AND p.archived_at IS NULL
       ORDER BY por.effective_to NULLS FIRST, por.created_at
       LIMIT 1`,
      [String(id)]
    );
    if (!context.rows[0]) {
      const error = new Error('Lead not found.');
      error.status = 404;
      throw error;
    }
    const { id: personId, role_id: roleId } = context.rows[0];

    if (payload.name !== undefined) {
      const displayName = String(payload.name || '').trim();
      if (!displayName) {
        const error = new Error('Contact name cannot be blank.');
        error.status = 400;
        throw error;
      }
      await client.query(`UPDATE people SET display_name = $2, updated_at = NOW() WHERE id = $1::uuid`, [personId, displayName]);
    }
    if (payload.designation !== undefined && roleId) {
      await client.query(`UPDATE person_organization_roles SET title = $2 WHERE id = $1::uuid`, [roleId, String(payload.designation || '').trim()]);
    }

    await setContactMethod(personId, 'email', payload.email);
    await setContactMethod(personId, 'phone', payload.phone);
    await setContactMethod(personId, 'linkedin', payload.linkedinUrl);

    if (payload.pocQualification && roleId) {
      const poc = payload.pocQualification;
      const current = await client.query(
        `SELECT id FROM poc_suitabilities WHERE role_id = $1::uuid ORDER BY assessed_at DESC NULLS LAST LIMIT 1`,
        [roleId]
      );
      const status = poc.status || 'Unverified';
      const values = [
        roleId,
        legacyStatusToAssessment[status] || 'unknown',
        String(poc.notes || '').trim(),
        status,
        String(actor || '').trim(),
        JSON.stringify(poc.referral || {}),
        poc.referredLeadId || null,
        JSON.stringify(poc),
      ];
      if (current.rows[0]) {
        await client.query(
          `UPDATE poc_suitabilities SET
             assessment = $2, reason = $3, assessed_at = NOW(), legacy_status = $4,
             assessed_by = $5, referral = $6::jsonb, referred_person_id = $7::uuid,
             source_payload = $8::jsonb
           WHERE id = $1::uuid`,
          [current.rows[0].id, ...values.slice(1)]
        );
      } else {
        await client.query(
          `INSERT INTO poc_suitabilities (
             role_id, responsibility_context, assessment, reason, assessed_at,
             legacy_status, assessed_by, referral, referred_person_id, source_payload
           ) VALUES ($1::uuid, 'general', $2, $3, NOW(), $4, $5, $6::jsonb, $7::uuid, $8::jsonb)`,
          values
        );
      }
    }

    if (payload.relationshipProfile && roleId) {
      const profile = payload.relationshipProfile;
      const current = await client.query(
        `SELECT id, manually_confirmed FROM key_relationship_profiles WHERE role_id = $1::uuid ORDER BY created_at LIMIT 1`,
        [roleId]
      );
      const values = [
        roleId,
        profile.status || 'New',
        String(profile.owner || '').trim(),
        Array.isArray(profile.serviceCategories) ? profile.serviceCategories.map(String).filter(Boolean) : [],
        profile.nextFollowUpAt || null,
        String(profile.reminderNotes || '').trim(),
        JSON.stringify(profile),
      ];
      if (current.rows[0]) {
        await client.query(
          `UPDATE key_relationship_profiles SET
             standing = $2, legacy_status = $2, owner_name = $3,
             service_categories = $4::text[], next_follow_up_at = $5,
             reminder_notes = $6, source_payload = $7::jsonb
           WHERE id = $1::uuid`,
          [current.rows[0].id, ...values.slice(1)]
        );
      } else {
        await client.query(
          `INSERT INTO key_relationship_profiles (
             role_id, standing, manually_confirmed, legacy_status, owner_name,
             service_categories, next_follow_up_at, reminder_notes, source_payload
           ) VALUES ($1::uuid, $2, FALSE, $2, $3, $4::text[], $5, $6, $7::jsonb)`,
          values
        );
      }
    }

    await client.query('COMMIT');
    return await getLeadById(personId);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function createStandaloneLead(payload) {
  if (!payload.name?.trim()) {
    const error = new Error('Lead name is required.');
    error.status = 400;
    throw error;
  }

  const name = payload.name.trim();
  const res = await db.query(
    `INSERT INTO people (display_name)
     VALUES ($1)
     RETURNING id AS "_id", id, display_name AS "name", created_at AS "createdAt"`,
    [name]
  );

  const lead = res.rows[0];
  if (payload.email) {
    await db.query(
      `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value)
       VALUES ($1::uuid, 'email', $2, $2)`,
      [lead.id, String(payload.email).trim().toLowerCase()]
    );
  }

  return {
    ...lead,
    email: payload.email || '',
  };
}

export async function addLeadToCompany(companyId, payload) {
  return createStandaloneLead({ ...payload, companyId });
}

export async function assignLeadToCampaign(leadId, campaignId) {
  return { assigned: true };
}

export async function deleteLead(id, actor = {}) {
  const res = await db.query(
    `UPDATE people SET archived_at = NOW() WHERE (id::text = $1::text) RETURNING id`,
    [String(id)]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreLead(id, actor = {}) {
  const res = await db.query(
    `UPDATE people SET archived_at = NULL WHERE (id::text = $1::text) RETURNING id`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

export async function deleteLeads(ids = [], actor = {}) {
  const cleanIds = (Array.isArray(ids) ? ids : []).map(String);
  if (!cleanIds.length) return { deleted: 0, failed: 0, results: [] };

  const res = await db.query(
    `UPDATE people SET archived_at = NOW() WHERE id::text = ANY($1::text[]) RETURNING id`,
    [cleanIds]
  );
  return { deleted: res.rowCount, failed: cleanIds.length - res.rowCount, results: cleanIds.map((id) => ({ id, ok: true })) };
}

export async function importTargetCompanies(projectId, companyRows) {
  return { importedCount: (companyRows || []).length };
}

export async function logRevenue(projectId, payload, actor = 'admin') {
  const amount = Number(payload.amount) || 0;
  const currency = String(payload.currency || 'AED').trim();
  const description = String(payload.description || '').trim();

  const res = await db.query(
    `INSERT INTO revenue_entries (campaign_id, amount, currency, description, logged_by)
     VALUES ($1::uuid, $2, $3, $4, $5)
     RETURNING id AS "_id", id, amount, currency, description, closed_at AS "closedAt"`,
    [
      String(projectId),
      amount,
      currency,
      description,
      String(actor?.username || actor?.displayName || 'admin'),
    ]
  );
  return res.rows[0];
}

export async function updateOverhead(projectId, payload) {
  return getProject(projectId);
}

export async function getFinanceOverview() {
  try {
    const res = await db.query(`SELECT SUM(amount) AS "totalRevenue" FROM revenue_entries`);
    const totalRevenue = Number(res.rows[0]?.totalRevenue) || 0;
    return {
      totalRevenue,
      totalCost: 0,
      netProfit: totalRevenue,
      roiPercent: 0,
    };
  } catch (err) {
    return { totalRevenue: 0, totalCost: 0, netProfit: 0, roiPercent: 0 };
  }
}

export async function getGlobalAnalytics() {
  return {
    totalProjects: 0,
    totalCompanies: 0,
    totalLeads: 0,
    totalRevenue: 0,
  };
}

export async function getProjectAnalytics(projectId) {
  return {
    campaignId: projectId,
    targetCompanies: 0,
    pocsFound: 0,
    emailsSent: 0,
    repliesReceived: 0,
  };
}

export async function getComprehensiveAnalytics() {
  return {
    overview: {},
    projects: [],
  };
}

export async function blacklistLead(leadId) {
  return { blacklisted: true };
}

export async function markLeadWon(leadId) {
  return { won: true };
}

export async function syncCampaignResponseCounts(projectId) {
  return { synced: true };
}

// Function alias exports
export const listProjectsSummary = (opts) => listProjects({ ...opts, summary: true });
