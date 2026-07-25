import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company } from '../src/models/Company.js';
import { Lead } from '../src/models/Lead.js';
import { recalculateCampaignCoverageStats } from '../src/services/projectService.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ranaExCampaignId = '6a3ebb9eac1ef3c5e876d151';

  // Find all companies linked to RANA EX
  const companies = await Company.find({
    deletedAt: null,
    $or: [
      { campaignId: ranaExCampaignId },
      { projectsAssociated: ranaExCampaignId }
    ]
  });

  console.log(`Found ${companies.length} companies linked to RANA EX.`);

  let unlinkedCount = 0;

  for (const comp of companies) {
    const activeLeadsInRana = await Lead.countDocuments({
      campaignId: ranaExCampaignId,
      companyId: comp._id,
      deletedAt: null
    });

    if (activeLeadsInRana === 0) {
      // Remove RANA EX from projectsAssociated array
      comp.projectsAssociated = (comp.projectsAssociated || [])
        .map((p) => String(p))
        .filter((p) => p !== ranaExCampaignId);

      if (String(comp.campaignId) === ranaExCampaignId) {
        comp.campaignId = comp.projectsAssociated.length > 0 ? comp.projectsAssociated[0] : null;
      }

      await comp.save();
      unlinkedCount++;
      console.log(`Unlinked RANA EX from Company "${comp.name || comp._id}"`);
    }
  }

  await recalculateCampaignCoverageStats(ranaExCampaignId);

  const remainingRanaCompanies = await Company.countDocuments({
    deletedAt: null,
    $or: [
      { campaignId: ranaExCampaignId },
      { projectsAssociated: ranaExCampaignId }
    ]
  });

  console.log('\nCompanies Cleanup Complete!');
  console.log(`Unlinked ${unlinkedCount} companies from RANA EX.`);
  console.log(`Remaining companies linked to RANA EX: ${remainingRanaCompanies}`);

  await mongoose.disconnect();
}

run().catch(console.error);
