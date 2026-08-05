#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });
dotenv.config();

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URI;
if (!connectionString) throw new Error('POSTGRES_URL, DATABASE_URL, or POSTGRES_URI is required.');

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 1,
  connectionTimeoutMillis: 10000,
});

const outputPath = process.argv[2] || path.resolve(scriptDir, '../../../../tmp/postgres_migration_audit_2026-08-05.json');
const client = await pool.connect();

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function rows(sql, params = []) {
  return (await client.query(sql, params)).rows;
}

async function scalar(sql, params = []) {
  const result = await rows(sql, params);
  return Number(result[0]?.count ?? result[0]?.value ?? 0);
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'PostgreSQL transaction READ ONLY; aggregate metadata and counts only',
  database: {},
  tables: {},
  columns: {},
  sourceStaging: {},
  entityMaps: {},
  checks: {},
  errors: [],
};

try {
  await client.query('BEGIN TRANSACTION READ ONLY');
  report.database = (await rows(`SELECT current_database() AS database, current_schema() AS schema, version()`))[0];

  const tableRows = await rows(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tables = tableRows.map((row) => row.table_name);
  const tableSet = new Set(tables);

  for (const table of tables) {
    try {
      report.tables[table] = await scalar(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(table)}`);
    } catch (error) {
      report.errors.push({ check: `count:${table}`, message: error.message });
    }
  }

  const columnRows = await rows(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const columnsByTable = new Map();
  for (const row of columnRows) {
    const list = columnsByTable.get(row.table_name) || [];
    list.push(row);
    columnsByTable.set(row.table_name, list);
  }
  for (const [table, columns] of columnsByTable) report.columns[table] = columns;

  const hasTable = (name) => tableSet.has(name);
  const hasColumn = (table, name) => (columnsByTable.get(table) || []).some((col) => col.column_name === name);
  const capture = async (name, sql, params = []) => {
    const savepoint = `audit_${String(name).replaceAll(/[^a-zA-Z0-9_]/g, '_').slice(0, 40)}`;
    try {
      await client.query(`SAVEPOINT ${quoteIdent(savepoint)}`);
      report.checks[name] = await rows(sql, params);
      await client.query(`RELEASE SAVEPOINT ${quoteIdent(savepoint)}`);
    } catch (error) {
      await client.query(`ROLLBACK TO SAVEPOINT ${quoteIdent(savepoint)}`);
      await client.query(`RELEASE SAVEPOINT ${quoteIdent(savepoint)}`);
      report.errors.push({ check: name, message: error.message });
    }
  };

  if (hasTable('migration_source_document')) {
    const dispositionSelect = hasColumn('migration_source_document', 'disposition')
      ? `, COUNT(*) FILTER (WHERE disposition = 'migrated')::bigint AS migrated,
           COUNT(*) FILTER (WHERE disposition = 'quarantined')::bigint AS quarantined,
           COUNT(*) FILTER (WHERE disposition = 'pending')::bigint AS pending`
      : '';
    report.sourceStaging.byCollection = await rows(`
      SELECT collection_name, COUNT(*)::bigint AS count ${dispositionSelect}
      FROM migration_source_document
      GROUP BY collection_name ORDER BY collection_name
    `);
  }

  if (hasTable('migration_entity_map')) {
    report.entityMaps.byTarget = await rows(`
      SELECT source_collection, target_table, COUNT(*)::bigint AS count
      FROM migration_entity_map
      GROUP BY source_collection, target_table
      ORDER BY source_collection, target_table
    `);
  }

  if (hasTable('people')) {
    await capture('people_summary', `
      SELECT COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE archived_at IS NOT NULL)::bigint AS archived,
             COUNT(*) FILTER (WHERE NULLIF(BTRIM(display_name), '') IS NULL)::bigint AS blank_display_name
      FROM people
    `);
  }
  if (hasTable('person_contact_methods')) {
    await capture('person_contact_methods_by_type', `
      SELECT type, COUNT(*)::bigint AS rows, COUNT(DISTINCT person_id)::bigint AS people,
             COUNT(DISTINCT normalized_value)::bigint AS distinct_values
      FROM person_contact_methods GROUP BY type ORDER BY type
    `);
  }
  if (hasTable('person_organization_roles')) {
    await capture('person_roles_summary', `
      SELECT COUNT(*)::bigint AS rows, COUNT(DISTINCT person_id)::bigint AS people,
             COUNT(DISTINCT organization_id)::bigint AS organizations,
             COUNT(*) FILTER (WHERE person_id IS NULL)::bigint AS null_person,
             COUNT(*) FILTER (WHERE organization_id IS NULL)::bigint AS null_organization
      FROM person_organization_roles
    `);
  }
  if (hasTable('poc_suitabilities')) {
    await capture('poc_suitabilities_summary', `
      SELECT assessment, COUNT(*)::bigint AS count
      FROM poc_suitabilities GROUP BY assessment ORDER BY assessment
    `);
  }
  if (hasTable('key_relationship_profiles')) {
    const manualExpr = hasColumn('key_relationship_profiles', 'manually_confirmed')
      ? `COUNT(*) FILTER (WHERE manually_confirmed)::bigint AS manually_confirmed,`
      : '';
    await capture('key_relationship_profiles_summary', `
      SELECT COUNT(*)::bigint AS rows, ${manualExpr}
             COUNT(DISTINCT role_id)::bigint AS distinct_roles
      FROM key_relationship_profiles
    `);
  }

  if (hasTable('migration_entity_map')) {
    await capture('migration_target_identity_consolidation', `
      SELECT target_table,
             COUNT(*)::bigint AS mapping_rows,
             COUNT(DISTINCT target_entity_id)::bigint AS distinct_targets,
             COUNT(*)::bigint - COUNT(DISTINCT target_entity_id)::bigint AS consolidated_source_rows
      FROM migration_entity_map GROUP BY target_table ORDER BY target_table
    `);
    await capture('ongoing_job_source_overlap', `
      SELECT COUNT(*)::bigint AS targets_mapped_from_both_jobs_and_opportunities
      FROM (
        SELECT target_entity_id
        FROM migration_entity_map
        WHERE target_table = 'ongoing_jobs' AND source_collection IN ('jobs', 'opportunities')
        GROUP BY target_entity_id
        HAVING COUNT(DISTINCT source_collection) = 2
      ) overlap_rows
    `);
    const mappedTargets = await rows(`SELECT DISTINCT target_table FROM migration_entity_map ORDER BY target_table`);
    for (const { target_table: targetTable } of mappedTargets) {
      if (!hasTable(targetTable) || !hasColumn(targetTable, 'id')) continue;
      await capture(`entity_map_integrity_${targetTable}`, `
        SELECT COUNT(*)::bigint AS mappings,
               COUNT(*) FILTER (WHERE target.id IS NULL)::bigint AS orphan_mappings,
               COUNT(*) FILTER (WHERE target.id IS NOT NULL)::bigint AS valid_mappings
        FROM migration_entity_map mem
        LEFT JOIN ${quoteIdent(targetTable)} target ON target.id = mem.target_entity_id
        WHERE mem.target_table = $1
      `, [targetTable]);
    }
  }

  if (hasTable('ongoing_jobs')) {
    const grouping = ['summary_stage', 'outcome'].filter((col) => hasColumn('ongoing_jobs', col));
    await capture('ongoing_jobs_summary', `
      SELECT COUNT(*)::bigint AS total,
             ${hasColumn('ongoing_jobs', 'deleted_at') ? `COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint AS deleted,` : ''}
             ${hasColumn('ongoing_jobs', 'customer_organization_id') ? `COUNT(*) FILTER (WHERE customer_organization_id IS NULL)::bigint AS missing_customer,` : ''}
             COUNT(*)::bigint AS row_count
      FROM ongoing_jobs
    `);
    if (grouping.length) {
      await capture('ongoing_jobs_by_state', `
        SELECT ${grouping.map(quoteIdent).join(', ')}, COUNT(*)::bigint AS count
        FROM ongoing_jobs GROUP BY ${grouping.map(quoteIdent).join(', ')}
        ORDER BY count DESC
      `);
    }
    if (hasTable('organizations') && hasColumn('ongoing_jobs', 'customer_organization_id')) {
      await capture('ongoing_job_organization_integrity', `
        SELECT COUNT(*) FILTER (WHERE oj.customer_organization_id IS NULL)::bigint AS null_organization,
               COUNT(*) FILTER (WHERE oj.customer_organization_id IS NOT NULL AND o.id IS NULL)::bigint AS orphan_organization,
               COUNT(*) FILTER (WHERE o.id IS NOT NULL)::bigint AS valid_organization
        FROM ongoing_jobs oj LEFT JOIN organizations o ON o.id = oj.customer_organization_id
      `);
    }
    if (hasTable('migration_entity_map')) {
      await capture('ongoing_jobs_by_source_coverage', `
        SELECT mem.source_collection,
               COUNT(*)::bigint AS mapped_rows,
               COUNT(*) FILTER (WHERE oj.customer_organization_id IS NULL)::bigint AS missing_customer,
               COUNT(*) FILTER (WHERE oj.payload IS NULL)::bigint AS missing_legacy_payload,
               COUNT(*) FILTER (WHERE oj.deleted_at IS NOT NULL)::bigint AS archived_or_deleted
        FROM migration_entity_map mem
        JOIN ongoing_jobs oj ON oj.id = mem.target_entity_id
        WHERE mem.target_table = 'ongoing_jobs'
        GROUP BY mem.source_collection ORDER BY mem.source_collection
      `);
    }
  }
  if (hasTable('completed_jobs')) {
    await capture('completed_jobs_summary', `
      SELECT COUNT(*)::bigint AS total,
             ${hasColumn('completed_jobs', 'opportunity_id') ? `COUNT(*) FILTER (WHERE opportunity_id IS NULL)::bigint AS missing_ongoing_job_link,` : ''}
             ${hasColumn('completed_jobs', 'deleted_at') ? `COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::bigint AS deleted,` : ''}
             COUNT(*)::bigint AS row_count
      FROM completed_jobs
    `);
    if (hasTable('ongoing_jobs') && hasColumn('completed_jobs', 'opportunity_id')) {
      await capture('completed_job_link_integrity', `
        SELECT COUNT(*) FILTER (WHERE cj.opportunity_id IS NULL)::bigint AS null_link,
               COUNT(*) FILTER (WHERE cj.opportunity_id IS NOT NULL AND oj.id IS NULL)::bigint AS orphan_link,
               COUNT(*) FILTER (WHERE oj.id IS NOT NULL)::bigint AS valid_link
        FROM completed_jobs cj LEFT JOIN ongoing_jobs oj ON oj.id = cj.opportunity_id
      `);
    }
  }

  for (const table of ['organizations', 'campaigns', 'campaign_accounts', 'campaign_contacts', 'conversations', 'conversation_participants', 'messages', 'reply_review_items', 'review_decisions', 'interactions', 'tasks', 'sequence_enrollments']) {
    if (!hasTable(table)) continue;
    const nullableFks = (columnsByTable.get(table) || [])
      .filter((col) => col.column_name.endsWith('_id') && col.is_nullable === 'YES')
      .map((col) => col.column_name);
    if (nullableFks.length) {
      await capture(`${table}_nullable_fk_coverage`, `
        SELECT COUNT(*)::bigint AS total,
               ${nullableFks.map((col) => `COUNT(*) FILTER (WHERE ${quoteIdent(col)} IS NULL)::bigint AS ${quoteIdent(`null_${col}`)}`).join(',\n               ')}
        FROM ${quoteIdent(table)}
      `);
    }
  }

  if (hasTable('messages')) {
    const groupCols = ['direction', 'channel'].filter((col) => hasColumn('messages', col));
    if (groupCols.length) await capture('messages_by_direction_channel', `SELECT ${groupCols.map(quoteIdent).join(', ')}, COUNT(*)::bigint AS count FROM messages GROUP BY ${groupCols.map(quoteIdent).join(', ')} ORDER BY count DESC`);
    if (hasColumn('messages', 'external_message_id')) await capture('message_external_id_duplicates', `
      SELECT COUNT(*)::bigint AS duplicate_external_id_groups,
             COALESCE(SUM(rows - 1), 0)::bigint AS excess_rows
      FROM (
        SELECT external_message_id, COUNT(*)::bigint AS rows
        FROM messages WHERE external_message_id IS NOT NULL
        GROUP BY external_message_id HAVING COUNT(*) > 1
      ) duplicates
    `);
    if (hasTable('migration_entity_map')) await capture('mapped_messages_by_source_and_direction', `
      SELECT mem.source_collection, m.direction, COUNT(*)::bigint AS count
      FROM migration_entity_map mem
      JOIN messages m ON m.id = mem.target_entity_id
      WHERE mem.target_table = 'messages'
      GROUP BY mem.source_collection, m.direction
      ORDER BY mem.source_collection, m.direction
    `);
  }
  if (hasTable('sequence_enrollments')) {
    const cols = ['campaign_contact_id', 'sequence_version_id', 'mongo_campaign_id', 'mongo_lead_id', 'mongo_sequence_id'].filter((col) => hasColumn('sequence_enrollments', col));
    if (cols.length) await capture('sequence_enrollment_resolution', `SELECT COUNT(*)::bigint AS total, ${cols.map((col) => `COUNT(*) FILTER (WHERE ${quoteIdent(col)} IS NULL)::bigint AS ${quoteIdent(`null_${col}`)}`).join(', ')} FROM sequence_enrollments`);
  }

  await client.query('ROLLBACK');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, tableCount: Object.keys(report.tables).length, errors: report.errors }, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
