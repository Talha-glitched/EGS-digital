import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { OngoingJob, ONGOING_JOB_STAGES } from '../src/models/OngoingJob.js';
import { CompletedJob, COMPLETED_JOB_CATEGORIES } from '../src/models/CompletedJob.js';
import { Task } from '../src/models/Task.js';
import { createCompletedJobFromOngoingJob, listCompletedJobs } from '../src/services/completedJobService.js';

test('OngoingJob model maps cleanly to opportunities collection and exports stages', () => {
  assert.ok(Array.isArray(ONGOING_JOB_STAGES));
  assert.equal(OngoingJob.collection.name, 'opportunities');

  const ongoingJob = new OngoingJob({
    name: 'Exhibition Stand Build',
    companyId: new mongoose.Types.ObjectId(),
    valueAed: 75000,
    stage: 'Inquiry',
  });

  assert.equal(ongoingJob.validateSync(), undefined);
  assert.equal(ongoingJob.name, 'Exhibition Stand Build');
  assert.equal(ongoingJob.stage, 'Inquiry');
});

test('CompletedJob model maps to jobs collection and supports ongoingJobId virtual', () => {
  assert.ok(Array.isArray(COMPLETED_JOB_CATEGORIES.typesOfJob));
  assert.equal(CompletedJob.collection.name, 'jobs');

  const sampleId = new mongoose.Types.ObjectId();
  const completedJob = new CompletedJob({
    jobNo: 501,
    company: 'Acme Corp',
    typeOfJob: 'Exhibition Stands',
    currentStatus: 'Job Done',
    ongoingJobId: sampleId,
  });

  assert.equal(completedJob.validateSync(), undefined);
  // Physical field is opportunityId, virtual is ongoingJobId
  assert.equal(String(completedJob.opportunityId), String(sampleId));
  assert.equal(String(completedJob.ongoingJobId), String(sampleId));

  const json = completedJob.toJSON();
  assert.equal(String(json.ongoingJobId), String(sampleId));
});

test('Task model supports ongoingJobId virtual mapping to opportunityId', () => {
  const sampleId = new mongoose.Types.ObjectId();
  const task = new Task({
    title: 'Send concept render',
    ongoingJobId: sampleId,
  });

  assert.equal(task.validateSync(), undefined);
  assert.equal(String(task.opportunityId), String(sampleId));
  assert.equal(String(task.ongoingJobId), String(sampleId));
});

test('createCompletedJobFromOngoingJob handles Job Done and rejects Job Lost', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('MongoDB not connected; skipping database execution tests.');
    return;
  }

  const sampleCompanyId = new mongoose.Types.ObjectId();

  const wonJob = await OngoingJob.create({
    name: 'Won Project',
    companyId: sampleCompanyId,
    stage: 'Job Done',
    valueAed: 50000,
  });

  const createdJob = await createCompletedJobFromOngoingJob(wonJob);
  assert.ok(createdJob);
  assert.equal(createdJob.currentStatus, 'Job Done');
  assert.equal(String(createdJob.opportunityId), String(wonJob._id));

  // Test idempotency: calling it again updates existing record, does not duplicate
  const duplicateCall = await createCompletedJobFromOngoingJob(wonJob);
  assert.equal(String(duplicateCall._id), String(createdJob._id));

  const lostJob = await OngoingJob.create({
    name: 'Lost Project',
    companyId: sampleCompanyId,
    stage: 'Job Lost',
    valueAed: 30000,
  });

  const lostResult = await createCompletedJobFromOngoingJob(lostJob);
  assert.equal(lostResult, null);

  // Clean up
  await OngoingJob.deleteOne({ _id: wonJob._id });
  await OngoingJob.deleteOne({ _id: lostJob._id });
  await CompletedJob.deleteOne({ _id: createdJob._id });
});
