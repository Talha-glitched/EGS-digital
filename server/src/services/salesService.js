import db from '../db/index.js';
import { unwrapBson } from '../utils/bsonUnwrap.js';
import {
  CLOSED_LOST_STAGE,
  CLOSED_WON_STAGE,
  isClosedStage,
  probabilityForStage,
  stageNames,
} from '../constants/ongoingJobPipeline.js';
import { DEFAULT_PIPELINE_STAGES } from '../models/PipelineConfig.js';
import { createCompletedJobFromOngoingJob } from './completedJobService.js';

const CHANNEL_TO_INTERACTION_TYPE = {
  phone: 'phone_call',
  email: 'email',
  whatsapp: 'whatsapp',
  meeting: 'meeting',
  linkedin: 'linkedin',
  other: 'note',
};

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTextList(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeStages(stages = []) {
  return stages
    .map((stage) => ({
      name: String(stage.name || '').trim(),
      probability: Math.min(100, Math.max(0, cleanNumber(stage.probability, 10))),
    }))
    .filter((stage) => stage.name);
}

function appendActivity(activityLog = [], entry, actor = 'admin') {
  const log = Array.isArray(activityLog) ? [...activityLog] : [];
  log.unshift({
    action: entry.action,
    field: entry.field || '',
    from: entry.from ?? null,
    to: entry.to ?? null,
    by: actor || 'admin',
    at: new Date().toISOString(),
  });
  return log.slice(0, 100);
}

async function getPipelineStages() {
  try {
    const res = await db.query(
      "SELECT stages AS pipeline_stages FROM pipeline_configs WHERE pipeline_key = 'sales' OR pipeline_name ILIKE '%sales%' LIMIT 1"
    );
    if (res.rows.length > 0 && res.rows[0].pipeline_stages) {
      const parsed = unwrapBson(res.rows[0].pipeline_stages);
      const normalized = normalizeStages(parsed);
      if (normalized.length) return normalized;
    }
  } catch (err) {}
  return DEFAULT_PIPELINE_STAGES.map((stage) => ({ ...stage }));
}

export async function getPipelineConfig() {
  const stages = await getPipelineStages();
  let config = null;
  try {
    const res = await db.query(
      "SELECT updated_at, updated_by FROM pipeline_configs WHERE pipeline_key = 'sales' OR pipeline_name ILIKE '%sales%' LIMIT 1"
    );
    if (res.rows.length > 0) {
      config = { updatedAt: res.rows[0].updated_at, updatedBy: res.rows[0].updated_by };
    }
  } catch (e) {}

  return {
    stages,
    updatedAt: config?.updatedAt || null,
    updatedBy: config?.updatedBy || '',
  };
}

export async function updatePipelineConfig(payload, actor = 'admin') {
  const stages = normalizeStages(payload.stages);
  if (!stages.length) {
    const error = new Error('At least one pipeline stage is required.');
    error.status = 400;
    throw error;
  }

  const names = new Set();
  for (const stage of stages) {
    if (names.has(stage.name)) {
      const error = new Error(`Duplicate stage name: ${stage.name}`);
      error.status = 400;
      throw error;
    }
    names.add(stage.name);
  }

  const updatedBy = String(actor || 'admin').trim();
  const stagesJson = JSON.stringify(stages);

  try {
    const res = await db.query(
      `INSERT INTO pipeline_configs (pipeline_name, pipeline_key, stages, is_active, updated_by, updated_at)
       VALUES ('Sales Pipeline', 'sales', $1::jsonb, true, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET stages = EXCLUDED.stages, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING stages, updated_at AS "updatedAt", updated_by AS "updatedBy"`,
      [stagesJson, updatedBy]
    );
    const row = res.rows[0];
    return {
      stages: normalizeStages(unwrapBson(row.stages)),
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  } catch (err) {
    console.error('Error updating pipeline config in PostgreSQL:', err.message);
    throw err;
  }
}

export async function listOngoingJobs({ stage, owner, search, campaignId, companyId } = {}) {
  const stages = await getPipelineStages();
  const params = [];
  const conditions = ['oj.deleted_at IS NULL'];

  if (stage && stage !== 'All') {
    params.push(stage);
    conditions.push(`oj.summary_stage = $${params.length}`);
  }

  if (owner && owner !== 'All') {
    params.push(owner);
    conditions.push(`oj.owner = $${params.length}`);
  }

  if (campaignId) {
    params.push(String(campaignId));
    conditions.push(`oj.campaign_id::text = $${params.length}::text`);
  }

  if (companyId) {
    params.push(String(companyId));
    conditions.push(`oj.customer_organization_id::text = $${params.length}::text`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`oj.title ILIKE $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const sql = `
      SELECT oj.id AS "_id", oj.id, oj.job_number AS "jobNo", oj.title AS "name",
             oj.summary_stage AS "stage", oj.owner, oj.value_aed AS "valueAed",
             oj.target_date AS "targetDate", oj.expected_close_date AS "expectedCloseDate",
             oj.closed_at AS "closedAt", oj.lost_reason AS "lostReason", oj.notes,
             oj.created_at AS "createdAt", oj.updated_at AS "updatedAt",
             o.id AS "companyId", o.canonical_name AS "companyName"
      FROM ongoing_jobs oj
      LEFT JOIN organizations o ON oj.customer_organization_id = o.id
      WHERE ${whereClause}
      ORDER BY oj.updated_at DESC NULLS LAST, oj.created_at DESC
    `;
    const res = await db.query(sql, params);
    const items = res.rows.map((row) => ({
      ...row,
      ongoingJobId: row._id,
      stage: row.stage || 'Inquiry',
      companyId: row.companyId ? { _id: row.companyId, companyName: row.companyName } : null,
      executionSummary: {
        totalTasks: 0,
        openTasks: 0,
        clientStakeholders: 1,
        internalCollaborators: 1,
      },
    }));

    const owners = [...new Set(items.map((item) => item.owner).filter(Boolean))].sort();

    return {
      items,
      stages: stageNames(stages),
      stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
      owners,
    };
  } catch (err) {
    console.error('Error listing ongoing jobs in PostgreSQL:', err.message);
    return {
      items: [],
      stages: stageNames(stages),
      stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
      owners: [],
    };
  }
}

export async function getOngoingJob(id) {
  try {
    const res = await db.query(
      `SELECT oj.id AS "_id", oj.id, oj.job_number AS "jobNo", oj.title AS "name",
              oj.summary_stage AS "stage", oj.owner, oj.value_aed AS "valueAed",
              oj.target_date AS "targetDate", oj.expected_close_date AS "expectedCloseDate",
              oj.closed_at AS "closedAt", oj.lost_reason AS "lostReason", oj.notes,
              oj.created_at AS "createdAt", oj.updated_at AS "updatedAt",
              o.id AS "companyId", o.canonical_name AS "companyName"
       FROM ongoing_jobs oj
       LEFT JOIN organizations o ON oj.customer_organization_id = o.id
       WHERE id::text = $1::text AND oj.deleted_at IS NULL
       LIMIT 1`,
      [String(id)]
    );

    if (!res.rows[0]) {
      const error = new Error('Ongoing Job not found.');
      error.status = 404;
      throw error;
    }

    const stages = await getPipelineStages();
    const ongoingJob = {
      ...res.rows[0],
      ongoingJobId: res.rows[0]._id,
      companyId: res.rows[0].companyId ? { _id: res.rows[0].companyId, companyName: res.rows[0].companyName } : null,
    };

    return {
      ongoingJob,
      opportunity: ongoingJob,
      contacts: [],
      stages: stageNames(stages),
      stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
    };
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Ongoing Job not found.');
    error.status = 404;
    throw error;
  }
}

export async function createOngoingJob(payload, actor = 'admin') {
  if (!payload.name?.trim() || !payload.companyId) {
    const error = new Error('Ongoing Job name and company are required.');
    error.status = 400;
    throw error;
  }

  const stages = await getPipelineStages();
  const stage = payload.stage || stages[0]?.name || 'Inquiry';
  const owner = String(payload.owner || actor || 'admin').trim();
  const valueAed = Math.max(0, cleanNumber(payload.valueAed));
  const now = new Date();

  const activityLog = appendActivity([], { action: 'Ongoing Job created', field: 'stage', from: null, to: stage }, owner);

  const res = await db.query(
    `INSERT INTO ongoing_jobs (
       title, customer_organization_id, campaign_id, owner, summary_stage,
       value_aed, expected_close_date, notes, activity_log
     ) VALUES (
       $1, $2::uuid, $3::uuid, $4, $5,
       $6, $7, $8, $9::jsonb
     )
     RETURNING id AS "_id", id, job_number AS "jobNo", title AS "name", summary_stage AS "stage", owner, value_aed AS "valueAed", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      payload.name.trim(),
      String(payload.companyId),
      payload.campaignId && String(payload.campaignId).length === 36 ? String(payload.campaignId) : null,
      owner,
      stage,
      valueAed,
      now,
      String(payload.notes || '').trim(),
      JSON.stringify(activityLog),
    ]
  );

  const newJob = { ...res.rows[0], ongoingJobId: res.rows[0]._id };

  if (isClosedStage(stage) || stage === 'Payment Received') {
    await createCompletedJobFromOngoingJob(newJob).catch(() => {});
  }

  return newJob;
}

export async function updateOngoingJob(id, payload, actor = 'admin') {
  const existing = await getOngoingJob(id);
  const currentJob = existing.ongoingJob;
  const stages = await getPipelineStages();
  const modifier = String(actor || payload.owner || currentJob.owner || 'admin').trim();

  const stage = payload.stage || currentJob.stage;
  const valueAed = payload.valueAed !== undefined ? Math.max(0, cleanNumber(payload.valueAed)) : currentJob.valueAed;

  let closedAt = currentJob.closedAt;
  if (payload.stage !== undefined) {
    if (stage === CLOSED_WON_STAGE || stage === CLOSED_LOST_STAGE) {
      closedAt = new Date();
    } else if (!isClosedStage(stage)) {
      closedAt = null;
    }
  }

  const res = await db.query(
    `UPDATE ongoing_jobs SET
       title = COALESCE($2, title),
       customer_organization_id = COALESCE($3::uuid, customer_organization_id),
       owner = COALESCE($4, owner),
       summary_stage = COALESCE($5, summary_stage),
       value_aed = $6,
       notes = COALESCE($7, notes),
       closed_at = $8,
       updated_at = NOW()
     WHERE (id::text = $1::text) AND deleted_at IS NULL
     RETURNING id AS "_id", id, job_number AS "jobNo", title AS "name", summary_stage AS "stage", owner, value_aed AS "valueAed", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      String(id),
      payload.name ? payload.name.trim() : null,
      payload.companyId && String(payload.companyId).length === 36 ? String(payload.companyId) : null,
      payload.owner ? String(payload.owner).trim() : null,
      payload.stage ? String(payload.stage).trim() : null,
      valueAed,
      payload.notes !== undefined ? String(payload.notes).trim() : null,
      closedAt,
    ]
  );

  const updatedJob = { ...res.rows[0], ongoingJobId: res.rows[0]._id };

  if (isClosedStage(stage) || stage === 'Payment Received') {
    await createCompletedJobFromOngoingJob(updatedJob).catch(() => {});
  }

  return updatedJob;
}

export async function deleteOngoingJob(id, actor = {}) {
  const res = await db.query(
    `UPDATE ongoing_jobs SET deleted_at = NOW(), deleted_by = $2 WHERE (id::text = $1::text) RETURNING *`,
    [String(id), String(actor?.username || actor?.displayName || 'admin')]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreOngoingJob(id, actor = {}) {
  const res = await db.query(
    `UPDATE ongoing_jobs SET deleted_at = NULL, deleted_by = NULL WHERE (id::text = $1::text) RETURNING *`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

export async function getOngoingJobTimeline(id) {
  const { ongoingJob } = await getOngoingJob(id);
  return {
    ongoingJobId: String(ongoingJob._id),
    opportunityId: String(ongoingJob._id),
    events: [],
  };
}

export async function listTasks({ status = 'Open', owner, opportunityId, ongoingJobId, taskType } = {}) {
  const targetJobId = ongoingJobId || opportunityId;
  const params = [];
  const conditions = ['deleted_at IS NULL'];

  if (status && status !== 'All') {
    params.push(status === 'Open' ? 'pending' : status.toLowerCase());
    conditions.push(`status = $${params.length}`);
  }

  if (targetJobId) {
    params.push(String(targetJobId));
    conditions.push(`review_item_id::text = $${params.length}::text OR id::text = $${params.length}::text`);
  }

  if (taskType) {
    params.push(taskType);
    conditions.push(`type = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const res = await db.query(
      `SELECT id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes",
              due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt"
       FROM tasks
       WHERE ${whereClause}
       ORDER BY due_at ASC NULLS LAST, created_at DESC`
    );
    const items = res.rows.map((row) => ({
      ...row,
      status: row.status === 'pending' ? 'Open' : (row.status === 'completed' || row.status === 'resolved' ? 'Done' : row.status),
    }));
    return { items };
  } catch (err) {
    return { items: [] };
  }
}

export async function getTask(id) {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes",
              due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt"
       FROM tasks WHERE (id::text = $1::text) AND deleted_at IS NULL LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Task not found.');
      error.status = 404;
      throw error;
    }
    const item = res.rows[0];
    return {
      ...item,
      status: item.status === 'pending' ? 'Open' : (item.status === 'completed' || item.status === 'resolved' ? 'Done' : item.status),
    };
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }
}

export async function createTask(payload, actor = 'admin') {
  if (!payload.title?.trim()) {
    const error = new Error('Task title is required.');
    error.status = 400;
    throw error;
  }

  const targetJobId = payload.ongoingJobId || payload.opportunityId;
  const isRelationship = Boolean(payload.isRelationshipFollowUp);
  const taskType = payload.taskType || (isRelationship ? 'relationship_follow_up' : targetJobId ? 'ongoing_job' : 'general');
  const status = payload.status === 'Done' ? 'completed' : 'pending';

  const res = await db.query(
    `INSERT INTO tasks (title, description, status, priority, type, due_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes", due_at AS "dueAt", created_at AS "createdAt"`,
    [
      payload.title.trim(),
      String(payload.notes || '').trim(),
      status,
      payload.priority || 'medium',
      taskType,
      payload.dueAt ? new Date(payload.dueAt) : null,
    ]
  );

  const item = res.rows[0];
  return {
    ...item,
    status: item.status === 'pending' ? 'Open' : 'Done',
  };
}

export async function updateTask(id, payload, actor = 'admin') {
  const status = payload.status ? (payload.status === 'Done' ? 'completed' : 'pending') : null;

  const res = await db.query(
    `UPDATE tasks SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       priority = COALESCE($4, priority),
       status = COALESCE($5, status),
       due_at = COALESCE($6, due_at),
       completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END
     WHERE (id::text = $1::text) AND deleted_at IS NULL
     RETURNING id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes", due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt"`,
    [
      String(id),
      payload.title ? payload.title.trim() : null,
      payload.notes !== undefined ? String(payload.notes).trim() : null,
      payload.priority ? String(payload.priority) : null,
      status,
      payload.dueAt ? new Date(payload.dueAt) : null,
    ]
  );

  if (!res.rows[0]) {
    const error = new Error('Task not found.');
    error.status = 404;
    throw error;
  }

  const item = res.rows[0];
  return {
    ...item,
    status: item.status === 'pending' ? 'Open' : 'Done',
  };
}

export async function deleteTask(id, actor = {}) {
  const res = await db.query(
    `UPDATE tasks SET deleted_at = NOW() WHERE (id::text = $1::text) RETURNING *`,
    [String(id)]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreTask(id, actor = {}) {
  const res = await db.query(
    `UPDATE tasks SET deleted_at = NULL WHERE (id::text = $1::text) RETURNING *`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

function normalizeIdList(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id).trim()).filter(Boolean);
}

async function bulkSoftDelete(ids, deleteFn, actor = {}) {
  const uniqueIds = [...new Set(normalizeIdList(ids))];
  const results = [];
  for (const id of uniqueIds) {
    try {
      const result = await deleteFn(id, actor);
      results.push({ id, ok: true, ...result });
    } catch (err) {
      results.push({ id, ok: false, message: err.message || 'Delete failed.' });
    }
  }
  return {
    deleted: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}

export async function deleteTasks(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteTask, actor);
}

export async function deleteOngoingJobs(ids = [], actor = {}) {
  return bulkSoftDelete(ids, deleteOngoingJob, actor);
}

export async function getWorkspaceSummary() {
  const now = new Date();

  let ongoingJobs = [];
  try {
    const res = await db.query(
      `SELECT oj.id AS "_id", oj.title AS "name", oj.summary_stage AS "stage", oj.value_aed AS "valueAed",
              oj.owner, oj.updated_at AS "updatedAt", o.canonical_name AS "companyName"
       FROM ongoing_jobs oj
       LEFT JOIN organizations o ON oj.customer_organization_id = o.id
       WHERE oj.deleted_at IS NULL AND oj.summary_stage NOT IN ('Job Lost', 'Closed Lost')
       ORDER BY oj.updated_at DESC`
    );
    ongoingJobs = res.rows.map((row) => ({
      ...row,
      companyId: row.companyName ? { companyName: row.companyName } : null,
    }));
  } catch (err) {}

  let openTasks = [];
  try {
    const taskRes = await db.query(
      `SELECT id AS "_id", title, due_at AS "dueAt", status FROM tasks WHERE status = 'pending' AND deleted_at IS NULL ORDER BY due_at ASC LIMIT 8`
    );
    openTasks = taskRes.rows.map((t) => ({ ...t, status: 'Open' }));
  } catch (err) {}

  const active = ongoingJobs.filter((item) => item.stage !== CLOSED_WON_STAGE && item.stage !== 'Job Done');
  const pipelineValue = active.reduce((sum, item) => sum + (Number(item.valueAed) || 0), 0);

  return {
    metrics: {
      activeOpportunities: active.length,
      activeOngoingJobs: active.length,
      pipelineValue,
      weightedPipeline: pipelineValue * 0.5,
      closingSoon: 0,
      overdueTasks: 0,
      interestedReplies7d: 0,
      failedSendJobs: 0,
      pendingContacts: 0,
    },
    openTasks,
    recentOpportunities: ongoingJobs.slice(0, 6),
    recentOngoingJobs: ongoingJobs.slice(0, 6),
    computedAt: now,
  };
}

// Aliases for backward compatibility
export const listOpportunities = listOngoingJobs;
export const getOpportunity = getOngoingJob;
export const createOpportunity = createOngoingJob;
export const updateOpportunity = updateOngoingJob;
export const getOpportunityTimeline = getOngoingJobTimeline;
export const deleteOpportunity = deleteOngoingJob;
export const restoreOpportunity = restoreOngoingJob;
export const deleteOpportunities = deleteOngoingJobs;
