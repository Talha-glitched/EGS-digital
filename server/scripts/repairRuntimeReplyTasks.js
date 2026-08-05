#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
const apply = process.argv.includes('--apply');
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
});
const client = await pool.connect();

try {
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION READ ONLY');
  const rows = await client.query(`
    SELECT DISTINCT ON (m.id)
           m.id AS message_id, t.id AS task_id,
           COALESCE(campaign_role.person_id, participant_method.person_id) AS person_id,
           COALESCE(campaign_account.organization_id, person_role.organization_id) AS company_id,
           COALESCE(conv.campaign_id, campaign_account.campaign_id) AS campaign_id,
           t.lead_id AS previous_lead_id, t.company_id AS previous_company_id,
           t.campaign_id AS previous_campaign_id, t.type AS previous_type
    FROM messages m
    JOIN conversations conv ON conv.id = m.conversation_id
    JOIN review_items ri ON ri.source_message_id = m.id
    JOIN tasks t ON t.review_item_id = ri.id
    LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
    LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = cc.campaign_account_id
    LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = cc.role_id
    LEFT JOIN conversation_participants participant ON participant.conversation_id = conv.id
      AND participant.person_contact_method_id IS NOT NULL
    LEFT JOIN person_contact_methods participant_method ON participant_method.id = participant.person_contact_method_id
    LEFT JOIN person_organization_roles person_role ON person_role.person_id = participant_method.person_id
    WHERE m.direction = 'inbound'
      AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
      AND m.source_collection IS NULL
    ORDER BY m.id,
             CASE WHEN campaign_role.person_id IS NOT NULL THEN 0 ELSE 1 END,
             person_role.effective_to NULLS FIRST, person_role.created_at DESC
  `);

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    messagesWithTasks: rows.rows.length,
    resolvablePeople: rows.rows.filter((row) => row.person_id).length,
    missingLeadBefore: rows.rows.filter((row) => !row.previous_lead_id).length,
    missingCampaignBefore: rows.rows.filter((row) => !row.previous_campaign_id).length,
  };
  if (summary.messagesWithTasks !== 23 || summary.resolvablePeople !== 23) {
    throw new Error(`Precondition failed; refusing reply-task repair: ${JSON.stringify(summary)}`);
  }

  if (apply) {
    const backupDir = path.resolve(scriptDir, '../backups/sql-repair');
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `runtime-reply-tasks-before-${new Date().toISOString().replaceAll(':', '-')}.json`);
    await fs.writeFile(backupPath, `${JSON.stringify(rows.rows, null, 2)}\n`, { flag: 'wx' });
    summary.backupPath = backupPath;

    for (const row of rows.rows) {
      await client.query(
        `UPDATE tasks SET
           lead_id = $2::uuid, company_id = $3::uuid, campaign_id = $4::uuid,
           type = 'reply_review', task_type = 'reply_review',
           reply_id = $5::uuid, source_collection = COALESCE(source_collection, 'runtime_reply_review')
         WHERE id = $1::uuid`,
        [row.task_id, row.person_id, row.company_id, row.campaign_id, row.message_id]
      );
      await client.query(
        `INSERT INTO audit_events (action, entity_type, entity_id, payload)
         VALUES ('runtime_reply_task_context_repaired', 'task', $1::uuid, $2::jsonb)`,
        [row.task_id, JSON.stringify({ sourceMessageId: row.message_id })]
      );
    }

    const after = await client.query(`
      SELECT COUNT(DISTINCT m.id)::int AS messages,
             COUNT(DISTINCT m.id) FILTER (WHERE t.lead_id IS NOT NULL)::int AS linked_people,
             COUNT(DISTINCT m.id) FILTER (WHERE t.campaign_id IS NOT NULL)::int AS linked_campaigns
      FROM messages m
      JOIN review_items ri ON ri.source_message_id = m.id
      JOIN tasks t ON t.review_item_id = ri.id
      WHERE m.direction = 'inbound' AND m.source_collection IS NULL
        AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
    `);
    summary.after = after.rows[0];
    if (summary.after.messages !== 23 || summary.after.linked_people !== 23 || summary.after.linked_campaigns !== 23) {
      throw new Error(`Postcondition failed; rolling back: ${JSON.stringify(summary.after)}`);
    }
    await client.query('COMMIT');
  } else {
    await client.query('ROLLBACK');
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
