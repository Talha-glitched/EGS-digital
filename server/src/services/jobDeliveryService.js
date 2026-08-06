import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';

const PROGRESS_VALUES = new Set(['not_started', 'in_progress', 'blocked', 'ready', 'completed']);
const SCOPE_VALUES = new Set(['draft', 'quoted', 'approved', 'changed', 'cancelled']);

function text(value) {
  return value == null ? null : String(value).trim() || null;
}

function date(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function uuid(value) {
  const normalized = text(value);
  return normalized && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

function progress(value, fallback = 'not_started') {
  const normalized = text(value)?.toLowerCase();
  return PROGRESS_VALUES.has(normalized) ? normalized : fallback;
}

function scopeState(value, fallback = 'draft') {
  const normalized = text(value)?.toLowerCase();
  return SCOPE_VALUES.has(normalized) ? normalized : fallback;
}

async function assertJob(jobId) {
  const result = await db.query('SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL', [jobId]);
  if (!result.rows.length) {
    const error = new Error('Ongoing Job not found.');
    error.status = 404;
    throw error;
  }
}

async function audit(actor, action, resource, resourceId, summary, jobId) {
  await writeAuditLog({
    userId: actor?.userId,
    userDisplayName: actor?.displayName || 'EGS Team',
    action,
    resource,
    resourceId,
    summary,
    metadata: { ongoingJobId: jobId },
  });
}

export async function getJobDeliveryWorkspace(jobId) {
  await assertJob(jobId);
  const [services, units, phases, locations, workPackages] = await Promise.all([
    db.query(`SELECT id, stable_code AS code, canonical_label AS label
              FROM service_offerings WHERE active_to IS NULL ORDER BY canonical_label`),
    db.query(`SELECT id, stable_code AS code, label, unit_family AS "unitFamily"
              FROM uoms ORDER BY label`),
    db.query(`SELECT id, name, display_order AS "displayOrder", start_date AS "startDate",
                     deadline, current_progress AS progress, owner_user_id AS "ownerUserId"
              FROM job_phases
              WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL
              ORDER BY display_order, deadline NULLS LAST, created_at`, [jobId]),
    db.query(`SELECT id, name, address, city, role, deadline, current_progress AS progress
              FROM job_locations
              WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL
              ORDER BY deadline NULLS LAST, created_at`, [jobId]),
    db.query(`SELECT jsl.id, jsl.title, jsl.description, jsl.quantity,
                     jsl.current_scope_state AS "scopeState", jsl.current_progress AS progress,
                     jsl.target_date AS "targetDate", jsl.display_order AS "displayOrder",
                     jsl.owner_user_id AS "ownerUserId", jsl.job_phase_id AS "phaseId",
                     jsl.job_location_id AS "locationId", jsl.service_offering_id AS "serviceOfferingId",
                     jsl.uom_id AS "uomId", so.canonical_label AS "serviceLabel", u.label AS "uomLabel"
              FROM job_scope_lines jsl
              LEFT JOIN service_offerings so ON so.id = jsl.service_offering_id
              LEFT JOIN uoms u ON u.id = jsl.uom_id
              WHERE jsl.ongoing_job_id = $1::uuid AND jsl.archived_at IS NULL
              ORDER BY jsl.display_order, jsl.target_date NULLS LAST, jsl.created_at`, [jobId]),
  ]);
  return {
    services: services.rows,
    uoms: units.rows,
    phases: phases.rows,
    locations: locations.rows,
    workPackages: workPackages.rows.map((row) => ({ ...row, quantity: row.quantity == null ? null : Number(row.quantity) })),
    progressValues: [...PROGRESS_VALUES],
    scopeStates: [...SCOPE_VALUES],
  };
}

export async function createJobPhase(jobId, payload = {}, actor = {}) {
  await assertJob(jobId);
  const name = text(payload.name);
  if (!name) {
    const error = new Error('Phase name is required.');
    error.status = 400;
    throw error;
  }
  const result = await db.query(
    `INSERT INTO job_phases (ongoing_job_id, name, display_order, start_date, deadline, current_progress, owner_user_id)
     VALUES ($1::uuid, $2, COALESCE($3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM job_phases WHERE ongoing_job_id = $1::uuid)), $4, $5, $6, $7::uuid)
     RETURNING id, name, display_order AS "displayOrder", start_date AS "startDate", deadline,
               current_progress AS progress, owner_user_id AS "ownerUserId"`,
    [jobId, name, Number(payload.displayOrder) || null, date(payload.startDate), date(payload.deadline), progress(payload.progress), uuid(payload.ownerUserId)],
  );
  await audit(actor, 'create', 'job_phase', result.rows[0].id, `Added phase: ${name}`, jobId);
  return result.rows[0];
}

export async function updateJobPhase(jobId, phaseId, payload = {}, actor = {}) {
  await assertJob(jobId);
  const result = await db.query(
    `UPDATE job_phases SET
       name = COALESCE($3, name), display_order = COALESCE($4, display_order),
       start_date = CASE WHEN $5::boolean THEN $6::date ELSE start_date END,
       deadline = CASE WHEN $7::boolean THEN $8::date ELSE deadline END,
       current_progress = COALESCE($9, current_progress),
       owner_user_id = CASE WHEN $10::boolean THEN $11::uuid ELSE owner_user_id END,
       updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL
     RETURNING id, name, display_order AS "displayOrder", start_date AS "startDate", deadline,
               current_progress AS progress, owner_user_id AS "ownerUserId"`,
    [phaseId, jobId, text(payload.name), Number(payload.displayOrder) || null,
      Object.hasOwn(payload, 'startDate'), date(payload.startDate), Object.hasOwn(payload, 'deadline'), date(payload.deadline),
      payload.progress ? progress(payload.progress) : null, Object.hasOwn(payload, 'ownerUserId'), uuid(payload.ownerUserId)],
  );
  if (!result.rows.length) throw Object.assign(new Error('Phase not found.'), { status: 404 });
  await audit(actor, 'update', 'job_phase', phaseId, `Updated phase: ${result.rows[0].name}`, jobId);
  return result.rows[0];
}

export async function archiveJobPhase(jobId, phaseId, actor = {}) {
  const result = await db.query(
    `UPDATE job_phases SET archived_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL RETURNING id, name`,
    [phaseId, jobId],
  );
  if (!result.rows.length) throw Object.assign(new Error('Phase not found.'), { status: 404 });
  await audit(actor, 'archive', 'job_phase', phaseId, `Archived phase: ${result.rows[0].name}`, jobId);
  return { ok: true };
}

export async function createJobLocation(jobId, payload = {}, actor = {}) {
  await assertJob(jobId);
  const name = text(payload.name);
  if (!name) throw Object.assign(new Error('Location name is required.'), { status: 400 });
  const result = await db.query(
    `INSERT INTO job_locations (ongoing_job_id, name, address, city, role, deadline, current_progress)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, address, city, role, deadline, current_progress AS progress`,
    [jobId, name, text(payload.address), text(payload.city), text(payload.role), date(payload.deadline), progress(payload.progress)],
  );
  await audit(actor, 'create', 'job_location', result.rows[0].id, `Added location: ${name}`, jobId);
  return result.rows[0];
}

export async function updateJobLocation(jobId, locationId, payload = {}, actor = {}) {
  const result = await db.query(
    `UPDATE job_locations SET
       name = COALESCE($3, name),
       address = CASE WHEN $4::boolean THEN $5 ELSE address END,
       city = CASE WHEN $6::boolean THEN $7 ELSE city END,
       role = CASE WHEN $8::boolean THEN $9 ELSE role END,
       deadline = CASE WHEN $10::boolean THEN $11::date ELSE deadline END,
       current_progress = COALESCE($12, current_progress), updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL
     RETURNING id, name, address, city, role, deadline, current_progress AS progress`,
    [locationId, jobId, text(payload.name), Object.hasOwn(payload, 'address'), text(payload.address),
      Object.hasOwn(payload, 'city'), text(payload.city), Object.hasOwn(payload, 'role'), text(payload.role),
      Object.hasOwn(payload, 'deadline'), date(payload.deadline), payload.progress ? progress(payload.progress) : null],
  );
  if (!result.rows.length) throw Object.assign(new Error('Location not found.'), { status: 404 });
  await audit(actor, 'update', 'job_location', locationId, `Updated location: ${result.rows[0].name}`, jobId);
  return result.rows[0];
}

export async function archiveJobLocation(jobId, locationId, actor = {}) {
  const result = await db.query(
    `UPDATE job_locations SET archived_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL RETURNING id, name`,
    [locationId, jobId],
  );
  if (!result.rows.length) throw Object.assign(new Error('Location not found.'), { status: 404 });
  await audit(actor, 'archive', 'job_location', locationId, `Archived location: ${result.rows[0].name}`, jobId);
  return { ok: true };
}

export async function createWorkPackage(jobId, payload = {}, actor = {}) {
  await assertJob(jobId);
  const title = text(payload.title);
  if (!title) throw Object.assign(new Error('Work package title is required.'), { status: 400 });
  const quantity = payload.quantity === '' || payload.quantity == null ? null : Number(payload.quantity);
  const result = await db.query(
    `INSERT INTO job_scope_lines (
       ongoing_job_id, title, description, service_offering_id, uom_id, quantity,
       current_scope_state, current_progress, owner_user_id, job_phase_id,
       job_location_id, target_date, display_order
     ) VALUES ($1::uuid, $2, $3, $4::uuid, $5::uuid, $6, $7, $8, $9::uuid, $10::uuid, $11::uuid, $12,
       COALESCE($13, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM job_scope_lines WHERE ongoing_job_id = $1::uuid)))
     RETURNING id`,
    [jobId, title, text(payload.description), uuid(payload.serviceOfferingId), uuid(payload.uomId),
      Number.isFinite(quantity) ? quantity : null, scopeState(payload.scopeState), progress(payload.progress),
      uuid(payload.ownerUserId), uuid(payload.phaseId), uuid(payload.locationId), date(payload.targetDate), Number(payload.displayOrder) || null],
  );
  await audit(actor, 'create', 'job_work_package', result.rows[0].id, `Added work package: ${title}`, jobId);
  return result.rows[0];
}

export async function updateWorkPackage(jobId, workPackageId, payload = {}, actor = {}) {
  const existing = await db.query(
    'SELECT * FROM job_scope_lines WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL',
    [workPackageId, jobId],
  );
  if (!existing.rows.length) throw Object.assign(new Error('Work package not found.'), { status: 404 });
  const row = existing.rows[0];
  const quantity = Object.hasOwn(payload, 'quantity')
    ? (payload.quantity === '' || payload.quantity == null ? null : Number(payload.quantity))
    : row.quantity;
  const result = await db.query(
    `UPDATE job_scope_lines SET title = $3, description = $4, service_offering_id = $5::uuid,
       uom_id = $6::uuid, quantity = $7, current_scope_state = $8, current_progress = $9,
       owner_user_id = $10::uuid, job_phase_id = $11::uuid, job_location_id = $12::uuid,
       target_date = $13, display_order = $14, updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid RETURNING id`,
    [workPackageId, jobId, text(payload.title) || row.title, Object.hasOwn(payload, 'description') ? text(payload.description) : row.description,
      Object.hasOwn(payload, 'serviceOfferingId') ? uuid(payload.serviceOfferingId) : row.service_offering_id,
      Object.hasOwn(payload, 'uomId') ? uuid(payload.uomId) : row.uom_id,
      quantity == null || quantity === '' ? null : (Number.isFinite(Number(quantity)) ? Number(quantity) : null),
      payload.scopeState ? scopeState(payload.scopeState) : row.current_scope_state,
      payload.progress ? progress(payload.progress) : row.current_progress,
      Object.hasOwn(payload, 'ownerUserId') ? uuid(payload.ownerUserId) : row.owner_user_id,
      Object.hasOwn(payload, 'phaseId') ? uuid(payload.phaseId) : row.job_phase_id,
      Object.hasOwn(payload, 'locationId') ? uuid(payload.locationId) : row.job_location_id,
      Object.hasOwn(payload, 'targetDate') ? date(payload.targetDate) : row.target_date,
      Number(payload.displayOrder) || row.display_order || 1],
  );
  await audit(actor, 'update', 'job_work_package', workPackageId, `Updated work package: ${text(payload.title) || row.title}`, jobId);
  return result.rows[0];
}

export async function archiveWorkPackage(jobId, workPackageId, actor = {}) {
  const result = await db.query(
    `UPDATE job_scope_lines SET archived_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL RETURNING id, title`,
    [workPackageId, jobId],
  );
  if (!result.rows.length) throw Object.assign(new Error('Work package not found.'), { status: 404 });
  await audit(actor, 'archive', 'job_work_package', workPackageId, `Archived work package: ${result.rows[0].title}`, jobId);
  return { ok: true };
}
