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
  console.log(`Found ${jobs.length} jobs with nextAction:`);
  for (const job of jobs) {
    console.log(`- [${job._id}] ${job.name} (Company: ${job.companyId}): "${job.nextAction}"`);
  }

  const allJobs = await OngoingJob.find({});
  console.log(`Total OngoingJobs in DB: ${allJobs.length}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
