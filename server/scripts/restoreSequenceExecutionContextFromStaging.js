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
  application_name: 'egs_sequence_context_repair',
});
const client = await pool.connect();

const oid = (value) => value == null ? null : String(unwrapBson(value));
const asDate = (value) => value ? new Date(unwrapBson(value)).toISOString() : null;
const json = (value) => JSON.stringify(value ?? {});

async function insertChunks(rows, width, sqlForValues, chunkSize = 250) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const params = chunk.flat();
    const values = chunk.map((_, index) => {
      const refs = Array.from({ length: width }, (_unused, col) => `$${index * width + col + 1}`);
      return `(${refs.join(',')})`;
    }).join(',');
    await client.query(sqlForValues(values), params);
  }
}

try {
  await client.query('BEGIN');
  await client.query("SET LOCAL idle_in_transaction_session_timeout = '60s'");
  await client.query("SET LOCAL lock_timeout = '10s'");
  if (withSchema) {
    const ddl = await fs.readFile(path.join(scriptDir, '07_restore_sequence_execution_context.sql'), 'utf8');
    await client.query(ddl.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, ''));
  }

  const source = await client.query(`
    SELECT collection_name, mongo_id, payload
    FROM migration_source_document
    WHERE collection_name IN ('sequences', 'sequencelaunches', 'sendjobs')
  `);
  const sourceByCollection = new Map();
  for (const row of source.rows) {
    const rows = sourceByCollection.get(row.collection_name) || [];
    rows.push({ mongoId: String(row.mongo_id), payload: unwrapBson(row.payload || {}) });
    sourceByCollection.set(row.collection_name, rows);
  }

  const sequenceRows = sourceByCollection.get('sequences') || [];
  for (const { mongoId, payload } of sequenceRows) {
    await client.query(`
      UPDATE sequences s SET
        campaign_id = campaign_map.target_entity_id,
        name = COALESCE(NULLIF($2, ''), s.name),
        is_active = $3,
        version = $4,
        deleted_at = $5::timestamptz,
        deleted_by = $6,
        steps = $7::jsonb,
        flow_graph = $8::jsonb,
        audience = $9::jsonb,
        payload = $10::jsonb,
        updated_at = COALESCE($11::timestamptz, s.updated_at)
      FROM (
        SELECT target_entity_id FROM migration_entity_map
        WHERE source_collection = 'projectcampaigns' AND source_mongo_id = $12
          AND target_table = 'campaigns' LIMIT 1
      ) campaign_map
      WHERE s.mongo_sequence_id = $1
    `, [
      mongoId, payload.name || '', payload.isActive !== false, Number(payload.version || 0),
      asDate(payload.deletedAt), payload.deletedBy || null, json(payload.steps || []),
      json(payload.flowGraph || {}), json(payload.audience || {}), json(payload),
      asDate(payload.updatedAt), oid(payload.campaignId),
    ]);
    if (!payload.campaignId) {
      await client.query(`
        UPDATE sequences SET name = COALESCE(NULLIF($2, ''), name), is_active = $3,
          version = $4, deleted_at = $5::timestamptz, deleted_by = $6,
          steps = $7::jsonb, flow_graph = $8::jsonb, audience = $9::jsonb,
          payload = $10::jsonb, updated_at = COALESCE($11::timestamptz, updated_at)
        WHERE mongo_sequence_id = $1
      `, [mongoId, payload.name || '', payload.isActive !== false, Number(payload.version || 0),
        asDate(payload.deletedAt), payload.deletedBy || null, json(payload.steps || []),
        json(payload.flowGraph || {}), json(payload.audience || {}), json(payload), asDate(payload.updatedAt)]);
    }
  }

  const persistedSequences = await client.query(`SELECT id, mongo_sequence_id, version FROM sequences WHERE mongo_sequence_id IS NOT NULL`);
  const sequenceByMongo = new Map(persistedSequences.rows.map((row) => [row.mongo_sequence_id, row]));
  const versionRows = sequenceRows
    .map(({ mongoId, payload }) => {
      const sequence = sequenceByMongo.get(mongoId);
      return sequence ? [sequence.id, Math.max(1, Number(payload.version || 0)), asDate(payload.updatedAt) || asDate(payload.createdAt)] : null;
    })
    .filter(Boolean);
  await insertChunks(versionRows, 3, (values) => `
    INSERT INTO sequence_versions (sequence_id, version_number, published_at)
    VALUES ${values}
    ON CONFLICT (sequence_id, version_number) DO UPDATE SET published_at = EXCLUDED.published_at
  `);

  const persistedVersions = await client.query(`SELECT id, sequence_id, version_number FROM sequence_versions`);
  const versionBySequenceAndNumber = new Map(persistedVersions.rows.map((row) => [`${row.sequence_id}|${row.version_number}`, row.id]));
  const stepRows = [];
  for (const { mongoId, payload } of sequenceRows) {
    const sequence = sequenceByMongo.get(mongoId);
    const versionNumber = Math.max(1, Number(payload.version || 0));
    const versionId = sequence ? versionBySequenceAndNumber.get(`${sequence.id}|${versionNumber}`) : null;
    if (!versionId) continue;
    (payload.steps || []).forEach((step, index) => {
      const order = Number(step.stepOrder ?? index + 1);
      const delayAmount = Number(step.dayDelay || 0);
      const delayUnit = step.delayUnit || 'days';
      const delayDays = delayUnit === 'days' ? delayAmount : 0;
      stepRows.push([
        versionId, oid(step._id) || `position:${order}`, order, 'email', delayDays,
        step.subjectTemplate || '', step.bodyTemplate || '', delayAmount, delayUnit, json(step),
      ]);
    });
  }
  await insertChunks(stepRows, 10, (values) => `
    INSERT INTO sequence_steps (
      sequence_version_id, source_step_mongo_id, step_number, step_type, delay_days,
      template_subject, template_body, delay_amount, delay_unit, payload
    ) VALUES ${values}
    ON CONFLICT (sequence_version_id, source_step_mongo_id)
      WHERE source_step_mongo_id IS NOT NULL
    DO UPDATE SET step_number = EXCLUDED.step_number, step_type = EXCLUDED.step_type,
      delay_days = EXCLUDED.delay_days, template_subject = EXCLUDED.template_subject,
      template_body = EXCLUDED.template_body, delay_amount = EXCLUDED.delay_amount,
      delay_unit = EXCLUDED.delay_unit, payload = EXCLUDED.payload
  `);

  const campaignMaps = await client.query(`
    SELECT source_mongo_id, target_entity_id FROM migration_entity_map
    WHERE source_collection = 'projectcampaigns' AND target_table = 'campaigns'
  `);
  const campaignByMongo = new Map(campaignMaps.rows.map((row) => [row.source_mongo_id, row.target_entity_id]));
  const launchRows = (sourceByCollection.get('sequencelaunches') || []).map(({ mongoId, payload }) => {
    const sequence = sequenceByMongo.get(oid(payload.sequenceId));
    const audienceCampaignMongoId = oid(payload.audience?.importedCampaignIds?.[0]);
    const campaignId = campaignByMongo.get(audienceCampaignMongoId) || null;
    return sequence ? [
      mongoId, sequence.id, campaignId, json(payload.audience || {}), Number(payload.enrolledCount || 0),
      Number(payload.restartedCount || 0), Number(payload.mergedCount || 0), asDate(payload.launchedAt),
      asDate(payload.createdAt), asDate(payload.updatedAt), 'historical', json(payload),
    ] : null;
  }).filter(Boolean);
  await insertChunks(launchRows, 12, (values) => `
    INSERT INTO sequence_launches (
      source_launch_mongo_id, sequence_id, campaign_id, audience, enrolled_count,
      restarted_count, merged_count, launched_at, created_at, updated_at, status, payload
    ) VALUES ${values}
    ON CONFLICT (source_launch_mongo_id) WHERE source_launch_mongo_id IS NOT NULL
    DO UPDATE SET sequence_id = EXCLUDED.sequence_id, campaign_id = EXCLUDED.campaign_id,
      audience = EXCLUDED.audience, enrolled_count = EXCLUDED.enrolled_count,
      restarted_count = EXCLUDED.restarted_count, merged_count = EXCLUDED.merged_count,
      launched_at = EXCLUDED.launched_at, updated_at = EXCLUDED.updated_at, payload = EXCLUDED.payload
  `);

  await client.query(`
    UPDATE sequence_enrollments se SET
      campaign_contact_id = (
        SELECT cc.id FROM campaign_contacts cc
        WHERE cc.source_lead_mongo_id = se.mongo_lead_id
          AND cc.source_campaign_mongo_id = se.mongo_campaign_id LIMIT 1
      ),
      sequence_version_id = (
        SELECT sv.id FROM sequences s
        JOIN sequence_versions sv ON sv.sequence_id = s.id
          AND sv.version_number = GREATEST(1, COALESCE(s.version, 0))
        WHERE s.mongo_sequence_id = se.mongo_sequence_id LIMIT 1
      ),
      lead_id = (
        SELECT target_entity_id FROM migration_entity_map
        WHERE source_collection = 'leads' AND target_table = 'people'
          AND source_mongo_id = se.mongo_lead_id LIMIT 1
      ),
      campaign_id = (
        SELECT target_entity_id FROM migration_entity_map
        WHERE source_collection = 'projectcampaigns' AND target_table = 'campaigns'
          AND source_mongo_id = se.mongo_campaign_id LIMIT 1
      ),
      sequence_id = (
        SELECT id FROM sequences WHERE mongo_sequence_id = se.mongo_sequence_id LIMIT 1
      ),
      launch_batch_id = (
        SELECT sl.id FROM sequence_launches sl
        WHERE sl.source_launch_mongo_id = NULLIF(se.payload->'launchBatchId'->>'$oid', '')
        LIMIT 1
      ),
      current_step_index = COALESCE((se.payload->'currentStepIndex'->>'$numberInt')::integer, se.current_step_index, 0),
      current_node_id = COALESCE(NULLIF(se.payload->>'currentNodeId', 'null'), se.current_node_id),
      next_send_at = COALESCE((se.payload->'nextSendAt'->'$date'->>'$numberLong')::bigint * interval '1 millisecond' + timestamptz '1970-01-01', se.next_send_at),
      completed_at = COALESCE((se.payload->'completedAt'->'$date'->>'$numberLong')::bigint * interval '1 millisecond' + timestamptz '1970-01-01', se.completed_at),
      last_sent_at = COALESCE((se.payload->'lastSentAt'->'$date'->>'$numberLong')::bigint * interval '1 millisecond' + timestamptz '1970-01-01', se.last_sent_at),
      created_at = COALESCE((se.payload->'createdAt'->'$date'->>'$numberLong')::bigint * interval '1 millisecond' + timestamptz '1970-01-01', se.created_at),
      updated_at = COALESCE((se.payload->'updatedAt'->'$date'->>'$numberLong')::bigint * interval '1 millisecond' + timestamptz '1970-01-01', se.updated_at),
      frozen = true,
      source_execution_state = COALESCE(se.source_execution_state, se.execution_state),
      execution_state = CASE WHEN COALESCE(se.source_execution_state, se.execution_state) = 'completed' THEN 'completed' ELSE 'frozen' END,
      stop_reason = CASE WHEN COALESCE(se.source_execution_state, se.execution_state) = 'active' THEN 'migration safety hold' ELSE se.stop_reason END
  `);

  await client.query(`
    INSERT INTO migration_exception (
      category, severity, source_collection, source_mongo_id,
      evidence, proposed_options, status
    )
    SELECT
      'orphan_sequence_enrollment_identity', 'warning', 'sequenceenrollments',
      se.mongo_enrollment_id,
      jsonb_build_object(
        'missingLeadMongoId', se.mongo_lead_id,
        'campaignLinked', se.campaign_id IS NOT NULL,
        'sequenceLinked', se.sequence_id IS NOT NULL,
        'payloadPreserved', se.payload IS NOT NULL
      ),
      jsonb_build_array(
        'Match to a restored person after human verification',
        'Retain as historical orphan evidence'
      ),
      'open'
    FROM sequence_enrollments se
    WHERE se.lead_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM migration_exception me
        WHERE me.category = 'orphan_sequence_enrollment_identity'
          AND me.source_collection = 'sequenceenrollments'
          AND me.source_mongo_id = se.mongo_enrollment_id
      )
  `);

  const enrollments = await client.query(`SELECT id, mongo_enrollment_id, lead_id, campaign_id FROM sequence_enrollments`);
  const enrollmentByMongo = new Map(enrollments.rows.map((row) => [row.mongo_enrollment_id, row]));
  const sendJobRows = (sourceByCollection.get('sendjobs') || []).map(({ mongoId, payload }) => {
    const enrollment = enrollmentByMongo.get(oid(payload.enrollmentId));
    if (!enrollment) return null;
    const sourceStatus = payload.status || 'pending';
    const safeStatus = ['pending', 'processing'].includes(sourceStatus) ? 'migration_held' : sourceStatus;
    return [
      mongoId, payload.bullJobId || '', oid(payload.leadId), enrollment.lead_id, enrollment.campaign_id,
      enrollment.id, Number(payload.stepIndex || 0), safeStatus, sourceStatus, asDate(payload.scheduledFor),
      asDate(payload.sentAt), String(payload.recipientEmail || '').toLowerCase(), payload.providerMessageId || '',
      payload.renderedSubject || '', payload.renderedBody || '', payload.errorMessage || '',
      payload.immediateLaunch === true, payload.manualSend === true, asDate(payload.createdAt), asDate(payload.updatedAt), json(payload),
    ];
  }).filter(Boolean);
  await insertChunks(sendJobRows, 21, (values) => `
    INSERT INTO send_jobs (
      source_send_job_mongo_id, bull_job_id, mongo_lead_id, lead_id, campaign_id,
      enrollment_id, step_index, status, source_status, scheduled_for, sent_at,
      recipient_email, provider_message_id, rendered_subject, rendered_body, error_message,
      immediate_launch, manual_send, created_at, updated_at, payload
    ) VALUES ${values}
    ON CONFLICT (source_send_job_mongo_id) WHERE source_send_job_mongo_id IS NOT NULL
    DO UPDATE SET lead_id = EXCLUDED.lead_id, campaign_id = EXCLUDED.campaign_id,
      enrollment_id = EXCLUDED.enrollment_id, status = EXCLUDED.status,
      source_status = EXCLUDED.source_status, scheduled_for = EXCLUDED.scheduled_for,
      sent_at = EXCLUDED.sent_at, recipient_email = EXCLUDED.recipient_email,
      provider_message_id = EXCLUDED.provider_message_id, rendered_subject = EXCLUDED.rendered_subject,
      rendered_body = EXCLUDED.rendered_body, error_message = EXCLUDED.error_message,
      immediate_launch = EXCLUDED.immediate_launch, manual_send = EXCLUDED.manual_send,
      updated_at = EXCLUDED.updated_at, payload = EXCLUDED.payload
  `);

  const summaryResult = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM sequence_versions)::int AS sequence_versions,
      (SELECT COUNT(*) FROM sequence_steps)::int AS sequence_steps,
      (SELECT COUNT(*) FROM sequence_launches)::int AS sequence_launches,
      (SELECT COUNT(*) FROM sequence_enrollments)::int AS enrollments,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE campaign_contact_id IS NULL OR sequence_version_id IS NULL)::int AS unresolved_enrollments,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE campaign_contact_id IS NULL)::int AS missing_campaign_contact,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_version_id IS NULL)::int AS missing_sequence_version,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE lead_id IS NULL)::int AS missing_person,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE campaign_id IS NULL)::int AS missing_campaign,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_id IS NULL)::int AS missing_sequence,
      (SELECT COUNT(*) FROM sequence_enrollments WHERE source_execution_state = 'active' AND execution_state = 'frozen')::int AS safety_held_enrollments,
      (SELECT COUNT(*) FROM send_jobs)::int AS send_jobs,
      (SELECT COUNT(*) FROM send_jobs WHERE enrollment_id IS NULL)::int AS missing_send_job_enrollment,
      (SELECT COUNT(*) FROM send_jobs WHERE lead_id IS NULL)::int AS send_jobs_without_person,
      (SELECT COUNT(*) FROM send_jobs WHERE status = 'migration_held')::int AS safety_held_send_jobs
  `);

  if (apply) await client.query('COMMIT');
  else await client.query('ROLLBACK');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...summaryResult.rows[0] }, null, 2));
} catch (error) {
  try { await client.query('ROLLBACK'); } catch {}
  throw error;
} finally {
  client.release();
  await pool.end();
}
