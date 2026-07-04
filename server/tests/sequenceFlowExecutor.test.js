import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCondition,
  normalizeFlowGraph,
  resolveEntryNodeId,
  resolveNextEmailTarget,
} from '../src/utils/sequenceFlowExecutor.js';

test('resolveNextEmailTarget walks waits and conditions on the no-reply path', () => {
  const flowGraph = normalizeFlowGraph({
    nodes: [
      { id: 'start', type: 'start', x: 0, y: 0, data: {} },
      { id: 'email-1', type: 'email', x: 0, y: 0, data: { subjectTemplate: 'One', bodyTemplate: 'First' } },
      { id: 'wait-1', type: 'wait', x: 0, y: 0, data: { amount: 5, unit: 'minutes' } },
      { id: 'cond-1', type: 'condition', x: 0, y: 0, data: { conditionType: 'no_reply', trueAction: 'continue', falseAction: 'continue' } },
      { id: 'email-yes', type: 'email', x: 0, y: 0, data: { subjectTemplate: 'Yes', bodyTemplate: 'Yes path' } },
      { id: 'email-no', type: 'email', x: 0, y: 0, data: { subjectTemplate: 'No', bodyTemplate: 'No path' } },
    ],
    edges: [
      { from: 'start', to: 'email-1', branch: 'default' },
      { from: 'email-1', to: 'wait-1', branch: 'default' },
      { from: 'wait-1', to: 'cond-1', branch: 'default' },
      { from: 'cond-1', to: 'email-yes', branch: 'true' },
      { from: 'cond-1', to: 'email-no', branch: 'false' },
    ],
  });

  assert.equal(resolveEntryNodeId(flowGraph), 'email-1');

  const lead = { deliveryStatus: 'Emailed Outbound', trackingMetrics: {} };
  const afterFirst = resolveNextEmailTarget(flowGraph, 'wait-1', lead);
  assert.equal(afterFirst.nodeId, 'email-yes');
  assert.equal(afterFirst.delayMs, 5 * 60 * 1000);
  assert.equal(afterFirst.completed, false);
});

test('evaluateCondition handles replied and no_reply', () => {
  const replied = { deliveryStatus: 'Replied', repliedAt: new Date(), trackingMetrics: {} };
  const pending = { deliveryStatus: 'Emailed Outbound', trackingMetrics: {} };
  assert.equal(evaluateCondition(replied, { conditionType: 'replied' }), true);
  assert.equal(evaluateCondition(pending, { conditionType: 'no_reply' }), true);
  assert.equal(evaluateCondition(replied, { conditionType: 'no_reply' }), false);
});
