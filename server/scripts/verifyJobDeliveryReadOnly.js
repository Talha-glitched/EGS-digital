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

try {
  await pool.query('BEGIN READ ONLY');
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM service_offerings WHERE active_to IS NULL) AS service_offerings,
      (SELECT COUNT(*)::int FROM uoms) AS uoms,
      (SELECT COUNT(*)::int FROM ongoing_jobs WHERE NULLIF(BTRIM(notes), '') IS NOT NULL) AS legacy_job_briefs,
      (SELECT COUNT(*)::int FROM notes WHERE source_key LIKE 'legacy-ongoing-job-notes:%') AS migrated_job_briefs,
      (SELECT COUNT(*)::int FROM notes n LEFT JOIN note_versions nv ON nv.note_id = n.id AND nv.version_number = n.current_version_number WHERE n.target_entity_type = 'ongoing_job' AND nv.id IS NULL) AS memory_without_current_version,
      (SELECT COUNT(*)::int FROM job_phases jp LEFT JOIN ongoing_jobs oj ON oj.id = jp.ongoing_job_id WHERE oj.id IS NULL) AS orphan_phases,
      (SELECT COUNT(*)::int FROM job_locations jl LEFT JOIN ongoing_jobs oj ON oj.id = jl.ongoing_job_id WHERE oj.id IS NULL) AS orphan_locations,
      (SELECT COUNT(*)::int FROM job_scope_lines jsl LEFT JOIN ongoing_jobs oj ON oj.id = jsl.ongoing_job_id WHERE oj.id IS NULL) AS orphan_work_packages,
      (SELECT COUNT(*)::int FROM completed_jobs WHERE deleted_at IS NULL) AS separate_completed_job_records
  `);
  const row = result.rows[0];
  if (row.service_offerings < 12) throw new Error(`Expected at least 12 service offerings, found ${row.service_offerings}.`);
  if (row.uoms < 9) throw new Error(`Expected at least 9 UOMs, found ${row.uoms}.`);
  if (row.migrated_job_briefs !== row.legacy_job_briefs) throw new Error('Not every legacy Job brief was copied into Job Memory.');
  if (row.memory_without_current_version || row.orphan_phases || row.orphan_locations || row.orphan_work_packages) {
    throw new Error(`Relationship verification failed: ${JSON.stringify(row)}`);
  }
  console.log(JSON.stringify(row, null, 2));
  console.log('Read-only Job delivery verification passed.');
  await pool.query('ROLLBACK');
} finally {
  await pool.end();
}
