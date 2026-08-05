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

const sourceValuesSql = `
  WITH source_values AS (
    SELECT mem.source_mongo_id,
           mem.target_entity_id,
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
      ON msd.collection_name = mem.source_collection
     AND msd.mongo_id = mem.source_mongo_id
    WHERE mem.source_collection = 'opportunities'
      AND mem.target_table = 'ongoing_jobs'
  )
`;

try {
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION READ ONLY');

  const before = await client.query(`${sourceValuesSql}
    SELECT sv.source_mongo_id, sv.target_entity_id,
           sv.source_value_aed::text, COALESCE(oj.value_aed, 0)::text AS target_value_aed
    FROM source_values sv
    JOIN ongoing_jobs oj ON oj.id = sv.target_entity_id
    ORDER BY sv.source_mongo_id
    ${apply ? 'FOR UPDATE OF oj' : ''}
  `);

  const mismatches = before.rows.filter((row) => Number(row.source_value_aed) !== Number(row.target_value_aed));
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    sourceRows: before.rows.length,
    mismatches: mismatches.length,
    sourceNonzero: before.rows.filter((row) => Number(row.source_value_aed) !== 0).length,
    targetNonzeroBefore: before.rows.filter((row) => Number(row.target_value_aed) !== 0).length,
    sourceTotalAed: before.rows.reduce((sum, row) => sum + Number(row.source_value_aed), 0),
    targetTotalAedBefore: before.rows.reduce((sum, row) => sum + Number(row.target_value_aed), 0),
  };

  if (before.rows.length !== 16 || mismatches.length !== 14 || summary.sourceTotalAed !== 1257730) {
    throw new Error(`Precondition failed; refusing repair: ${JSON.stringify(summary)}`);
  }

  if (apply) {
    const backupDir = path.resolve(scriptDir, '../backups/sql-repair');
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `opportunity-values-before-${new Date().toISOString().replaceAll(':', '-')}.json`);
    await fs.writeFile(backupPath, `${JSON.stringify(before.rows, null, 2)}\n`, { flag: 'wx' });
    summary.backupPath = backupPath;

    for (const row of mismatches) {
      await client.query(
        `UPDATE ongoing_jobs SET value_aed = $2::numeric, updated_at = NOW() WHERE id = $1::uuid`,
        [row.target_entity_id, row.source_value_aed]
      );
      await client.query(
        `INSERT INTO audit_events (action, entity_type, entity_id, payload)
         VALUES ('migration_repair.value_aed', 'ongoing_job', $1::uuid, $2::jsonb)`,
        [row.target_entity_id, JSON.stringify({
          sourceCollection: 'opportunities',
          sourceMongoId: row.source_mongo_id,
          previousValueAed: row.target_value_aed,
          repairedValueAed: row.source_value_aed,
          reason: 'Post-SQL migration reconciliation against immutable source staging',
        })]
      );
    }

    const after = await client.query(`${sourceValuesSql}
      SELECT COUNT(*) FILTER (WHERE sv.source_value_aed <> COALESCE(oj.value_aed, 0))::int AS mismatches,
             COUNT(*) FILTER (WHERE COALESCE(oj.value_aed, 0) <> 0)::int AS target_nonzero,
             COALESCE(SUM(oj.value_aed), 0)::text AS target_total_aed
      FROM source_values sv JOIN ongoing_jobs oj ON oj.id = sv.target_entity_id
    `);
    summary.after = after.rows[0];
    if (Number(summary.after.mismatches) !== 0 || Number(summary.after.target_total_aed) !== 1257730) {
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
