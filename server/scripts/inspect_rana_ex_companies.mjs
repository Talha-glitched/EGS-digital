import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company } from '../src/models/Company.js';
import { Lead } from '../src/models/Lead.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ranaExCampaignId = '6a3ebb9eac1ef3c5e876d151';
  const gitexCampaignId = '6a54c2e37b1a7bc292ec8c8d';
  const gisecCampaignId = '6a4a69e12da687d1b7171081';

  // Find all companies associated with RANA EX
  const ranaCompanies = await Company.find({
    deletedAt: null,
    $or: [
      { campaignId: ranaExCampaignId },
      { projectsAssociated: ranaExCampaignId }
    ]
  }).lean();

  console.log(`Total companies linked to RANA EX: ${ranaCompanies.length}`);

  let removedFromRanaCount = 0;
  let completelyDeletedCompanyCount = 0;

  for (const comp of ranaCompanies) {
    // Check if this company has any active leads in RANA EX
    const activeLeadsInRana = await Lead.countDocuments({
      campaignId: ranaExCampaignId,
      companyId: comp._id,
      deletedAt: null
    });

    console.log(`Company "${comp.name}" (${comp._id}) => Active RANA EX leads: ${activeLeadsInRana}, projectsAssociated: ${comp.projectsAssociated?.length || 0}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
