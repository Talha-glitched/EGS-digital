import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPLETED_JOB_CATEGORIES } from '../src/services/completedJobService.js';
import { DEFAULT_PIPELINE_STAGES, isClosedStage } from '../src/constants/ongoingJobPipeline.js';

test('CompletedJob categories export valid job types and statuses', () => {
  assert.ok(Array.isArray(COMPLETED_JOB_CATEGORIES.typesOfJob));
  assert.ok(COMPLETED_JOB_CATEGORIES.typesOfJob.includes('Exhibition Stands'));
  assert.ok(COMPLETED_JOB_CATEGORIES.typesOfJob.includes('Retail Branding & Displays'));

  assert.ok(Array.isArray(COMPLETED_JOB_CATEGORIES.statuses));
  assert.ok(COMPLETED_JOB_CATEGORIES.statuses.includes('Job Done'));
  assert.ok(COMPLETED_JOB_CATEGORIES.statuses.includes('Job Lost'));
});

test('Pipeline stages support ongoing job lifecycle', () => {
  assert.ok(Array.isArray(DEFAULT_PIPELINE_STAGES));
  const inquiry = DEFAULT_PIPELINE_STAGES.find((s) => s.name === 'Inquiry');
  assert.ok(inquiry);
  assert.equal(inquiry.probability, 10);

  const done = DEFAULT_PIPELINE_STAGES.find((s) => s.name === 'Job Done');
  assert.ok(done);
  assert.equal(done.probability, 100);

  assert.equal(isClosedStage('Job Done'), true);
  assert.equal(isClosedStage('Inquiry'), false);
});
