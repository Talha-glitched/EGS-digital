import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import db from '../db/index.js';

const ACTIVE_OUTCOMES = ['Interested', 'Ambiguous', 'Referral', 'Out of Office'];

function formatTaskNotes(reply) {
  return (reply?.text || reply?.body || '').trim();
}

function formatTaskTitle(reply, lead) {
  const contactName = lead?.name || lead?.email || 'Contact';
  return `Review Reply from ${contactName}`;
}

export async function ensureReplyReviewTask(reply, lead) {
  if (!lead || (!lead._id && !lead.id)) return null;

  const leadId = lead.id || lead._id;
  const replyDate = reply?.receivedAt ? new Date(reply.receivedAt) : new Date();

  // Try PostgreSQL task creation
  try {
    const sourceMessageId = reply?.sourceMessageId || reply?.messageId || null;
    const conversationId = reply?.conversation_id || reply?.conversationId || null;
    let reviewItemId = null;
    if (sourceMessageId) {
      const existingReview = await db.query(
        `SELECT id FROM review_items WHERE source_message_id = $1::uuid ORDER BY opened_at LIMIT 1`,
        [sourceMessageId]
      );
      if (existingReview.rows[0]) {
        reviewItemId = existingReview.rows[0].id;
      } else {
        const createdReview = await db.query(
          `INSERT INTO review_items (
             source_message_id, conversation_id, status, opened_at, suggested_outcome, payload
           ) VALUES ($1::uuid, $2::uuid, 'pending', NOW(), $3, $4::jsonb)
           RETURNING id`,
          [sourceMessageId, conversationId, reply?.intent || 'Neutral', JSON.stringify({ source: 'runtime_email_sync' })]
        );
        reviewItemId = createdReview.rows[0].id;
      }
    }

    const existingRes = await db.query(
      `SELECT id, title, description AS notes FROM tasks
       WHERE status = 'pending'
         AND (($1::uuid IS NOT NULL AND review_item_id = $1::uuid)
           OR ($1::uuid IS NULL AND lead_id = $2::uuid AND type = 'reply_review'))
       LIMIT 1`,
      [reviewItemId, leadId]
    );

    if (existingRes.rows.length > 0) {
      return existingRes.rows[0];
    }

    const dueAt = new Date(replyDate.getTime() + 60 * 60 * 1000);
    const title = formatTaskTitle(reply, lead);

    const newRes = await db.query(
      `INSERT INTO tasks (
         title, description, status, priority, due_at, type, task_type,
         review_item_id, reply_id, lead_id, company_id, campaign_id, source_collection
       ) VALUES (
         $1::varchar, $2::text, 'pending', 'medium', $3::timestamptz,
         'reply_review', 'reply_review', $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8::uuid,
         'runtime_reply_review'
       )
       RETURNING id, title, description AS notes, status, priority, due_at AS "dueAt",
                 review_item_id AS "reviewItemId", lead_id AS "leadId"`,
      [
        title, formatTaskNotes(reply), dueAt, reviewItemId, sourceMessageId, leadId,
        lead.companyId?._id || lead.companyId || null,
        lead.campaignId || null,
      ]
    );

    return newRes.rows[0];
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const existingTask = await Task.findOne({
        leadId,
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

      const dueAt = new Date(replyDate.getTime() + 60 * 60 * 1000);
      return Task.create({
        title: formatTaskTitle(reply, lead),
        taskType: 'reply_review',
        dueAt,
        status: 'Open',
        owner: '',
        ownerUserId: null,
        replyId: reply._id,
        leadId,
        notes: formatTaskNotes(reply),
      });
    }
    throw err;
  }
}

export async function completeReplyReview(taskId, { outcome, followUpTask, actor = 'admin' }) {
  const validOutcomes = [
    'Interested',
    'Ambiguous',
    'Not Interested',
    'Referral',
    'Out of Office',
    'Wrong POC',
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

  try {
    const taskRes = await db.query(`SELECT id, status FROM tasks WHERE id = $1::uuid`, [taskId]);
    if (taskRes.rows.length === 0) {
      const error = new Error('Reply review task not found.');
      error.status = 404;
      throw error;
    }

    await db.query(
      `UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1::uuid`,
      [taskId]
    );

    let createdFollowUpTask = null;
    if (followUpTask?.title?.trim()) {
      const followRes = await db.query(
        `INSERT INTO tasks (title, description, status, priority, due_at)
         VALUES ($1::varchar, $2::text, 'pending', COALESCE($3::varchar, 'medium'), $4::timestamptz)
         RETURNING id, title, status`,
        [followUpTask.title.trim(), followUpTask.notes || null, followUpTask.priority || 'medium', followUpTask.dueAt || null]
      );
      createdFollowUpTask = followRes.rows[0];
    }

    return { task: taskRes.rows[0], createdFollowUpTask };
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const task = await Task.findById(taskId);
      if (!task) {
        const error = new Error('Reply review task not found.');
        error.status = 404;
        throw error;
      }
      task.status = 'Done';
      task.completedAt = new Date();
      await task.save();
      return { task };
    }
    throw err;
  }
}
