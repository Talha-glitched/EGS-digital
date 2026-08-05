#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
await fs.writeFile('/tmp/egs_crm_repair_verification.stage', 'environment-loaded\n', 'utf8');

const { default: db } = await import('../src/db/index.js');
await fs.writeFile('/tmp/egs_crm_repair_verification.stage', 'database-imported\n', 'utf8');
const { listAllLeads, listProjectLeads, listAllCompanies, listProjectCompanies, listProjects } = await import('../src/services/projectService.js');
const { listOngoingJobs, getOngoingJob, getOngoingJobTimeline } = await import('../src/services/salesService.js');
await fs.writeFile('/tmp/egs_crm_repair_verification.stage', 'service-imported\n', 'utf8');

try {
  const [contacts, leads, companies, campaigns] = await Promise.all([
    listAllLeads({ page: 1, limit: 1 }),
    listAllLeads({ respondedOnly: true, page: 1, limit: 500 }),
    listAllCompanies({ page: 1, limit: 1 }),
    db.query(`SELECT id, mongo_campaign_id, name FROM campaigns WHERE deleted_at IS NULL ORDER BY created_at`),
  ]);
  await fs.writeFile('/tmp/egs_crm_repair_verification.stage', 'global-queries-complete\n', 'utf8');

  const campaignChecks = [];
  for (const campaign of campaigns.rows) {
    const campaignKey = campaign.mongo_campaign_id || campaign.id;
    const [result, companyResult] = await Promise.all([
      listProjectLeads(campaignKey, { page: 1, limit: 500 }),
      listProjectCompanies(campaignKey, { page: 1, limit: 1 }),
    ]);
    campaignChecks.push({
      campaignId: campaign.id,
      name: campaign.name,
      contacts: result.total,
      companies: companyResult.total,
      responders: result.items.filter((item) => item.hasResponded).length,
    });
  }

  const [projectRows, ongoingJobsResult] = await Promise.all([listProjects(), listOngoingJobs()]);
  const firstJob = ongoingJobsResult.items[0]
    ? await getOngoingJob(ongoingJobsResult.items[0].id)
    : null;
  const firstJobTimeline = ongoingJobsResult.items[0]
    ? await getOngoingJobTimeline(ongoingJobsResult.items[0].id)
    : null;

  const report = JSON.stringify({
    contacts: contacts.total,
    companies: companies.total,
    leads: leads.total,
    leadRowsReturned: leads.items.length,
    leadsWithoutResponseEvidence: leads.items.filter((item) => !item.hasResponded).length,
    leadRowsWithoutReplyDate: leads.items.filter((item) => !item.respondedAt).length,
    campaignChecks,
    projectMetrics: projectRows.map((project) => ({
      id: project.id,
      targetCompanies: project.targetCompaniesCount,
      pocsFound: project.pocsFound,
      pocsResponded: project.pocsResponded,
      companiesResponded: project.companiesRespondedCount,
    })),
    ongoingJobs: {
      count: ongoingJobsResult.items.length,
      nonzeroValues: ongoingJobsResult.items.filter((job) => Number(job.valueAed) !== 0).length,
      totalValueAed: ongoingJobsResult.items.reduce((sum, job) => sum + Number(job.valueAed || 0), 0),
      firstJobContacts: firstJob?.contacts?.length || 0,
      firstJobTimelineEvents: firstJobTimeline?.events?.length || 0,
    },
  }, null, 2);
  await fs.writeFile('/tmp/egs_crm_repair_verification.json', `${report}\n`, 'utf8');
  console.log(report);
} finally {
  await db.getPool().end();
}
