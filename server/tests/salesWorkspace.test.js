import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PIPELINE_STAGES,
  CLOSED_WON_STAGE,
  CLOSED_LOST_STAGE,
  isClosedStage,
  stageNames,
  probabilityForStage,
} from '../src/constants/ongoingJobPipeline.js';

test('pipeline stages support the full commercial pipeline', () => {
  const names = stageNames(DEFAULT_PIPELINE_STAGES);
  assert.deepEqual(names, [
    'Inquiry', 'Design', 'Quotation Sent', 'Waiting Adv/ PO', 'In Production',
    'Installation', 'Ready', 'Waiting Balance Payment', 'Job Done', 'Job Lost',
  ]);
});

test('isClosedStage correctly identifies terminal stages', () => {
  assert.equal(isClosedStage(CLOSED_WON_STAGE), true);
  assert.equal(isClosedStage(CLOSED_LOST_STAGE), true);
  assert.equal(isClosedStage('Closed Won'), true);
  assert.equal(isClosedStage('Closed Lost'), true);
  assert.equal(isClosedStage('Inquiry'), false);
  assert.equal(isClosedStage('In Production'), false);
});

test('probabilityForStage returns expected probabilities', () => {
  assert.equal(probabilityForStage(DEFAULT_PIPELINE_STAGES, 'Inquiry'), 10);
  assert.equal(probabilityForStage(DEFAULT_PIPELINE_STAGES, 'Job Done'), 100);
  assert.equal(probabilityForStage(DEFAULT_PIPELINE_STAGES, 'Job Lost'), 0);
  assert.equal(probabilityForStage(DEFAULT_PIPELINE_STAGES, 'NonExistent'), 10);
});
