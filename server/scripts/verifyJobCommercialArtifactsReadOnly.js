#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('PostgreSQL connection string is required.');
const pool = new pg.Pool({ connectionString, ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false, max: 1 });
try {
  await pool.query('BEGIN READ ONLY');
  const result = await pool.query(`SELECT
    to_regclass('public.design_sets') IS NOT NULL AS design_sets_ready,
    to_regclass('public.artifact_decisions') IS NOT NULL AS decisions_ready,
    (SELECT COUNT(*)::int FROM design_versions dv LEFT JOIN design_sets ds ON ds.id = dv.design_set_id WHERE dv.design_set_id IS NOT NULL AND ds.id IS NULL) AS orphan_design_versions,
    (SELECT COUNT(*)::int FROM quote_versions qv LEFT JOIN quotes q ON q.id = qv.quote_id WHERE q.id IS NULL) AS orphan_quote_versions,
    (SELECT COUNT(*)::int FROM (SELECT ds.ongoing_job_id,ds.work_package_id FROM design_sets ds WHERE ds.work_package_id IS NOT NULL UNION ALL SELECT q.ongoing_job_id,q.work_package_id FROM quotes q WHERE q.work_package_id IS NOT NULL) f LEFT JOIN job_scope_lines w ON w.id=f.work_package_id WHERE w.id IS NULL OR w.ongoing_job_id<>f.ongoing_job_id) AS invalid_family_work_packages,
    (SELECT COUNT(*)::int FROM quote_lines ql LEFT JOIN quote_versions qv ON qv.id=ql.quote_version_id LEFT JOIN quotes q ON q.id=qv.quote_id LEFT JOIN job_scope_lines w ON w.id=ql.work_package_id WHERE qv.id IS NULL OR (ql.work_package_id IS NOT NULL AND (w.id IS NULL OR w.ongoing_job_id<>q.ongoing_job_id))) AS invalid_quote_lines,
    (SELECT COUNT(*)::int FROM quote_lines WHERE quantity<=0 OR unit_price<0 OR ABS(line_total-(quantity*unit_price))>0.01) AS invalid_quote_line_totals,
    (SELECT COUNT(*)::int FROM artifact_decisions ad LEFT JOIN ongoing_jobs oj ON oj.id = ad.ongoing_job_id WHERE oj.id IS NULL) AS orphan_decisions,
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name = 'design_versions' AND column_name IN ('checksum_sha256', 'public_url', 'revision_note')) AS design_file_columns,
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name = 'quote_versions' AND column_name IN ('checksum_sha256', 'public_url', 'revision_note')) AS quote_file_columns,
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name = 'quote_lines' AND column_name IN ('work_package_id','job_phase_id','job_location_id','service_label_snapshot','uom_label_snapshot','work_package_title_snapshot','phase_name_snapshot','location_name_snapshot','display_order')) AS structured_line_columns`);
  const row = result.rows[0];
  if (!row.design_sets_ready || !row.decisions_ready || row.design_file_columns !== 3 || row.quote_file_columns !== 3 || row.structured_line_columns !== 9
      || row.orphan_design_versions || row.orphan_quote_versions || row.invalid_family_work_packages || row.invalid_quote_lines || row.invalid_quote_line_totals || row.orphan_decisions) {
    throw new Error(`Commercial artifact verification failed: ${JSON.stringify(row)}`);
  }
  console.log(JSON.stringify(row, null, 2));
  console.log('Read-only commercial artifact verification passed.');
  await pool.query('ROLLBACK');
} finally { await pool.end(); }
