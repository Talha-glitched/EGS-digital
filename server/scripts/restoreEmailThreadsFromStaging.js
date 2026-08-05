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
  application_name: 'egs_email_thread_repair',
});
const client = await pool.connect();

const oid = (value) => value == null ? null : String(unwrapBson(value));
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const asDate = (value) => value ? new Date(unwrapBson(value)).toISOString() : null;
const json = (value) => JSON.stringify(value ?? {});

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
    const ddl = await fs.readFile(path.join(scriptDir, '08_restore_email_threads.sql'), 'utf8');
    await client.query(ddl.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));
  }

  const source = await client.query(`
    SELECT collection_name, mongo_id, payload
    FROM migration_source_document
    WHERE collection_name IN ('emails', 'replies')
    ORDER BY CASE WHEN collection_name = 'emails' THEN 0 ELSE 1 END, mongo_id
  `);

  const canonicalByExternalId = new Map();
  const aliasesByExternalId = new Map();
  for (const row of source.rows) {
    const payload = unwrapBson(row.payload || {});
    const externalId = clean(payload.messageId) || `${row.collection_name}:${row.mongo_id}`;
    const aliases = aliasesByExternalId.get(externalId) || [];
    aliases.push({ collection: row.collection_name, mongoId: String(row.mongo_id) });
    aliasesByExternalId.set(externalId, aliases);
    if (!canonicalByExternalId.has(externalId)) {
      canonicalByExternalId.set(externalId, {
        collection: row.collection_name,
        mongoId: String(row.mongo_id),
        externalId,
        payload,
      });
    }
  }

  const personMaps = await client.query(`
    SELECT source_mongo_id, target_entity_id FROM migration_entity_map
    WHERE source_collection = 'leads' AND target_table = 'people'
  `);
  const campaignMaps = await client.query(`
    SELECT source_mongo_id, target_entity_id FROM migration_entity_map
    WHERE source_collection = 'projectcampaigns' AND target_table = 'campaigns'
  `);
  const personByMongo = new Map(personMaps.rows.map((row) => [row.source_mongo_id, row.target_entity_id]));
  const campaignByMongo = new Map(campaignMaps.rows.map((row) => [row.source_mongo_id, row.target_entity_id]));
  const contactMethods = await client.query(`
    SELECT id, person_id, normalized_value, preferred, created_at
    FROM person_contact_methods WHERE type = 'email'
    ORDER BY preferred DESC NULLS LAST, created_at
  `);
  const contactMethodByPersonEmail = new Map();
  const preferredContactMethodByPerson = new Map();
  for (const row of contactMethods.rows) {
    contactMethodByPersonEmail.set(`${row.person_id}|${lower(row.normalized_value)}`, row.id);
    if (!preferredContactMethodByPerson.has(String(row.person_id))) preferredContactMethodByPerson.set(String(row.person_id), row.id);
  }
  const campaignContacts = await client.query(`
    SELECT id, source_lead_mongo_id, source_campaign_mongo_id, organization_contact_method_id
    FROM campaign_contacts
  `);
  const campaignContactBySource = new Map(campaignContacts.rows.map((row) => [
    `${row.source_lead_mongo_id}|${row.source_campaign_mongo_id}`,
    row,
  ]));

  const canonical = [];
  const threadGroups = new Map();
  for (const item of canonicalByExternalId.values()) {
    const p = item.payload;
    const direction = item.collection === 'replies' ? 'inbound' : (p.direction || 'outbound');
    const leadMongoId = oid(p.leadId);
    const campaignMongoId = oid(p.campaignId);
    const inboundEmail = lower(p.fromEmail || p.from || p.email);
    const outboundEmail = lower(p.toEmail || (Array.isArray(p.to) ? p.to[0] : p.to) || p.email);
    const contactEmail = direction === 'inbound' ? inboundEmail : outboundEmail;
    const contactIdentity = leadMongoId ? `lead:${leadMongoId}` : `endpoint:${contactEmail || 'unknown'}`;
    const threadKey = `${contactIdentity}|campaign:${campaignMongoId || 'none'}`;
    const campaignContact = campaignContactBySource.get(`${leadMongoId}|${campaignMongoId}`) || null;
    const personId = personByMongo.get(leadMongoId) || null;
    const personContactMethodId = personId
      ? contactMethodByPersonEmail.get(`${personId}|${contactEmail}`) || preferredContactMethodByPerson.get(String(personId)) || null
      : null;
    const occurredAt = asDate(direction === 'inbound' ? p.receivedAt : p.sentAt) || asDate(p.createdAt) || new Date(0).toISOString();
    const normalized = {
      ...item,
      direction,
      leadMongoId,
      campaignMongoId,
      campaignId: campaignByMongo.get(campaignMongoId) || null,
      campaignContactId: campaignContact?.id || null,
      personContactMethodId,
      organizationContactMethodId: campaignContact?.organization_contact_method_id || null,
      contactEmail,
      threadKey,
      occurredAt,
    };
    canonical.push(normalized);
    const group = threadGroups.get(threadKey) || [];
    group.push(normalized);
    threadGroups.set(threadKey, group);
  }

  const conversationRows = [...threadGroups.entries()].map(([threadKey, group]) => {
    group.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
    const first = group[0];
    return [
      threadKey,
      first.campaignContactId,
      first.campaignId,
      clean(first.payload.subject).slice(0, 255) || '(No subject)',
      first.occurredAt,
      json({ source: 'Mongo email history', messageCount: group.length }),
    ];
  });
  await chunks(conversationRows, 6, (values) => `
    INSERT INTO conversations (
      source_thread_key, campaign_contact_id, campaign_id, subject, created_at, payload
    ) VALUES ${values}
    ON CONFLICT (source_thread_key) WHERE source_thread_key IS NOT NULL
    DO UPDATE SET campaign_contact_id = EXCLUDED.campaign_contact_id,
      campaign_id = EXCLUDED.campaign_id, subject = EXCLUDED.subject,
      created_at = LEAST(conversations.created_at, EXCLUDED.created_at), payload = EXCLUDED.payload
  `);
  const conversations = await client.query(`SELECT id, source_thread_key FROM conversations WHERE source_thread_key IS NOT NULL`);
  const conversationByKey = new Map(conversations.rows.map((row) => [row.source_thread_key, row.id]));

  const existingMessages = await client.query(`SELECT id, external_message_id FROM messages ORDER BY id`);
  const existingByExternalId = new Map();
  for (const row of existingMessages.rows) {
    const rows = existingByExternalId.get(row.external_message_id) || [];
    rows.push(row.id);
    existingByExternalId.set(row.external_message_id, rows);
  }

  const missingRows = canonical.filter((item) => !(existingByExternalId.get(item.externalId) || []).length).map((item) => [
    conversationByKey.get(item.threadKey), item.direction, item.externalId,
    clean(item.payload.subject).slice(0, 255), clean(item.payload.body || item.payload.text),
    item.occurredAt, item.payload.status || (item.direction === 'inbound' ? 'received' : 'sent'),
  ]);
  await chunks(missingRows, 7, (values) => `
    INSERT INTO messages (conversation_id, direction, external_message_id, subject, body, occurred_at, delivery_state)
    VALUES ${values}
  `);
  if (missingRows.length) {
    const refreshed = await client.query(`SELECT id, external_message_id FROM messages ORDER BY id`);
    existingByExternalId.clear();
    for (const row of refreshed.rows) {
      const rows = existingByExternalId.get(row.external_message_id) || [];
      rows.push(row.id);
      existingByExternalId.set(row.external_message_id, rows);
    }
  }

  const canonicalMessageId = new Map();
  const updateRows = canonical.map((item) => {
    const messageId = existingByExternalId.get(item.externalId)?.[0];
    canonicalMessageId.set(item.externalId, messageId);
    return [
      messageId, conversationByKey.get(item.threadKey), item.direction, item.collection, item.mongoId,
      clean(item.payload.subject).slice(0, 255), clean(item.payload.body || item.payload.text),
      clean(item.payload.htmlBody || item.payload.html), item.occurredAt,
      item.payload.status || (item.direction === 'inbound' ? 'received' : 'sent'),
      clean(item.payload.fromEmail || item.payload.from), json(item.payload.to || item.payload.toEmail || []),
      item.payload.suggestedIntent || item.payload.intent || null,
      item.payload.humanReview?.status || null, json(item.payload),
    ];
  });
  await chunks(updateRows, 15, (values) => `
    UPDATE messages m SET
      conversation_id = source.conversation_id::uuid,
      direction = source.direction,
      source_collection = source.source_collection,
      source_mongo_id = source.source_mongo_id,
      subject = source.subject,
      body = source.body,
      html_body = source.html_body,
      occurred_at = source.occurred_at::timestamptz,
      delivery_state = source.delivery_state,
      from_snapshot = source.from_snapshot,
      to_snapshot = source.to_snapshot::jsonb,
      suggested_intent = source.suggested_intent,
      human_review_status = source.human_review_status,
      is_migration_duplicate = false,
      duplicate_of_message_id = NULL,
      payload = source.payload::jsonb
    FROM (VALUES ${values}) AS source(
      id, conversation_id, direction, source_collection, source_mongo_id,
      subject, body, html_body, occurred_at, delivery_state, from_snapshot,
      to_snapshot, suggested_intent, human_review_status, payload
    )
    WHERE m.id = source.id::uuid
  `);

  const duplicateRows = [];
  for (const item of canonical) {
    const ids = existingByExternalId.get(item.externalId) || [];
    for (const duplicateId of ids.slice(1)) duplicateRows.push([duplicateId, ids[0]]);
  }
  await chunks(duplicateRows, 2, (values) => `
    UPDATE messages m SET is_migration_duplicate = true,
      duplicate_of_message_id = source.canonical_id::uuid,
      delivery_state = 'migration_duplicate'
    FROM (VALUES ${values}) AS source(id, canonical_id)
    WHERE m.id = source.id::uuid
  `);

  const participantRowsByKey = new Map();
  for (const item of canonical) {
    const conversationId = conversationByKey.get(item.threadKey);
    if (!conversationId || !item.contactEmail) continue;
    for (const role of ['recipient', 'sender']) {
      const key = `${conversationId}|${role}|${item.contactEmail}`;
      participantRowsByKey.set(key, [
        conversationId, item.personContactMethodId, item.organizationContactMethodId,
        role, 'email', item.contactEmail,
      ]);
    }
  }
  await chunks([...participantRowsByKey.values()], 6, (values) => `
    INSERT INTO conversation_participants (
      conversation_id, person_contact_method_id, organization_contact_method_id,
      participant_role, endpoint_type_snapshot, endpoint_value_snapshot
    ) VALUES ${values}
    ON CONFLICT (conversation_id, participant_role, endpoint_value_snapshot)
    DO UPDATE SET person_contact_method_id = EXCLUDED.person_contact_method_id,
      organization_contact_method_id = EXCLUDED.organization_contact_method_id
  `);

  const reviewRows = canonical.filter((item) => item.direction === 'inbound').map((item) => {
    const status = item.payload.humanReview?.status === 'Not Required' ? 'resolved' : 'pending';
    return [
      canonicalMessageId.get(item.externalId), conversationByKey.get(item.threadKey), status,
      item.occurredAt, status === 'resolved' ? asDate(item.payload.humanReview?.reviewedAt) || item.occurredAt : null,
      item.payload.suggestedIntent || item.payload.intent || 'Neutral', json(item.payload.humanReview || {}),
    ];
  });
  await chunks(reviewRows, 7, (values) => `
    INSERT INTO review_items (
      source_message_id, conversation_id, status, opened_at, closed_at, suggested_outcome, payload
    ) VALUES ${values}
    ON CONFLICT (source_message_id) WHERE source_message_id IS NOT NULL
    DO UPDATE SET conversation_id = EXCLUDED.conversation_id, status = EXCLUDED.status,
      opened_at = EXCLUDED.opened_at, closed_at = EXCLUDED.closed_at,
      suggested_outcome = EXCLUDED.suggested_outcome, payload = EXCLUDED.payload
  `);

  const mappingRows = [];
  for (const [externalId, aliases] of aliasesByExternalId) {
    const targetId = canonicalMessageId.get(externalId);
    for (const alias of aliases) mappingRows.push([alias.collection, alias.mongoId, targetId, aliases.length > 1 ? 'deduplicated' : 'direct']);
  }
  await chunks(mappingRows, 4, (values) => `
    UPDATE migration_entity_map mem SET
      target_entity_id = source.target_id::uuid,
      mapping_kind = source.mapping_kind,
      confidence = 1.00,
      rule_version = 'email-thread-v1'
    FROM (VALUES ${values}) AS source(source_collection, source_mongo_id, target_id, mapping_kind)
    WHERE mem.source_collection = source.source_collection
      AND mem.source_mongo_id = source.source_mongo_id
      AND mem.target_table = 'messages'
  `);
  await chunks(mappingRows, 4, (values) => `
    INSERT INTO migration_entity_map (
      source_collection, source_mongo_id, target_table, target_entity_id,
      mapping_kind, confidence, rule_version
    )
    SELECT source.source_collection, source.source_mongo_id, 'messages',
      source.target_id::uuid, source.mapping_kind, 1.00, 'email-thread-v1'
    FROM (VALUES ${values}) AS source(source_collection, source_mongo_id, target_id, mapping_kind)
    WHERE NOT EXISTS (
      SELECT 1 FROM migration_entity_map mem
      WHERE mem.source_collection = source.source_collection
        AND mem.source_mongo_id = source.source_mongo_id
        AND mem.target_table = 'messages'
    )
  `);

  const summary = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM conversations WHERE source_thread_key IS NOT NULL)::int AS canonical_threads,
      (SELECT COUNT(*) FROM messages WHERE source_collection IS NOT NULL AND NOT is_migration_duplicate)::int AS canonical_source_messages,
      (SELECT COUNT(*) FROM messages WHERE direction = 'outbound' AND NOT is_migration_duplicate)::int AS visible_outbound,
      (SELECT COUNT(*) FROM messages WHERE direction = 'inbound' AND NOT is_migration_duplicate)::int AS visible_inbound,
      (SELECT COUNT(*) FROM messages WHERE is_migration_duplicate)::int AS preserved_duplicates,
      (SELECT COUNT(*) FROM conversation_participants)::int AS participants,
      (SELECT COUNT(*) FROM review_items)::int AS review_items,
      (SELECT COUNT(*) FROM migration_entity_map mem JOIN messages m ON mem.target_table='messages' AND mem.target_entity_id=m.id WHERE mem.source_collection IN ('emails','replies'))::int AS valid_source_mappings
  `);
  if (apply) await client.query('COMMIT');
  else await client.query('ROLLBACK');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', sourceDocuments: source.rows.length, uniqueSourceMessages: canonical.length, ...summary.rows[0] }, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
