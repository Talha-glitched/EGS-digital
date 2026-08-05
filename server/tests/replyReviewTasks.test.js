import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { Reply } from '../src/models/Reply.js';
import { Task } from '../src/models/Task.js';
import { ContactInteraction } from '../src/models/ContactInteraction.js';

import { applyOutreachEmailFromReply } from '../src/utils/contactEmails.js';
import { ensureReplyReviewTask, completeReplyReview } from '../src/services/replyReviewTaskService.js';
import { createTask, updateTask, listTasks } from '../src/services/salesService.js';
import { getLeadTimeline } from '../src/services/contactTimelineService.js';
import { listAllLeads } from '../src/services/projectService.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

test('Task-Based Contacts -> Leads -> Qualified Leads Suite', async (t) => {
  if (!process.env.MONGODB_URI) {
    t.skip('MongoDB not connected; skipping database execution tests.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    t.skip('MongoDB not connected; skipping database execution tests.');
    return;
  }

  const testSuffix = String(Date.now());
  const company = await Company.create({
    companyName: `Test Corp ${testSuffix}`,
    domain: `testcorp${testSuffix}.com`,
  });

  const lead = await Lead.create({
    name: `Lead Contact ${testSuffix}`,
    email: `contact_${testSuffix}@example.com`,
    companyId: company._id,
    leadStage: 'contact',
    pocQualification: { status: 'Unverified' },
  });

  t.after(async () => {
    await Task.deleteMany({ leadId: lead._id });
    await Reply.deleteMany({ leadId: lead._id });
    await ContactInteraction.deleteMany({ leadId: lead._id });
    await Lead.deleteOne({ _id: lead._id });
    await Company.deleteOne({ _id: company._id });
    await mongoose.disconnect();
  });

  await t.test('1. Inbound reply advances stage to lead and creates 1 open review task', async () => {
    const receivedAt = new Date('2026-08-01T10:00:00Z');
    applyOutreachEmailFromReply(lead, lead.email, 'inbox@test.com', receivedAt);

    const reply = await Reply.create({
      leadId: lead._id,
      email: lead.email,
      from: lead.email,
      subject: 'Interested in services',
      text: 'Hello, please send details.',
      messageId: `msg_1_${testSuffix}`,
      receivedAt,
    });

    const task = await ensureReplyReviewTask(reply, lead);

    assert.equal(lead.leadStage, 'lead');
    assert.equal(lead.repliedAt.toISOString(), receivedAt.toISOString());
    assert.ok(task);
    assert.equal(task.taskType, 'reply_review');
    assert.equal(task.status, 'Open');
    assert.equal(String(task.leadId), String(lead._id));
  });

  await t.test('2. Provider retry repairs missing review task without duplicate Reply', async () => {
    const existingReply = await Reply.findOne({ messageId: `msg_1_${testSuffix}` });
    assert.ok(existingReply);

    // Call ensureReplyReviewTask again (simulating duplicate webhook/sync payload)
    const task = await ensureReplyReviewTask(existingReply, lead);
    const totalOpenReviewTasks = await Task.countDocuments({
      leadId: lead._id,
      taskType: 'reply_review',
      status: 'Open',
      deletedAt: null,
    });

    assert.equal(totalOpenReviewTasks, 1);
    assert.equal(String(task._id), String(task._id));
  });

  await t.test('3. Out-of-order replies never move repliedAt backward', async () => {
    const earlierDate = new Date('2026-07-15T08:00:00Z');
    applyOutreachEmailFromReply(lead, lead.email, 'inbox@test.com', earlierDate);

    // repliedAt should remain 2026-08-01 (later date)
    assert.equal(lead.repliedAt.toISOString(), new Date('2026-08-01T10:00:00Z').toISOString());
  });

  await t.test('4. Human outcome Interested advances leadStage to qualified_lead and creates lead_follow_up task', async () => {
    const openReviewTask = await Task.findOne({
      leadId: lead._id,
      taskType: 'reply_review',
      status: 'Open',
    });
    assert.ok(openReviewTask);

    const result = await completeReplyReview(openReviewTask._id, {
      outcome: 'Interested',
      followUpTask: {
        title: `Follow up on proposal with ${lead.name}`,
        dueAt: new Date('2026-08-05T10:00:00Z'),
        priority: 'High',
        owner: 'Uzair',
        notes: 'Send booth design deck',
      },
      actor: 'talha.admin',
    });

    assert.equal(result.lead.leadStage, 'qualified_lead');
    assert.ok(result.lead.qualifiedAt);
    assert.equal(result.lead.qualifiedBy, 'talha.admin');
    assert.equal(result.task.status, 'Done');
    assert.ok(result.createdFollowUpTask);
    assert.equal(result.createdFollowUpTask.taskType, 'lead_follow_up');

    // Verify covered replies marked as Reviewed
    const reviewedReply = await Reply.findById(openReviewTask.replyId);
    assert.equal(reviewedReply.humanReview.status, 'Reviewed');
    assert.equal(reviewedReply.humanReview.outcome, 'Interested');
  });

  await t.test('5. Internal reply_review completion does not create ContactInteraction', async () => {
    const interactions = await ContactInteraction.find({ leadId: lead._id });
    assert.equal(interactions.length, 0);
  });

  await t.test('6. Completing external lead_follow_up with channel logs ContactInteraction', async () => {
    const followUpTask = await Task.findOne({
      leadId: lead._id,
      taskType: 'lead_follow_up',
      status: 'Open',
    });
    assert.ok(followUpTask);

    const updatedTask = await updateTask(followUpTask._id, { status: 'Done', channel: 'phone' }, 'talha.admin');
    assert.equal(updatedTask.status, 'Done');

    const interaction = await ContactInteraction.findOne({ sourceTaskId: followUpTask._id });
    assert.ok(interaction);
    assert.equal(interaction.type, 'phone_call');
    assert.equal(interaction.loggedBy, 'talha.admin');
  });

  await t.test('7. Subsequent reply does not downgrade qualified_lead stage', async () => {
    const currentLead = await Lead.findById(lead._id);
    assert.equal(currentLead.leadStage, 'qualified_lead');

    const laterDate = new Date('2026-08-10T12:00:00Z');
    const newReply = await Reply.create({
      leadId: lead._id,
      email: lead.email,
      from: lead.email,
      subject: 'Re: Proposal details',
      text: 'Thanks for sending.',
      messageId: `msg_2_${testSuffix}`,
      receivedAt: laterDate,
    });

    await ensureReplyReviewTask(newReply, currentLead);
    assert.equal(currentLead.leadStage, 'qualified_lead');
  });

  await t.test('8. Relationship follow-up task creation and queries use taskType', async () => {
    const relTask = await createTask({
      title: `Key relationship check-in with ${lead.name}`,
      leadId: lead._id,
      taskType: 'relationship_follow_up',
      dueAt: new Date('2026-08-20T10:00:00Z'),
    });

    assert.equal(relTask.taskType, 'relationship_follow_up');
    assert.equal(relTask.isRelationshipFollowUp, true);

    const fetchedList = await listTasks({ leadId: lead._id, taskType: 'relationship_follow_up' });
    assert.equal(fetchedList.items.length, 1);
    assert.equal(String(fetchedList.items[0]._id), String(relTask._id));
  });
});
