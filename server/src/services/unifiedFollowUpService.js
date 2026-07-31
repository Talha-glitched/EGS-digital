import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';

export async function convertOpenTasksToRelationshipFollowUps(leadId, companyId, contactName, actorName = 'admin') {
  if (!leadId || !mongoose.isValidObjectId(String(leadId))) return { convertedTasks: 0, updatedReplies: 0 };

  const leadObjectId = new mongoose.Types.ObjectId(String(leadId));
  const cName = contactName || 'contact';

  // 1. Find all open lead_follow_up or reply_review tasks for this lead
  const openTasks = await Task.find({
    leadId: leadObjectId,
    status: 'Open',
    deletedAt: null,
    taskType: { $in: ['lead_follow_up', 'reply_review'] },
  });

  let convertedTasks = 0;
  for (const task of openTasks) {
    task.taskType = 'relationship_follow_up';
    if (task.replyId) {
      task.title = `Follow up with ${cName} about their reply`;
    }
    await task.save();
    convertedTasks += 1;
  }

  // 2. Mark any unreviewed replies for this lead as 'Not Required' (Contact confirmed as Right POC)
  const resReplies = await Reply.updateMany(
    {
      leadId: leadObjectId,
      'humanReview.status': 'Unreviewed',
      deletedAt: null,
    },
    {
      $set: {
        'humanReview.status': 'Not Required',
        'humanReview.reviewedAt': new Date(),
        'humanReview.reviewedBy': actorName,
      },
    }
  );

  return {
    convertedTasks,
    updatedReplies: resReplies.modifiedCount || 0,
  };
}
