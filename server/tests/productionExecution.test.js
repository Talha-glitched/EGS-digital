import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_TYPES, ACTIVITY_STATUSES } from '../src/services/productionExecutionService.js';

test('EGS production activity catalogue covers the physical delivery lifecycle', () => {
  for (const type of ['site_survey', 'printing', 'fabrication', 'packing', 'transport', 'installation', 'dismantling', 'return']) {
    assert.ok(ACTIVITY_TYPES.includes(type));
  }
  assert.equal(new Set(ACTIVITY_TYPES).size, ACTIVITY_TYPES.length);
});

test('production activity states distinguish blocked, ready and completed work', () => {
  assert.ok(ACTIVITY_STATUSES.includes('blocked'));
  assert.ok(ACTIVITY_STATUSES.includes('ready'));
  assert.ok(ACTIVITY_STATUSES.includes('completed'));
  assert.equal(new Set(ACTIVITY_STATUSES).size, ACTIVITY_STATUSES.length);
});
