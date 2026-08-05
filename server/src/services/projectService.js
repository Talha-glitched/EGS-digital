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
      `SELECT id AS "_id", id, mongo_campaign_id, name AS "projectName", lifecycle AS "milestone", created_at AS "createdAt", payload
       FROM campaigns
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
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
        stats: p.stats || {
          targetExhibitorsCount: 0,
          exhibitorsWithPocCount: 0,
          totalPocsFoundCount: 0,
          emailedCount: 0,
          respondedCount: 0,
          companiesReachedCount: 0,
          activeQueueCount: 0,
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
      return {
        ...p,
        _id: cid,
        id: cid,
        projectName: row.projectName || p.projectName || p.name || 'Unnamed Project',
        milestone: row.milestone || p.status || 'Active Planning',
        status: row.milestone || p.status || 'Active Planning',
        createdAt: row.createdAt,
      };
    }
  } catch (err) {}

  const error = new Error('Project not found.');
  error.status = 404;
  throw error;
}

export async function recalculateCampaignCoverageStats(projectId) {
  return null;
}

export async function recalculateAllCampaignCoverageStats() {
  return { updated: 0 };
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
  const { search, page = 1, limit = 50 } = options;
  const params = [];
  const conditions = ['o.archived_at IS NULL'];

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
             (SELECT COUNT(*) FROM person_organization_roles por WHERE por.organization_id = o.id) AS "pocCount"
      FROM organizations o
      LEFT JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
      LEFT JOIN locations l ON l.organization_id = o.id
      WHERE ${whereClause}
      ORDER BY o.canonical_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*) FROM organizations o WHERE ${whereClause}`;

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
  return listAllCompanies(options);
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
  const { search, page = 1, limit = 50 } = options;
  const params = [];
  const conditions = ['p.archived_at IS NULL'];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.display_name ILIKE $${params.length} OR pcm.normalized_value ILIKE $${params.length})`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;
  const whereClause = conditions.join(' AND ');

  try {
    const sql = `
      SELECT p.id AS "_id", p.id, p.display_name AS "name", por.title AS "designation",
             pcm.normalized_value AS "email", o.canonical_name AS "companyName", o.id AS "companyId",
             p.created_at AS "createdAt"
      FROM people p
      LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN organizations o ON por.organization_id = o.id
      WHERE ${whereClause}
      ORDER BY p.display_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const countSql = `SELECT COUNT(*) FROM people p LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email' WHERE ${whereClause}`;

    const [res, countRes] = await Promise.all([
      db.query(sql, [...params, limitNum, offset]),
      db.query(countSql, params),
    ]);

    const total = parseInt(countRes.rows[0]?.count || 0, 10);
    return {
      leads: res.rows,
      items: res.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    };
  } catch (err) {
    return { leads: [], items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 1 };
  }
}

export async function listProjectLeads(projectId, options = {}) {
  return listAllLeads(options);
}

export async function getLeadById(id) {
  try {
    const res = await db.query(
      `SELECT p.id AS "_id", p.id, p.display_name AS "name", por.title AS "designation",
              pcm.normalized_value AS "email", o.canonical_name AS "companyName", o.id AS "companyId",
              p.created_at AS "createdAt"
       FROM people p
       LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
       LEFT JOIN person_organization_roles por ON por.person_id = p.id
       LEFT JOIN organizations o ON por.organization_id = o.id
       WHERE (p.id::text = $1::text) AND p.archived_at IS NULL LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Lead not found.');
      error.status = 404;
      throw error;
    }
    return res.rows[0];
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
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
