import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDubaiBusinessDate,
} from '../src/services/dailyReviewService.js';

test('Daily Review & Working View Backend Suite', async (t) => {
  await t.test('1. getDubaiBusinessDate returns YYYY-MM-DD format', () => {
    const dStr = getDubaiBusinessDate();
    assert.match(dStr, /^\d{4}-\d{2}-\d{2}$/);
  });
});
