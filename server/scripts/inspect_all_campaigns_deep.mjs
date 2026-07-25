import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Lead } from '../src/models/Lead.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { SendJob } from '../src/models/SendJob.js';
import { Sequence } from '../src/models/Sequence.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const campaigns = await ProjectCampaign.find({ deletedAt: null }).lean();
  console.log('\n=== ALL CAMPAIGNS SUMMARY ===');
  for (const c of campaigns) {
    const leadCount = await Lead.countDocuments({ campaignId: c._id, deletedAt: null });
    const enrollCount = await SequenceEnrollment.countDocuments({ campaignId: c._id });
    console.log(`Campaign [${c._id}] "${c.projectName}" => ${leadCount} leads, ${enrollCount} enrollments`);
  }

  // Check sequences in DB
  const sequences = await Sequence.find({ deletedAt: null }).lean();
  console.log('\n=== ALL SEQUENCES SUMMARY ===');
  for (const s of sequences) {
    const enrollCount = await SequenceEnrollment.countDocuments({ sequenceId: s._id });
    const jobCount = await SendJob.countDocuments({ sequenceId: s._id });
    console.log(`Sequence [${s._id}] "${s.title}" (Campaign: ${s.campaignId}) => ${enrollCount} enrollments, ${jobCount} SendJobs`);
  }

  // Check all SendJobs in DB by subject/template
  const sendJobs = await SendJob.find({}).lean();
  console.log('\n=== ALL SENDJOBS SUMMARY (${sendJobs.length}) ===');
  const subjectCounts = {};
  for (const j of sendJobs) {
    const subj = j.subject || '(no subject)';
    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
  }
  console.log(subjectCounts);

  // Check leads in RANA EX vs Gitex 2026:
  // Are there overlapping email addresses between RANA EX leads and Gitex 2026 leads?
  const ranaLeads = await Lead.find({ campaignId: '6a3ebb9eac1ef3c5e876d151', deletedAt: null }).lean();
  const gitexLeads = await Lead.find({ campaignId: '6a54c2e37b1a7bc292ec8c8d', deletedAt: null }).lean();
  const gisecLeads = await Lead.find({ campaignId: '6a4a69e12da687d1b7171081', deletedAt: null }).lean();

  const ranaEmails = new Set(ranaLeads.map((l) => l.email?.toLowerCase()).filter(Boolean));
  const gitexEmails = new Set(gitexLeads.map((l) => l.email?.toLowerCase()).filter(Boolean));
  const gisecEmails = new Set(gisecLeads.map((l) => l.email?.toLowerCase()).filter(Boolean));

  let ranaInGitex = 0;
  let ranaInGisec = 0;

  for (const email of ranaEmails) {
    if (gitexEmails.has(email)) ranaInGitex++;
    if (gisecEmails.has(email)) ranaInGisec++;
  }

  console.log('\n=== OVERLAPPING LEADS BETWEEN CAMPAIGNS ===');
  console.log(`RANA EX email count: ${ranaEmails.size}`);
  console.log(`Gitex email count: ${gitexEmails.size}`);
  console.log(`GISEC email count: ${gisecEmails.size}`);
  console.log(`RANA EX leads also in Gitex 2026: ${ranaInGitex}`);
  console.log(`RANA EX leads also in GISEC 2026: ${ranaInGisec}`);

  await mongoose.disconnect();
}

run().catch(console.error);
