import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

export const RESOURCE_TYPES = Object.freeze(['employee', 'contractor', 'team', 'subcontractor', 'vehicle', 'equipment']);
export const AVAILABILITY_TYPES = Object.freeze(['leave', 'sick', 'training', 'external_booking', 'maintenance', 'other']);
function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f-]{36}$/i.test(result) ? result : null; }
function timestamp(value) { if (!value) return null; const result = new Date(value); return Number.isNaN(result.getTime()) ? null : result; }
function tags(value) { return [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map(text).filter(Boolean))]; }
function minutesFromHours(value) { if (value === '' || value == null) return null; const hours = Number(value); if (!Number.isFinite(hours) || hours < 0) throw Object.assign(new Error('Planned hours must be zero or more.'), { status: 400 }); return Math.round(hours * 60); }
async function audit(actor, action, resource, resourceId, summary, jobId = null) { await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary, metadata: jobId ? { ongoingJobId: jobId } : {} }); }

export async function getResourceWorkspace({ from, to } = {}, actor = {}) {
  const start = timestamp(from) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = timestamp(to) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const [resources, assignments, availability, entries, jobs, users, suppliers] = await Promise.all([
    db.query(`SELECT r.id, r.resource_type AS "resourceType", r.name, r.user_id AS "userId", r.supplier_profile_id AS "supplierId",
      r.identifier, r.capability_tags AS "capabilityTags", r.hourly_cost_aed AS "hourlyCostAed", r.notes, r.status,
      u.email, o.canonical_name AS "supplierName"
      FROM operational_resources r LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN supplier_profiles sp ON sp.id = r.supplier_profile_id LEFT JOIN organizations o ON o.id = sp.organization_id
      ORDER BY r.status, r.resource_type, r.name`),
    db.query(`SELECT a.id, a.resource_id AS "resourceId", a.job_activity_id AS "activityId", a.assignment_role AS role, a.planned_minutes AS "plannedMinutes",
      ja.ongoing_job_id AS "jobId", oj.title AS "jobTitle", oj.job_number AS "jobNumber", ja.title AS "activityTitle",
      ja.planned_start AS "plannedStart", ja.planned_end AS "plannedEnd", ja.status AS "activityStatus",
      COALESCE((SELECT SUM(te.duration_minutes) FROM project_time_entries te WHERE te.job_activity_id=a.job_activity_id AND te.resource_id=a.resource_id AND te.status='completed'),0)::int AS "actualMinutes"
      FROM job_activity_resource_assignments a JOIN job_activities ja ON ja.id = a.job_activity_id JOIN ongoing_jobs oj ON oj.id = ja.ongoing_job_id
      WHERE ja.archived_at IS NULL AND ja.status <> 'cancelled' AND ja.planned_start <= $2 AND COALESCE(ja.planned_end, ja.planned_start) >= $1
      ORDER BY ja.planned_start`, [start, end]),
    db.query(`SELECT id, resource_id AS "resourceId", starts_at AS "startsAt", ends_at AS "endsAt", reason, block_type AS "blockType"
      FROM resource_availability_blocks WHERE starts_at <= $2 AND ends_at >= $1 ORDER BY starts_at`, [start, end]),
    db.query(`SELECT te.id, te.resource_id AS "resourceId", r.name AS "resourceName", te.ongoing_job_id AS "jobId", oj.title AS "jobTitle",
      te.job_activity_id AS "activityId", ja.title AS "activityTitle", te.started_at AS "startedAt", te.ended_at AS "endedAt",
      te.duration_minutes AS "durationMinutes", te.entry_source AS source, te.status, te.note
      FROM project_time_entries te JOIN operational_resources r ON r.id = te.resource_id JOIN ongoing_jobs oj ON oj.id = te.ongoing_job_id
      LEFT JOIN job_activities ja ON ja.id = te.job_activity_id
      WHERE te.status <> 'voided' AND te.started_at <= $2 AND COALESCE(te.ended_at, NOW()) >= $1 ORDER BY te.started_at DESC`, [start, end]),
    db.query(`SELECT oj.id, oj.job_number AS "jobNumber", oj.title AS name FROM ongoing_jobs oj WHERE oj.deleted_at IS NULL
      AND COALESCE(oj.summary_stage, '') NOT IN ('Job Done', 'Job Lost', 'Closed Won', 'Closed Lost')
      AND NOT EXISTS (SELECT 1 FROM migration_entity_map mem WHERE mem.target_table = 'ongoing_jobs' AND mem.target_entity_id = oj.id AND mem.source_collection = 'jobs')
      ORDER BY oj.updated_at DESC NULLS LAST`),
    db.query(`SELECT id, name, email FROM users WHERE is_active = TRUE ORDER BY name`),
    db.query(`SELECT sp.id, o.canonical_name AS name FROM supplier_profiles sp JOIN organizations o ON o.id = sp.organization_id WHERE sp.status = 'active' ORDER BY o.canonical_name`),
  ]);
  const assignmentRows = assignments.rows.map((row) => {
    const conflicts = assignments.rows.filter((other) => other.id !== row.id && other.resourceId === row.resourceId && row.plannedStart && other.plannedStart && new Date(row.plannedStart) < new Date(other.plannedEnd || other.plannedStart) && new Date(other.plannedStart) < new Date(row.plannedEnd || row.plannedStart));
    const blocked = availability.rows.filter((item) => item.resourceId === row.resourceId && new Date(row.plannedStart) < new Date(item.endsAt) && new Date(item.startsAt) < new Date(row.plannedEnd || row.plannedStart));
    return { ...row, conflictCount: conflicts.length + blocked.length };
  });
  const resourceRows = resources.rows.map((row) => ({
    ...row,
    hourlyCostAed: row.hourlyCostAed == null ? null : Number(row.hourlyCostAed),
    assignments: assignmentRows.filter((item) => item.resourceId === row.id),
    hours: entries.rows.filter((item) => item.resourceId === row.id).reduce((sum, item) => sum + Number(item.durationMinutes || (item.status === 'running' ? (Date.now() - new Date(item.startedAt).getTime()) / 60000 : 0)), 0) / 60,
  }));
  return { resources: resourceRows, assignments: assignmentRows, availability: availability.rows, timeEntries: entries.rows, jobs: jobs.rows, users: users.rows, suppliers: suppliers.rows, resourceTypes: RESOURCE_TYPES, availabilityTypes: AVAILABILITY_TYPES, currentResourceId: resourceRows.find((item) => item.userId === actor?.userId)?.id || null, from: start, to: end };
}

export async function createResource(payload = {}, actor = {}) {
  const name = text(payload.name); const resourceType = RESOURCE_TYPES.includes(payload.resourceType) ? payload.resourceType : null;
  if (!name || !resourceType) throw Object.assign(new Error('Resource name and type are required.'), { status: 400 });
  const hourlyCost = payload.hourlyCostAed === '' || payload.hourlyCostAed == null ? null : Number(payload.hourlyCostAed);
  if (hourlyCost != null && (!Number.isFinite(hourlyCost) || hourlyCost < 0)) throw Object.assign(new Error('Hourly cost must be zero or more.'), { status: 400 });
  const result = await db.query(`INSERT INTO operational_resources (resource_type, name, user_id, supplier_profile_id, identifier, capability_tags, hourly_cost_aed, notes, created_by_user_id)
    VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6::text[], $7, $8, $9::uuid) RETURNING id`, [resourceType, name, uuid(payload.userId), uuid(payload.supplierId), text(payload.identifier), tags(payload.capabilityTags), hourlyCost, text(payload.notes), actor?.userId || null]);
  await audit(actor, 'create', 'operational_resource', result.rows[0].id, `Created ${resourceType}: ${name}`); return result.rows[0];
}

export async function updateResource(resourceId, payload = {}, actor = {}) {
  const current = await db.query('SELECT * FROM operational_resources WHERE id = $1::uuid', [resourceId]);
  if (!current.rows.length) throw Object.assign(new Error('Resource not found.'), { status: 404 }); const row = current.rows[0];
  const result = await db.query(`UPDATE operational_resources SET name = $2, resource_type = $3, user_id = $4::uuid, supplier_profile_id = $5::uuid,
    identifier = $6, capability_tags = $7::text[], hourly_cost_aed = $8, notes = $9, status = $10, updated_at = NOW() WHERE id = $1::uuid RETURNING id`,
  [resourceId, text(payload.name) || row.name, RESOURCE_TYPES.includes(payload.resourceType) ? payload.resourceType : row.resource_type,
    Object.hasOwn(payload, 'userId') ? uuid(payload.userId) : row.user_id, Object.hasOwn(payload, 'supplierId') ? uuid(payload.supplierId) : row.supplier_profile_id,
    Object.hasOwn(payload, 'identifier') ? text(payload.identifier) : row.identifier, Object.hasOwn(payload, 'capabilityTags') ? tags(payload.capabilityTags) : row.capability_tags,
    Object.hasOwn(payload, 'hourlyCostAed') ? (payload.hourlyCostAed === '' ? null : Number(payload.hourlyCostAed)) : row.hourly_cost_aed,
    Object.hasOwn(payload, 'notes') ? text(payload.notes) : row.notes, payload.status === 'inactive' ? 'inactive' : 'active']);
  await audit(actor, 'update', 'operational_resource', resourceId, `Updated resource: ${text(payload.name) || row.name}`); return result.rows[0];
}

export async function assignResource(jobId, activityId, payload = {}, actor = {}) {
  const resourceId = uuid(payload.resourceId); if (!resourceId) throw Object.assign(new Error('Select a resource.'), { status: 400 });
  const plannedMinutes = minutesFromHours(payload.plannedHours);
  const valid = await db.query(`SELECT ja.id FROM job_activities ja, operational_resources r WHERE ja.id = $1::uuid AND ja.ongoing_job_id = $2::uuid AND ja.archived_at IS NULL AND r.id = $3::uuid AND r.status = 'active'`, [activityId, jobId, resourceId]);
  if (!valid.rows.length) throw Object.assign(new Error('Activity or active resource not found.'), { status: 404 });
  const result = await db.query(`INSERT INTO job_activity_resource_assignments (job_activity_id, resource_id, assignment_role, planned_minutes, created_by_user_id)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid) ON CONFLICT (job_activity_id, resource_id) DO UPDATE SET assignment_role = EXCLUDED.assignment_role, planned_minutes = EXCLUDED.planned_minutes, updated_at=NOW() RETURNING id`, [activityId, resourceId, text(payload.role), plannedMinutes, actor?.userId || null]);
  await audit(actor, 'create', 'resource_assignment', result.rows[0].id, 'Assigned resource to Job activity', jobId); return result.rows[0];
}

export async function removeResourceAssignment(jobId, activityId, assignmentId, actor = {}) {
  const result = await db.query(`DELETE FROM job_activity_resource_assignments a USING job_activities ja WHERE a.id = $1::uuid AND a.job_activity_id = ja.id AND ja.id = $2::uuid AND ja.ongoing_job_id = $3::uuid RETURNING a.id`, [assignmentId, activityId, jobId]);
  if (!result.rows.length) throw Object.assign(new Error('Resource assignment not found.'), { status: 404 }); await audit(actor, 'delete', 'resource_assignment', assignmentId, 'Removed resource assignment', jobId); return { ok: true };
}

export async function addAvailabilityBlock(resourceId, payload = {}, actor = {}) {
  const start = timestamp(payload.startsAt); const end = timestamp(payload.endsAt); const reason = text(payload.reason);
  const blockType = AVAILABILITY_TYPES.includes(payload.blockType) ? payload.blockType : 'other';
  if (!start || !end || end <= start || !reason) throw Object.assign(new Error('Valid start, end and reason are required.'), { status: 400 });
  const result = await db.query(`INSERT INTO resource_availability_blocks (resource_id, starts_at, ends_at, reason, block_type, created_by_user_id) VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid) RETURNING id`, [resourceId, start, end, reason, blockType, actor?.userId || null]);
  await audit(actor, 'create', 'resource_availability', result.rows[0].id, `Blocked resource availability: ${reason}`); return result.rows[0];
}

async function validateTimeContext(client, resourceId, jobId, activityId) {
  const resource = await client.query(`SELECT id FROM operational_resources WHERE id = $1::uuid AND status = 'active' AND resource_type IN ('employee','contractor')`, [resourceId]); if (!resource.rows.length) throw Object.assign(new Error('Active employee or contractor resource not found.'), { status: 404 });
  const job = await client.query(`SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL`, [jobId]); if (!job.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 });
  if (activityId) { const activity = await client.query(`SELECT id FROM job_activities WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [activityId, jobId]); if (!activity.rows.length) throw Object.assign(new Error('Activity does not belong to this Job.'), { status: 400 }); }
}

export async function startProjectTimer(payload = {}, actor = {}) {
  const resourceId = uuid(payload.resourceId); const jobId = uuid(payload.jobId); const activityId = uuid(payload.activityId);
  const client = await db.getClient(); try { await client.query('BEGIN'); await validateTimeContext(client, resourceId, jobId, activityId);
    const result = await client.query(`INSERT INTO project_time_entries (resource_id, user_id, ongoing_job_id, job_activity_id, started_at, entry_source, status, note, created_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, NOW(), 'timer', 'running', $5, $2::uuid) RETURNING id`, [resourceId, actor?.userId || null, jobId, activityId, text(payload.note)]);
    await client.query('COMMIT'); await audit(actor, 'create', 'project_time_entry', result.rows[0].id, 'Started project timer', jobId); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); if (error.code === '23505') throw Object.assign(new Error('This resource already has a running timer.'), { status: 409 }); throw error; } finally { client.release(); }
}

export async function stopProjectTimer(entryId, actor = {}) {
  const result = await db.query(`UPDATE project_time_entries SET ended_at = NOW(), duration_minutes = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60)::int), status = 'completed', updated_at = NOW()
    WHERE id = $1::uuid AND status = 'running' RETURNING id, ongoing_job_id`, [entryId]);
  if (!result.rows.length) throw Object.assign(new Error('Running timer not found.'), { status: 404 }); await audit(actor, 'update', 'project_time_entry', entryId, 'Stopped project timer', result.rows[0].ongoing_job_id); return { ok: true };
}

export async function createManualTimeEntry(payload = {}, actor = {}) {
  const resourceId = uuid(payload.resourceId); const jobId = uuid(payload.jobId); const activityId = uuid(payload.activityId); const start = timestamp(payload.startedAt); const end = timestamp(payload.endedAt);
  if (!start || !end || end < start) throw Object.assign(new Error('Valid start and end times are required.'), { status: 400 }); const client = await db.getClient();
  try { await validateTimeContext(client, resourceId, jobId, activityId); const minutes = Math.max(0, Math.round((end - start) / 60000));
    const result = await client.query(`INSERT INTO project_time_entries (resource_id, user_id, ongoing_job_id, job_activity_id, started_at, ended_at, duration_minutes, entry_source, status, note, created_by_user_id)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, 'manual', 'completed', $8, $2::uuid) RETURNING id`, [resourceId, actor?.userId || null, jobId, activityId, start, end, minutes, text(payload.note)]);
    await audit(actor, 'create', 'project_time_entry', result.rows[0].id, `Recorded ${minutes} project minutes`, jobId); return result.rows[0];
  } finally { client.release(); }
}

export async function correctTimeEntry(entryId, payload = {}, actor = {}) {
  const start = timestamp(payload.startedAt); const end = timestamp(payload.endedAt); const reason = text(payload.reason); if (!start || !end || end < start || !reason) throw Object.assign(new Error('Corrected times and reason are required.'), { status: 400 });
  const client = await db.getClient(); try { await client.query('BEGIN'); const current = await client.query(`SELECT * FROM project_time_entries WHERE id = $1::uuid AND status = 'completed' FOR UPDATE`, [entryId]); if (!current.rows.length) throw Object.assign(new Error('Completed time entry not found.'), { status: 404 }); const row = current.rows[0];
    await client.query(`INSERT INTO project_time_corrections (project_time_entry_id, previous_started_at, previous_ended_at, corrected_started_at, corrected_ended_at, reason, corrected_by_user_id) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid)`, [entryId, row.started_at, row.ended_at, start, end, reason, actor?.userId || null]);
    await client.query(`UPDATE project_time_entries SET started_at = $2, ended_at = $3, duration_minutes = $4, updated_at = NOW() WHERE id = $1::uuid`, [entryId, start, end, Math.round((end - start) / 60000)]); await client.query('COMMIT'); await audit(actor, 'update', 'project_time_entry', entryId, `Corrected project time: ${reason}`, row.ongoing_job_id); return { ok: true };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
}
