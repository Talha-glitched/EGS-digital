import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PipelineConfig, DEFAULT_PIPELINE_STAGES } from '../src/models/PipelineConfig.js';
import { Opportunity } from '../src/models/Opportunity.js';
import { Job } from '../src/models/Job.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const STAGE_MAPPING = {
  'New Lead': 'Inquiry',
  'Contacted': 'Inquiry',
  'Qualified': 'Inquiry',
  'Discovery / Site Visit': 'Inquiry',
  'Brief Received': 'Inquiry',
  'Estimate In Progress': 'Design',
  'Proposal Sent': 'Quotation Sent',
  'Decision Maker Review': 'Quotation Sent',
  'Negotiation': 'Waiting Adv/ PO',
  'Contract Sent': 'Waiting Adv/ PO',
  'Closed Won': 'Job Done',
  'Closed Lost': 'Job Lost',
};

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const validStageNames = DEFAULT_PIPELINE_STAGES.map((s) => s.name);
  console.log('Target pipeline stages:', validStageNames);

  // 1. Reset / Update PipelineConfig
  console.log('Updating PipelineConfig in DB...');
  await PipelineConfig.findOneAndUpdate(
    { key: 'sales' },
    { stages: DEFAULT_PIPELINE_STAGES, updatedBy: 'migration_script' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('PipelineConfig updated.');

  // 2. Migrate Opportunities
  console.log('Migrating Opportunity records...');
  let totalOppMigrated = 0;
  for (const [oldStage, newStage] of Object.entries(STAGE_MAPPING)) {
    const res = await Opportunity.updateMany({ stage: oldStage }, { $set: { stage: newStage } });
    if (res.modifiedCount > 0) {
      console.log(`Mapped ${res.modifiedCount} opportunities from "${oldStage}" -> "${newStage}"`);
      totalOppMigrated += res.modifiedCount;
    }
  }

  const fallbackOpp = await Opportunity.updateMany(
    { stage: { $nin: validStageNames } },
    { $set: { stage: 'Inquiry' } }
  );
  if (fallbackOpp.modifiedCount > 0) {
    console.log(`Updated ${fallbackOpp.modifiedCount} fallback opportunities to "Inquiry"`);
    totalOppMigrated += fallbackOpp.modifiedCount;
  }
  console.log(`Total opportunities updated: ${totalOppMigrated}`);

  // 3. Migrate Jobs
  console.log('Migrating Job records...');
  const resClosedWon = await Job.updateMany({ currentStatus: 'Closed Won' }, { $set: { currentStatus: 'Job Done' } });
  const resClosedLost = await Job.updateMany({ currentStatus: 'Closed Lost' }, { $set: { currentStatus: 'Job Lost' } });
  console.log(`Updated ${resClosedWon.modifiedCount} jobs from "Closed Won" -> "Job Done"`);
  console.log(`Updated ${resClosedLost.modifiedCount} jobs from "Closed Lost" -> "Job Lost"`);

  const validStatuses = [...validStageNames, 'Other'];
  const fallbackJobs = await Job.updateMany(
    { currentStatus: { $nin: validStatuses } },
    { $set: { currentStatus: 'Inquiry' } }
  );
  if (fallbackJobs.modifiedCount > 0) {
    console.log(`Updated ${fallbackJobs.modifiedCount} fallback jobs to "Inquiry"`);
  }

  console.log('Pipeline stage migration completed successfully!');
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
