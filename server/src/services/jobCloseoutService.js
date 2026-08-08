import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('job-closeout');
export const EVIDENCE_TYPES = Object.freeze(['final_photo', 'before_photo', 'installation_photo', 'handover_document', 'snag_photo', 'other']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f-]{36}$/i.test(result) ? result : null; }
function timestamp(value) { if (!value) return null; const result = new Date(value); return Number.isNaN(result.getTime()) ? null : result; }
function safeName(value) { return path.basename(String(value || 'evidence')).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180); }
async function assertJob(client, jobId) { const result = await client.query(`SELECT id FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL`, [jobId]); if (!result.rows.length) throw Object.assign(new Error('Ongoing Job not found.'), { status: 404 }); }
async function audit(actor, action, resource, resourceId, summary, jobId) { await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource, resourceId, summary, metadata: { ongoingJobId: jobId } }); }

export async function getJobCloseout(jobId) {
  const [closeout, evidence, snags, workPackages, locations, users] = await Promise.all([
    db.query(`SELECT jc.id, jc.handover_at AS "handoverAt", jc.handover_contact_person_id AS "handoverContactPersonId", jc.handover_note AS "handoverNote", jc.completion_summary AS "completionSummary", jc.updated_at AS "updatedAt" FROM job_closeouts jc WHERE jc.ongoing_job_id = $1::uuid`, [jobId]),
    db.query(`SELECT e.id, e.evidence_type AS type, e.title, e.file_name AS "fileName", e.public_url AS url, e.mime_type AS "mimeType", e.size_bytes AS "sizeBytes", e.checksum_sha256 AS checksum, e.captured_at AS "capturedAt", e.created_at AS "createdAt", COALESCE(u.name, 'EGS Team') AS "uploadedBy" FROM job_closeout_evidence e LEFT JOIN users u ON u.id = e.uploaded_by_user_id WHERE e.ongoing_job_id = $1::uuid ORDER BY e.created_at DESC`, [jobId]),
    db.query(`SELECT s.id, s.work_package_id AS "workPackageId", jsl.title AS "workPackageTitle", s.location_id AS "locationId", jl.name AS "locationName", s.title, s.description, s.severity, s.status, s.owner_user_id AS "ownerUserId", u.name AS "ownerName", s.due_at AS "dueAt", s.resolution, s.resolved_at AS "resolvedAt", s.created_at AS "createdAt" FROM job_snags s LEFT JOIN job_scope_lines jsl ON jsl.id = s.work_package_id LEFT JOIN job_locations jl ON jl.id = s.location_id LEFT JOIN users u ON u.id = s.owner_user_id WHERE s.ongoing_job_id = $1::uuid ORDER BY CASE s.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, s.due_at NULLS LAST, s.created_at DESC`, [jobId]),
    db.query(`SELECT id, title FROM job_scope_lines WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY display_order`, [jobId]),
    db.query(`SELECT id, name FROM job_locations WHERE ongoing_job_id = $1::uuid AND archived_at IS NULL ORDER BY name`, [jobId]),
    db.query(`SELECT id, name FROM users WHERE is_active = TRUE ORDER BY name`),
  ]);
  const finalPhotoCount = evidence.rows.filter((item) => item.type === 'final_photo').length; const openSnagCount = snags.rows.filter((item) => ['open', 'in_progress'].includes(item.status)).length;
  return { closeout: closeout.rows[0] || null, evidence: evidence.rows, snags: snags.rows, workPackages: workPackages.rows, locations: locations.rows, users: users.rows, evidenceTypes: EVIDENCE_TYPES, readiness: { finalPhotoCount, finalPhotoReady: finalPhotoCount > 0, handoverReady: Boolean(closeout.rows[0]?.handoverAt), openSnagCount, readyForJobDone: finalPhotoCount > 0 } };
}

export async function saveJobHandover(jobId, payload = {}, actor = {}) {
  const client = await db.getClient(); try { await assertJob(client, jobId); const result = await client.query(`INSERT INTO job_closeouts (ongoing_job_id, handover_at, handover_contact_person_id, handover_note, completion_summary, created_by_user_id, updated_by_user_id) VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6::uuid,$6::uuid) ON CONFLICT (ongoing_job_id) DO UPDATE SET handover_at = EXCLUDED.handover_at, handover_contact_person_id = EXCLUDED.handover_contact_person_id, handover_note = EXCLUDED.handover_note, completion_summary = EXCLUDED.completion_summary, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = NOW() RETURNING id`, [jobId, timestamp(payload.handoverAt), uuid(payload.handoverContactPersonId), text(payload.handoverNote), text(payload.completionSummary), actor?.userId || null]); await audit(actor, 'update', 'job_closeout', result.rows[0].id, 'Updated physical handover record', jobId); return result.rows[0]; } finally { client.release(); }
}

export async function uploadCloseoutEvidence(jobId, payload = {}, files = [], actor = {}) {
  const type = EVIDENCE_TYPES.includes(payload.type) ? payload.type : null; if (!type || !files.length) throw Object.assign(new Error('Evidence type and at least one file are required.'), { status: 400 }); if (type === 'final_photo' && files.some((file) => !IMAGE_TYPES.has(String(file.mimetype || '').toLowerCase()))) throw Object.assign(new Error('Final delivery evidence must be an image.'), { status: 400 });
  const client = await db.getClient(); const written = []; try { await client.query('BEGIN'); await assertJob(client, jobId); const directory = path.join(uploadRoot, String(jobId)); await fs.mkdir(directory, { recursive: true }); const ids = [];
    for (const file of files) { const storedName = `${crypto.randomUUID()}-${safeName(file.originalname)}`; const storagePath = path.join(directory, storedName); await fs.writeFile(storagePath, file.buffer, { flag: 'wx' }); written.push(storagePath); const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex'); const result = await client.query(`INSERT INTO job_closeout_evidence (ongoing_job_id, evidence_type, title, file_name, storage_path, public_url, mime_type, size_bytes, checksum_sha256, captured_at, uploaded_by_user_id) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::uuid) RETURNING id`, [jobId, type, text(payload.title), file.originalname, storagePath, `/uploads/job-closeout/${jobId}/${storedName}`, file.mimetype || null, file.size || file.buffer.length, checksum, timestamp(payload.capturedAt), actor?.userId || null]); ids.push(result.rows[0].id); }
    await client.query('COMMIT'); await audit(actor, 'create', 'job_closeout_evidence', ids[0], `Uploaded ${files.length} ${type.replaceAll('_', ' ')} file(s)`, jobId); return { ids };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); await Promise.all(written.map((filePath) => fs.unlink(filePath).catch(() => {}))); throw error; } finally { client.release(); }
}

export async function createJobSnag(jobId, payload = {}, actor = {}) {
  const title = text(payload.title); if (!title) throw Object.assign(new Error('Snag title is required.'), { status: 400 }); const severity = ['low','normal','high','critical'].includes(payload.severity) ? payload.severity : 'normal';
  const workPackageId = uuid(payload.workPackageId); const locationId = uuid(payload.locationId);
  if (workPackageId && !(await db.query(`SELECT id FROM job_scope_lines WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [workPackageId, jobId])).rows.length) throw Object.assign(new Error('Work package does not belong to this Job.'), { status: 400 });
  if (locationId && !(await db.query(`SELECT id FROM job_locations WHERE id = $1::uuid AND ongoing_job_id = $2::uuid AND archived_at IS NULL`, [locationId, jobId])).rows.length) throw Object.assign(new Error('Location does not belong to this Job.'), { status: 400 });
  const result = await db.query(`INSERT INTO job_snags (ongoing_job_id, work_package_id, location_id, title, description, severity, owner_user_id, due_at, created_by_user_id) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid,$8,$9::uuid) RETURNING id`, [jobId, uuid(payload.workPackageId), uuid(payload.locationId), title, text(payload.description), severity, uuid(payload.ownerUserId), timestamp(payload.dueAt), actor?.userId || null]); await audit(actor, 'create', 'job_snag', result.rows[0].id, `Created snag: ${title}`, jobId); return result.rows[0];
}

export async function updateJobSnag(jobId, snagId, payload = {}, actor = {}) {
  const current = await db.query(`SELECT * FROM job_snags WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [snagId, jobId]); if (!current.rows.length) throw Object.assign(new Error('Snag not found.'), { status: 404 }); const row = current.rows[0]; const status = ['open','in_progress','resolved','accepted'].includes(payload.status) ? payload.status : row.status; const resolution = Object.hasOwn(payload, 'resolution') ? text(payload.resolution) : row.resolution; if (['resolved','accepted'].includes(status) && !resolution) throw Object.assign(new Error('Resolution is required before resolving a snag.'), { status: 400 });
  await db.query(`UPDATE job_snags SET status = $3, resolution = $4, owner_user_id = $5::uuid, due_at = $6, resolved_at = CASE WHEN $3 IN ('resolved','accepted') THEN COALESCE(resolved_at,NOW()) ELSE NULL END, updated_at = NOW() WHERE id = $1::uuid AND ongoing_job_id = $2::uuid`, [snagId, jobId, status, resolution, Object.hasOwn(payload, 'ownerUserId') ? uuid(payload.ownerUserId) : row.owner_user_id, Object.hasOwn(payload, 'dueAt') ? timestamp(payload.dueAt) : row.due_at]); await audit(actor, 'update', 'job_snag', snagId, `Snag updated to ${status}`, jobId); return { ok: true };
}
