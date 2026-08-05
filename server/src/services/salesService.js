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

// Mongo `jobs` are deferred historical records. They remain preserved in SQL and
// migration provenance, but they are not part of the current operational workspace.
// The corresponding Mongo `opportunities` remain visible, including the four cases
// where both source collections describe the same current Ongoing Job.
const EXCLUDE_DEFERRED_LEGACY_JOBS = `NOT EXISTS (
  SELECT 1
  FROM migration_entity_map legacy_job_map
  WHERE legacy_job_map.target_table = 'ongoing_jobs'
    AND legacy_job_map.target_entity_id = oj.id
    AND legacy_job_map.source_collection = 'jobs'
)`;

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
  const conditions = ['oj.deleted_at IS NULL', EXCLUDE_DEFERRED_LEGACY_JOBS];

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
             o.id AS "companyId", o.canonical_name AS "companyName",
             task_summary.total_tasks AS "totalTasks", task_summary.open_tasks AS "openTasks",
             (
               CASE WHEN oj.primary_lead_id IS NOT NULL THEN 1 ELSE 0 END
               + COALESCE(cardinality(oj.stakeholder_lead_ids), 0)
               + COALESCE(stakeholder_summary.structured_stakeholders, 0)
             ) AS "clientStakeholders",
             (
               CASE WHEN NULLIF(BTRIM(oj.owner), '') IS NOT NULL OR oj.owner_user_id IS NOT NULL THEN 1 ELSE 0 END
               + GREATEST(COALESCE(cardinality(oj.collaborators), 0), COALESCE(cardinality(oj.collaborator_user_ids), 0))
             ) AS "internalCollaborators"
      FROM ongoing_jobs oj
      LEFT JOIN organizations o ON oj.customer_organization_id = o.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS total_tasks,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS open_tasks
        FROM tasks WHERE opportunity_id = oj.id AND deleted_at IS NULL
      ) task_summary ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS structured_stakeholders
        FROM customer_stakeholders WHERE ongoing_job_id = oj.id
      ) stakeholder_summary ON TRUE
      WHERE ${whereClause}
      ORDER BY oj.updated_at DESC NULLS LAST, oj.created_at DESC
    `;
    const res = await db.query(sql, params);
    const items = res.rows.map((row) => ({
      ...row,
      ongoingJobId: row._id,
      stage: row.stage || 'Inquiry',
      valueAed: Number(row.valueAed) || 0,
      companyId: row.companyId ? { _id: row.companyId, companyName: row.companyName } : null,
      executionSummary: {
        totalTasks: Number(row.totalTasks) || 0,
        openTasks: Number(row.openTasks) || 0,
        clientStakeholders: Number(row.clientStakeholders) || 0,
        internalCollaborators: Number(row.internalCollaborators) || 0,
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
              oj.next_action AS "nextAction", oj.event_name AS "eventName", oj.campaign_id AS "campaignId",
              oj.created_at AS "createdAt", oj.updated_at AS "updatedAt",
              oj.primary_lead_id AS "primaryLeadId", oj.stakeholder_lead_ids AS "stakeholderLeadIds",
              oj.collaborators, oj.collaborator_user_ids AS "collaboratorUserIds",
              oj.activity_log AS "activityLog",
              o.id AS "companyId", o.canonical_name AS "companyName"
       FROM ongoing_jobs oj
       LEFT JOIN organizations o ON oj.customer_organization_id = o.id
       WHERE oj.id = $1::uuid
         AND oj.deleted_at IS NULL
         AND ${EXCLUDE_DEFERRED_LEGACY_JOBS}
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
      valueAed: Number(res.rows[0].valueAed) || 0,
      companyId: res.rows[0].companyId ? { _id: res.rows[0].companyId, companyName: res.rows[0].companyName } : null,
    };
    const contactIds = [...new Set([
      ongoingJob.primaryLeadId,
      ...(Array.isArray(ongoingJob.stakeholderLeadIds) ? ongoingJob.stakeholderLeadIds : []),
    ].filter(Boolean).map(String))];
    let contacts = [];
    if (contactIds.length) {
      const contactRows = await db.query(
        `SELECT p.id AS "_id", p.id, p.display_name AS "name", por.title AS "designation",
                email.normalized_value AS "email", phone.normalized_value AS "phone",
                o.id AS "companyId", o.canonical_name AS "companyName"
         FROM people p
         LEFT JOIN person_organization_roles por ON por.person_id = p.id
           AND por.organization_id = $2::uuid
         LEFT JOIN organizations o ON o.id = por.organization_id
         LEFT JOIN LATERAL (
           SELECT normalized_value FROM person_contact_methods
           WHERE person_id = p.id AND type = 'email'
           ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1
         ) email ON TRUE
         LEFT JOIN LATERAL (
           SELECT normalized_value FROM person_contact_methods
           WHERE person_id = p.id AND type = 'phone'
           ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1
         ) phone ON TRUE
         WHERE p.id = ANY($1::uuid[]) AND p.archived_at IS NULL
         ORDER BY CASE WHEN p.id = $3::uuid THEN 0 ELSE 1 END, p.display_name`,
        [contactIds, ongoingJob.companyId?._id || null, ongoingJob.primaryLeadId || null]
      );
      contacts = contactRows.rows.map((contact) => ({
        ...contact,
        isPrimary: String(contact.id) === String(ongoingJob.primaryLeadId),
        companyId: contact.companyId ? { _id: contact.companyId, companyName: contact.companyName } : null,
      }));
    }

    return {
      ongoingJob,
      opportunity: ongoingJob,
      contacts,
      stages: stageNames(stages),
      stageProbabilities: Object.fromEntries(stages.map((s) => [s.name, s.probability])),
    };
  } catch (err) {
    if (err.status === 404) throw err;
    console.error('Error loading Ongoing Job from PostgreSQL:', err.message);
    throw err;
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
       value_aed, expected_close_date, notes, activity_log,
       primary_lead_id, stakeholder_lead_ids, collaborators, next_action, event_name
     ) VALUES (
       $1, $2::uuid, $3::uuid, $4, $5,
       $6, $7, $8, $9::jsonb,
       $10::uuid, $11::uuid[], $12::text[], $13, $14
     )
     RETURNING id AS "_id", id, job_number AS "jobNo", title AS "name", summary_stage AS "stage", owner,
               value_aed AS "valueAed", primary_lead_id AS "primaryLeadId",
               stakeholder_lead_ids AS "stakeholderLeadIds", collaborators,
               next_action AS "nextAction", event_name AS "eventName",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
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
      payload.primaryLeadId && String(payload.primaryLeadId).length === 36 ? String(payload.primaryLeadId) : null,
      normalizeTextList(payload.stakeholderLeadIds).filter((value) => value.length === 36),
      normalizeTextList(payload.collaborators),
      String(payload.nextAction || '').trim() || null,
      String(payload.eventName || '').trim() || null,
    ]
  );

  const newJob = {
    ...res.rows[0],
    ongoingJobId: res.rows[0]._id,
    valueAed: Number(res.rows[0].valueAed) || 0,
  };

  return newJob;
}

export async function updateOngoingJob(id, payload, actor = 'admin') {
  const existing = await getOngoingJob(id);
  const currentJob = existing.ongoingJob;
  const stages = await getPipelineStages();
  const modifier = String(actor || payload.owner || currentJob.owner || 'admin').trim();

  const stage = payload.stage || currentJob.stage;
  const valueAed = payload.valueAed !== undefined ? Math.max(0, cleanNumber(payload.valueAed)) : currentJob.valueAed;
  let activityLog = Array.isArray(currentJob.activityLog) ? currentJob.activityLog : [];
  if (payload.stage !== undefined && stage !== currentJob.stage) {
    activityLog = appendActivity(activityLog, { action: 'Stage changed', field: 'stage', from: currentJob.stage, to: stage }, modifier);
  }
  if (payload.valueAed !== undefined && Number(valueAed) !== Number(currentJob.valueAed || 0)) {
    activityLog = appendActivity(activityLog, { action: 'Job value changed', field: 'valueAed', from: currentJob.valueAed || 0, to: valueAed }, modifier);
  }
  if (payload.owner !== undefined && payload.owner !== currentJob.owner) {
    activityLog = appendActivity(activityLog, { action: 'Owner changed', field: 'owner', from: currentJob.owner || null, to: payload.owner || null }, modifier);
  }

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
       primary_lead_id = $9::uuid,
       stakeholder_lead_ids = $10::uuid[],
       collaborators = $11::text[],
       next_action = $12,
       event_name = $13,
       activity_log = $14::jsonb,
       updated_at = NOW()
     WHERE (id::text = $1::text) AND deleted_at IS NULL
     RETURNING id AS "_id", id, job_number AS "jobNo", title AS "name", summary_stage AS "stage", owner,
               value_aed AS "valueAed", primary_lead_id AS "primaryLeadId",
               stakeholder_lead_ids AS "stakeholderLeadIds", collaborators,
               next_action AS "nextAction", event_name AS "eventName",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      String(id),
      payload.name ? payload.name.trim() : null,
      payload.companyId && String(payload.companyId).length === 36 ? String(payload.companyId) : null,
      payload.owner ? String(payload.owner).trim() : null,
      payload.stage ? String(payload.stage).trim() : null,
      valueAed,
      payload.notes !== undefined ? String(payload.notes).trim() : null,
      closedAt,
      payload.primaryLeadId !== undefined
        ? (payload.primaryLeadId && String(payload.primaryLeadId).length === 36 ? String(payload.primaryLeadId) : null)
        : (currentJob.primaryLeadId || null),
      normalizeTextList(payload.stakeholderLeadIds ?? currentJob.stakeholderLeadIds).filter((value) => value.length === 36),
      normalizeTextList(payload.collaborators ?? currentJob.collaborators),
      payload.nextAction !== undefined ? String(payload.nextAction || '').trim() || null : currentJob.nextAction || null,
      payload.eventName !== undefined ? String(payload.eventName || '').trim() || null : currentJob.eventName || null,
      JSON.stringify(activityLog),
    ]
  );

  const updatedJob = {
    ...res.rows[0],
    ongoingJobId: res.rows[0]._id,
    valueAed: Number(res.rows[0].valueAed) || 0,
  };

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
  const events = [];
  const pushEvent = (event) => {
    if (!event.timestamp) return;
    const timestamp = new Date(event.timestamp);
    if (Number.isNaN(timestamp.getTime())) return;
    events.push({
      id: event.id,
      type: event.type || 'opportunity',
      title: event.title,
      detail: event.detail || '',
      timestamp: timestamp.toISOString(),
      actor: event.actor || 'EGS Team',
      channel: event.channel || 'crm',
      source: event.source || 'automated',
      meta: event.meta || { direction: 'internal' },
    });
  };

  pushEvent({
    id: `job-created-${ongoingJob.id}`,
    type: 'opportunity',
    title: 'Ongoing Job created',
    detail: ongoingJob.name,
    timestamp: ongoingJob.createdAt,
    actor: ongoingJob.owner || 'EGS Team',
  });

  for (const [index, activity] of (Array.isArray(ongoingJob.activityLog) ? ongoingJob.activityLog : []).entries()) {
    pushEvent({
      id: `job-activity-${ongoingJob.id}-${index}`,
      type: activity.field === 'stage' ? 'pipeline' : 'opportunity',
      title: activity.action || 'Ongoing Job updated',
      detail: activity.from !== undefined || activity.to !== undefined
        ? `${activity.from ?? '—'} → ${activity.to ?? '—'}`
        : '',
      timestamp: activity.at,
      actor: activity.by || ongoingJob.owner,
    });
  }

  const [tasks, jobEvents] = await Promise.all([
    db.query(
      `SELECT id, title, description, status, priority, due_at, completed_at, created_at
       FROM tasks WHERE opportunity_id = $1::uuid AND deleted_at IS NULL`,
      [ongoingJob.id]
    ),
    db.query(
      `SELECT id, event_type, details, created_at
       FROM job_events WHERE ongoing_job_id = $1::uuid`,
      [ongoingJob.id]
    ),
  ]);

  tasks.rows.forEach((task) => pushEvent({
    id: `task-${task.id}`,
    type: 'task',
    channel: 'task',
    title: task.status === 'completed' ? `Task completed: ${task.title}` : `Task: ${task.title}`,
    detail: task.description || '',
    timestamp: task.completed_at || task.due_at || task.created_at,
    meta: { direction: 'internal', priority: task.priority, status: task.status },
  }));
  jobEvents.rows.forEach((jobEvent) => pushEvent({
    id: `job-event-${jobEvent.id}`,
    type: 'status',
    title: jobEvent.event_type,
    detail: jobEvent.details?.reason || jobEvent.details?.detail || '',
    timestamp: jobEvent.created_at,
    meta: { direction: 'internal', ...(jobEvent.details || {}) },
  }));

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return {
    ongoingJobId: String(ongoingJob._id),
    opportunityId: String(ongoingJob._id),
    events,
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
    conditions.push(`opportunity_id::text = $${params.length}`);
  }

  if (taskType) {
    params.push(taskType);
    conditions.push(`type = $${params.length}`);
  }

  if (owner) {
    params.push(String(owner));
    conditions.push(`(owner = $${params.length} OR owner_user_id::text = $${params.length})`);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const res = await db.query(
      `SELECT id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes",
              due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt",
              owner, owner_user_id AS "ownerUserId", campaign_id AS "campaignId",
              company_id AS "companyId", lead_id AS "leadId", opportunity_id AS "opportunityId",
              review_item_id AS "reviewItemId", interaction_id AS "interactionId"
       FROM tasks
       WHERE ${whereClause}
       ORDER BY due_at ASC NULLS LAST, created_at DESC`,
      params
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
    `INSERT INTO tasks (
       title, description, status, priority, type, due_at, owner,
       owner_user_id, campaign_id, company_id, lead_id, opportunity_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, $10::uuid, $11::uuid, $12::uuid)
     RETURNING id AS "_id", id, title, type AS "taskType", status, priority, description AS "notes", due_at AS "dueAt", created_at AS "createdAt"`,
    [
      payload.title.trim(),
      String(payload.notes || '').trim(),
      status,
      payload.priority || 'medium',
      taskType,
      payload.dueAt ? new Date(payload.dueAt) : null,
      payload.owner || (typeof actor === 'string' ? actor : actor?.username || actor?.name) || null,
      payload.ownerUserId || null,
      payload.campaignId || null,
      payload.companyId || null,
      payload.leadId || null,
      targetJobId || null,
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
       WHERE oj.deleted_at IS NULL
         AND ${EXCLUDE_DEFERRED_LEGACY_JOBS}
         AND oj.summary_stage NOT IN ('Job Lost', 'Closed Lost')
       ORDER BY oj.updated_at DESC`
    );
    ongoingJobs = res.rows.map((row) => ({
      ...row,
      valueAed: Number(row.valueAed) || 0,
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
