import db from '../db/index.js';

function positiveInt(value, fallback, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), maximum);
}

export async function getCommunicationsWorkspace(options = {}, actor = {}) {
  const limit = positiveInt(options.limit, 30, 100);
  const query = String(options.q || '').trim();
  const searchPattern = query ? `%${query}%` : null;

  const [summaryResult, attentionResult, linkedResult, searchResult, ownersResult] = await Promise.all([
    db.query(`
      SELECT
        (SELECT COUNT(DISTINCT conversation_id)::int FROM messages
          WHERE direction = 'inbound' AND COALESCE(is_migration_duplicate, FALSE) = FALSE) AS "inboxThreads",
        (SELECT COUNT(*)::int FROM review_items WHERE status = 'pending') AS "needsReview",
        (SELECT COUNT(*)::int FROM send_jobs WHERE status IN ('failed', 'cancelled', 'migration_held')) AS "deliveryIssues",
        (SELECT COUNT(*)::int FROM send_jobs WHERE status IN ('pending', 'processing')) AS "queuedSends",
        (SELECT COUNT(*)::int FROM messages WHERE direction = 'outbound'
          AND COALESCE(is_migration_duplicate, FALSE) = FALSE AND occurred_at >= CURRENT_DATE) AS "sentToday",
        (SELECT COUNT(DISTINCT conversation_id)::int FROM conversation_job_links) AS "linkedThreads",
        (SELECT COUNT(DISTINCT m.conversation_id)::int FROM messages m
          WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
            AND NOT EXISTS (SELECT 1 FROM conversation_job_links link WHERE link.conversation_id = m.conversation_id)) AS "unlinkedReplies"
    `),
    db.query(`
      SELECT review.id AS "reviewItemId", review.status AS "reviewStatus",
             message.id AS "messageId", message.conversation_id AS "conversationId",
             message.subject, LEFT(COALESCE(message.body, ''), 240) AS preview,
             message.occurred_at AS "occurredAt", message.suggested_intent AS intent,
             person.display_name AS "personName", organization.canonical_name AS "companyName",
             campaign.name AS "campaignName", review_task.id AS "taskId",
             review_task.owner_user_id AS "ownerUserId", review_task.owner AS "ownerName",
             review_task.due_at AS "dueAt"
      FROM review_items review
      JOIN messages message ON message.id = review.source_message_id
      JOIN conversations conversation ON conversation.id = message.conversation_id
      LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
      LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
      LEFT JOIN LATERAL (
        SELECT pcm.person_id FROM conversation_participants cp
        JOIN person_contact_methods pcm ON pcm.id=cp.person_contact_method_id
        WHERE cp.conversation_id=conversation.id
        ORDER BY CASE WHEN cp.participant_role='sender' THEN 0 ELSE 1 END,cp.id LIMIT 1
      ) participant ON TRUE
      LEFT JOIN people person ON person.id = COALESCE(campaign_role.person_id,participant.person_id)
      LEFT JOIN LATERAL (
        SELECT organization_id FROM person_organization_roles
        WHERE person_id=participant.person_id ORDER BY effective_to NULLS FIRST,created_at DESC LIMIT 1
      ) display_role ON TRUE
      LEFT JOIN organizations organization ON organization.id = COALESCE(campaign_account.organization_id,display_role.organization_id)
      LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conversation.campaign_id, campaign_account.campaign_id)
      LEFT JOIN LATERAL (
        SELECT id,owner_user_id,owner,due_at FROM tasks
        WHERE review_item_id=review.id AND status NOT IN ('completed','cancelled')
        ORDER BY created_at DESC LIMIT 1
      ) review_task ON TRUE
      WHERE review.status = 'pending'
        AND COALESCE(message.is_migration_duplicate, FALSE) = FALSE
      ORDER BY message.occurred_at DESC
      LIMIT $1
    `, [limit]),
    db.query(`
      SELECT conversation.id AS "conversationId", conversation.subject,
             message_stats."lastMessageAt", message_stats.preview,
             message_stats."messageCount", message_stats."replyCount",
             person.display_name AS "personName", organization.canonical_name AS "companyName",
             campaign.name AS "campaignName",
             job_links.jobs
      FROM conversations conversation
      JOIN LATERAL (
        SELECT MAX(message.occurred_at) AS "lastMessageAt",
               (ARRAY_AGG(LEFT(COALESCE(message.body, ''), 240) ORDER BY message.occurred_at DESC))[1] AS preview,
               COUNT(message.id)::int AS "messageCount",
               COUNT(message.id) FILTER (WHERE message.direction = 'inbound')::int AS "replyCount"
        FROM messages message
        WHERE message.conversation_id = conversation.id
          AND COALESCE(message.is_migration_duplicate, FALSE) = FALSE
      ) message_stats ON TRUE
      JOIN LATERAL (
        SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
          'id', job.id, 'title', job.title, 'jobNumber', job.job_number, 'stage', job.summary_stage
        ) ORDER BY link.linked_at DESC) AS jobs
        FROM conversation_job_links link
        JOIN ongoing_jobs job ON job.id = link.ongoing_job_id
        WHERE link.conversation_id = conversation.id
      ) job_links ON job_links.jobs IS NOT NULL
      LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
      LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
      LEFT JOIN people person ON person.id = campaign_role.person_id
      LEFT JOIN organizations organization ON organization.id = campaign_account.organization_id
      LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conversation.campaign_id, campaign_account.campaign_id)
      ORDER BY message_stats."lastMessageAt" DESC NULLS LAST
      LIMIT $1
    `, [limit]),
    query ? db.query(`
      SELECT message.id AS "messageId", message.conversation_id AS "conversationId", message.direction,
             message.subject, LEFT(COALESCE(message.body, ''), 320) AS preview,
             message.occurred_at AS "occurredAt", message.delivery_state AS "deliveryState",
             person.display_name AS "personName", organization.canonical_name AS "companyName",
             campaign.name AS "campaignName",
             COALESCE(job_links.jobs, '[]'::jsonb) AS jobs
      FROM messages message
      JOIN conversations conversation ON conversation.id = message.conversation_id
      LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
      LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
      LEFT JOIN people person ON person.id = campaign_role.person_id
      LEFT JOIN organizations organization ON organization.id = campaign_account.organization_id
      LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conversation.campaign_id, campaign_account.campaign_id)
      LEFT JOIN LATERAL (
        SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', job.id, 'title', job.title, 'jobNumber', job.job_number)) AS jobs
        FROM conversation_job_links link
        JOIN ongoing_jobs job ON job.id = link.ongoing_job_id
        WHERE link.conversation_id = conversation.id
      ) job_links ON TRUE
      WHERE COALESCE(message.is_migration_duplicate, FALSE) = FALSE
        AND (message.subject ILIKE $1 OR message.body ILIKE $1 OR person.display_name ILIKE $1
          OR organization.canonical_name ILIKE $1 OR campaign.name ILIKE $1)
      ORDER BY message.occurred_at DESC
      LIMIT $2
    `, [searchPattern, limit]) : Promise.resolve({ rows: [] }),
    db.query(`SELECT id,name,email,role FROM users WHERE is_active=TRUE ORDER BY name`),
  ]);

  return {
    summary: summaryResult.rows[0] || {},
    attention: attentionResult.rows,
    linked: linkedResult.rows,
    search: { query, items: searchResult.rows },
    owners: ownersResult.rows,
    currentUserId: actor?.userId || null,
  };
}
