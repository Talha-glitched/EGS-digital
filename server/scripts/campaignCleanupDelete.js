/**
 * Deletes all CRM data EXCEPT the target campaign (default: "RANA EX").
 * HARD delete. Dry-run by default; set CONFIRM_DELETE=YES to actually delete.
 *
 * Decisions (per operator):
 *   - Hard delete (permanent removal).
 *   - Keep AnalyticsSnapshot docs for the target campaign AND all scope==='global'.
 *   - Preserve global/config collections: User, Page, PipelineConfig, AuditLog, RecordRevision.
 *   - Companies are kept if referenced by a kept lead OR associated with the target campaign.
 *
 * Usage:
 *   node scripts/campaignCleanupDelete.js                     # dry run
 *   CONFIRM_DELETE=YES node scripts/campaignCleanupDelete.js  # execute
 *   KEEP_CAMPAIGN="RANA EX" CONFIRM_DELETE=YES node scripts/campaignCleanupDelete.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import { ProjectCampaign } from '../src/models/ProjectCampaign.js';
import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { Opportunity } from '../src/models/Opportunity.js';
import { Reply } from '../src/models/Reply.js';
import { SequenceEnrollment } from '../src/models/SequenceEnrollment.js';
import { Sequence } from '../src/models/Sequence.js';
import { RevenueEntry } from '../src/models/RevenueEntry.js';
import { Suppression } from '../src/models/Suppression.js';
import { AnalyticsSnapshot } from '../src/models/AnalyticsSnapshot.js';
import { SendJob } from '../src/models/SendJob.js';
import { ContactInteraction } from '../src/models/ContactInteraction.js';
import { Task } from '../src/models/Task.js';

const KEEP_NAME = process.env.KEEP_CAMPAIGN || 'RANA EX';
const EXECUTE = process.env.CONFIRM_DELETE === 'YES';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set in server/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${EXECUTE ? '*** EXECUTE (hard delete) ***' : 'DRY RUN'}\n`);

  const keep = await ProjectCampaign.findOne({
    projectName: new RegExp(`^\\s*${KEEP_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'),
  }).lean();
  if (!keep) throw new Error(`Campaign "${KEEP_NAME}" not found. Aborting.`);
  const keepId = keep._id;
  console.log(`Keeping campaign: "${keep.projectName}" [${keepId}]\n`);

  // Capture kept id-sets BEFORE any deletion.
  const keptLeads = await Lead.find({ campaignId: keepId }, { _id: 1, companyId: 1 }).lean();
  const keptLeadIds = keptLeads.map((l) => l._id);
  const companyIdSet = new Set(keptLeads.map((l) => String(l.companyId)).filter(Boolean));
  (await Company.find({ projectsAssociated: keepId }, { _id: 1 }).lean()).forEach((c) =>
    companyIdSet.add(String(c._id))
  );
  const keptCompanyIds = [...companyIdSet].map((s) => new mongoose.Types.ObjectId(s));
  const keptOppIds = (await Opportunity.find({ campaignId: keepId }, { _id: 1 }).lean()).map(
    (o) => o._id
  );
  const keptEnrollmentIds = (
    await SequenceEnrollment.find({ campaignId: keepId }, { _id: 1 }).lean()
  ).map((e) => e._id);

  const ops = [
    ['ProjectCampaign', ProjectCampaign, { _id: { $ne: keepId } }],
    ['Lead', Lead, { campaignId: { $ne: keepId } }],
    ['Company', Company, { _id: { $nin: keptCompanyIds } }],
    ['Opportunity', Opportunity, { campaignId: { $ne: keepId } }],
    ['Reply', Reply, { campaignId: { $ne: keepId } }],
    ['SequenceEnrollment', SequenceEnrollment, { campaignId: { $ne: keepId } }],
    ['Sequence', Sequence, { campaignId: { $ne: keepId } }],
    ['RevenueEntry', RevenueEntry, { campaignId: { $ne: keepId } }],
    ['Suppression', Suppression, { campaignId: { $nin: [keepId, null] } }],
    [
      'AnalyticsSnapshot',
      AnalyticsSnapshot,
      { scope: { $ne: 'global' }, campaignId: { $ne: keepId } },
    ],
    [
      'SendJob',
      SendJob,
      { leadId: { $nin: keptLeadIds }, enrollmentId: { $nin: keptEnrollmentIds } },
    ],
    [
      'ContactInteraction',
      ContactInteraction,
      { leadId: { $nin: keptLeadIds }, companyId: { $nin: keptCompanyIds } },
    ],
    [
      'Task',
      Task,
      {
        leadId: { $nin: keptLeadIds },
        companyId: { $nin: keptCompanyIds },
        opportunityId: { $nin: keptOppIds },
      },
    ],
  ];

  console.log(`${'Collection'.padEnd(22)}${'toDelete'.padStart(10)}${'result'.padStart(12)}`);
  console.log('-'.repeat(44));
  let grand = 0;
  for (const [label, Model, filter] of ops) {
    const n = await Model.countDocuments(filter);
    grand += n;
    let result = 'dry-run';
    if (EXECUTE && n > 0) {
      const res = await Model.deleteMany(filter);
      result = `deleted ${res.deletedCount}`;
    } else if (EXECUTE) {
      result = 'deleted 0';
    }
    console.log(`${label.padEnd(22)}${String(n).padStart(10)}${result.padStart(12)}`);
  }
  console.log('-'.repeat(44));
  console.log(`${'TOTAL'.padEnd(22)}${String(grand).padStart(10)}\n`);

  if (EXECUTE) {
    // Remove dangling references to deleted campaigns from kept companies.
    const pull = await Company.updateMany(
      { _id: { $in: keptCompanyIds } },
      { $pull: { projectsAssociated: { $ne: keepId } } }
    );
    console.log(`Cleaned projectsAssociated on kept companies (matched ${pull.matchedCount}).`);
  }

  await mongoose.disconnect();
  console.log(EXECUTE ? '\nDeletion complete.' : '\nDry run complete (no changes).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
