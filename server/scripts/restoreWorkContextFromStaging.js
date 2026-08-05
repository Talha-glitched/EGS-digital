#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { unwrapBson } from '../src/utils/bsonUnwrap.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
dotenv.config();
const apply = process.argv.includes('--apply');
const withSchema = process.argv.includes('--schema');
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
  application_name: 'egs_work_context_repair',
});
const client = await pool.connect();

const oid = (value) => value == null ? null : String(unwrapBson(value));
const asDate = (value) => value ? new Date(unwrapBson(value)).toISOString() : null;
const json = (value) => JSON.stringify(value ?? {});
const normalizeStatus = (value) => String(value || '').toLowerCase() === 'done' ? 'completed' : 'pending';
const normalizePriority = (value) => String(value || 'Normal').toLowerCase();

async function chunks(rows, width, sqlForValues, chunkSize = 200) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = chunk.map((_, index) => {
      const refs = Array.from({ length: width }, (_unused, col) => `$${index * width + col + 1}`);
      return `(${refs.join(',')})`;
    }).join(',');
    await client.query(sqlForValues(values), chunk.flat());
  }
}

try {
  await client.query('BEGIN');
  await client.query("SET LOCAL idle_in_transaction_session_timeout = '60s'");
  await client.query("SET LOCAL lock_timeout = '10s'");
  if (withSchema) {
    const ddl = await fs.readFile(path.join(scriptDir, '09_restore_work_context.sql'), 'utf8');
    await client.query(ddl.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));
  }

  const source = await client.query(`
    SELECT collection_name, mongo_id, payload
    FROM migration_source_document
    WHERE collection_name IN ('tasks', 'contactinteractions')
  `);
  const byCollection = new Map();
  for (const row of source.rows) {
    const rows = byCollection.get(row.collection_name) || [];
    rows.push({ mongoId: String(row.mongo_id), payload: unwrapBson(row.payload || {}) });
    byCollection.set(row.collection_name, rows);
  }

  const mappings = await client.query(`
    SELECT source_collection, source_mongo_id, target_table, target_entity_id
    FROM migration_entity_map
    WHERE (source_collection = 'leads' AND target_table = 'people')
       OR (source_collection = 'companies' AND target_table = 'organizations')
       OR (source_collection = 'users' AND target_table = 'users')
       OR (source_collection = 'projectcampaigns' AND target_table = 'campaigns')
       OR (source_collection = 'opportunities' AND target_table = 'ongoing_jobs')
       OR (source_collection = 'replies' AND target_table = 'messages')
  `);
  const mapFor = (collection, table) => new Map(mappings.rows
    .filter((row) => row.source_collection === collection && row.target_table === table)
    .map((row) => [row.source_mongo_id, row.target_entity_id]));
  const people = mapFor('leads', 'people');
  const organizations = mapFor('companies', 'organizations');
  const users = mapFor('users', 'users');
  const campaigns = mapFor('projectcampaigns', 'campaigns');
  const jobs = mapFor('opportunities', 'ongoing_jobs');
  const replyMessages = mapFor('replies', 'messages');

  const interactionRows = (byCollection.get('contactinteractions') || []).map(({ mongoId, payload }) => [
    mongoId, people.get(oid(payload.leadId)) || null, organizations.get(oid(payload.companyId)) || null,
    payload.type || 'other', payload.direction || 'outbound', asDate(payload.occurredAt),
    payload.outcome || null, payload.summary || '', users.get(oid(payload.loggedByUserId)) || null,
    payload.title || '', Number(payload.durationMinutes || 0) || null, payload.location || '',
    payload.attendees || '', payload.loggedBy || 'Team',
    (payload.relatedLeadIds || []).map((id) => people.get(oid(id))).filter(Boolean),
    asDate(payload.deletedAt), json(payload),
  ]);
  await chunks(interactionRows, 17, (values) => `
    INSERT INTO interactions (
      source_interaction_mongo_id, person_id, organization_id, channel, direction,
      occurred_at, outcome, notes, created_by_user_id, title, duration_minutes,
      location, attendees, logged_by, related_person_ids, deleted_at, payload
    ) VALUES ${values}
    ON CONFLICT (source_interaction_mongo_id) WHERE source_interaction_mongo_id IS NOT NULL
    DO UPDATE SET person_id = EXCLUDED.person_id, organization_id = EXCLUDED.organization_id,
      channel = EXCLUDED.channel, direction = EXCLUDED.direction, occurred_at = EXCLUDED.occurred_at,
      outcome = EXCLUDED.outcome, notes = EXCLUDED.notes, created_by_user_id = EXCLUDED.created_by_user_id,
      title = EXCLUDED.title, duration_minutes = EXCLUDED.duration_minutes,
      location = EXCLUDED.location, attendees = EXCLUDED.attendees, logged_by = EXCLUDED.logged_by,
      related_person_ids = EXCLUDED.related_person_ids, deleted_at = EXCLUDED.deleted_at,
      payload = EXCLUDED.payload
  `);
  const persistedInteractions = await client.query(`SELECT id, source_interaction_mongo_id FROM interactions WHERE source_interaction_mongo_id IS NOT NULL`);
  const interactions = new Map(persistedInteractions.rows.map((row) => [row.source_interaction_mongo_id, row.id]));

  await client.query(`
    INSERT INTO review_items (source_message_id, conversation_id, status, opened_at, suggested_outcome, payload)
    SELECT m.id, m.conversation_id, 'pending', m.occurred_at,
      COALESCE(m.suggested_intent, 'Neutral'), '{}'::jsonb
    FROM messages m
    WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, false) = false
      AND NOT EXISTS (SELECT 1 FROM review_items ri WHERE ri.source_message_id = m.id)
  `);
  const reviewItems = await client.query(`SELECT id, source_message_id FROM review_items WHERE source_message_id IS NOT NULL`);
  const reviewByMessage = new Map(reviewItems.rows.map((row) => [String(row.source_message_id), row.id]));

  const sqlTasks = await client.query(`
    SELECT id, title, status, priority, owner, due_at, completed_at, deleted_at, created_at
    FROM tasks WHERE source_task_mongo_id IS NULL
    ORDER BY created_at, id
  `);
  const candidatesByTitle = new Map();
  for (const row of sqlTasks.rows) {
    const rows = candidatesByTitle.get(row.title) || [];
    rows.push(row);
    candidatesByTitle.set(row.title, rows);
  }

  const sourceTasks = byCollection.get('tasks') || [];
  const matched = [];
  const unresolvedSourceTasks = [];
  const distance = (candidate, payload) => {
    let score = 0;
    if (String(candidate.status || '').toLowerCase() === normalizeStatus(payload.status)) score += 8;
    if (String(candidate.priority || '').toLowerCase() === normalizePriority(payload.priority)) score += 4;
    if (String(candidate.owner || '').toLowerCase() === String(payload.owner || '').toLowerCase()) score += 2;
    if (Boolean(candidate.completed_at) === Boolean(payload.completedAt)) score += 2;
    if (Boolean(candidate.deleted_at) === Boolean(payload.deletedAt)) score += 2;
    return score;
  };
  for (const sourceTask of sourceTasks.sort((a, b) => new Date(a.payload.createdAt || 0) - new Date(b.payload.createdAt || 0))) {
    const candidates = candidatesByTitle.get(sourceTask.payload.title) || [];
    if (!candidates.length) {
      unresolvedSourceTasks.push(sourceTask.mongoId);
      continue;
    }
    candidates.sort((a, b) => distance(b, sourceTask.payload) - distance(a, sourceTask.payload));
    const target = candidates.shift();
    matched.push({ ...sourceTask, targetId: target.id });
  }

  const taskRows = matched.map(({ mongoId, payload, targetId }) => {
    const replyMessageId = replyMessages.get(oid(payload.replyId)) || null;
    return [
      targetId, mongoId, users.get(oid(payload.ownerUserId)) || null,
      campaigns.get(oid(payload.campaignId)) || null, organizations.get(oid(payload.companyId)) || null,
      people.get(oid(payload.leadId)) || null, jobs.get(oid(payload.opportunityId)) || null,
      payload.taskType || 'general', normalizeStatus(payload.status), normalizePriority(payload.priority),
      payload.title || 'Task', payload.notes || '', asDate(payload.dueAt), asDate(payload.completedAt),
      payload.owner || null, replyMessageId, reviewByMessage.get(String(replyMessageId)) || null,
      payload.channel || null, interactions.get(oid(payload.interactionId)) || null,
      asDate(payload.deletedAt), payload.deletedBy || null,
      jobs.get(oid(payload.deletedViaOpportunityId)) || null, Number(payload.version || 0),
      asDate(payload.createdAt), asDate(payload.updatedAt), json(payload),
    ];
  });
  await chunks(taskRows, 26, (values) => `
    UPDATE tasks t SET
      source_collection = 'tasks', source_task_mongo_id = source.mongo_id,
      owner_user_id = source.owner_user_id::uuid, campaign_id = source.campaign_id::uuid,
      company_id = source.company_id::uuid, lead_id = source.lead_id::uuid,
      opportunity_id = source.opportunity_id::uuid, type = source.task_type,
      task_type = source.task_type, status = source.status, priority = source.priority,
      title = source.title, description = source.description, due_at = source.due_at::timestamptz,
      completed_at = source.completed_at::timestamptz, owner = source.owner,
      reply_id = source.reply_id::uuid, review_item_id = source.review_item_id::uuid,
      channel = source.channel, interaction_id = source.interaction_id::uuid,
      deleted_at = source.deleted_at::timestamptz, deleted_by = source.deleted_by,
      deleted_via_opportunity_id = source.deleted_via_opportunity_id::uuid,
      version = source.version::integer, created_at = source.created_at::timestamptz,
      updated_at = source.updated_at::timestamptz, payload = source.payload::jsonb
    FROM (VALUES ${values}) AS source(
      id, mongo_id, owner_user_id, campaign_id, company_id, lead_id, opportunity_id,
      task_type, status, priority, title, description, due_at, completed_at, owner,
      reply_id, review_item_id, channel, interaction_id, deleted_at, deleted_by,
      deleted_via_opportunity_id, version, created_at, updated_at, payload
    )
    WHERE t.id = source.id::uuid
  `);

  await client.query(`
    UPDATE tasks t SET
      type = 'reply_review', task_type = 'reply_review',
      reply_id = m.id, review_item_id = ri.id,
      lead_id = por.person_id, company_id = ca.organization_id,
      campaign_id = COALESCE(conv.campaign_id, ca.campaign_id),
      source_collection = COALESCE(t.source_collection, 'generated_reply_review')
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
    LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
    LEFT JOIN person_organization_roles por ON por.id = cc.role_id
    LEFT JOIN review_items ri ON ri.source_message_id = m.id
    WHERE t.source_task_mongo_id IS NULL
      AND lower(t.title) LIKE 'review reply%'
      AND t.description = m.body
      AND m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, false) = false
  `);

  await client.query(`
    INSERT INTO migration_entity_map (
      source_collection, source_mongo_id, target_table, target_entity_id,
      mapping_kind, confidence, rule_version
    )
    SELECT 'contactinteractions', i.source_interaction_mongo_id, 'interactions', i.id,
      'direct', 1.00, 'work-context-v1'
    FROM interactions i
    WHERE i.source_interaction_mongo_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM migration_entity_map mem
        WHERE mem.source_collection = 'contactinteractions'
          AND mem.source_mongo_id = i.source_interaction_mongo_id
          AND mem.target_table = 'interactions'
      )
  `);
  await client.query(`
    INSERT INTO migration_entity_map (
      source_collection, source_mongo_id, target_table, target_entity_id,
      mapping_kind, confidence, rule_version
    )
    SELECT 'tasks', t.source_task_mongo_id, 'tasks', t.id,
      'direct', 1.00, 'work-context-v1'
    FROM tasks t
    WHERE t.source_task_mongo_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM migration_entity_map mem
        WHERE mem.source_collection = 'tasks'
          AND mem.source_mongo_id = t.source_task_mongo_id
          AND mem.target_table = 'tasks'
      )
  `);

  const summary = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM interactions WHERE source_interaction_mongo_id IS NOT NULL)::int AS restored_interactions,
      (SELECT COUNT(*) FROM interactions WHERE source_interaction_mongo_id IS NOT NULL AND (person_id IS NULL OR organization_id IS NULL))::int AS unresolved_interactions,
      (SELECT COUNT(*) FROM tasks WHERE source_collection = 'tasks')::int AS restored_source_tasks,
      (SELECT COUNT(*) FROM tasks WHERE source_collection = 'tasks' AND owner_user_id IS NULL AND NULLIF(payload->>'ownerUserId', '') IS NOT NULL)::int AS unresolved_task_owners,
      (SELECT COUNT(*) FROM tasks WHERE source_collection = 'generated_reply_review')::int AS linked_reply_review_tasks,
      (SELECT COUNT(*) FROM tasks WHERE lower(title) LIKE 'review reply%' AND review_item_id IS NULL)::int AS unlinked_reply_review_tasks,
      (SELECT COUNT(*) FROM review_items)::int AS review_items
  `);
  if (apply) await client.query('COMMIT');
  else await client.query('ROLLBACK');
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    sourceTasks: sourceTasks.length,
    matchedSourceTasks: matched.length,
    unresolvedSourceTasks: unresolvedSourceTasks.length,
    ...summary.rows[0],
  }, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
