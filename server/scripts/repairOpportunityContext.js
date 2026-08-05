#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import { unwrapBson } from '../src/utils/bsonUnwrap.js';

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

const oid = (value) => value == null ? null : String(unwrapBson(value));
const date = (value) => {
  if (!value) return null;
  const parsed = new Date(unwrapBson(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const number = (value) => {
  const parsed = Number(unwrapBson(value));
  return Number.isFinite(parsed) ? parsed : null;
};

try {
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION READ ONLY');

  const sourceResult = await client.query(
    `SELECT mongo_id, payload FROM migration_source_document WHERE collection_name = 'opportunities' ORDER BY mongo_id`
  );
  const mappingResult = await client.query(`
      SELECT source_collection, source_mongo_id, target_table, target_entity_id
      FROM migration_entity_map
      WHERE (source_collection = 'opportunities' AND target_table = 'ongoing_jobs')
         OR (source_collection = 'leads' AND target_table = 'people')
         OR (source_collection = 'projectcampaigns' AND target_table = 'campaigns')
         OR (source_collection = 'users' AND target_table = 'users')
    `);
  const targetBefore = await client.query(`
      SELECT oj.* FROM ongoing_jobs oj
      JOIN migration_entity_map mem ON mem.target_entity_id = oj.id
      WHERE mem.source_collection = 'opportunities' AND mem.target_table = 'ongoing_jobs'
      ORDER BY oj.id
      ${apply ? 'FOR UPDATE OF oj' : ''}
    `);

  const mapFor = (collection, table) => new Map(mappingResult.rows
    .filter((row) => row.source_collection === collection && row.target_table === table)
    .map((row) => [row.source_mongo_id, row.target_entity_id]));
  const jobs = mapFor('opportunities', 'ongoing_jobs');
  const people = mapFor('leads', 'people');
  const campaigns = mapFor('projectcampaigns', 'campaigns');
  const users = mapFor('users', 'users');

  const repairs = sourceResult.rows.map((row) => {
    const payload = unwrapBson(row.payload || {});
    return {
      sourceMongoId: row.mongo_id,
      targetId: jobs.get(row.mongo_id) || null,
      primaryLeadId: people.get(oid(payload.primaryLeadId)) || null,
      stakeholderLeadIds: (payload.stakeholderLeadIds || []).map((id) => people.get(oid(id))).filter(Boolean),
      campaignId: campaigns.get(oid(payload.campaignId)) || null,
      owner: payload.owner || null,
      ownerUserId: users.get(oid(payload.ownerUserId)) || null,
      collaborators: Array.isArray(payload.collaborators) ? payload.collaborators.map(String).filter(Boolean) : [],
      collaboratorUserIds: (payload.collaboratorUserIds || []).map((id) => users.get(oid(id))).filter(Boolean),
      summaryStage: payload.stage || 'Inquiry',
      probability: number(payload.probability),
      expectedCloseDate: date(payload.expectedCloseDate),
      nextAction: payload.nextAction || null,
      nextActionDueAt: date(payload.nextActionDueAt),
      services: Array.isArray(payload.services) ? payload.services.map(String).filter(Boolean) : [],
      eventName: payload.eventName || null,
      eventDate: date(payload.eventDate),
      boothNumber: payload.boothNumber || null,
      standSizeSqm: number(payload.standSizeSqm),
      budgetBand: payload.budgetBand || null,
      proposalDeadline: date(payload.proposalDeadline),
      lostReason: payload.lostReason || null,
      notes: payload.notes || null,
      closedAt: date(payload.closedAt),
      lastModifiedBy: payload.lastModifiedBy || null,
      activityLog: Array.isArray(payload.activityLog) ? payload.activityLog : [],
      version: number(payload.version) ?? 0,
      deletedAt: date(payload.deletedAt),
      deletedBy: payload.deletedBy || null,
    };
  });

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    sourceRows: repairs.length,
    mappedJobs: repairs.filter((row) => row.targetId).length,
    sourceDeleted: repairs.filter((row) => row.deletedAt).length,
    primaryContacts: repairs.filter((row) => row.primaryLeadId).length,
    campaignLinks: repairs.filter((row) => row.campaignId).length,
    unresolvedPrimaryContacts: sourceResult.rows.filter((row) => oid(unwrapBson(row.payload).primaryLeadId)).length
      - repairs.filter((row) => row.primaryLeadId).length,
  };
  if (repairs.length !== 16 || summary.mappedJobs !== 16 || summary.sourceDeleted !== 2 || summary.primaryContacts !== 6 || summary.unresolvedPrimaryContacts !== 0) {
    throw new Error(`Precondition failed; refusing context repair: ${JSON.stringify(summary)}`);
  }

  if (apply) {
    const backupDir = path.resolve(scriptDir, '../backups/sql-repair');
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `opportunity-context-before-${new Date().toISOString().replaceAll(':', '-')}.json`);
    await fs.writeFile(backupPath, `${JSON.stringify(targetBefore.rows, null, 2)}\n`, { flag: 'wx' });
    summary.backupPath = backupPath;

    for (const repair of repairs) {
      await client.query(
        `UPDATE ongoing_jobs SET
           primary_lead_id = $2::uuid, stakeholder_lead_ids = $3::uuid[], campaign_id = $4::uuid,
           owner = $5, owner_user_id = $6::uuid, collaborators = $7::text[], collaborator_user_ids = $8::uuid[],
           summary_stage = $9, probability = $10, expected_close_date = $11,
           next_action = $12, next_action_due_at = $13, services = $14::text[],
           event_name = $15, event_date = $16, booth_number = $17, stand_size_sqm = $18,
           budget_band = $19, proposal_deadline = $20, lost_reason = $21, notes = $22,
           closed_at = $23, last_modified_by = $24, activity_log = $25::jsonb, version = $26,
           deleted_at = $27, deleted_by = $28, updated_at = NOW()
         WHERE id = $1::uuid`,
        [
          repair.targetId, repair.primaryLeadId, repair.stakeholderLeadIds, repair.campaignId,
          repair.owner, repair.ownerUserId, repair.collaborators, repair.collaboratorUserIds,
          repair.summaryStage, repair.probability, repair.expectedCloseDate, repair.nextAction,
          repair.nextActionDueAt, repair.services, repair.eventName, repair.eventDate,
          repair.boothNumber, repair.standSizeSqm, repair.budgetBand, repair.proposalDeadline,
          repair.lostReason, repair.notes, repair.closedAt, repair.lastModifiedBy,
          JSON.stringify(repair.activityLog), repair.version, repair.deletedAt, repair.deletedBy,
        ]
      );
      await client.query(
        `INSERT INTO audit_events (action, entity_type, entity_id, payload)
         VALUES ('migration_repair.opportunity_context', 'ongoing_job', $1::uuid, $2::jsonb)`,
        [repair.targetId, JSON.stringify({ sourceCollection: 'opportunities', sourceMongoId: repair.sourceMongoId })]
      );
    }

    const after = await client.query(`
      SELECT COUNT(*)::int AS rows,
             COUNT(*) FILTER (WHERE primary_lead_id IS NOT NULL)::int AS primary_contacts,
             COUNT(*) FILTER (WHERE campaign_id IS NOT NULL)::int AS campaign_links,
             COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted
      FROM ongoing_jobs oj
      WHERE EXISTS (
        SELECT 1 FROM migration_entity_map mem
        WHERE mem.source_collection = 'opportunities' AND mem.target_table = 'ongoing_jobs'
          AND mem.target_entity_id = oj.id
      )
    `);
    summary.after = after.rows[0];
    if (summary.after.rows !== 16 || summary.after.primary_contacts !== 6 || summary.after.deleted !== 2) {
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
