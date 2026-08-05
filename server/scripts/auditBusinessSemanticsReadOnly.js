#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
});

const client = await pool.connect();
const report = {};

async function query(name, sql) {
  report[name] = (await client.query(sql)).rows;
}

try {
  await client.query('BEGIN TRANSACTION READ ONLY');

  await query('activeInboundLinkage', `
    WITH inbound AS (
      SELECT m.id, m.source_collection, m.conversation_id, c.campaign_contact_id,
             EXISTS (
               SELECT 1 FROM conversation_participants cp
               WHERE cp.conversation_id = c.id AND cp.person_contact_method_id IS NOT NULL
             ) AS has_person_participant
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
    )
    SELECT COALESCE(source_collection, 'runtime/unlabelled') AS source,
           COUNT(*)::int AS messages,
           COUNT(*) FILTER (WHERE campaign_contact_id IS NOT NULL)::int AS with_campaign_contact,
           COUNT(*) FILTER (WHERE has_person_participant)::int AS with_person_participant,
           COUNT(*) FILTER (WHERE campaign_contact_id IS NULL AND NOT has_person_participant)::int AS fully_unlinked
    FROM inbound GROUP BY COALESCE(source_collection, 'runtime/unlabelled') ORDER BY source
  `);

  await query('activeInboundPeople', `
    WITH linked_people AS (
      SELECT DISTINCT COALESCE(por.person_id, pcm.person_id) AS person_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN campaign_contacts cc ON cc.id = c.campaign_contact_id
      LEFT JOIN person_organization_roles por ON por.id = cc.role_id
      LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
      LEFT JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
      WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
    )
    SELECT COUNT(*) FILTER (WHERE person_id IS NOT NULL)::int AS distinct_linked_people
    FROM linked_people
  `);

  await query('runtimeInboundRepairability', `
    SELECT COUNT(DISTINCT m.id)::int AS messages,
           COUNT(DISTINCT m.id) FILTER (WHERE NULLIF(BTRIM(m.from_snapshot), '') IS NOT NULL)::int AS with_from_snapshot,
           COUNT(DISTINCT m.id) FILTER (WHERE ri.id IS NOT NULL)::int AS with_review_item,
           COUNT(DISTINCT m.id) FILTER (WHERE t.lead_id IS NOT NULL)::int AS with_task_lead,
           COUNT(DISTINCT m.id) FILTER (WHERE pcm.id IS NOT NULL)::int AS sender_matches_contact_method,
           COUNT(DISTINCT m.id) FILTER (WHERE matched_person.role_count = 1)::int AS unambiguous_person_role,
           COUNT(DISTINCT m.id) FILTER (WHERE matched_person.campaign_contact_count = 1)::int AS unambiguous_campaign_contact,
           COUNT(DISTINCT m.id) FILTER (WHERE NULLIF(ri.payload #>> '{leadId}', '') IS NOT NULL)::int AS review_payload_lead_id,
           COUNT(DISTINCT m.id) FILTER (WHERE NULLIF(ri.payload #>> '{lead,id}', '') IS NOT NULL)::int AS review_payload_nested_lead_id,
           COUNT(DISTINCT m.id) FILTER (WHERE NULLIF(ri.payload #>> '{email}', '') IS NOT NULL)::int AS review_payload_email,
           COUNT(DISTINCT m.id) FILTER (WHERE NULLIF(m.payload #>> '{from}', '') IS NOT NULL)::int AS message_payload_from
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN review_items ri ON ri.source_message_id = m.id
    LEFT JOIN tasks t ON t.review_item_id = ri.id
    LEFT JOIN person_contact_methods pcm
      ON pcm.type = 'email' AND pcm.normalized_value = LOWER(NULLIF(BTRIM(m.from_snapshot), ''))
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT por.id)::int AS role_count,
             COUNT(DISTINCT cc.id)::int AS campaign_contact_count
      FROM person_organization_roles por
      LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
      WHERE por.person_id = pcm.person_id
    ) matched_person ON TRUE
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      AND m.source_collection IS NULL
      AND c.campaign_contact_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.person_contact_method_id IS NOT NULL
      )
  `);

  await query('campaignConversationRepairability', `
    WITH candidates AS (
      SELECT conv.id AS conversation_id,
             COUNT(DISTINCT cc.id)::int AS campaign_contact_candidates
      FROM conversations conv
      JOIN messages m ON m.conversation_id = conv.id
        AND m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      JOIN conversation_participants cp ON cp.conversation_id = conv.id
        AND cp.person_contact_method_id IS NOT NULL
      JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
      JOIN person_organization_roles por ON por.person_id = pcm.person_id
      JOIN campaign_contacts cc ON cc.role_id = por.id
      JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id AND ca.campaign_id = conv.campaign_id
      WHERE conv.campaign_id IS NOT NULL AND conv.campaign_contact_id IS NULL
      GROUP BY conv.id
    )
    SELECT COUNT(*)::int AS conversations_with_candidates,
           COUNT(*) FILTER (WHERE campaign_contact_candidates = 1)::int AS unambiguous,
           COUNT(*) FILTER (WHERE campaign_contact_candidates > 1)::int AS ambiguous
    FROM candidates
  `);
  await query('migratedEmailCampaignRepairability', `
    SELECT COUNT(DISTINCT m.id)::int AS messages_without_campaign_contact,
           COUNT(DISTINCT m.id) FILTER (WHERE campaign_map.target_entity_id IS NOT NULL)::int AS with_mapped_campaign,
           COUNT(DISTINCT m.id) FILTER (WHERE cc.id IS NOT NULL)::int AS with_exact_campaign_contact
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    JOIN migration_source_document msd
      ON msd.collection_name = 'emails' AND msd.mongo_id = m.source_mongo_id
    LEFT JOIN migration_entity_map campaign_map
      ON campaign_map.source_collection = 'projectcampaigns'
     AND campaign_map.source_mongo_id = COALESCE(msd.payload #>> '{campaignId,$oid}', msd.payload->>'campaignId')
     AND campaign_map.target_table = 'campaigns'
    LEFT JOIN campaign_contacts cc
      ON cc.source_lead_mongo_id = COALESCE(msd.payload #>> '{leadId,$oid}', msd.payload->>'leadId')
     AND cc.source_campaign_mongo_id = COALESCE(msd.payload #>> '{campaignId,$oid}', msd.payload->>'campaignId')
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      AND m.source_collection = 'emails'
      AND conv.campaign_contact_id IS NULL
  `);

  await query('runtimeInboundWorkLinkage', `
    SELECT COUNT(DISTINCT m.id)::int AS messages,
           COUNT(DISTINCT m.id) FILTER (WHERE ri.id IS NOT NULL)::int AS with_review_item,
           COUNT(DISTINCT m.id) FILTER (WHERE t.id IS NOT NULL)::int AS with_review_task,
           COUNT(DISTINCT m.id) FILTER (WHERE t.lead_id IS NOT NULL)::int AS task_linked_to_person,
           COUNT(DISTINCT m.id) FILTER (WHERE t.campaign_id IS NOT NULL)::int AS task_linked_to_campaign
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN review_items ri ON ri.source_message_id = m.id
    LEFT JOIN tasks t ON t.review_item_id = ri.id
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      AND m.source_collection IS NULL
  `);

  await query('sourceReplyLeadReconciliation', `
    WITH source_reply_leads AS (
      SELECT DISTINCT CASE
        WHEN collection_name = 'emails' THEN COALESCE(payload #>> '{leadId,$oid}', payload->>'leadId', payload #>> '{lead,$oid}', payload->>'lead')
        WHEN collection_name = 'replies' THEN COALESCE(payload #>> '{leadId,$oid}', payload->>'leadId', payload #>> '{lead,$oid}', payload->>'lead')
      END AS source_lead_id
      FROM migration_source_document
      WHERE collection_name IN ('emails', 'replies')
        AND (collection_name = 'replies' OR LOWER(COALESCE(payload->>'direction', '')) = 'inbound')
    ), mapped AS (
      SELECT s.source_lead_id, mem.target_entity_id AS person_id
      FROM source_reply_leads s
      LEFT JOIN migration_entity_map mem
        ON mem.source_collection = 'leads'
       AND mem.source_mongo_id = s.source_lead_id
       AND mem.target_table = 'people'
      WHERE s.source_lead_id IS NOT NULL
    ), sql_inbound_people AS (
      SELECT DISTINCT COALESCE(por.person_id, pcm.person_id) AS person_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN campaign_contacts cc ON cc.id = c.campaign_contact_id
      LEFT JOIN person_organization_roles por ON por.id = cc.role_id
      LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
      LEFT JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
      WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
    )
    SELECT COUNT(*)::int AS source_reply_leads,
           COUNT(*) FILTER (WHERE mapped.person_id IS NOT NULL)::int AS mapped_to_person,
           COUNT(*) FILTER (WHERE sip.person_id IS NOT NULL)::int AS visible_through_sql_inbound_link,
           COUNT(*) FILTER (WHERE mapped.person_id IS NOT NULL AND sip.person_id IS NULL)::int AS mapped_but_not_visible
    FROM mapped LEFT JOIN sql_inbound_people sip ON sip.person_id = mapped.person_id
  `);

  await query('contactArchiveReconciliation', `
    SELECT COUNT(*)::int AS source_contacts,
           COUNT(*) FILTER (WHERE msd.payload->'deletedAt' IS NOT NULL AND msd.payload->'deletedAt' <> 'null'::jsonb)::int AS source_deleted,
           COUNT(*) FILTER (WHERE p.archived_at IS NOT NULL)::int AS target_archived,
           COUNT(*) FILTER (
             WHERE p.archived_at IS NOT NULL
               AND (msd.payload->'deletedAt' IS NULL OR msd.payload->'deletedAt' = 'null'::jsonb)
           )::int AS unexpectedly_archived,
           COUNT(*) FILTER (
             WHERE p.archived_at IS NULL
               AND msd.payload->'deletedAt' IS NOT NULL AND msd.payload->'deletedAt' <> 'null'::jsonb
           )::int AS source_deleted_but_active
    FROM migration_entity_map mem
    JOIN migration_source_document msd ON msd.collection_name = 'leads' AND msd.mongo_id = mem.source_mongo_id
    JOIN people p ON p.id = mem.target_entity_id
    WHERE mem.source_collection = 'leads' AND mem.target_table = 'people'
  `);
  await query('unexpectedArchiveBoundaryCheck', `
    WITH unexpected AS (
      SELECT mem.source_mongo_id, mem.target_entity_id AS person_id
      FROM migration_entity_map mem
      JOIN migration_source_document msd ON msd.collection_name = 'leads' AND msd.mongo_id = mem.source_mongo_id
      JOIN people p ON p.id = mem.target_entity_id
      WHERE mem.source_collection = 'leads' AND mem.target_table = 'people'
        AND p.archived_at IS NOT NULL
        AND (msd.payload->'deletedAt' IS NULL OR msd.payload->'deletedAt' = 'null'::jsonb)
    )
    SELECT COUNT(*)::int AS unexpectedly_archived,
           COUNT(*) FILTER (
             WHERE cc.role_id IS NULL AND cc.organization_contact_method_id IS NOT NULL
           )::int AS represented_as_organization_endpoint,
           COUNT(*) FILTER (WHERE cc.id IS NULL)::int AS without_campaign_contact_mapping
    FROM unexpected u
    LEFT JOIN migration_entity_map cc_map
      ON cc_map.source_collection = 'leads' AND cc_map.source_mongo_id = u.source_mongo_id
     AND cc_map.target_table = 'campaign_contacts'
    LEFT JOIN campaign_contacts cc ON cc.id = cc_map.target_entity_id
  `);

  await query('opportunityValueReconciliation', `
    WITH source_values AS (
      SELECT mem.target_entity_id,
             COALESCE(
               NULLIF(msd.payload #>> '{valueAed,$numberInt}', '')::numeric,
               NULLIF(msd.payload #>> '{valueAed,$numberLong}', '')::numeric,
               NULLIF(msd.payload #>> '{valueAed,$numberDouble}', '')::numeric,
               CASE WHEN jsonb_typeof(msd.payload->'valueAed') = 'number'
                    THEN (msd.payload->>'valueAed')::numeric END,
               0
             ) AS source_value_aed
      FROM migration_entity_map mem
      JOIN migration_source_document msd
        ON msd.collection_name = mem.source_collection AND msd.mongo_id = mem.source_mongo_id
      WHERE mem.source_collection = 'opportunities' AND mem.target_table = 'ongoing_jobs'
    )
    SELECT COUNT(*)::int AS source_rows,
           COUNT(*) FILTER (WHERE sv.source_value_aed <> 0)::int AS source_nonzero,
           COUNT(*) FILTER (WHERE COALESCE(oj.value_aed, 0) <> 0)::int AS target_nonzero,
           COALESCE(SUM(sv.source_value_aed), 0)::numeric AS source_total_aed,
           COALESCE(SUM(oj.value_aed), 0)::numeric AS target_total_aed,
           COUNT(*) FILTER (WHERE sv.source_value_aed <> COALESCE(oj.value_aed, 0))::int AS mismatches
    FROM source_values sv JOIN ongoing_jobs oj ON oj.id = sv.target_entity_id
  `);

  await query('jobPopulation', `
    SELECT mem.source_collection, COUNT(*)::int AS rows,
           COUNT(*) FILTER (WHERE oj.deleted_at IS NULL)::int AS visible,
           COUNT(*) FILTER (WHERE oj.customer_organization_id IS NULL)::int AS missing_customer
    FROM migration_entity_map mem
    JOIN ongoing_jobs oj ON oj.id = mem.target_entity_id
    WHERE mem.target_table = 'ongoing_jobs'
    GROUP BY mem.source_collection ORDER BY mem.source_collection
  `);

  await query('currentJobContext', `
    SELECT COUNT(*)::int AS jobs,
           COUNT(*) FILTER (WHERE oj.primary_lead_id IS NOT NULL)::int AS with_primary_contact,
           COUNT(*) FILTER (WHERE COALESCE(cardinality(oj.stakeholder_lead_ids), 0) > 0)::int AS with_additional_contacts,
           COUNT(*) FILTER (WHERE NULLIF(BTRIM(oj.owner), '') IS NOT NULL)::int AS with_owner,
           COUNT(*) FILTER (WHERE COALESCE(cardinality(oj.collaborators), 0) > 0)::int AS with_collaborators,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.opportunity_id = oj.id AND t.deleted_at IS NULL))::int AS with_tasks
    FROM ongoing_jobs oj
    WHERE oj.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM migration_entity_map mem
        WHERE mem.target_table = 'ongoing_jobs' AND mem.target_entity_id = oj.id
          AND mem.source_collection = 'opportunities'
      )
  `);

  await client.query('ROLLBACK');
  console.log(JSON.stringify(report, null, 2));
} finally {
  client.release();
  await pool.end();
}
