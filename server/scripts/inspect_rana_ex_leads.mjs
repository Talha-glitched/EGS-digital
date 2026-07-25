import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { SendJob } from '../src/models/SendJob.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ranaExCampaignId = '6a3ebb9eac1ef3c5e876d151';
  const gitexCampaignId = '6a54c2e37b1a7bc292ec8c8d';

  const ranaLeads = await Lead.find({ campaignId: ranaExCampaignId, deletedAt: null }).lean();
  console.log(`RANA EX total leads count: ${ranaLeads.length}`);

  let gitexMentionCount = 0;
  const gitexKeywords = ['gitex', 'gitex 2026', 'gitex 2025', 'dwtc', 'dubai world trade center'];

  const sampleGitexLeadsInRana = [];

  for (const lead of ranaLeads) {
    const text = JSON.stringify(lead).toLowerCase();
    const hasGitex = gitexKeywords.some((kw) => text.includes(kw));

    if (hasGitex) {
      gitexMentionCount++;
      sampleGitexLeadsInRana.push({
        id: lead._id,
        name: lead.name,
        email: lead.email,
        companyName: lead.companyName,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      });
    }
  }

  console.log(`Leads in RANA EX that mention GITEX in fields: ${gitexMentionCount} out of ${ranaLeads.length}`);
  console.log('\nSample Gitex leads in RANA EX:', JSON.stringify(sampleGitexLeadsInRana.slice(0, 10), null, 2));

  // Check SendJobs and SequenceEnrollments for RANA EX leads
  const ranaLeadIds = ranaLeads.map((l) => l._id);
  const enrollmentsForRanaLeads = await SequenceEnrollment.find({ leadId: { $in: ranaLeadIds } }).lean();
  console.log('\nSequenceEnrollments for RANA EX leads count:', enrollmentsForRanaLeads.length);
  for (const e of enrollmentsForRanaLeads) {
    console.log(`- Lead ${e.leadId} enrolled in Campaign [${e.campaignId}] Sequence [${e.sequenceId}] Status: ${e.status}`);
  }

  const jobsForRanaLeads = await SendJob.find({ leadId: { $in: ranaLeadIds } }).lean();
  console.log('\nSendJobs for RANA EX leads count:', jobsForRanaLeads.length);
  for (const j of jobsForRanaLeads.slice(0, 10)) {
    console.log(`- Job [${j._id}] for Lead ${j.leadId} in Campaign [${j.campaignId}] Subject: "${j.subject}" Status: ${j.status}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
