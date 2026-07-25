import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Lead } from '../src/models/Lead.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { SendJob } from '../src/models/SendJob.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const campaigns = await ProjectCampaign.find({ deletedAt: null }).lean();
  console.log('=== CAMPAIGNS IN SYSTEM ===');
  for (const c of campaigns) {
    const leadCount = await Lead.countDocuments({ campaignId: c._id, deletedAt: null });
    const enrollmentCount = await SequenceEnrollment.countDocuments({ campaignId: c._id });
    const jobCount = await SendJob.countDocuments({ campaignId: c._id });
    console.log(`- [${c._id}] "${c.projectName}" (code: ${c.code}) => Leads: ${leadCount}, Enrollments: ${enrollmentCount}, SendJobs: ${jobCount}`);
  }

  // Check unique campaignName string values on Leads vs campaignId
  const leadCampaignNames = await Lead.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: '$campaignName', campaignIds: { $addToSet: '$campaignId' }, count: { $sum: 1 } } }
  ]);
  console.log('\n=== LEAD CAMPAIGN NAME vs CAMPAIGN ID BREAKDOWN ===');
  console.log(JSON.stringify(leadCampaignNames, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
