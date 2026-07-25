import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lead } from '../src/models/Lead.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { recalculateCampaignCoverageStats } from '../src/services/projectService.js';
import { getLeadEmailCandidates } from '../src/utils/contactEmails.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ranaExCampaignId = '6a3ebb9eac1ef3c5e876d151';
  const gitexCampaignId = '6a54c2e37b1a7bc292ec8c8d';
  const gisecCampaignId = '6a4a69e12da687d1b7171081';

  // Get all active leads in Gitex and GISEC campaigns
  const gitexLeads = await Lead.find({ campaignId: gitexCampaignId, deletedAt: null }).lean();
  const gisecLeads = await Lead.find({ campaignId: gisecCampaignId, deletedAt: null }).lean();

  const otherCampaignEmails = new Set();

  for (const gLead of [...gitexLeads, ...gisecLeads]) {
    const candidates = getLeadEmailCandidates(gLead);
    for (const cand of candidates) {
      if (cand) otherCampaignEmails.add(cand.toLowerCase());
    }
  }

  console.log(`Collected ${otherCampaignEmails.size} unique emails from GITEX and GISEC campaigns.`);

  // Find all active leads in RANA EX
  const ranaLeads = await Lead.find({ campaignId: ranaExCampaignId, deletedAt: null });
  console.log(`RANA EX active leads before cleanup: ${ranaLeads.length}`);

  let removedCount = 0;
  const removedLeadIds = [];

  for (const lead of ranaLeads) {
    const candidates = getLeadEmailCandidates(lead);
    const isDuplicate = candidates.some((cand) => cand && otherCampaignEmails.has(cand.toLowerCase()));

    if (isDuplicate) {
      lead.deletedAt = new Date();
      await lead.save();
      removedCount++;
      removedLeadIds.push(lead._id);
      console.log(`Removed duplicate lead from RANA EX: ${lead.name || lead.email} (${lead._id})`);
    }
  }

  // Also remove enrollments for soft-deleted leads
  if (removedLeadIds.length) {
    await SequenceEnrollment.deleteMany({ leadId: { $in: removedLeadIds }, campaignId: ranaExCampaignId });
  }

  // Recalculate campaign coverage stats for all 3 campaigns
  await recalculateCampaignCoverageStats(ranaExCampaignId);
  await recalculateCampaignCoverageStats(gitexCampaignId);
  await recalculateCampaignCoverageStats(gisecCampaignId);

  const remainingRanaLeads = await Lead.countDocuments({ campaignId: ranaExCampaignId, deletedAt: null });
  console.log(`\nCleanup Complete!`);
  console.log(`Removed ${removedCount} duplicate leads from RANA EX.`);
  console.log(`Remaining unique leads in RANA EX: ${remainingRanaLeads}`);

  await mongoose.disconnect();
}

run().catch(console.error);
