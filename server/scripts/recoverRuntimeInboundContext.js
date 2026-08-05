#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
const apply = process.argv.includes('--apply');
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error('RESEND_API_KEY is required for provider-assisted recovery.');
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

function emailFrom(value = '') {
  const bracketed = String(value).match(/<([^>]+)>/);
  return String(bracketed?.[1] || value).trim().toLowerCase();
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
});
const client = await pool.connect();

try {
  const orphanResult = await client.query(`
    SELECT DISTINCT m.id AS message_id, m.external_message_id, c.id AS conversation_id
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      AND m.source_collection IS NULL
      AND c.campaign_contact_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.person_contact_method_id IS NOT NULL
      )
    ORDER BY m.id
  `);

  const receiving = await fetch('https://api.resend.com/emails/receiving?limit=100', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!receiving.ok) throw new Error(`Resend receiving API returned ${receiving.status}.`);
  const payload = await receiving.json();
  const providerItems = Array.isArray(payload.data) ? payload.data : [];
  const byExternalId = new Map();
  providerItems.forEach((item) => {
    if (item.id) byExternalId.set(String(item.id), item);
    if (item.message_id) byExternalId.set(String(item.message_id), item);
  });

  const recoverable = [];
  let providerMatched = 0;
  let uniquePersonMatched = 0;
  for (const orphan of orphanResult.rows) {
    const item = byExternalId.get(String(orphan.external_message_id));
    if (!item) continue;
    providerMatched += 1;
    const email = emailFrom(item.from);
    if (!email) continue;
    const candidates = await client.query(
      `SELECT pcm.id AS contact_method_id, pcm.person_id,
              COUNT(DISTINCT cc.id)::int AS campaign_contact_count,
              MIN(cc.id::text)::uuid AS sole_campaign_contact_id,
              MIN(ca.campaign_id::text)::uuid AS sole_campaign_id
       FROM person_contact_methods pcm
       LEFT JOIN person_organization_roles por ON por.person_id = pcm.person_id
       LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
       LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
       WHERE pcm.type = 'email' AND pcm.normalized_value = $1
       GROUP BY pcm.id, pcm.person_id`,
      [email]
    );
    const distinctPeople = new Set(candidates.rows.map((row) => String(row.person_id)));
    if (distinctPeople.size !== 1 || candidates.rows.length !== 1) continue;
    uniquePersonMatched += 1;
    const match = candidates.rows[0];
    recoverable.push({
      ...orphan,
      endpoint: email,
      contactMethodId: match.contact_method_id,
      personId: match.person_id,
      campaignContactId: match.campaign_contact_count === 1 ? match.sole_campaign_contact_id : null,
      campaignId: match.campaign_contact_count === 1 ? match.sole_campaign_id : null,
    });
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    orphanMessages: orphanResult.rows.length,
    providerItems: providerItems.length,
    providerMatched,
    uniquePersonMatched,
    safelyRecoverable: recoverable.length,
    withUnambiguousCampaign: recoverable.filter((row) => row.campaignContactId).length,
    unresolvedAfterRecovery: orphanResult.rows.length - recoverable.length,
  };

  if (apply && recoverable.length) {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    for (const row of recoverable) {
      await client.query(
        `INSERT INTO conversation_participants (
           conversation_id, person_contact_method_id, participant_role,
           endpoint_type_snapshot, endpoint_value_snapshot
         ) SELECT $1::uuid, $2::uuid, 'sender', 'email', $3
         WHERE NOT EXISTS (
           SELECT 1 FROM conversation_participants
           WHERE conversation_id = $1::uuid AND person_contact_method_id = $2::uuid
         )`,
        [row.conversation_id, row.contactMethodId, row.endpoint]
      );
      if (row.campaignContactId) {
        await client.query(
          `UPDATE conversations
           SET campaign_contact_id = COALESCE(campaign_contact_id, $2::uuid),
               campaign_id = COALESCE(campaign_id, $3::uuid)
           WHERE id = $1::uuid`,
          [row.conversation_id, row.campaignContactId, row.campaignId]
        );
      }
      await client.query(
        `UPDATE tasks t SET lead_id = $2::uuid,
             company_id = COALESCE(company_id, por.organization_id),
             campaign_id = COALESCE(campaign_id, $3::uuid),
             type = COALESCE(type, 'reply_review'), task_type = COALESCE(task_type, 'reply_review')
         FROM review_items ri
         LEFT JOIN person_organization_roles por ON por.person_id = $2::uuid
         WHERE ri.source_message_id = $1::uuid AND t.review_item_id = ri.id`,
        [row.message_id, row.personId, row.campaignId]
      );
      await client.query(
        `INSERT INTO audit_events (action, entity_type, entity_id, payload)
         VALUES ('runtime_email_context_recovered', 'message', $1::uuid, $2::jsonb)`,
        [row.message_id, JSON.stringify({ provider: 'resend', campaignLinked: Boolean(row.campaignContactId) })]
      );
    }
    await client.query('COMMIT');
  }

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
