import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { releaseWrongPocFocus } from './campaignContactCoordinationService.js';

const ACTIVE_OUTCOMES = ['Interested', 'Ambiguous', 'Referral', 'Out of Office'];

function formatTaskNotes(reply) {
  return (reply?.text || reply?.body || '').trim();
}

function formatTaskTitle(reply, lead) {
  const contactName = lead?.name || lead?.email || 'Contact';
  if (reply?.intent === 'OOO' || reply?.suggested_outcome === 'Out of Office') {
    return `Auto-reply / Out of Office: ${contactName}`;
  }
  return `Review Reply from ${contactName}`;
}

export async function ensureReplyReviewTask(reply, lead) {
  if (!lead || (!lead._id && !lead.id)) return null;

  const leadId = lead.id || lead._id;
  const replyDate = reply?.receivedAt ? new Date(reply.receivedAt) : new Date();
  const campaignId = reply?.campaignId || reply?.campaign_id || lead.campaignId || null;

  // Try PostgreSQL task creation
  try {
    const sourceMessageId = reply?.sourceMessageId || reply?.messageId || null;
    const conversationId = reply?.conversation_id || reply?.conversationId || null;
    const suggestedOutcome = reply?.intent === 'OOO' ? 'Out of Office' : (reply?.intent || 'Neutral');
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
          [sourceMessageId, conversationId, suggestedOutcome, JSON.stringify({ source: 'runtime_email_sync' })]
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
        campaignId,
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

const VALID_OUTCOMES = new Set([
  'Interested', 'Ambiguous', 'Not Interested', 'Referral', 'Out of Office',
  'Wrong POC', 'Unsubscribe', 'Bounce', 'Automated', 'Other',
]);
const FOLLOW_UP_OUTCOMES = new Set(['Interested', 'Ambiguous', 'Referral', 'Out of Office']);

function text(value) { return String(value ?? '').trim() || null; }
function priority(value) { return ['low', 'medium', 'high', 'urgent'].includes(String(value).toLowerCase()) ? String(value).toLowerCase() : 'medium'; }

export async function assignReplyReview(reviewItemId, ownerUserId, actor = {}, transactionOptions = {}) {
  if (!text(ownerUserId)) throw Object.assign(new Error('Choose a review owner.'), { status: 400 });
  const client = await db.getClient();
  let task;
  try {
    await client.query('BEGIN');
    const owner = await client.query(`SELECT id,name FROM users WHERE id=$1::uuid AND is_active=TRUE`, [ownerUserId]);
    if (!owner.rows.length) throw Object.assign(new Error('Selected review owner is not active.'), { status: 400 });
    const review = await client.query(`
      SELECT review.id,review.status,message.id AS "messageId",LEFT(COALESCE(message.body,''),1000) AS body,
             COALESCE(person.display_name,participant.email,'Contact') AS "personName",
             COALESCE(conversation.campaign_id,campaign_account.campaign_id) AS "campaignId",
             COALESCE(campaign_account.organization_id,display_role.organization_id) AS "companyId",
             COALESCE(campaign_role.person_id,participant.person_id) AS "personId"
      FROM review_items review JOIN messages message ON message.id=review.source_message_id
      JOIN conversations conversation ON conversation.id=message.conversation_id
      LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id=conversation.campaign_contact_id
      LEFT JOIN campaign_accounts campaign_account ON campaign_account.id=campaign_contact.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id=campaign_contact.role_id
      LEFT JOIN LATERAL(SELECT pcm.person_id,pcm.normalized_value email FROM conversation_participants cp JOIN person_contact_methods pcm ON pcm.id=cp.person_contact_method_id WHERE cp.conversation_id=conversation.id ORDER BY CASE WHEN cp.participant_role='sender' THEN 0 ELSE 1 END,cp.id LIMIT 1)participant ON TRUE
      LEFT JOIN people person ON person.id=COALESCE(campaign_role.person_id,participant.person_id)
      LEFT JOIN LATERAL(SELECT organization_id FROM person_organization_roles WHERE person_id=participant.person_id ORDER BY effective_to NULLS FIRST,created_at DESC LIMIT 1)display_role ON TRUE
      WHERE review.id=$1::uuid FOR UPDATE OF review
    `, [reviewItemId]);
    const context = review.rows[0];
    if (!context) throw Object.assign(new Error('Reply review item not found.'), { status: 404 });
    if (context.status !== 'pending') throw Object.assign(new Error('This reply has already been reviewed.'), { status: 409 });
    const existing = await client.query(`SELECT id FROM tasks WHERE review_item_id=$1::uuid AND status NOT IN('completed','cancelled') ORDER BY created_at DESC LIMIT 1`, [reviewItemId]);
    if (existing.rows.length) {
      const result = await client.query(`UPDATE tasks SET owner_user_id=$2::uuid,owner=$3,updated_at=NOW() WHERE id=$1::uuid RETURNING id,title,owner,owner_user_id AS "ownerUserId",due_at AS "dueAt"`, [existing.rows[0].id, ownerUserId, owner.rows[0].name]);
      task = result.rows[0];
    } else {
      const result = await client.query(`INSERT INTO tasks(title,description,notes,status,priority,type,task_type,due_at,owner,owner_user_id,review_item_id,campaign_id,company_id,lead_id,reply_id,source_type,source_id,updated_at) VALUES($1,$2,$2,'pending','medium','reply_review','reply_review',NOW(),$3,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,'review_item',$5::uuid,NOW()) RETURNING id,title,owner,owner_user_id AS "ownerUserId",due_at AS "dueAt"`, [`Review reply from ${context.personName}`, context.body, owner.rows[0].name, ownerUserId, reviewItemId, context.campaignId, context.companyId, context.personId, context.messageId]);
      task = result.rows[0];
    }
    if (transactionOptions.rollbackOnly) await client.query('ROLLBACK');
    else await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  if (!transactionOptions.rollbackOnly) await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action: 'assign', resource: 'reply_review', resourceId: reviewItemId, summary: `Assigned reply review to ${task.owner}`, metadata: { taskId: task.id, ownerUserId } });
  return { ok: true, task, dryRun: Boolean(transactionOptions.rollbackOnly) };
}

export async function resolveReplyReview(reviewItemId, payload = {}, actor = {}, transactionOptions = {}) {
  const outcome = text(payload.outcome);
  if (!VALID_OUTCOMES.has(outcome)) throw Object.assign(new Error('Choose a valid human review outcome.'), { status: 400 });
  if (outcome === 'Other' && !text(payload.reason)) throw Object.assign(new Error('Explain the outcome when choosing Other.'), { status: 400 });
  const followUp = payload.followUpTask || null;
  if (FOLLOW_UP_OUTCOMES.has(outcome) && !text(followUp?.title)) {
    throw Object.assign(new Error(`${outcome} requires a next follow-up action.`), { status: 400 });
  }
  if (FOLLOW_UP_OUTCOMES.has(outcome) && !followUp?.dueAt) throw Object.assign(new Error('Choose when the follow-up is due.'), { status: 400 });
  if (FOLLOW_UP_OUTCOMES.has(outcome) && !(text(followUp?.ownerUserId) || actor?.userId)) throw Object.assign(new Error('Assign the follow-up to a team member.'), { status: 400 });

  const client = await db.getClient();
  let context;
  let createdFollowUpTask = null;
  try {
    await client.query('BEGIN');
    const reviewResult = await client.query(`
      SELECT review.id, review.status, review.source_message_id AS "messageId",
             message.conversation_id AS "conversationId", message.subject,
             conversation.campaign_contact_id AS "campaignContactId",
             COALESCE(conversation.campaign_id, campaign_account.campaign_id) AS "campaignId",
             COALESCE(campaign_account.organization_id, display_role.organization_id) AS "companyId",
             COALESCE(campaign_role.person_id, participant.person_id) AS "personId",
             COALESCE(campaign_contact.role_id, display_role.id) AS "roleId",
             contact_method.normalized_value AS email
      FROM review_items review
      JOIN messages message ON message.id = review.source_message_id
      JOIN conversations conversation ON conversation.id = message.conversation_id
      LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
      LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
      LEFT JOIN LATERAL (
        SELECT pcm.person_id, pcm.normalized_value
        FROM conversation_participants cp
        JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
        WHERE cp.conversation_id = conversation.id
        ORDER BY CASE WHEN cp.participant_role = 'sender' THEN 0 ELSE 1 END, cp.id
        LIMIT 1
      ) participant ON TRUE
      LEFT JOIN LATERAL (
        SELECT normalized_value FROM person_contact_methods
        WHERE person_id=COALESCE(campaign_role.person_id,participant.person_id) AND type='email'
        ORDER BY preferred DESC NULLS LAST,created_at LIMIT 1
      ) contact_method ON TRUE
      LEFT JOIN LATERAL (
        SELECT id, organization_id FROM person_organization_roles
        WHERE person_id = participant.person_id ORDER BY effective_to NULLS FIRST, created_at DESC LIMIT 1
      ) display_role ON TRUE
      WHERE review.id = $1::uuid
      FOR UPDATE OF review
    `, [reviewItemId]);
    context = reviewResult.rows[0];
    if (!context) throw Object.assign(new Error('Reply review item not found.'), { status: 404 });
    if (context.status !== 'pending') throw Object.assign(new Error('This reply has already been reviewed.'), { status: 409 });

    await client.query(`
      INSERT INTO review_decisions (review_item_id, reviewer_user_id, outcome, reason, decided_at)
      VALUES ($1::uuid, $2::uuid, $3, $4, NOW())
    `, [reviewItemId, actor?.userId || null, outcome, text(payload.reason)]);
    await client.query(`UPDATE review_items SET status='resolved', closed_at=NOW() WHERE id=$1::uuid`, [reviewItemId]);
    await client.query(`UPDATE messages SET human_review_status='resolved' WHERE id=$1::uuid`, [context.messageId]);
    await client.query(`UPDATE tasks SET status='completed', completed_at=NOW(), completion_note=COALESCE($2, completion_note), updated_at=NOW() WHERE review_item_id=$1::uuid AND status NOT IN ('completed','cancelled')`, [reviewItemId, `Reply reviewed: ${outcome}${text(payload.reason) ? ` — ${text(payload.reason)}` : ''}`]);

    if (outcome === 'Wrong POC') {
      // A human decided this person is not the right contact. Record the same canonical
      // POC suitability the manual qualification editor writes, so the contact profile,
      // Right-POC filters and Key Relationship rules all observe the decision. Without
      // this the decision only existed as campaign focus state and the profile still
      // showed "Not verified yet".
      let pocSuitabilityId = null;
      if (context.roleId) {
        const latestAssessment = await client.query(
          `SELECT assessment FROM poc_suitabilities
           WHERE role_id=$1::uuid ORDER BY assessed_at DESC NULLS LAST,id DESC LIMIT 1`,
          [context.roleId],
        );
        if (latestAssessment.rows[0]?.assessment !== 'unsuitable') {
          const insertedAssessment = await client.query(
            `INSERT INTO poc_suitabilities (
               role_id, responsibility_context, assessment, reason, assessed_at,
               legacy_status, assessed_by, source_payload
             ) VALUES ($1::uuid, 'general', 'unsuitable', $2, NOW(), 'WrongContact', $3, $4::jsonb)
             RETURNING id`,
            [context.roleId, text(payload.reason) || 'Recorded from a human reply review.',
              actor?.displayName || 'EGS Team',
              JSON.stringify({ source: 'reply_review', reviewItemId, messageId: context.messageId })],
          );
          pocSuitabilityId = insertedAssessment.rows[0].id;
        }
        // Wrong POC cannot remain a confirmed Key Relationship.
        await client.query(
          `UPDATE key_relationship_profiles SET manually_confirmed=FALSE,confirmed_at=NULL
           WHERE role_id=$1::uuid AND manually_confirmed=TRUE`,
          [context.roleId],
        );
      }
      if (context.campaignContactId) {
        await releaseWrongPocFocus(client, {
          campaignContactId: context.campaignContactId,
          sourcePocSuitabilityId: pocSuitabilityId,
          sourceReviewItemId: reviewItemId,
          actor,
        });
      }
    }

    if (['Unsubscribe', 'Bounce'].includes(outcome) && context.email) {
      await client.query(`INSERT INTO endpoint_suppressions(endpoint,reason,source) SELECT LOWER($1),$2,'human_reply_review' WHERE NOT EXISTS(SELECT 1 FROM endpoint_suppressions WHERE LOWER(endpoint)=LOWER($1))`, [context.email, outcome === 'Bounce' ? 'bounced' : 'unsubscribed']);
      if (context.campaignContactId) {
        await client.query(`UPDATE campaign_contacts SET lead_state=$2 WHERE id=$1::uuid`, [context.campaignContactId, outcome === 'Bounce' ? 'Bounced / Invalid' : 'Opted Out']);
        await client.query(`UPDATE sequence_enrollments SET execution_state='stopped',stop_reason=$2 WHERE campaign_contact_id=$1::uuid AND execution_state NOT IN ('completed','stopped')`, [context.campaignContactId, outcome.toLowerCase().replaceAll(' ', '_')]);
      }
    }

    if (text(followUp?.title)) {
      const ownerUserId = text(followUp.ownerUserId) || actor?.userId || null;
      const owner = ownerUserId ? await client.query(`SELECT id,name FROM users WHERE id=$1::uuid AND is_active=TRUE`, [ownerUserId]) : { rows: [] };
      if (ownerUserId && !owner.rows.length) throw Object.assign(new Error('Selected follow-up owner is not active.'), { status: 400 });
      const created = await client.query(`
        INSERT INTO tasks(title,description,notes,status,priority,type,task_type,due_at,owner,owner_user_id,
          campaign_id,company_id,lead_id,reply_id,source_type,source_id,updated_at)
        VALUES($1,$2,$2,'pending',$3,'relationship_follow_up','relationship_follow_up',$4,$5,$6::uuid,
          $7::uuid,$8::uuid,$9::uuid,$10::uuid,'review_item',$11::uuid,NOW())
        RETURNING id,title,status,due_at AS "dueAt",owner,owner_user_id AS "ownerUserId"
      `, [text(followUp.title), text(followUp.notes), priority(followUp.priority), followUp.dueAt || null,
        owner.rows[0]?.name || actor?.displayName || null, ownerUserId, context.campaignId, context.companyId,
        context.personId, context.messageId, reviewItemId]);
      createdFollowUpTask = created.rows[0];
    }

    if (transactionOptions.rollbackOnly) await client.query('ROLLBACK');
    else await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  if (!transactionOptions.rollbackOnly) {
    await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action: 'resolve', resource: 'reply_review', resourceId: reviewItemId, summary: `Reviewed reply: ${outcome}`, metadata: { conversationId: context.conversationId, messageId: context.messageId, outcome, followUpTaskId: createdFollowUpTask?.id || null } });
  }
  return { ok: true, reviewItemId, outcome, createdFollowUpTask, dryRun: Boolean(transactionOptions.rollbackOnly) };
}

export async function completeReplyReview(taskId, payload = {}) {
  const taskResult = await db.query(`SELECT id,review_item_id AS "reviewItemId" FROM tasks WHERE id=$1::uuid`, [taskId]);
  if (!taskResult.rows.length) {
    if (mongoose.connection?.readyState) {
      const task = await Task.findById(taskId);
      if (!task) throw Object.assign(new Error('Reply review task not found.'), { status: 404 });
      task.status = 'Done'; task.completedAt = new Date(); await task.save(); return { task };
    }
    throw Object.assign(new Error('Reply review task not found.'), { status: 404 });
  }
  if (!taskResult.rows[0].reviewItemId) throw Object.assign(new Error('This legacy task is not linked to a reply review item.'), { status: 409 });
  const actor = typeof payload.actor === 'object' ? payload.actor : { displayName: text(payload.actor) || 'admin' };
  return resolveReplyReview(taskResult.rows[0].reviewItemId, payload, actor);
}
