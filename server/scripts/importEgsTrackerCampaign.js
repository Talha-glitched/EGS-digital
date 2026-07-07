/**
 * Import an EGS Outreach Tracker v9 workbook into a campaign, then mark as already emailed.
 *
 * Usage:
 *   node scripts/importEgsTrackerCampaign.js <xlsxPath> [--name "CAA 2026"] [--milestone "May 2026"] [--emailed]
 */
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Lead } from '../src/models/Lead.js';
import {
  parseSpreadsheetBuffer,
  suggestFieldMapping,
  buildCompanyRows,
  blendAndIngestLeads,
  COMPANY_FIELDS,
  CONTACT_FIELDS,
} from '../src/services/ingestionService.js';
import { importTargetCompanies, createProject } from '../src/services/projectService.js';
import { computeProjectSnapshot } from '../src/services/analyticsCronService.js';
import { syncAutoCampaignStatus } from '../src/services/projectService.js';
import { isValidEmail } from '../src/utils/normalizeDomain.js';

const PRESERVE_STATUSES = new Set(['Replied', 'Bounced / Invalid', 'Opted Out']);

function parseArgs(argv) {
  const opts = { emailed: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--emailed') opts.emailed = true;
    else if (arg === '--name') opts.name = argv[++i];
    else if (arg === '--milestone') opts.milestone = argv[++i];
    else if (arg === '--dry-run') opts.dryRun = true;
    else positional.push(arg);
  }
  opts.xlsxPath = positional[0];
  return opts;
}

function deriveCampaignName(sheets) {
  const companiesSheet = sheets.find((s) => s.sheetName === 'Companies');
  if (!companiesSheet) return 'Imported Campaign';
  const pitchIdx = companiesSheet.headers.findIndex((h) => /service pitch/i.test(String(h)));
  if (pitchIdx >= 0) {
    const pitchRow = companiesSheet.dataRows.find((row) => String(row[pitchIdx + 1] || row[1] || '').trim());
  }
  return 'Imported Campaign';
}

async function findOrCreateCampaign({ name, milestone, dryRun }) {
  const existing = await ProjectCampaign.findOne({
    projectName: name,
    deletedAt: null,
  });
  if (existing) return { project: existing, created: false };

  if (dryRun) {
    return { project: { _id: 'dry-run', projectName: name, milestone }, created: true };
  }

  const project = await createProject({ projectName: name, milestone });
  return { project, created: true };
}

async function markCampaignEmailed(projectId, dryRun) {
  const leads = await Lead.find({ campaignId: projectId, deletedAt: null });
  let marked = 0;
  for (const lead of leads) {
    if (PRESERVE_STATUSES.has(lead.deliveryStatus)) continue;
    if (lead.deliveryStatus === 'Emailed Outbound') continue;
    if (!lead.email || !isValidEmail(lead.email)) continue;
    marked += 1;
    if (dryRun) continue;
    lead.deliveryStatus = 'Emailed Outbound';
    lead.trackingMetrics = lead.trackingMetrics || {};
    if (!lead.trackingMetrics.emailsDeliveredCount) {
      lead.trackingMetrics.emailsDeliveredCount = 1;
    }
    await lead.save();
  }
  if (!dryRun && marked > 0) {
    await syncAutoCampaignStatus(projectId);
    await computeProjectSnapshot(projectId);
  }
  return marked;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.xlsxPath || !fs.existsSync(opts.xlsxPath)) {
    console.error('Usage: node scripts/importEgsTrackerCampaign.js <xlsxPath> [--name "Campaign"] [--milestone "May 2026"] [--emailed]');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');

  const buf = fs.readFileSync(opts.xlsxPath);
  const allSheets = parseSpreadsheetBuffer(buf);
  const companiesSheet = allSheets.find((s) => s.sheetName === 'Companies');
  const pocsSheet = allSheets.find((s) => s.sheetName === 'POCs');

  if (!companiesSheet || !pocsSheet) {
    throw new Error('Workbook must contain Companies and POCs sheets (EGS tracker format).');
  }

  const defaultName = opts.xlsxPath.split('/').pop()?.replace(/\.xlsx$/i, '') || 'Imported Campaign';
  const campaignName = opts.name || defaultName;
  const milestone = opts.milestone || '';

  const companyMapping = suggestFieldMapping(companiesSheet.headers, COMPANY_FIELDS).suggestedMapping;
  const contactMapping = suggestFieldMapping(pocsSheet.headers, CONTACT_FIELDS).suggestedMapping;

  await mongoose.connect(process.env.MONGODB_URI);

  const { project, created } = await findOrCreateCampaign({
    name: campaignName,
    milestone,
    dryRun: opts.dryRun,
  });

  const projectId = project._id;
  const stats = {
    campaignName,
    campaignId: String(projectId),
    campaignCreated: created,
    dryRun: Boolean(opts.dryRun),
    companies: null,
    contacts: null,
    markedEmailed: 0,
    leadStatusBreakdown: [],
  };

  if (opts.dryRun) {
    stats.companyRows = buildCompanyRows([companiesSheet], companyMapping).filter((r) => r.companyName && r.domain).length;
    stats.pocRows = pocsSheet.dataRows.length;
    console.log(JSON.stringify({ ...stats, companyMapping, contactMapping }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const companyRows = buildCompanyRows([companiesSheet], companyMapping).filter((r) => r.companyName && r.domain);
  stats.companies = await importTargetCompanies(projectId, companyRows);

  stats.contacts = await blendAndIngestLeads(projectId, [{
    sheets: [pocsSheet],
    fieldMapping: contactMapping,
    vendor: 'Manual',
  }]);

  if (opts.emailed) {
    stats.markedEmailed = await markCampaignEmailed(projectId, false);
  }

  await computeProjectSnapshot(projectId);

  stats.leadStatusBreakdown = await Lead.aggregate([
    { $match: { campaignId: projectId, deletedAt: null } },
    { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
  ]);

  const refreshed = await ProjectCampaign.findById(projectId).lean();
  stats.campaignStatus = refreshed?.status;
  stats.targetCompaniesCount = refreshed?.targetCompaniesCount;
  stats.companiesWithPocsFound = refreshed?.companiesWithPocsFound;
  stats.totalLeads = await Lead.countDocuments({ campaignId: projectId, deletedAt: null });

  console.log(JSON.stringify(stats, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
