import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('activity-evidence');
export const ACTIVITY_TYPES = Object.freeze(['site_survey', 'design', 'client_approval', 'procurement', 'printing', 'fabrication', 'packing', 'transport', 'installation', 'event_support', 'dismantling', 'return', 'other']);
export const ACTIVITY_STATUSES = Object.freeze(['not_started', 'in_progress', 'blocked', 'ready', 'completed', 'cancelled']);
const UPDATE_TYPES = new Set(['progress', 'blocker', 'resolution', 'completion', 'evidence']);

function text(value) { return String(value || '').trim() || null; }
function uuid(value) { const v = text(value); return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null; }
function timestamp(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }
function safeName(value) { return path.basename(String(value || 'evidence')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180); }
function status(value, fallback = 'not_started') { const v = text(value)?.toLowerCase(); return ACTIVITY_STATUSES.includes(v) ? v : fallback; }
function minutesFromHours(value) { if (value === '' || value == null) return null; const hours = Number(value); if (!Number.isFinite(hours) || hours < 0) throw Object.assign(new Error('Planned hours must be zero or more.'), { status: 400 }); return Math.round(hours * 60); }

async function assertJob(client, jobId) {
  const result = await client.query('SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL', [jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
}

async function audit(actor, action, resource, resourceId, summary, jobId) {
  await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary, metadata: { ongoingJobId: jobId } });
}

function buildReadiness({ release, workPackages, activities }) {
  const checks = [
    { key: 'production_basis', label: 'Exact design and quotation basis released', ok: Boolean(release), critical: true },
    { key: 'scope', label: 'At least one work package defined', ok: workPackages.length > 0, critical: true },
    { key: 'plan', label: 'At least one production activity planned', ok: activities.length > 0, critical: true },
    { key: 'ownership', label: 'Every active activity has an owner', ok: activities.length > 0 && activities.filter((a) => a.status !== 'cancelled').every((a) => a.ownerUserId), critical: false },
    { key: 'dates', label: 'Every active activity has planned dates', ok: activities.length > 0 && activities.filter((a) => a.status !== 'cancelled').every((a) => a.plannedStart && a.plannedEnd), critical: false },
    { key: 'blockers', label: 'No unresolved blockers', ok: !activities.some((a) => a.status === 'blocked' || a.blocker), critical: false },
  ];
  return {
    checks,
    ready: checks.filter((item) => item.critical).every((item) => item.ok),
    warnings: [release?.poPending && 'PO is pending', release?.depositPending && 'Deposit is pending'].filter(Boolean),
  };
}

export async function getProductionWorkspace(jobId) {
  const client = await db.getClient();
  try {
    await assertJob(client, jobId);
    const [releases, designs, quotations, activities, updates, workPackages, phases, locations, users, resources, assignments] = await Promise.all([
      db.query(`SELECT pr.id, pr.quote_version_id AS "quoteVersionId", pr.release_basis AS "releaseBasis", pr.status,
                       pr.po_pending AS "poPending", pr.deposit_pending AS "depositPending", pr.release_note AS note,
                       pr.released_at AS "releasedAt", COALESCE(u.name, 'EGS Team') AS "releasedBy",
                       COALESCE(array_agg(prdv.design_version_id) FILTER (WHERE prdv.design_version_id IS NOT NULL), '{}') AS "designVersionIds"
                FROM production_releases pr LEFT JOIN users u ON u.id = pr.released_by_user_id
                LEFT JOIN production_release_design_versions prdv ON prdv.production_release_id = pr.id
                WHERE pr.ongoing_job_id = $1::uuid GROUP BY pr.id, u.name ORDER BY pr.released_at DESC`, [jobId]),
      db.query(`SELECT dv.id, ds.title AS "seriesTitle", dv.version_number AS version, dv.status, dv.original_file_name AS "fileName",
                       latest.decision AS "latestDecision"
                FROM design_versions dv JOIN design_sets ds ON ds.id = dv.design_set_id
                LEFT JOIN LATERAL (SELECT decision FROM artifact_decisions WHERE design_version_id = dv.id ORDER BY decided_at DESC LIMIT 1) latest ON TRUE
                WHERE ds.ongoing_job_id = $1::uuid ORDER BY ds.title, dv.version_number DESC`, [jobId]),
      db.query(`SELECT qv.id, q.title AS "seriesTitle", q.quote_family_number AS "familyNumber", qv.version_number AS version,
                       qv.status, qv.total_amount AS "totalAmount", qv.original_file_name AS "fileName", latest.decision AS "latestDecision"
                FROM quote_versions qv JOIN quotes q ON q.id = qv.quote_id
                LEFT JOIN LATERAL (SELECT decision FROM artifact_decisions WHERE quote_version_id = qv.id ORDER BY decided_at DESC LIMIT 1) latest ON TRUE
                WHERE q.ongoing_job_id = $1::uuid ORDER BY q.title, qv.version_number DESC`, [jobId]),
      db.query(`SELECT ja.id, ja.activity_type AS "activityType", ja.title, ja.work_package_id AS "workPackageId",
                       ja.phase_id AS "phaseId", ja.location_id AS "locationId", ja.owner_user_id AS "ownerUserId",
                       ja.planned_start AS "plannedStart", ja.planned_end AS "plannedEnd", ja.status, ja.blocker,
                       ja.completion_note AS "completionNote", ja.completed_at AS "completedAt", ja.created_at AS "createdAt",
                       u.name AS "ownerName", jsl.title AS "workPackageTitle", jp.name AS "phaseName", jl.name AS "locationName",
                       COALESCE((SELECT SUM(te.duration_minutes) FROM project_time_entries te JOIN operational_resources tr ON tr.id=te.resource_id WHERE te.job_activity_id = ja.id AND te.status = 'completed' AND tr.resource_type IN ('employee','contractor')), 0)::int AS "actualMinutes"
                FROM job_activities ja LEFT JOIN users u ON u.id = ja.owner_user_id
                LEFT JOIN job_scope_lines jsl ON jsl.id = ja.work_package_id LEFT JOIN job_phases jp ON jp.id = ja.phase_id
                LEFT JOIN job_locations jl ON jl.id = ja.location_id
                WHERE ja.ongoing_job_id = $1::uuid AND ja.archived_at IS NULL ORDER BY ja.planned_start NULLS LAST, ja.created_at`, [jobId]),
      db.query(`SELECT jau.id, jau.job_activity_id AS "activityId", jau.update_type AS type, jau.note,
                       jau.file_name AS "fileName", jau.public_url AS url, jau.created_at AS "createdAt", COALESCE(u.name, 'EGS Team') AS author
                FROM job_activity_updates jau LEFT JOIN users u ON u.id = jau.created_by_user_id
                JOIN job_activities ja ON ja.id = jau.job_activity_id WHERE ja.ongoing_job_id = $1::uuid ORDER BY jau.created_at DESC`, [jobId]),
      db.query(`SELECT id, title FROM job_scope_lines WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY display_order, created_at`, [jobId]),
      db.query(`SELECT id, name FROM job_phases WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY display_order, created_at`, [jobId]),
      db.query(`SELECT id, name FROM job_locations WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY created_at`, [jobId]),
      db.query(`SELECT id, name, email, role FROM users WHERE is_active = TRUE ORDER BY name`),
      db.query(`SELECT id, name, resource_type AS "resourceType", capability_tags AS "capabilityTags" FROM operational_resources WHERE status = 'active' ORDER BY resource_type, name`),
      db.query(`SELECT a.id, a.job_activity_id AS "activityId", a.resource_id AS "resourceId", a.assignment_role AS role,
                       a.planned_minutes AS "plannedMinutes", r.name AS "resourceName", r.resource_type AS "resourceType",
                       COALESCE((SELECT SUM(te.duration_minutes) FROM project_time_entries te WHERE te.job_activity_id=a.job_activity_id AND te.resource_id=a.resource_id AND te.status='completed'),0)::int AS "actualMinutes"
                FROM job_activity_resource_assignments a JOIN operational_resources r ON r.id = a.resource_id
                JOIN job_activities ja ON ja.id = a.job_activity_id WHERE ja.ongoing_job_id = $1::uuid`, [jobId]),
    ]);
    const activityRows = activities.rows.map((activity) => ({ ...activity, updates: updates.rows.filter((update) => update.activityId === activity.id), resourceAssignments: assignments.rows.filter((assignment) => assignment.activityId === activity.id) }));
    const activeRelease = releases.rows.find((release) => release.status === 'active') || null;
    return {
      releases: releases.rows,
      activeRelease,
      designs: designs.rows,
      quotations: quotations.rows.map((row) => ({ ...row, totalAmount: row.totalAmount == null ? null : Number(row.totalAmount) })),
      activities: activityRows,
      workPackages: workPackages.rows,
      phases: phases.rows,
      locations: locations.rows,
      users: users.rows,
      resources: resources.rows,
      activityTypes: ACTIVITY_TYPES,
      activityStatuses: ACTIVITY_STATUSES,
      readiness: buildReadiness({ release: activeRelease, workPackages: workPackages.rows, activities: activityRows }),
    };
  } finally { client.release(); }
}

export async function createProductionRelease(jobId, payload = {}, actor = {}) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await assertJob(client, jobId);
    const designVersionIds = [...new Set((Array.isArray(payload.designVersionIds) ? payload.designVersionIds : []).map(uuid).filter(Boolean))];
    const quoteVersionId = uuid(payload.quoteVersionId);
    const releaseBasis = payload.releaseBasis === 'authorized_exception' ? 'authorized_exception' : 'approved';
    const note = text(payload.note);
    if (!designVersionIds.length || !quoteVersionId) throw Object.assign(new Error('Select at least one exact design version and one exact quotation version.'), { status: 400 });
    if (releaseBasis === 'authorized_exception' && !note) throw Object.assign(new Error('Explain why production is being released by exception.'), { status: 400 });
    const validDesigns = await client.query(`SELECT dv.id, latest.decision FROM design_versions dv JOIN design_sets ds ON ds.id = dv.design_set_id
      LEFT JOIN LATERAL (SELECT decision FROM artifact_decisions WHERE design_version_id = dv.id ORDER BY decided_at DESC LIMIT 1) latest ON TRUE
      WHERE ds.ongoing_job_id = $1::uuid AND dv.id = ANY($2::uuid[])`, [jobId, designVersionIds]);
    const validQuote = await client.query(`SELECT qv.id, latest.decision FROM quote_versions qv JOIN quotes q ON q.id = qv.quote_id
      LEFT JOIN LATERAL (SELECT decision FROM artifact_decisions WHERE quote_version_id = qv.id ORDER BY decided_at DESC LIMIT 1) latest ON TRUE
      WHERE q.ongoing_job_id = $1::uuid AND qv.id = $2::uuid`, [jobId, quoteVersionId]);
    if (validDesigns.rows.length !== designVersionIds.length || !validQuote.rows.length) throw Object.assign(new Error('One or more selected artifact versions do not belong to this Job.'), { status: 400 });
    if (releaseBasis === 'approved' && (validDesigns.rows.some((row) => row.decision !== 'approved') || validQuote.rows[0].decision !== 'approved')) {
      throw Object.assign(new Error('Approved release requires approved decisions on every selected version. Use an authorized exception when work must start earlier.'), { status: 400 });
    }
    const previous = await client.query(`SELECT id FROM production_releases WHERE ongoing_job_id = $1::uuid AND status = 'active' FOR UPDATE`, [jobId]);
    if (previous.rows.length) await client.query(`UPDATE production_releases SET status = 'superseded' WHERE id = $1::uuid`, [previous.rows[0].id]);
    const created = await client.query(`INSERT INTO production_releases (ongoing_job_id, quote_version_id, release_basis, po_pending, deposit_pending, release_note, released_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid) RETURNING id`,
      [jobId, quoteVersionId, releaseBasis, payload.poPending === true, payload.depositPending === true, note, actor?.userId || null]);
    for (const designVersionId of designVersionIds) {
      await client.query(`INSERT INTO production_release_design_versions (production_release_id, design_version_id) VALUES ($1::uuid, $2::uuid)`, [created.rows[0].id, designVersionId]);
    }
    if (previous.rows.length) await client.query(`UPDATE production_releases SET superseded_by_release_id = $2::uuid WHERE id = $1::uuid`, [previous.rows[0].id, created.rows[0].id]);
    await client.query('COMMIT');
    await audit(actor, 'create', 'production_release', created.rows[0].id, releaseBasis === 'approved' ? 'Released production from approved versions' : 'Released production by authorized exception', jobId);
    return { id: created.rows[0].id };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

export async function revokeProductionRelease(jobId, releaseId, reason, actor = {}) {
  const note = text(reason);
  if (!note) throw Object.assign(new Error('A revocation reason is required.'), { status: 400 });
  const result = await db.query(`UPDATE production_releases SET status = 'revoked', revoked_at = NOW(), revoked_by_user_id = $3::uuid, revocation_reason = $4
    WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND status = 'active' RETURNING id`, [releaseId, jobId, actor?.userId || null, note]);
  if (!result.rows.length) throw Object.assign(new Error('Active production release not found.'), { status: 404 });
  await audit(actor, 'update', 'production_release', releaseId, `Revoked production release: ${note}`, jobId);
  return { ok: true };
}

export async function createJobActivity(jobId, payload = {}, actor = {}) {
  const title = text(payload.title);
  if (!title) throw Object.assign(new Error('Activity title is required.'), { status: 400 });
  const start = timestamp(payload.plannedStart); const end = timestamp(payload.plannedEnd);
  if (start && end && end < start) throw Object.assign(new Error('Planned end cannot be before planned start.'), { status: 400 });
  const activityType = ACTIVITY_TYPES.includes(payload.activityType) ? payload.activityType : 'other';
  const resourceIds = [...new Set((Array.isArray(payload.resourceIds) ? payload.resourceIds : []).map(uuid).filter(Boolean))];
  const plannedMinutes = minutesFromHours(payload.plannedHours); const client = await db.getClient();
  try {
    await client.query('BEGIN'); await assertJob(client, jobId);
    if (resourceIds.length) {
      const valid = await client.query(`SELECT id FROM operational_resources WHERE id=ANY($1::uuid[]) AND status='active'`, [resourceIds]);
      if (valid.rows.length !== resourceIds.length) throw Object.assign(new Error('One or more selected resources are unavailable.'), { status: 400 });
    }
    const result = await client.query(`INSERT INTO job_activities (ongoing_job_id, work_package_id, phase_id, location_id, activity_type, title,
      owner_user_id, planned_start, planned_end, status, blocker, created_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7::uuid, $8, $9, $10, $11, $12::uuid) RETURNING id`,
      [jobId, uuid(payload.workPackageId), uuid(payload.phaseId), uuid(payload.locationId), activityType, title, uuid(payload.ownerUserId), start, end,
        status(payload.status), text(payload.blocker), actor?.userId || null]);
    for (const resourceId of resourceIds) await client.query(`INSERT INTO job_activity_resource_assignments (job_activity_id,resource_id,planned_minutes,created_by_user_id) VALUES ($1::uuid,$2::uuid,$3,$4::uuid)`, [result.rows[0].id, resourceId, plannedMinutes, actor?.userId || null]);
    await client.query('COMMIT'); await audit(actor, 'create', 'job_activity', result.rows[0].id, `Planned activity: ${title}`, jobId); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}

export async function updateJobActivity(jobId, activityId, payload = {}, actor = {}) {
  const current = await db.query(`SELECT * FROM job_activities WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [activityId, jobId]);
  if (!current.rows.length) throw Object.assign(new Error('Activity not found.'), { status: 404 });
  const row = current.rows[0]; const nextStatus = payload.status ? status(payload.status, row.status) : row.status;
  const start = Object.hasOwn(payload, 'plannedStart') ? timestamp(payload.plannedStart) : row.planned_start;
  const end = Object.hasOwn(payload, 'plannedEnd') ? timestamp(payload.plannedEnd) : row.planned_end;
  if (start && end && end < start) throw Object.assign(new Error('Planned end cannot be before planned start.'), { status: 400 });
  const result = await db.query(`UPDATE job_activities SET title = $3, activity_type = $4, work_package_id = $5::uuid, phase_id = $6::uuid,
    location_id = $7::uuid, owner_user_id = $8::uuid, planned_start = $9, planned_end = $10, status = $11,
    blocker = $12, completion_note = $13, completed_at = CASE WHEN $11 = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END, updated_at = NOW()
    WHERE id = $1::uuid AND ongoing_job_id = $2::uuid RETURNING id`, [activityId, jobId, text(payload.title) || row.title,
      ACTIVITY_TYPES.includes(payload.activityType) ? payload.activityType : row.activity_type,
      Object.hasOwn(payload, 'workPackageId') ? uuid(payload.workPackageId) : row.work_package_id,
      Object.hasOwn(payload, 'phaseId') ? uuid(payload.phaseId) : row.phase_id,
      Object.hasOwn(payload, 'locationId') ? uuid(payload.locationId) : row.location_id,
      Object.hasOwn(payload, 'ownerUserId') ? uuid(payload.ownerUserId) : row.owner_user_id, start, end, nextStatus,
      Object.hasOwn(payload, 'blocker') ? text(payload.blocker) : row.blocker,
      Object.hasOwn(payload, 'completionNote') ? text(payload.completionNote) : row.completion_note]);
  await audit(actor, 'update', 'job_activity', activityId, `Updated activity: ${text(payload.title) || row.title}`, jobId);
  return result.rows[0];
}

export async function archiveJobActivity(jobId, activityId, actor = {}) {
  const result = await db.query(`UPDATE job_activities SET archived_at = NOW(), updated_at = NOW() WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL RETURNING id, title`, [activityId, jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Activity not found.'), { status: 404 });
  await audit(actor, 'archive', 'job_activity', activityId, `Archived activity: ${result.rows[0].title}`, jobId);
  return { ok: true };
}

export async function addActivityUpdate(jobId, activityId, payload = {}, file, actor = {}) {
  const type = UPDATE_TYPES.has(payload.type) ? payload.type : 'progress'; const note = text(payload.note);
  if (!note && !file?.buffer) throw Object.assign(new Error('Add an update note or evidence file.'), { status: 400 });
  const activity = await db.query(`SELECT id FROM job_activities WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [activityId, jobId]);
  if (!activity.rows.length) throw Object.assign(new Error('Activity not found.'), { status: 404 });
  let stored = null;
  if (file?.buffer) {
    const dir = path.join(uploadRoot, String(jobId), String(activityId)); await fs.mkdir(dir, { recursive: true });
    const name = `${crypto.randomUUID()}-${safeName(file.originalname)}`; const filePath = path.join(dir, name);
    await fs.writeFile(filePath, file.buffer, { flag: 'wx' });
    stored = { filePath, url: `/uploads/activity-evidence/${jobId}/${activityId}/${name}`, checksum: crypto.createHash('sha256').update(file.buffer).digest('hex') };
  }
  try {
    const result = await db.query(`INSERT INTO job_activity_updates (job_activity_id, update_type, note, file_name, file_path, public_url, mime_type, size_bytes, checksum_sha256, created_by_user_id)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid) RETURNING id`, [activityId, type, note, file?.originalname || null,
        stored?.filePath || null, stored?.url || null, file?.mimetype || null, file?.size || null, stored?.checksum || null, actor?.userId || null]);
    if (type === 'blocker') await db.query(`UPDATE job_activities SET status = 'blocked', blocker = COALESCE($3, blocker), updated_at = NOW() WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [activityId, jobId, note]);
    if (type === 'resolution') await db.query(`UPDATE job_activities SET blocker = NULL, status = CASE WHEN status = 'blocked' THEN 'in_progress' ELSE status END, updated_at = NOW() WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [activityId, jobId]);
    if (type === 'completion') await db.query(`UPDATE job_activities SET status = 'completed', completion_note = COALESCE($3, completion_note), completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [activityId, jobId, note]);
    await audit(actor, 'create', 'job_activity_update', result.rows[0].id, `Added ${type} update`, jobId);
    return result.rows[0];
  } catch (error) { if (stored?.filePath) await fs.unlink(stored.filePath).catch(() => {}); throw error; }
}

export async function getPlanCalendar({ from, to, ownerUserId, jobId, resourceId } = {}) {
  const start = timestamp(from) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = timestamp(to) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 7);
  const params = [start, end]; const conditions = ['ja.archived_at IS NULL', "ja.status <> 'cancelled'", 'ja.planned_start <= $2', 'COALESCE(ja.planned_end, ja.planned_start) >= $1'];
  if (uuid(ownerUserId)) { params.push(uuid(ownerUserId)); conditions.push(`ja.owner_user_id = $${params.length}::uuid`); }
  if (uuid(jobId)) { params.push(uuid(jobId)); conditions.push(`ja.ongoing_job_id = $${params.length}::uuid`); }
  if (uuid(resourceId)) { params.push(uuid(resourceId)); conditions.push(`EXISTS (SELECT 1 FROM job_activity_resource_assignments filter_assignment WHERE filter_assignment.job_activity_id = ja.id AND filter_assignment.resource_id = $${params.length}::uuid)`); }
  const result = await db.query(`SELECT ja.id, ja.ongoing_job_id AS "jobId", oj.title AS "jobTitle", oj.job_number AS "jobNumber",
    ja.title, ja.activity_type AS "activityType", ja.status, ja.planned_start AS "plannedStart", ja.planned_end AS "plannedEnd",
    ja.owner_user_id AS "ownerUserId", u.name AS "ownerName", jl.name AS "locationName", ja.blocker,
    COALESCE(resource_list.names, '{}') AS "resourceNames", COALESCE(resource_list.ids, '{}') AS "resourceIds",
    COALESCE(resource_list.assignments, '[]'::jsonb) AS "resourceAssignments",
    COALESCE(resource_list.planned_minutes,0)::int AS "plannedLaborMinutes",
    COALESCE((SELECT SUM(te.duration_minutes) FROM project_time_entries te JOIN operational_resources tr ON tr.id=te.resource_id WHERE te.job_activity_id=ja.id AND te.status='completed' AND tr.resource_type IN ('employee','contractor')),0)::int AS "actualMinutes",
    COALESCE(resource_list.planned_cost,0) AS "plannedLaborCostAed",
    COALESCE((SELECT SUM((te.duration_minutes::numeric / 60) * COALESCE(tr.hourly_cost_aed,0)) FROM project_time_entries te JOIN operational_resources tr ON tr.id=te.resource_id WHERE te.job_activity_id=ja.id AND te.status='completed' AND tr.resource_type IN ('employee','contractor')),0) AS "actualLaborCostAed",
    (EXISTS (
      SELECT 1 FROM job_activity_resource_assignments own_assignment
      JOIN job_activity_resource_assignments other_assignment ON other_assignment.resource_id = own_assignment.resource_id AND other_assignment.job_activity_id <> ja.id
      JOIN job_activities other_activity ON other_activity.id = other_assignment.job_activity_id
      WHERE own_assignment.job_activity_id = ja.id AND other_activity.archived_at IS NULL AND other_activity.status <> 'cancelled'
        AND ja.planned_start < COALESCE(other_activity.planned_end, other_activity.planned_start)
        AND other_activity.planned_start < COALESCE(ja.planned_end, ja.planned_start)
    ) OR EXISTS (
      SELECT 1 FROM job_activity_resource_assignments own_assignment JOIN resource_availability_blocks availability ON availability.resource_id = own_assignment.resource_id
      WHERE own_assignment.job_activity_id = ja.id AND ja.planned_start < availability.ends_at AND availability.starts_at < COALESCE(ja.planned_end, ja.planned_start)
    )) AS "hasResourceConflict"
    FROM job_activities ja JOIN ongoing_jobs oj ON oj.id = ja.ongoing_job_id LEFT JOIN users u ON u.id = ja.owner_user_id
    LEFT JOIN job_locations jl ON jl.id = ja.location_id
    LEFT JOIN LATERAL (SELECT array_agg(r.name ORDER BY r.name) AS names, array_agg(r.id ORDER BY r.name) AS ids,
      jsonb_agg(jsonb_build_object('id',assignment.id,'resourceId',r.id,'resourceName',r.name,'resourceType',r.resource_type,
        'role',assignment.assignment_role,'plannedMinutes',assignment.planned_minutes,'actualMinutes',COALESCE((SELECT SUM(te.duration_minutes) FROM project_time_entries te WHERE te.job_activity_id=ja.id AND te.resource_id=r.id AND te.status='completed'),0)) ORDER BY r.name) AS assignments,
      SUM(COALESCE(assignment.planned_minutes,0)) FILTER (WHERE r.resource_type IN ('employee','contractor')) AS planned_minutes,
      SUM((COALESCE(assignment.planned_minutes,0)::numeric / 60) * COALESCE(r.hourly_cost_aed,0)) FILTER (WHERE r.resource_type IN ('employee','contractor')) AS planned_cost
      FROM job_activity_resource_assignments assignment JOIN operational_resources r ON r.id = assignment.resource_id WHERE assignment.job_activity_id = ja.id) resource_list ON TRUE
    WHERE ${conditions.join(' AND ')} ORDER BY ja.planned_start, oj.title`, params);
  const taskParams = [start, end];
  const taskConditions = ["t.deleted_at IS NULL", "t.status IN ('pending','blocked','waiting')", 't.due_at >= $1', 't.due_at <= $2'];
  if (uuid(ownerUserId)) { taskParams.push(uuid(ownerUserId)); taskConditions.push(`t.owner_user_id = $${taskParams.length}::uuid`); }
  if (uuid(jobId)) { taskParams.push(uuid(jobId)); taskConditions.push(`t.opportunity_id = $${taskParams.length}::uuid`); }
  const [users, jobs, resources, tasks] = await Promise.all([
    db.query(`SELECT id, name FROM users WHERE is_active = TRUE ORDER BY name`),
    db.query(`SELECT oj.id, oj.job_number AS "jobNumber", oj.title AS name
              FROM ongoing_jobs oj
              WHERE oj.deleted_at IS NULL
                AND COALESCE(oj.summary_stage, '') NOT IN ('Job Done', 'Job Lost', 'Closed Won', 'Closed Lost')
                AND NOT EXISTS (
                  SELECT 1 FROM migration_entity_map mem
                  WHERE mem.target_table = 'ongoing_jobs' AND mem.target_entity_id = oj.id AND mem.source_collection = 'jobs'
                )
              ORDER BY oj.updated_at DESC NULLS LAST, oj.title`),
    db.query(`SELECT id, name, resource_type AS "resourceType", hourly_cost_aed AS "hourlyCostAed" FROM operational_resources WHERE status = 'active' ORDER BY resource_type, name`),
    db.query(`SELECT t.id, t.title, t.status, t.priority, t.due_at AS "dueAt", t.owner_user_id AS "ownerUserId",
      COALESCE(u.name,t.owner) AS "ownerName", t.opportunity_id AS "jobId", oj.title AS "jobTitle", oj.job_number AS "jobNumber",
      t.work_package_id AS "workPackageId", wp.title AS "workPackageTitle", t.job_activity_id AS "activityId"
      FROM tasks t LEFT JOIN users u ON u.id=t.owner_user_id LEFT JOIN ongoing_jobs oj ON oj.id=t.opportunity_id
      LEFT JOIN job_scope_lines wp ON wp.id=t.work_package_id WHERE ${taskConditions.join(' AND ')} ORDER BY t.due_at`, taskParams),
  ]);
  return { items: result.rows.map((row) => ({ ...row, plannedLaborCostAed: Number(row.plannedLaborCostAed || 0), actualLaborCostAed: Number(row.actualLaborCostAed || 0) })), taskItems: tasks.rows, users: users.rows, jobs: jobs.rows, resources: resources.rows.map((row) => ({ ...row, hourlyCostAed: row.hourlyCostAed == null ? null : Number(row.hourlyCostAed) })), activityTypes: ACTIVITY_TYPES, from: start, to: end };
}
