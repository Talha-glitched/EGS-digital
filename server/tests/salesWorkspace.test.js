import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Opportunity, OPPORTUNITY_STAGES } from '../src/models/Opportunity.js';
import { Task } from '../src/models/Task.js';

test('opportunity model supports the full commercial pipeline', () => {
  assert.deepEqual(OPPORTUNITY_STAGES, [
    'New Lead', 'Contacted', 'Qualified', 'Discovery / Site Visit', 'Brief Received',
    'Estimate In Progress', 'Proposal Sent', 'Decision Maker Review', 'Negotiation',
    'Contract Sent', 'Closed Won', 'Closed Lost',
  ]);
  const opportunity = new Opportunity({
    name: 'GITEX stand',
    companyId: new mongoose.Types.ObjectId(),
    valueAed: 150000,
    probability: 40,
  });
  assert.equal(opportunity.validateSync(), undefined);
  assert.equal(opportunity.stage, 'New Lead');
});

test('opportunity requires an account and task requires a title', () => {
  const opportunityError = new Opportunity({ name: 'Missing account' }).validateSync();
  assert.ok(opportunityError.errors.companyId);
  const taskError = new Task({ priority: 'High' }).validateSync();
  assert.ok(taskError.errors.title);
});

test('task defaults support an actionable follow-up queue', () => {
  const task = new Task({ title: 'Call marketing director' });
  assert.equal(task.validateSync(), undefined);
  assert.equal(task.status, 'Open');
  assert.equal(task.priority, 'Normal');
});
