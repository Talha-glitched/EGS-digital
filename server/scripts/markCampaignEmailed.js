/**
 * Mark a campaign's leads as already emailed (historical outreach).
 * Usage: node scripts/markCampaignEmailed.js [campaignIdOrName] [--dry-run]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { computeProjectSnapshot } from '../src/services/analyticsCronService.js';
import { syncAutoCampaignStatus } from '../src/services/projectService.js';
import { isValidEmail } from '../src/utils/normalizeDomain.js';

const PRESERVE_STATUSES = new Set(['Replied', 'Bounced / Invalid', 'Opted Out']);

async function findCampaign(query) {
  if (query && mongoose.Types.ObjectId.isValid(query)) {
    return ProjectCampaign.findById(query);
  }
  const regex = new RegExp(String(query || 'organics').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const matches = await ProjectCampaign.find({
    $or: [{ projectName: regex }, { milestone: regex }],
    deletedAt: null,
  });
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`No campaign matched "${query}"`);
  throw new Error(`Multiple campaigns matched — pass an ID. ${matches.map((c) => c._id).join(', ')}`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  const dryRun = process.argv.includes('--dry-run');
  const campaignQuery = args[0] || 'arabian organics';

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const project = await findCampaign(campaignQuery);
  const projectId = project._id;

  const leads = await Lead.find({ campaignId: projectId, deletedAt: null });
  const stats = {
    campaign: project.projectName,
    campaignId: String(projectId),
    dryRun,
    total: leads.length,
    markedEmailed: 0,
    skippedPreserved: 0,
    skippedNoEmail: 0,
    alreadyEmailed: 0,
  };

  for (const lead of leads) {
    if (PRESERVE_STATUSES.has(lead.deliveryStatus)) {
      stats.skippedPreserved += 1;
      continue;
    }
    if (lead.deliveryStatus === 'Emailed Outbound') {
      stats.alreadyEmailed += 1;
      continue;
    }
    if (!lead.email || !isValidEmail(lead.email)) {
      stats.skippedNoEmail += 1;
      continue;
    }

    stats.markedEmailed += 1;
    if (dryRun) continue;

    lead.deliveryStatus = 'Emailed Outbound';
    lead.trackingMetrics = lead.trackingMetrics || {};
    if (!lead.trackingMetrics.emailsDeliveredCount) {
      lead.trackingMetrics.emailsDeliveredCount = 1;
    }
    await lead.save();
  }

  if (!dryRun && stats.markedEmailed > 0) {
    await syncAutoCampaignStatus(projectId);
    await computeProjectSnapshot(projectId);
  }

  const after = await Lead.aggregate([
    { $match: { campaignId: projectId, deletedAt: null } },
    { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
  ]);

  const refreshed = await ProjectCampaign.findById(projectId).lean();
  stats.campaignStatus = refreshed?.status;
  stats.leadStatusBreakdown = after;

  console.log(JSON.stringify(stats, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
