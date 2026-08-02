import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';

const ACTIVE_OUTCOMES = ['Interested', 'Ambiguous', 'Referral', 'Out of Office'];

function formatTaskNotes(reply) {
  return (reply?.text || reply?.body || '').trim();
}

export async function ensureReplyReviewTask(reply, lead) {
  if (!lead || !lead._id) return null;

  // 1. Update lead stage and repliedAt with atomic max logic
  if (lead.leadStage !== 'qualified_lead') {
    lead.leadStage = 'lead';
  }
  const replyDate = reply?.receivedAt ? new Date(reply.receivedAt) : new Date();
  if (!lead.repliedAt || replyDate > new Date(lead.repliedAt)) {
    lead.repliedAt = replyDate;
  }
  await lead.save();

  const isConfirmedRightPoc = lead.pocQualification?.status === 'Confirmed';
  const contactName = lead.name || 'Contact';

  // -----------------------------------------------------------------
  // 1B. Confirmed Right POC Inbound Reply Workflow
  // -----------------------------------------------------------------
  if (isConfirmedRightPoc) {
    // Mark Reply humanReview status as 'Not Required'
    reply.humanReview = {
      outcome: null,
      status: 'Not Required',
      reviewedAt: new Date(),
      reviewedBy: 'system',
    };
    await reply.save();

    // Look ONLY for an existing open reply-linked Relationship follow-up task
    const existingReplyRelTask = await Task.findOne({
      leadId: lead._id,
      taskType: 'relationship_follow_up',
      status: 'Open',
      replyId: { $ne: null },
      deletedAt: null,
    });

    if (existingReplyRelTask) {
      existingReplyRelTask.replyId = reply._id || existingReplyRelTask.replyId;
      existingReplyRelTask.title = formatTaskTitle(reply, lead);
      existingReplyRelTask.notes = formatTaskNotes(reply);
      await existingReplyRelTask.save();
      return existingReplyRelTask;
    }

    // Create a new reply-linked Relationship follow-up task
    const dueAt = new Date(replyDate.getTime() + 60 * 60 * 1000);
    const title = formatTaskTitle(reply, lead);

    try {
      return await Task.create({
        title,
        taskType: 'relationship_follow_up',
        dueAt,
        status: 'Open',
        owner: lead.relationshipProfile?.owner || '',
        ownerUserId: null,
        replyId: reply._id,
        leadId: lead._id,
        companyId: lead.companyId || null,
        campaignId: reply?.campaignId || lead.campaignId || null,
        notes: formatTaskNotes(reply),
      });
    } catch (err) {
      if (err.code === 11000) {
        const winningTask = await Task.findOne({
          leadId: lead._id,
          taskType: 'relationship_follow_up',
          status: 'Open',
          replyId: { $ne: null },
        });
        if (winningTask) return winningTask;
      }
      throw err;
    }
  }

  // -----------------------------------------------------------------
  // 2. Standard Non-Right-POC Reply Review Task Workflow
  // -----------------------------------------------------------------
  const existingTask = await Task.findOne({
    leadId: lead._id,
    taskType: 'reply_review',
    status: 'Open',
    deletedAt: null,
  });

  if (existingTask) {
    existingTask.replyId = reply._id || existingTask.replyId;
    existingTask.title = formatTaskTitle(reply, lead);
    existingTask.notes = formatTaskNotes(reply);
    await existingTask.save();
    return existingTask;
  }

  // 3. Find earliest unreviewed reply for deadline calculation (1h after first unreviewed reply)
  const earliestUnreviewed = await Reply.findOne({
    leadId: lead._id,
    'humanReview.status': 'Unreviewed',
    deletedAt: null,
  }).sort({ receivedAt: 1 }).lean();

  const firstDate = earliestUnreviewed?.receivedAt
    ? new Date(earliestUnreviewed.receivedAt)
    : replyDate;
  const dueAt = new Date(firstDate.getTime() + 60 * 60 * 1000);

  const title = formatTaskTitle(reply, lead);

  try {
    return await Task.create({
      title,
      taskType: 'reply_review',
      dueAt,
      status: 'Open',
      owner: '',
      ownerUserId: null,
      replyId: reply._id,
      leadId: lead._id,
      companyId: lead.companyId || null,
      campaignId: reply?.campaignId || lead.campaignId || null,
      notes: formatTaskNotes(reply),
    });
  } catch (err) {
    if (err.code === 11000) {
      const winningTask = await Task.findOne({
        leadId: lead._id,
        taskType: 'reply_review',
        status: 'Open',
      });
      if (winningTask) return winningTask;
    }
  }
}

export async function completeReplyReview(taskId, { outcome, followUpTask, actor = 'admin' }) {
  const validOutcomes = [
    'Interested',
    'Ambiguous',
    'Not Interested',
    'Referral',
    'Out of Office',
    'Unsubscribe',
    'Bounce',
    'Automated',
    'Other',
  ];

  if (!validOutcomes.includes(outcome)) {
    const error = new Error(`Invalid review outcome "${outcome}".`);
    error.status = 400;
    throw error;
  }

  const requiresFollowUp = ACTIVE_OUTCOMES.includes(outcome) || (outcome === 'Other' && followUpTask);
  if (requiresFollowUp && !followUpTask?.title?.trim()) {
    const error = new Error(`Follow-up task title is required for outcome "${outcome}".`);
    error.status = 400;
    throw error;
  }

  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error('Reply review task not found.');
    error.status = 404;
    throw error;
  }
  if (task.taskType !== 'reply_review') {
    const error = new Error('Target task is not a reply review task.');
    error.status = 400;
    throw error;
  }

  const lead = await Lead.findById(task.leadId);
  if (!lead) {
    const error = new Error('Contact not found.');
    error.status = 404;
    throw error;
  }

  // Find latest reply included in the task cutoff
  let latestReply = null;
  if (task.replyId) {
    latestReply = await Reply.findById(task.replyId).lean();
  }
  if (!latestReply) {
    latestReply = await Reply.findOne({ leadId: lead._id, deletedAt: null }).sort({ receivedAt: -1 }).lean();
  }
  const cutoffDate = latestReply?.receivedAt ? new Date(latestReply.receivedAt) : new Date();

  let session = null;
  let useTransaction = true;
  try {
    session = await mongoose.startSession();
  } catch {
    useTransaction = false;
  }

  const loggedByActor = typeof actor === 'string' ? actor : (actor.username || actor.displayName || 'admin');

  const executeOperations = async (sess) => {
    const options = sess ? { session: sess } : {};

    // 1. Batch mark unreviewed replies up to cutoffDate as Reviewed
    await Reply.updateMany(
      {
        leadId: lead._id,
        receivedAt: { $lte: cutoffDate },
        'humanReview.status': 'Unreviewed',
      },
      {
        $set: {
          'humanReview.outcome': outcome,
          'humanReview.status': 'Reviewed',
          'humanReview.reviewedAt': new Date(),
          'humanReview.reviewedBy': loggedByActor,
        },
      },
      options
    );

    // 2. Update Lead stage
    if (outcome === 'Interested') {
      lead.leadStage = 'qualified_lead';
      lead.qualifiedAt = new Date();
      lead.qualifiedBy = loggedByActor;
    } else if (lead.leadStage === 'contact') {
      lead.leadStage = 'lead';
    }
    await lead.save(options);

    // 3. Create lead_follow_up task if required
    let createdFollowUpTask = null;
    if (requiresFollowUp && followUpTask) {
      const [created] = await Task.create(
        [
          {
            title: followUpTask.title.trim(),
            taskType: lead.pocQualification?.status === 'Confirmed' ? 'relationship_follow_up' : 'lead_follow_up',
            dueAt: followUpTask.dueAt || null,
            priority: followUpTask.priority || 'Normal',
            owner: followUpTask.owner || '',
            leadId: lead._id,
            companyId: lead.companyId || task.companyId || null,
            campaignId: task.campaignId || lead.campaignId || null,
            notes: String(followUpTask.notes || '').trim(),
          },
        ],
        options
      );
      createdFollowUpTask = created;
    }

    // 4. Complete the reply_review task
    task.status = 'Done';
    task.completedAt = new Date();
    await task.save(options);

    return { task, lead, createdFollowUpTask };
  };

  if (session && useTransaction) {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await executeOperations(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  } else {
    return executeOperations(null);
  }
}
