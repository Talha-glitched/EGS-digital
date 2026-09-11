import test from 'node:test';
import assert from 'node:assert/strict';
import { convertOpenTasksToRelationshipFollowUps } from '../src/services/unifiedFollowUpService.js';

test('Unified Follow-ups & Right POC Safeguards Test Suite', async (t) => {
  await t.test('1. convertOpenTasksToRelationshipFollowUps handles null/empty lead gracefully', async () => {
    const res = await convertOpenTasksToRelationshipFollowUps(null, null, 'Test Contact');
    assert.deepEqual(res, { convertedTasks: 0, updatedReplies: 0 });
  });

  await t.test('2. convertOpenTasksToRelationshipFollowUps handles string leadId gracefully', async () => {
    const res = await convertOpenTasksToRelationshipFollowUps('00000000-0000-0000-0000-000000000000', null, 'Test Contact');
    assert.equal(typeof res.convertedTasks, 'number');
    assert.equal(typeof res.updatedReplies, 'number');
  });
});
