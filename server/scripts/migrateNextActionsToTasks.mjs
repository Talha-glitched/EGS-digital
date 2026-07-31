import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { OngoingJob } from '../src/models/OngoingJob.js';
import { Task } from '../src/models/Task.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const jobs = await OngoingJob.find({ nextAction: { $exists: true, $ne: '' } });
  console.log(`Found ${jobs.length} jobs with nextAction to migrate.\n`);

  let createdTasksCount = 0;

  for (const job of jobs) {
    const nextActionText = job.nextAction.trim();
    if (!nextActionText) continue;

    // Check if task already exists for this job title to prevent duplicates
    const existingTask = await Task.findOne({
      title: nextActionText,
      $or: [{ opportunityId: job._id }, { ongoingJobId: job._id }],
    });

    let taskDoc = existingTask;
    if (!existingTask) {
      taskDoc = await Task.create({
        title: nextActionText,
        opportunityId: job._id,
        ongoingJobId: job._id,
        companyId: job.companyId || null,
        campaignId: job.campaignId || null,
        owner: job.owner || 'admin',
        dueAt: job.nextActionDueAt || null,
        status: 'Open',
        priority: 'Normal',
        notes: '',
      });
      createdTasksCount++;
      console.log(`[CREATED TASK] "${taskDoc.title}" for job "${job.name}" (${job._id})`);
    } else {
      console.log(`[EXISTING TASK] "${taskDoc.title}" already exists for job "${job.name}" (${job._id})`);
    }

    // Clear nextAction on OngoingJob
    await OngoingJob.updateOne(
      { _id: job._id },
      { $set: { nextAction: '', nextActionDueAt: null } }
    );
    console.log(`[CLEARED NEXT ACTION] on job "${job.name}" (${job._id})\n`);
  }

  console.log(`Migration complete. ${createdTasksCount} new tasks created, ${jobs.length} jobs updated.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
