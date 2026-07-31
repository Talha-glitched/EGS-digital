import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { Task } from '../src/models/Task.js';
import { ContactInteraction } from '../src/models/ContactInteraction.js';
import { listTasks, createTask, updateTask } from '../src/services/salesService.js';
import { listAllLeads } from '../src/services/projectService.js';
import { getLeadTimeline } from '../src/services/contactTimelineService.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

test('Key Relationship Follow-up Integration Suite', async (t) => {
  if (!process.env.MONGODB_URI) {
    console.log('Skipping MongoDB tests: MONGODB_URI not configured.');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // Setup test fixtures
  const testSuffix = String(Date.now());
  const company = await Company.create({ companyName: `Test Co ${testSuffix}`, domain: `testco${testSuffix}.com` });
  const lead = await Lead.create({
    name: `Test Contact ${testSuffix}`,
    email: `contact_${testSuffix}@example.com`,
    companyId: company._id,
    pocQualification: { status: 'Confirmed' },
    relationshipProfile: { owner: 'Uzair', reminderNotes: 'Initial relationship context' },
  });

  t.after(async () => {
    await Task.deleteMany({ leadId: lead._id });
    await ContactInteraction.deleteMany({ leadId: lead._id });
    await Lead.deleteOne({ _id: lead._id });
    await Company.deleteOne({ _id: company._id });
    await mongoose.disconnect();
  });

  await t.test('1. createTask validation & company derivation for relationship tasks', async () => {
    // Rejects missing leadId
    await assert.rejects(
      async () => {
        await createTask({
          title: 'Invalid relationship task',
          isRelationshipFollowUp: true,
        });
      },
      (err) => err.status === 400 && err.message.includes('leadId')
    );

    // Successfully creates with derived companyId and unassigned owner support
    const task = await createTask({
      title: `Follow up with ${lead.name}`,
      leadId: lead._id,
      isRelationshipFollowUp: true,
      owner: '',
      dueAt: new Date('2026-08-15T10:00:00Z'),
      notes: 'Check exhibition booth designs',
    });

    assert.equal(String(task.leadId), String(lead._id));
    assert.equal(String(task.companyId), String(company._id));
    assert.equal(task.isRelationshipFollowUp, true);
    assert.equal(task.owner, '');
  });

  await t.test('2. listTasks filtering by leadId', async () => {
    try {
      const res = await listTasks({ leadId: lead._id, status: 'All' });
      assert.equal(res.items.length, 1);
      const fetchedLeadId = res.items[0].leadId?._id || res.items[0].leadId;
      assert.equal(String(fetchedLeadId), String(lead._id));
    } catch (err) {
      console.error('FAIL SUBTEST 2:', err);
      throw err;
    }
  });

  await t.test('3. updateTask requires channel to complete relationship follow-up task', async () => {
    try {
      const task = await Task.findOne({ leadId: lead._id, taskType: 'relationship_follow_up' });
      assert.ok(task);

      await assert.rejects(
        async () => {
          await updateTask(task._id, { status: 'Done' });
        },
        (err) => err.status === 400 && err.message.includes('channel required')
      );

      const refreshed = await Task.findById(task._id);
      assert.equal(refreshed.status, 'Open');
    } catch (err) {
      console.error('FAIL SUBTEST 3:', err);
      throw err;
    }
  });

  await t.test('4. Atomic completion creates ContactInteraction with matching sourceTaskId', async () => {
    try {
      const task = await Task.findOne({ leadId: lead._id, taskType: 'relationship_follow_up' });
      assert.ok(task);

      const updatedTask = await updateTask(task._id, { status: 'Done', channel: 'phone' }, 'talha.admin');
      assert.equal(updatedTask.status, 'Done');
      assert.ok(updatedTask.completedAt);
      assert.ok(updatedTask.interactionId);

      const interaction = await ContactInteraction.findOne({ sourceTaskId: task._id });
      assert.ok(interaction);
      assert.equal(String(interaction.leadId), String(lead._id));
      assert.equal(String(interaction.companyId), String(company._id));
      assert.equal(interaction.type, 'phone_call');
      assert.equal(interaction.direction, 'outbound');
      assert.equal(interaction.loggedBy, 'talha.admin');
      assert.equal(String(interaction._id), String(updatedTask.interactionId));
    } catch (err) {
      console.error('FAIL SUBTEST 4:', err);
      throw err;
    }
  });

  await t.test('5. Duplicate completion attempt is idempotent', async () => {
    try {
      const task = await Task.findOne({ leadId: lead._id, taskType: 'relationship_follow_up' });

      await updateTask(task._id, { status: 'Done', channel: 'phone' }, 'talha.admin');

      const interactionCount = await ContactInteraction.countDocuments({ sourceTaskId: task._id });
      assert.equal(interactionCount, 1);
    } catch (err) {
      console.error('FAIL SUBTEST 5:', err);
      throw err;
    }
  });

  await t.test('6. Contact timeline suppresses duplicate completed task timeline event', async () => {
    try {
      const timeline = await getLeadTimeline(lead._id);
      const taskEvents = timeline.events.filter((e) => e.type === 'task' && e.title.includes('Follow up with'));
      const interactionEvents = timeline.events.filter((e) => e.type === 'phone_call');

      assert.equal(taskEvents.length, 0, 'Completed relationship task event should be suppressed from timeline');
      assert.equal(interactionEvents.length, 1, 'Logged interaction event should display in timeline');
    } catch (err) {
      console.error('FAIL SUBTEST 6:', err);
      throw err;
    }
  });

  await t.test('7. Database-wide summary metrics and top-level nextFollowUpAt aggregation', async () => {
    try {
      const openTask = await createTask({
        title: 'Schedule next follow up',
        leadId: lead._id,
        isRelationshipFollowUp: true,
        dueAt: new Date('2026-08-01T00:00:00Z'),
        channel: 'email',
      });

      const leadData = await listAllLeads({ rightPocOnly: true, search: testSuffix });
      assert.ok(leadData.summary);
      assert.equal(typeof leadData.summary.total, 'number');
      assert.equal(typeof leadData.summary.overdue, 'number');
      assert.equal(typeof leadData.summary.upcoming, 'number');
      assert.equal(typeof leadData.summary.nurture, 'number');

      const foundLead = leadData.items.find((l) => String(l._id) === String(lead._id));
      assert.ok(foundLead);
      assert.ok(foundLead.nextFollowUpAt);
      assert.equal(new Date(foundLead.nextFollowUpAt).toISOString(), openTask.dueAt.toISOString());
    } catch (err) {
      console.error('FAIL SUBTEST 7:', err);
      throw err;
    }
  });
});
