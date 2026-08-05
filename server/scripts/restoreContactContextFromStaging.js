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
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
});
const client = await pool.connect();

const assessmentByStatus = {
  Confirmed: 'suitable',
  WrongContact: 'unsuitable',
  RedirectedWithReferral: 'redirected_with_referral',
  RedirectedNoReferral: 'redirected_without_referral',
  Unverified: 'unknown',
};

function hasRelationshipEvidence(profile = {}) {
  return (profile.status && profile.status !== 'New')
    || Boolean(String(profile.owner || '').trim())
    || (Array.isArray(profile.serviceCategories) && profile.serviceCategories.some(Boolean))
    || Boolean(profile.nextFollowUpAt)
    || Boolean(String(profile.reminderNotes || '').trim());
}

try {
  await client.query('BEGIN');
  const ddl = await fs.readFile(path.join(scriptDir, '05_restore_contact_context.sql'), 'utf8');
  // The file owns its transaction for standalone use; execute its statements inside this transaction.
  await client.query(ddl.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));

  const sourceRows = (await client.query(`
    SELECT msd.mongo_id, msd.payload, mem.target_entity_id AS person_id, por.id AS role_id
    FROM migration_source_document msd
    JOIN migration_entity_map mem
      ON mem.source_collection = 'leads'
     AND mem.source_mongo_id = msd.mongo_id
     AND mem.target_table = 'people'
    LEFT JOIN person_organization_roles por ON por.person_id = mem.target_entity_id
    WHERE msd.collection_name = 'leads'
  `)).rows;

  const personByMongoLead = new Map(sourceRows.map((row) => [String(row.mongo_id), row.person_id]));
  let pocEvidence = 0;
  let relationshipEvidence = 0;
  let missingRole = 0;

  for (const row of sourceRows) {
    const lead = unwrapBson(row.payload || {});
    const poc = lead.pocQualification || {};
    const profile = lead.relationshipProfile || {};
    const hasPocEvidence = Boolean(poc.assessedAt)
      || (poc.status && poc.status !== 'Unverified')
      || Boolean(String(poc.notes || '').trim())
      || Boolean(poc.referredLeadId)
      || Object.values(poc.referral || {}).some((value) => Boolean(String(value || '').trim()));

    if (!row.role_id && (hasPocEvidence || hasRelationshipEvidence(profile))) {
      missingRole += 1;
      continue;
    }

    if (hasPocEvidence) {
      pocEvidence += 1;
      const referredMongoId = poc.referredLeadId ? String(poc.referredLeadId) : null;
      const referredPersonId = referredMongoId ? personByMongoLead.get(referredMongoId) || null : null;
      await client.query(`
        INSERT INTO poc_suitabilities (
          role_id, responsibility_context, assessment, reason, assessed_at,
          legacy_status, assessed_by, referral, referred_person_id,
          source_lead_mongo_id, source_payload
        ) VALUES ($1::uuid, 'legacy_general', $2, $3, $4, $5, $6, $7::jsonb, $8::uuid, $9, $10::jsonb)
        ON CONFLICT (source_lead_mongo_id) WHERE source_lead_mongo_id IS NOT NULL
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          assessment = EXCLUDED.assessment,
          reason = EXCLUDED.reason,
          assessed_at = EXCLUDED.assessed_at,
          legacy_status = EXCLUDED.legacy_status,
          assessed_by = EXCLUDED.assessed_by,
          referral = EXCLUDED.referral,
          referred_person_id = EXCLUDED.referred_person_id,
          source_payload = EXCLUDED.source_payload
      `, [
        row.role_id,
        assessmentByStatus[poc.status] || 'unknown',
        String(poc.notes || '').trim(),
        poc.assessedAt || null,
        poc.status || 'Unverified',
        String(poc.assessedBy || '').trim(),
        JSON.stringify(poc.referral || {}),
        referredPersonId,
        String(row.mongo_id),
        JSON.stringify(poc),
      ]);
    }

    if (hasRelationshipEvidence(profile)) {
      relationshipEvidence += 1;
      await client.query(`
        INSERT INTO key_relationship_profiles (
          role_id, standing, manually_confirmed, confirmed_at,
          legacy_status, owner_name, service_categories, next_follow_up_at,
          reminder_notes, source_lead_mongo_id, source_payload
        ) VALUES ($1::uuid, $2, $3, $4, $2, $5, $6::text[], $7, $8, $9, $10::jsonb)
        ON CONFLICT (source_lead_mongo_id) WHERE source_lead_mongo_id IS NOT NULL
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          standing = EXCLUDED.standing,
          manually_confirmed = EXCLUDED.manually_confirmed,
          confirmed_at = EXCLUDED.confirmed_at,
          legacy_status = EXCLUDED.legacy_status,
          owner_name = EXCLUDED.owner_name,
          service_categories = EXCLUDED.service_categories,
          next_follow_up_at = EXCLUDED.next_follow_up_at,
          reminder_notes = EXCLUDED.reminder_notes,
          source_payload = EXCLUDED.source_payload
      `, [
        row.role_id,
        profile.status || 'New',
        profile.status === 'Active',
        profile.status === 'Active' ? (lead.updatedAt || lead.createdAt || new Date().toISOString()) : null,
        String(profile.owner || '').trim(),
        (profile.serviceCategories || []).map(String).filter(Boolean),
        profile.nextFollowUpAt || null,
        String(profile.reminderNotes || '').trim(),
        String(row.mongo_id),
        JSON.stringify(profile),
      ]);
    }
  }

  const summary = { mode: apply ? 'apply' : 'dry-run', sourceRows: sourceRows.length, pocEvidence, relationshipEvidence, missingRole };
  if (apply) await client.query('COMMIT');
  else await client.query('ROLLBACK');
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
