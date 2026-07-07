/**
 * READ-ONLY inventory script.
 *
 * Reports how much CRM data exists, and how much belongs to a target campaign
 * (default: "RANA EX Campaign") vs. everything else. Makes NO writes.
 *
 * Usage:
 *   node scripts/campaignCleanupInventory.js
 *   KEEP_CAMPAIGN="RANA EX Campaign" node scripts/campaignCleanupInventory.js
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
import { AuditLog } from '../src/models/AuditLog.js';
import { RecordRevision } from '../src/models/RecordRevision.js';
import { User } from '../src/models/User.js';
import { Page } from '../src/models/Page.js';
import { PipelineConfig } from '../src/models/PipelineConfig.js';

const KEEP_NAME = process.env.KEEP_CAMPAIGN || 'RANA EX Campaign';

function pad(label) {
  return String(label).padEnd(22, ' ');
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set in server/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const allCampaigns = await ProjectCampaign.find({}, { projectName: 1 }).lean();
  console.log(`All campaigns in DB (${allCampaigns.length}):`);
  allCampaigns.forEach((c) => console.log(`   - "${c.projectName}"  [${c._id}]`));
  console.log('');

  const keep = allCampaigns.find(
    (c) => (c.projectName || '').trim().toLowerCase() === KEEP_NAME.trim().toLowerCase()
  );
  if (!keep) {
    console.log(`!! No campaign exactly named "${KEEP_NAME}" found. Aborting inventory.`);
    await mongoose.disconnect();
    return;
  }
  const keepId = keep._id;
  console.log(`Target to KEEP: "${keep.projectName}"  [${keepId}]\n`);

  // Kept leads / companies / opportunities / enrollments (ids used for derived collections)
  const keptLeads = await Lead.find({ campaignId: keepId }, { _id: 1, companyId: 1 }).lean();
  const keptLeadIds = keptLeads.map((l) => l._id);
  const leadCompanyIds = new Set(keptLeads.map((l) => String(l.companyId)));

  const companiesByAssoc = await Company.find(
    { projectsAssociated: keepId },
    { _id: 1 }
  ).lean();
  companiesByAssoc.forEach((c) => leadCompanyIds.add(String(c._id)));
  const keptCompanyIds = [...leadCompanyIds].map((s) => new mongoose.Types.ObjectId(s));

  const keptOpps = await Opportunity.find({ campaignId: keepId }, { _id: 1 }).lean();
  const keptOppIds = keptOpps.map((o) => o._id);

  const keptEnrollments = await SequenceEnrollment.find(
    { campaignId: keepId },
    { _id: 1 }
  ).lean();
  const keptEnrollmentIds = keptEnrollments.map((e) => e._id);

  const rows = [];
  const add = async (label, Model, keepFilter) => {
    const total = await Model.countDocuments({});
    const kept = keepFilter ? await Model.countDocuments(keepFilter) : 0;
    rows.push({ label, total, kept, del: total - kept, scoped: !!keepFilter });
  };

  // Campaign-scoped collections
  await add('ProjectCampaign', ProjectCampaign, { _id: keepId });
  await add('Lead', Lead, { campaignId: keepId });
  await add('Company', Company, { _id: { $in: keptCompanyIds } });
  await add('Opportunity', Opportunity, { campaignId: keepId });
  await add('Reply', Reply, { campaignId: keepId });
  await add('SequenceEnrollment', SequenceEnrollment, { campaignId: keepId });
  await add('Sequence', Sequence, { campaignId: keepId });
  await add('RevenueEntry', RevenueEntry, { campaignId: keepId });
  await add('Suppression', Suppression, {
    $or: [{ campaignId: keepId }, { campaignId: null }],
  });
  await add('AnalyticsSnapshot', AnalyticsSnapshot, {
    $or: [{ campaignId: keepId }, { scope: 'global' }],
  });

  // Derived collections
  await add('SendJob', SendJob, {
    $or: [{ leadId: { $in: keptLeadIds } }, { enrollmentId: { $in: keptEnrollmentIds } }],
  });
  await add('ContactInteraction', ContactInteraction, {
    $or: [{ leadId: { $in: keptLeadIds } }, { companyId: { $in: keptCompanyIds } }],
  });
  await add('Task', Task, {
    $or: [
      { leadId: { $in: keptLeadIds } },
      { companyId: { $in: keptCompanyIds } },
      { opportunityId: { $in: keptOppIds } },
    ],
  });

  // Global / config (would normally be preserved)
  const globals = [];
  const addGlobal = async (label, Model) => {
    globals.push({ label, total: await Model.countDocuments({}) });
  };
  await addGlobal('User', User);
  await addGlobal('Page', Page);
  await addGlobal('PipelineConfig', PipelineConfig);
  await addGlobal('AuditLog', AuditLog);
  await addGlobal('RecordRevision', RecordRevision);

  console.log('CAMPAIGN-SCOPED / DERIVED COLLECTIONS');
  console.log(`${pad('Collection')}${'total'.padStart(8)}${'keep'.padStart(8)}${'DELETE'.padStart(10)}`);
  console.log('-'.repeat(48));
  let totalDel = 0;
  for (const r of rows) {
    totalDel += r.del;
    console.log(`${pad(r.label)}${String(r.total).padStart(8)}${String(r.kept).padStart(8)}${String(r.del).padStart(10)}`);
  }
  console.log('-'.repeat(48));
  console.log(`${pad('TOTAL to delete')}${''.padStart(8)}${''.padStart(8)}${String(totalDel).padStart(10)}\n`);

  console.log('GLOBAL / CONFIG COLLECTIONS (proposed: PRESERVE)');
  console.log(`${pad('Collection')}${'total'.padStart(8)}`);
  console.log('-'.repeat(30));
  for (const g of globals) {
    console.log(`${pad(g.label)}${String(g.total).padStart(8)}`);
  }
  console.log('');

  await mongoose.disconnect();
  console.log('Done (read-only, no changes made).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
