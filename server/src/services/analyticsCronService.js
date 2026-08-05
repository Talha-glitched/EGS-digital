import db from '../db/index.js';
import { resolveLeadVendorSource } from '../utils/contactEmails.js';

const VENDORS = ['Apollo', 'Hunter', 'Lusha', 'Personal', 'Manual'];

export async function computeVendorMatrix(campaignId = null) {
  let allLeads = [];
  try {
    const sql = campaignId
      ? `SELECT p.id AS "_id", p.id, cc.lead_state AS "deliveryStatus", pcm.source AS "primarySource"
         FROM people p
         LEFT JOIN person_organization_roles por ON por.person_id = p.id
         LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
         LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id
         LEFT JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
         WHERE ca.campaign_id::text = $1::text`
      : `SELECT p.id AS "_id", p.id, cc.lead_state AS "deliveryStatus", pcm.source AS "primarySource"
         FROM people p
         LEFT JOIN person_organization_roles por ON por.person_id = p.id
         LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
         LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id`;
    const res = await db.query(sql, campaignId ? [String(campaignId)] : []);
    allLeads = res.rows;
  } catch (err) {
    allLeads = [];
  }

  const vendorGroups = {
    Apollo: [],
    Hunter: [],
    Lusha: [],
    Personal: [],
    Manual: [],
  };

  for (const lead of allLeads) {
    const vendor = resolveLeadVendorSource(lead);
    if (vendorGroups[vendor]) {
      vendorGroups[vendor].push(lead);
    } else {
      vendorGroups.Manual.push(lead);
    }
  }

  const matrix = [];

  for (const source of VENDORS) {
    const leads = vendorGroups[source] || [];

    if (!leads.length) {
      matrix.push({ source, leadsCount: 0, opens: 0, bounces: 0, replies: 0, replyRate: '0.0%', revenue: 0 });
      continue;
    }

    const leadIds = leads.map((l) => l._id);
    const opens = 0; // Tracking aggregate

    const bounces = leads.filter((l) => l.deliveryStatus === 'Bounced / Invalid').length;
    const replies = leads.filter((l) => l.deliveryStatus === 'Replied').length;

    let revenueTotal = 0;
    try {
      const revSql = campaignId
        ? `SELECT SUM(amount) AS total FROM revenue_entries WHERE person_id = ANY($1::uuid[]) AND campaign_id = $2::uuid`
        : `SELECT SUM(amount) AS total FROM revenue_entries WHERE person_id = ANY($1::uuid[])`;
      const revParams = campaignId ? [leadIds, campaignId] : [leadIds];
      const revRes = await db.query(revSql, revParams);
      revenueTotal = Number(revRes.rows[0]?.total) || 0;
    } catch (err) {
      revenueTotal = 0;
    }

    const replyRate = leads.length > 0 ? ((replies / leads.length) * 100).toFixed(1) + '%' : '0.0%';

    matrix.push({
      source,
      leadsCount: leads.length,
      opens,
      bounces,
      replies,
      replyRate,
      revenue: revenueTotal,
    });
  }

  return matrix;
}

async function refreshCampaignCoverageCounters(projectId) {
  if (!projectId) return { targetCompaniesCount: 0, companiesWithPocsFound: 0 };

  try {
    const companyRes = await db.query(
      `SELECT COUNT(DISTINCT organization_id) AS count FROM campaign_accounts WHERE campaign_id::text = $1::text`,
      [String(projectId)]
    );
    const pocRes = await db.query(
      `SELECT COUNT(DISTINCT por.organization_id) AS count
       FROM campaign_contacts cc
       JOIN person_organization_roles por ON cc.role_id = por.id
       JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
       WHERE ca.campaign_id::text = $1::text`,
      [String(projectId)]
    );

    const targetCompaniesCount = Number(companyRes.rows[0]?.count) || 0;
    const companiesWithPocsFound = Number(pocRes.rows[0]?.count) || 0;

    await db.query(
      `UPDATE campaigns SET target_companies_count = $1, companies_with_pocs = $2, updated_at = NOW()
       WHERE id::text = $3::text`,
      [targetCompaniesCount, companiesWithPocsFound, String(projectId)]
    );

    return { targetCompaniesCount, companiesWithPocsFound };
  } catch (err) {
    return { targetCompaniesCount: 0, companiesWithPocsFound: 0 };
  }
}

export async function computeProjectSnapshot(projectId) {
  let projectRes;
  try {
    projectRes = await db.query(
      `SELECT id, name, target_companies_count AS "targetCompaniesCount",
              companies_with_pocs AS "companiesWithPocsFound", companies_responded AS "companiesRespondedCount",
              financial_ledger AS "financialLedger", deleted_at
       FROM campaigns WHERE id::text = $1::text AND deleted_at IS NULL LIMIT 1`,
      [String(projectId)]
    );
  } catch (err) {
    return null;
  }

  const project = projectRes.rows[0];
  if (!project) return null;

  const coverage = await refreshCampaignCoverageCounters(projectId);

  const target = coverage.targetCompaniesCount || project.targetCompaniesCount || 0;
  const withPoc = coverage.companiesWithPocsFound || project.companiesWithPocsFound || 0;
  const responded = project.companiesRespondedCount || 0;
  const vendorMatrix = await computeVendorMatrix(projectId);

  const ledger = project.financialLedger || {};
  const totalCost = (ledger.allocatedToolBudget || 0) + (ledger.domainFixedCosts || 0) + (ledger.laborCosts || 0) + (ledger.accumulatedOpenAiCost || 0);
  const revenue = ledger.validatedRevenueWon || 0;
  const roiPercent = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;

  let activeQueues = 0;
  try {
    const qRes = await db.query(
      `SELECT COUNT(*) FROM sequence_enrollments WHERE (mongo_campaign_id = $1 OR campaign_contact_id IN (
         SELECT cc.id FROM campaign_contacts cc JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id WHERE ca.campaign_id = $1::uuid
       )) AND execution_state = 'active'`,
      [String(projectId)]
    );
    activeQueues = Number(qRes.rows[0]?.count) || 0;
  } catch (err) {}

  const snapshot = {
    scope: 'project',
    campaignId: projectId,
    pocDiscoveryPercent: target ? (withPoc / target) * 100 : 0,
    interactionProgressPercent: target ? (responded / target) * 100 : 0,
    roiPercent,
    totalProjectCost: totalCost,
    validatedRevenueWon: revenue,
    vendorMatrix,
    activeQueues,
    computedAt: new Date(),
  };

  try {
    await db.query(
      `INSERT INTO analytics_snapshots (snapshot_type, payload, computed_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [`project_${projectId}`, JSON.stringify(snapshot)]
    );
  } catch (err) {}

  return snapshot;
}

export async function computeGlobalSnapshot() {
  let projects = [];
  try {
    const pRes = await db.query(`SELECT id, financial_ledger AS "financialLedger" FROM campaigns WHERE deleted_at IS NULL`);
    projects = pRes.rows;
  } catch (err) {}

  let activeQueues = 0;
  try {
    const qRes = await db.query(`SELECT COUNT(*) FROM sequence_enrollments WHERE execution_state = 'active'`);
    activeQueues = Number(qRes.rows[0]?.count) || 0;
  } catch (err) {}

  let leadCount = 0;
  try {
    const lRes = await db.query(`SELECT COUNT(*) FROM people WHERE archived_at IS NULL`);
    leadCount = Number(lRes.rows[0]?.count) || 0;
  } catch (err) {}

  const totalRevenue = projects.reduce((sum, p) => sum + (p.financialLedger?.validatedRevenueWon || 0), 0);
  const totalCost = projects.reduce((sum, p) => sum + ((p.financialLedger?.allocatedToolBudget || 0) + (p.financialLedger?.domainFixedCosts || 0) + (p.financialLedger?.laborCosts || 0) + (p.financialLedger?.accumulatedOpenAiCost || 0)), 0);
  const roiPercent = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

  const snapshot = {
    scope: 'global',
    campaignId: null,
    pocDiscoveryPercent: 0,
    interactionProgressPercent: 0,
    roiPercent,
    totalProjectCost: totalCost,
    validatedRevenueWon: totalRevenue,
    vendorMatrix: [],
    activeQueues,
    projectCount: projects.length,
    leadCount,
    computedAt: new Date(),
  };

  try {
    await db.query(
      `INSERT INTO analytics_snapshots (snapshot_type, payload, computed_at)
       VALUES ($1, $2::jsonb, NOW())`,
      ['global', JSON.stringify(snapshot)]
    );
  } catch (err) {}

  return snapshot;
}

export async function runAnalyticsCron() {
  let projects = [];
  try {
    const res = await db.query(`SELECT id FROM campaigns WHERE deleted_at IS NULL`);
    projects = res.rows;
  } catch (err) {}

  for (const project of projects) {
    await computeProjectSnapshot(project.id);
  }
  await computeGlobalSnapshot();
  console.info('Analytics cron completed.');
}

let cronTimer = null;

export function startAnalyticsCron() {
  if (cronTimer) return;
  const fourHours = 4 * 60 * 60 * 1000;
  cronTimer = setInterval(() => {
    runAnalyticsCron().catch((err) => console.error('Analytics cron failed:', err.message));
  }, fourHours);
  runAnalyticsCron().catch(() => {});
}

export function stopAnalyticsCron() {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

export async function recordEmailOpen(leadId, stepId) {
  try {
    const res = await db.query(
      `UPDATE campaign_contacts SET lead_state = 'opened'
       WHERE id::text = $1::text OR role_id IN (SELECT id FROM person_organization_roles WHERE person_id::text = $1::text)`,
      [String(leadId)]
    );
    return res.rowCount > 0;
  } catch (err) {
    return false;
  }
}
