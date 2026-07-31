import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Reply } from '../src/models/Reply.js';
import { Task } from '../src/models/Task.js';
import { convertOpenTasksToRelationshipFollowUps } from '../src/services/unifiedFollowUpService.js';
import { ensureReplyReviewTask } from '../src/services/replyReviewTaskService.js';

test('Unified Follow-ups & Right POC Safeguards Test Suite', async (t) => {
  const isMongoConnected = mongoose.connection.readyState === 1;

  await t.test('1. convertOpenTasksToRelationshipFollowUps converts lead tasks and reply reviews idempotently', async () => {
    if (!isMongoConnected) return;

    const lead = await Lead.create({
      name: 'Test Contact Alpha',
      email: 'alpha@example.com',
      companyName: 'Alpha Corp',
      leadStage: 'lead',
      pocQualification: { status: 'Confirmed' },
    });

    const reply = await Reply.create({
      leadId: lead._id,
      email: 'alpha@example.com',
      messageId: `msg_${Date.now()}_alpha`,
      subject: 'Interested in booth design',
      receivedAt: new Date(),
      humanReview: { status: 'Unreviewed' },
    });

    const leadTask = await Task.create({
      title: 'Follow up lead',
      taskType: 'lead_follow_up',
      status: 'Open',
      leadId: lead._id,
    });

    const replyTask = await Task.create({
      title: 'Review reply and decide next step: Test Contact Alpha — Alpha Corp',
      taskType: 'reply_review',
      status: 'Open',
      leadId: lead._id,
      replyId: reply._id,
    });

    // Execute conversion
    const res = await convertOpenTasksToRelationshipFollowUps(lead._id, lead.companyId, lead.name, 'admin');
    assert.equal(res.convertedTasks, 2);

    const updatedLeadTask = await Task.findById(leadTask._id);
    assert.equal(updatedLeadTask.taskType, 'relationship_follow_up');

    const updatedReplyTask = await Task.findById(replyTask._id);
    assert.equal(updatedReplyTask.taskType, 'relationship_follow_up');
    assert.equal(updatedReplyTask.title, 'Follow up with Test Contact Alpha about their reply');

    const updatedReply = await Reply.findById(reply._id);
    assert.equal(updatedReply.humanReview.status, 'Not Required');

    // Re-running transition is idempotent
    const res2 = await convertOpenTasksToRelationshipFollowUps(lead._id, lead.companyId, lead.name, 'admin');
    assert.equal(res2.convertedTasks, 0);

    // Clean up
    await Task.deleteMany({ leadId: lead._id });
    await Reply.deleteMany({ leadId: lead._id });
    await Lead.deleteOne({ _id: lead._id });
  });

  await t.test('2. Confirmed Right POC inbound reply creates reply-linked relationship follow-up without overwriting manual tasks', async () => {
    if (!isMongoConnected) return;

    const lead = await Lead.create({
      name: 'Confirmed POC Beta',
      email: 'beta@example.com',
      companyName: 'Beta Ltd',
      leadStage: 'contact',
      pocQualification: { status: 'Confirmed' },
    });

    // Create an unrelated manual relationship follow-up
    const manualTask = await Task.create({
      title: 'Manual relationship check-in',
      taskType: 'relationship_follow_up',
      status: 'Open',
      leadId: lead._id,
      replyId: null, // manual task without replyId
    });

    const reply = await Reply.create({
      leadId: lead._id,
      email: 'beta@example.com',
      messageId: `msg_${Date.now()}_beta`,
      subject: 'Quotation inquiry',
      receivedAt: new Date(),
      humanReview: { status: 'Unreviewed' },
    });

    // Ingest reply for confirmed Right POC
    const replyTask = await ensureReplyReviewTask(reply, lead);
    assert.equal(replyTask.taskType, 'relationship_follow_up');
    assert.equal(replyTask.title, 'Follow up with Confirmed POC Beta about their reply');
    assert.equal(String(replyTask.replyId), String(reply._id));

    // Verify manual task was NOT touched or overwritten
    const freshManualTask = await Task.findById(manualTask._id);
    assert.equal(freshManualTask.title, 'Manual relationship check-in');
    assert.equal(freshManualTask.replyId, null);

    // Verify reply status was set to 'Not Required'
    const freshReply = await Reply.findById(reply._id);
    assert.equal(freshReply.humanReview.status, 'Not Required');

    // Second reply before completion updates the existing reply-linked task
    const secondReply = await Reply.create({
      leadId: lead._id,
      email: 'beta@example.com',
      messageId: `msg_${Date.now()}_beta2`,
      subject: 'Follow-up on quotation',
      receivedAt: new Date(),
      humanReview: { status: 'Unreviewed' },
    });

    const secondTaskResult = await ensureReplyReviewTask(secondReply, lead);
    assert.equal(String(secondTaskResult._id), String(replyTask._id));
    assert.equal(String(secondTaskResult.replyId), String(secondReply._id));

    // Clean up
    await Task.deleteMany({ leadId: lead._id });
    await Reply.deleteMany({ leadId: lead._id });
    await Lead.deleteOne({ _id: lead._id });
  });

  await t.test('3. Non-Right-POC inbound reply creates reply_review task with unreviewed status', async () => {
    if (!isMongoConnected) return;

    const lead = await Lead.create({
      name: 'Unconfirmed Gamma',
      email: 'gamma@example.com',
      companyName: 'Gamma Inc',
      leadStage: 'contact',
      pocQualification: { status: 'Unverified' },
    });

    const reply = await Reply.create({
      leadId: lead._id,
      email: 'gamma@example.com',
      messageId: `msg_${Date.now()}_gamma`,
      subject: 'Tell me more',
      receivedAt: new Date(),
      humanReview: { status: 'Unreviewed' },
    });

    const task = await ensureReplyReviewTask(reply, lead);
    assert.equal(task.taskType, 'reply_review');

    const freshReply = await Reply.findById(reply._id);
    assert.equal(freshReply.humanReview.status, 'Unreviewed');

    // Clean up
    await Task.deleteMany({ leadId: lead._id });
    await Reply.deleteMany({ leadId: lead._id });
    await Lead.deleteOne({ _id: lead._id });
  });
});
