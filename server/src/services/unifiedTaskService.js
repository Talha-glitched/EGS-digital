import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('task-evidence');
const OPEN_STATUSES = new Set(['pending', 'blocked', 'waiting']);
const VALID_STATUSES = new Set([...OPEN_STATUSES, 'completed', 'cancelled']);
const VALID_PRIORITIES = new Set(['low', 'normal', 'medium', 'high', 'urgent']);

function text(value) { return String(value || '').trim() || null; }
function uuid(value) { const valueText = text(value); return valueText && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valueText) ? valueText : null; }
function timestamp(value) { if (!value) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function safeName(value) { return path.basename(String(value || 'evidence')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180); }
function statusValue(value, fallback = 'pending') {
  const normalized = text(value)?.toLowerCase().replaceAll(' ', '_');
  if (normalized === 'open') return 'pending';
  if (normalized === 'done' || normalized === 'resolved') return 'completed';
  return VALID_STATUSES.has(normalized) ? normalized : fallback;
}
function priorityValue(value, fallback = 'medium') {
  const normalized = text(value)?.toLowerCase();
  return VALID_PRIORITIES.has(normalized) ? normalized : fallback;
}
function displayStatus(value) {
  if (value === 'completed' || value === 'resolved') return 'Done';
  if (value === 'blocked') return 'Blocked';
  if (value === 'waiting') return 'Waiting';
  if (value === 'cancelled') return 'Cancelled';
  return 'Open';
}
function displayPriority(value) {
  const normalized = text(value)?.toLowerCase();
  if (normalized === 'medium') return 'Normal';
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Normal';
}

const TASK_SELECT = `
  SELECT t.id AS "_id", t.id, t.title, COALESCE(NULLIF(t.type,''), NULLIF(t.task_type,''), 'general') AS "taskType",
    t.status AS "rawStatus", t.priority AS "rawPriority", COALESCE(NULLIF(t.description,''), NULLIF(t.notes,'')) AS notes,
    t.due_at AS "dueAt", t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
    COALESCE(NULLIF(u.name,''), NULLIF(t.owner,'')) AS owner, t.owner_user_id AS "ownerUserId",
    t.campaign_id AS "campaignId", t.company_id AS "companyId", t.lead_id AS "leadId", t.opportunity_id AS "opportunityId",
    t.review_item_id AS "reviewItemId", t.interaction_id AS "interactionId",
    t.work_package_id AS "workPackageId", wp.title AS "workPackageTitle",
    t.job_phase_id AS "phaseId", jp.name AS "phaseName", t.job_location_id AS "locationId", jl.name AS "locationName",
    t.job_activity_id AS "activityId", ja.title AS "activityTitle",
    oj.title AS "jobTitle", oj.job_number AS "jobNumber", t.blocked_reason AS "blockedReason", t.waiting_on AS "waitingOn",
    t.completion_note AS "completionNote", t.completion_evidence_required AS "completionEvidenceRequired",
    t.source_type AS "sourceType", t.source_id AS "sourceId",
    COALESCE(deps.items, '[]'::jsonb) AS dependencies, COALESCE(evidence.items, '[]'::jsonb) AS evidence
  FROM tasks t
  LEFT JOIN users u ON u.id=t.owner_user_id
  LEFT JOIN ongoing_jobs oj ON oj.id=t.opportunity_id
  LEFT JOIN job_scope_lines wp ON wp.id=t.work_package_id
  LEFT JOIN job_phases jp ON jp.id=t.job_phase_id
  LEFT JOIN job_locations jl ON jl.id=t.job_location_id
  LEFT JOIN job_activities ja ON ja.id=t.job_activity_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', predecessor.id, 'title', predecessor.title, 'status', predecessor.status) ORDER BY predecessor.due_at NULLS LAST, predecessor.created_at) AS items
    FROM task_dependencies td JOIN tasks predecessor ON predecessor.id=td.depends_on_task_id
    WHERE td.task_id=t.id AND predecessor.deleted_at IS NULL
  ) deps ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', e.id, 'note', e.note, 'fileName', e.file_name, 'url', e.public_url, 'mimeType', e.mime_type, 'sizeBytes', e.size_bytes, 'createdAt', e.created_at, 'uploadedBy', COALESCE(eu.name,'EGS Team')) ORDER BY e.created_at DESC) AS items
    FROM task_evidence e LEFT JOIN users eu ON eu.id=e.uploaded_by_user_id WHERE e.task_id=t.id
  ) evidence ON TRUE`;

function taskReadModel(row) {
  return {
    ...row,
    status: displayStatus(row.rawStatus),
    priority: displayPriority(row.rawPriority),
    isBlockedByDependency: (row.dependencies || []).some((dependency) => !['completed', 'resolved', 'cancelled'].includes(dependency.status)),
  };
}

export async function listUnifiedTasks({ status = 'Open', owner, ownerUserId, currentUserId, mine, opportunityId, ongoingJobId, taskType, campaignId, projectId } = {}) {
  const params = [];
  const conditions = ['t.deleted_at IS NULL'];
  const targetCampaignId = uuid(campaignId || projectId);
  const targetJobId = uuid(ongoingJobId || opportunityId);
  if (status && status !== 'All') {
    if (status === 'Open') conditions.push(`t.status IN ('pending','blocked','waiting')`);
    else if (status === 'Done') conditions.push(`t.status IN ('completed','resolved')`);
    else { params.push(statusValue(status)); conditions.push(`t.status=$${params.length}`); }
  }
  if (targetCampaignId) {
    params.push(targetCampaignId);
    conditions.push(`(
      t.campaign_id = $${params.length}::uuid
      OR t.opportunity_id IN (SELECT id FROM ongoing_jobs WHERE campaign_id = $${params.length}::uuid)
      OR t.lead_id IN (
        SELECT cc.id FROM campaign_contacts cc
        JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
        WHERE ca.campaign_id = $${params.length}::uuid
      )
    )`);
  }
  if (targetJobId) { params.push(targetJobId); conditions.push(`t.opportunity_id=$${params.length}::uuid`); }
  if (taskType) { params.push(String(taskType)); conditions.push(`COALESCE(NULLIF(t.type,''), NULLIF(t.task_type,''), 'general')=$${params.length}`); }
  const targetOwnerUserId = uuid(ownerUserId || (String(mine) === '1' || mine === true ? currentUserId : null));
  if (targetOwnerUserId) { params.push(targetOwnerUserId); conditions.push(`t.owner_user_id=$${params.length}::uuid`); }
  else if (owner) { params.push(String(owner)); conditions.push(`(t.owner=$${params.length} OR u.name=$${params.length})`); }

  const result = await db.query(`${TASK_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY
    CASE t.status WHEN 'blocked' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END,
    t.due_at ASC NULLS LAST, t.created_at DESC`, params);
  const items = result.rows.map(taskReadModel);
  const now = Date.now();
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const endWeek = new Date(); endWeek.setDate(endWeek.getDate() + 7); endWeek.setHours(23, 59, 59, 999);
  const summary = items.reduce((acc, item) => {
    if (item.status === 'Blocked' || item.isBlockedByDependency) acc.blocked += 1;
    if (item.status === 'Waiting') acc.waiting += 1;
    const due = item.dueAt ? new Date(item.dueAt).getTime() : null;
    if (due != null && due < now) acc.overdue += 1;
    else if (due != null && due <= endToday.getTime()) acc.today += 1;
    else if (due != null && due <= endWeek.getTime()) acc.upcoming += 1;
    else acc.later += 1;
    return acc;
  }, { overdue: 0, today: 0, upcoming: 0, later: 0, blocked: 0, waiting: 0 });
  return { items, summary };
}

export async function getUnifiedTask(id) {
  const result = await db.query(`${TASK_SELECT} WHERE t.id=$1::uuid AND t.deleted_at IS NULL LIMIT 1`, [id]);
  if (!result.rows.length) throw Object.assign(new Error('Task not found.'), { status: 404 });
  return taskReadModel(result.rows[0]);
}

export async function getTaskJobContext(jobId) {
  const result = await Promise.all([
    db.query(`SELECT id, title, job_number AS "jobNumber" FROM ongoing_jobs WHERE id=$1::uuid AND deleted_at IS NULL`, [jobId]),
    db.query(`SELECT id, title FROM job_scope_lines WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY display_order, created_at`, [jobId]),
    db.query(`SELECT id, name FROM job_phases WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY display_order, created_at`, [jobId]),
    db.query(`SELECT id, name FROM job_locations WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY created_at`, [jobId]),
    db.query(`SELECT id, title, status FROM job_activities WHERE ongoing_job_id=$1::uuid AND archived_at IS NULL ORDER BY planned_start NULLS LAST, created_at`, [jobId]),
  ]);
  if (!result[0].rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
  return { job: result[0].rows[0], workPackages: result[1].rows, phases: result[2].rows, locations: result[3].rows, activities: result[4].rows };
}

async function replaceDependencies(client, taskId, dependencyIds, actor = {}) {
  if (!Array.isArray(dependencyIds)) return;
  const ids = [...new Set(dependencyIds.map(uuid).filter(Boolean))].filter((id) => id !== taskId);
  await client.query('DELETE FROM task_dependencies WHERE task_id=$1::uuid', [taskId]);
  for (const dependencyId of ids) {
    const inserted = await client.query(`INSERT INTO task_dependencies (task_id, depends_on_task_id, created_by_user_id)
      SELECT $1::uuid,$2::uuid,$3::uuid WHERE EXISTS (SELECT 1 FROM tasks WHERE id=$2::uuid AND deleted_at IS NULL)
      ON CONFLICT DO NOTHING RETURNING task_id`, [taskId, dependencyId, actor?.userId || null]);
    if (!inserted.rowCount) throw Object.assign(new Error('One of the selected dependency tasks no longer exists.'), { status: 400 });
  }
}

export async function createUnifiedTask(payload = {}, actor = {}) {
  const title = text(payload.title);
  if (!title) throw Object.assign(new Error('Task title is required.'), { status: 400 });
  const taskStatus = statusValue(payload.status);
  const blocker = text(payload.blockedReason);
  const waitingOn = text(payload.waitingOn);
  if (taskStatus === 'blocked' && !blocker) throw Object.assign(new Error('Say what is blocking this task.'), { status: 400 });
  if (taskStatus === 'waiting' && !waitingOn) throw Object.assign(new Error('Say what or whom this task is waiting on.'), { status: 400 });
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const ownerUserId = uuid(payload.ownerUserId);
    const ownerResult = ownerUserId ? await client.query('SELECT name FROM users WHERE id=$1::uuid AND is_active=TRUE', [ownerUserId]) : { rows: [] };
    if (ownerUserId && !ownerResult.rows.length) throw Object.assign(new Error('Selected task owner is not an active user.'), { status: 400 });
    const jobId = uuid(payload.ongoingJobId || payload.opportunityId);
    const type = text(payload.taskType) || (jobId || payload.activityId ? 'ongoing_job' : 'general');
    const result = await client.query(`INSERT INTO tasks (
      title, description, notes, status, priority, type, task_type, due_at, completed_at, owner, owner_user_id,
      campaign_id, company_id, lead_id, opportunity_id, work_package_id, job_phase_id, job_location_id, job_activity_id,
      blocked_reason, waiting_on, completion_note, completion_evidence_required, source_type, source_id, updated_at)
      VALUES ($1,$2,$2,$3,$4,$5,$5,$6,$7,$8,$9::uuid,$10::uuid,$11::uuid,$12::uuid,$13::uuid,$14::uuid,$15::uuid,$16::uuid,$17::uuid,$18,$19,$20,$21,$22,$23::uuid,NOW())
      RETURNING id`, [title, text(payload.notes), taskStatus, priorityValue(payload.priority), type, timestamp(payload.dueAt), taskStatus === 'completed' ? new Date() : null,
      ownerResult.rows[0]?.name || text(payload.owner) || actor?.displayName || null, ownerUserId, uuid(payload.campaignId), uuid(payload.companyId), uuid(payload.leadId), jobId,
      uuid(payload.workPackageId), uuid(payload.phaseId || payload.jobPhaseId), uuid(payload.locationId || payload.jobLocationId), uuid(payload.activityId || payload.jobActivityId),
      blocker, waitingOn, text(payload.completionNote), Boolean(payload.completionEvidenceRequired), text(payload.sourceType), uuid(payload.sourceId)]);
    await replaceDependencies(client, result.rows[0].id, payload.dependencyIds, actor);
    await client.query('COMMIT');
    await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action: 'create', resource: 'task', resourceId: result.rows[0].id, summary: `Created task: ${title}`, metadata: { ongoingJobId: jobId } });
    return getUnifiedTask(result.rows[0].id);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function updateUnifiedTask(id, payload = {}, actor = {}) {
  const existing = await getUnifiedTask(id);
  const updates = [];
  const values = [id];
  const set = (column, value, cast = '') => { values.push(value); updates.push(`${column}=$${values.length}${cast}`); };
  if (Object.hasOwn(payload, 'title')) { const title = text(payload.title); if (!title) throw Object.assign(new Error('Task title is required.'), { status: 400 }); set('title', title); }
  if (Object.hasOwn(payload, 'notes')) { set('description', text(payload.notes)); set('notes', text(payload.notes)); }
  if (Object.hasOwn(payload, 'priority')) set('priority', priorityValue(payload.priority));
  if (Object.hasOwn(payload, 'dueAt')) set('due_at', timestamp(payload.dueAt));
  if (Object.hasOwn(payload, 'ownerUserId')) {
    const ownerId = uuid(payload.ownerUserId);
    if (payload.ownerUserId && !ownerId) throw Object.assign(new Error('Invalid task owner.'), { status: 400 });
    let ownerName = text(payload.owner);
    if (ownerId) { const owner = await db.query('SELECT name FROM users WHERE id=$1::uuid AND is_active=TRUE', [ownerId]); if (!owner.rows.length) throw Object.assign(new Error('Selected task owner is not active.'), { status: 400 }); ownerName = owner.rows[0].name; }
    set('owner_user_id', ownerId, '::uuid'); set('owner', ownerName);
  } else if (Object.hasOwn(payload, 'owner')) set('owner', text(payload.owner));
  const contextFields = [
    ['opportunity_id', payload.ongoingJobId ?? payload.opportunityId, Object.hasOwn(payload, 'ongoingJobId') || Object.hasOwn(payload, 'opportunityId')],
    ['work_package_id', payload.workPackageId, Object.hasOwn(payload, 'workPackageId')],
    ['job_phase_id', payload.phaseId ?? payload.jobPhaseId, Object.hasOwn(payload, 'phaseId') || Object.hasOwn(payload, 'jobPhaseId')],
    ['job_location_id', payload.locationId ?? payload.jobLocationId, Object.hasOwn(payload, 'locationId') || Object.hasOwn(payload, 'jobLocationId')],
    ['job_activity_id', payload.activityId ?? payload.jobActivityId, Object.hasOwn(payload, 'activityId') || Object.hasOwn(payload, 'jobActivityId')],
    ['campaign_id', payload.campaignId, Object.hasOwn(payload, 'campaignId')], ['company_id', payload.companyId, Object.hasOwn(payload, 'companyId')], ['lead_id', payload.leadId, Object.hasOwn(payload, 'leadId')],
  ];
  contextFields.forEach(([column, value, present]) => { if (present) set(column, uuid(value), '::uuid'); });
  if (Object.hasOwn(payload, 'blockedReason')) set('blocked_reason', text(payload.blockedReason));
  if (Object.hasOwn(payload, 'waitingOn')) set('waiting_on', text(payload.waitingOn));
  if (Object.hasOwn(payload, 'completionNote')) set('completion_note', text(payload.completionNote));
  if (Object.hasOwn(payload, 'completionEvidenceRequired')) set('completion_evidence_required', Boolean(payload.completionEvidenceRequired));
  if (Object.hasOwn(payload, 'status')) {
    const nextStatus = statusValue(payload.status, existing.rawStatus);
    const blocker = Object.hasOwn(payload, 'blockedReason') ? text(payload.blockedReason) : existing.blockedReason;
    const waitingOn = Object.hasOwn(payload, 'waitingOn') ? text(payload.waitingOn) : existing.waitingOn;
    if (nextStatus === 'blocked' && !blocker) throw Object.assign(new Error('Say what is blocking this task.'), { status: 400 });
    if (nextStatus === 'waiting' && !waitingOn) throw Object.assign(new Error('Say what or whom this task is waiting on.'), { status: 400 });
    const evidenceRequired = Object.hasOwn(payload, 'completionEvidenceRequired') ? Boolean(payload.completionEvidenceRequired) : existing.completionEvidenceRequired;
    if (nextStatus === 'completed' && evidenceRequired && !existing.evidence?.length && !payload.hasPendingEvidence) throw Object.assign(new Error('Completion evidence is required before this task can be completed.'), { status: 400 });
    set('status', nextStatus); set('completed_at', nextStatus === 'completed' ? (existing.completedAt || new Date()) : null);
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    if (updates.length) {
      updates.push('updated_at=NOW()');
      const result = await client.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id=$1::uuid AND deleted_at IS NULL RETURNING id`, values);
      if (!result.rowCount) throw Object.assign(new Error('Task not found.'), { status: 404 });
    }
    await replaceDependencies(client, id, payload.dependencyIds, actor);
    await client.query('COMMIT');
    await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action: 'update', resource: 'task', resourceId: id, summary: `Updated task: ${text(payload.title) || existing.title}`, metadata: { ongoingJobId: existing.opportunityId } });
    return getUnifiedTask(id);
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function addTaskEvidence(taskId, payload = {}, file, actor = {}) {
  const note = text(payload.note);
  if (!note && !file?.buffer) throw Object.assign(new Error('Add a note or evidence file.'), { status: 400 });
  await getUnifiedTask(taskId);
  let stored = null;
  if (file?.buffer) {
    const directory = path.join(uploadRoot, String(taskId)); await fs.mkdir(directory, { recursive: true });
    const name = `${crypto.randomUUID()}-${safeName(file.originalname)}`; const storagePath = path.join(directory, name);
    await fs.writeFile(storagePath, file.buffer, { flag: 'wx' });
    stored = { storagePath, publicUrl: `/uploads/task-evidence/${taskId}/${name}`, checksum: crypto.createHash('sha256').update(file.buffer).digest('hex') };
  }
  try {
    await db.query(`INSERT INTO task_evidence (task_id,note,file_name,storage_path,public_url,mime_type,size_bytes,checksum_sha256,uploaded_by_user_id)
      VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::uuid)`, [taskId, note, file?.originalname || null, stored?.storagePath || null, stored?.publicUrl || null, file?.mimetype || null, file?.size || null, stored?.checksum || null, actor?.userId || null]);
    await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action: 'create', resource: 'task_evidence', resourceId: taskId, summary: 'Added task completion evidence' });
    return getUnifiedTask(taskId);
  } catch (error) { if (stored?.storagePath) await fs.unlink(stored.storagePath).catch(() => {}); throw error; }
}
