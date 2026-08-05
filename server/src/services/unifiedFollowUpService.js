import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import db from '../db/index.js';

export async function convertOpenTasksToRelationshipFollowUps(leadId, companyId, contactName, actorName = 'admin') {
  if (!leadId) return { convertedTasks: 0, updatedReplies: 0 };

  try {
    const res = await db.query(
      `UPDATE tasks SET type = 'relationship_follow_up', title = 'Follow up with ' || $1 || ' about their reply'
       WHERE (description LIKE '%' || $2 || '%' OR title LIKE '%' || $2 || '%') AND (status = 'Open' OR status = 'pending') AND type IN ('lead_follow_up', 'reply_review')`,
      [contactName || 'contact', String(leadId)]
    );
    if (res.rowCount > 0 || !mongoose.connection?.readyState) {
      return { convertedTasks: res.rowCount, updatedReplies: 0 };
    }
  } catch (err) {
    // Fall back to Mongo query
  }

  if (!mongoose.isValidObjectId(String(leadId))) return { convertedTasks: 0, updatedReplies: 0 };

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
