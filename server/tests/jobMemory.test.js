import test from 'node:test';
import assert from 'node:assert/strict';
import { JOB_MEMORY_TYPES, normalizeJobMemoryType } from '../src/services/jobMemoryService.js';

test('Job Memory uses a governed but practical set of entry types', () => {
  assert.ok(JOB_MEMORY_TYPES.includes('requirement'));
  assert.ok(JOB_MEMORY_TYPES.includes('issue'));
  assert.ok(JOB_MEMORY_TYPES.includes('installation_update'));
  assert.ok(JOB_MEMORY_TYPES.includes('learning'));
  assert.equal(new Set(JOB_MEMORY_TYPES).size, JOB_MEMORY_TYPES.length);
});

test('Job Memory type normalization is stable and rejects uncontrolled labels', () => {
  assert.equal(normalizeJobMemoryType('Client_Comment'), 'client_comment');
  assert.equal(normalizeJobMemoryType(' issue '), 'issue');
  assert.equal(normalizeJobMemoryType('something invented'), 'update');
  assert.equal(normalizeJobMemoryType(), 'update');
});
