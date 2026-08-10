import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { captureRevision } from './revisionService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('inventory');
const PHOTO_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif' };

function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result) ? result : null; }

async function audit(actor, action, resourceId, summary, jobId = null) {
  await writeAuditLog({ userId: actor?.userId, userDisplayName: actor?.displayName || 'EGS Team', action, resource: 'inventory_item', resourceId, summary, metadata: jobId ? { ongoingJobId: jobId } : {} });
}

async function generateUniqueSlug(client) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = crypto.randomBytes(4).toString('hex');
    const existing = await client.query(`SELECT 1 FROM inventory_items WHERE slug = $1`, [slug]);
    if (!existing.rows.length) return slug;
  }
  throw Object.assign(new Error('Could not generate a unique item code, please try again.'), { status: 500 });
}

async function nextDisplayName(client, baseName) {
  const pattern = `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\([0-9]+\\))?$`;
  const existing = await client.query(`SELECT name FROM inventory_items WHERE status = 'active' AND deleted_at IS NULL AND name ~* $1`, [pattern]);
  if (!existing.rows.length) return baseName;
  let highest = 1;
  for (const row of existing.rows) {
    const match = row.name.match(/\((\d+)\)$/);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${baseName} (${highest + 1})`;
}

export async function listWarehouseItems() {
  const [items, jobs] = await Promise.all([
    db.query(`SELECT i.id, i.slug, i.name, i.quantity, i.notes, i.photo_url AS "photoUrl", i.photo_urls AS "photoUrls", i.current_status AS "status", i.current_job_id AS "jobId", oj.job_number AS "jobNumber", oj.title AS "jobTitle", i.created_at AS "createdAt"
      FROM inventory_items i LEFT JOIN ongoing_jobs oj ON oj.id = i.current_job_id
      WHERE i.status = 'active' AND i.deleted_at IS NULL ORDER BY i.created_at DESC`),
    db.query(`SELECT oj.id, oj.job_number AS "jobNumber", oj.title AS name FROM ongoing_jobs oj
      WHERE oj.deleted_at IS NULL AND COALESCE(oj.summary_stage, '') NOT IN ('Job Done','Job Lost','Closed Won','Closed Lost')
      ORDER BY oj.updated_at DESC NULLS LAST`),
  ]);
  return { items: items.rows, jobs: jobs.rows };
}

export async function listRecentlyRemovedItems() {
  const result = await db.query(
    `SELECT id, slug, name, quantity, notes, photo_url AS "photoUrl", photo_urls AS "photoUrls", deleted_at AS "deletedAt"
     FROM inventory_items WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 100`,
  );
  return result.rows;
}

export async function createWarehouseItem(payload = {}, photos = [], actor = {}) {
  const baseName = text(payload.name);
  if (!baseName) throw Object.assign(new Error('Item name is required.'), { status: 400 });

  const rawPhotos = Array.isArray(photos) ? photos : (photos ? [photos] : []);
  if (!rawPhotos.length) throw Object.assign(new Error('At least 1 photo is required.'), { status: 400 });

  for (const photo of rawPhotos) {
    const extension = PHOTO_EXTENSIONS[String(photo.mimetype || '').toLowerCase()];
    if (!extension) throw Object.assign(new Error('Photos must be JPG, PNG, WebP, HEIC, or HEIF images.'), { status: 400 });
  }

  const quantity = Math.max(1, parseInt(payload.quantity, 10) || 1);
  const notes = text(payload.notes);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const slug = await generateUniqueSlug(client);
    const name = await nextDisplayName(client, baseName);
    const directory = path.join(uploadRoot, slug);
    await fs.mkdir(directory, { recursive: true });

    const photoUrls = [];
    for (let i = 0; i < rawPhotos.length; i += 1) {
      const photo = rawPhotos[i];
      const extension = PHOTO_EXTENSIONS[String(photo.mimetype || '').toLowerCase()];
      const fileName = `photo_${i}${extension}`;
      await fs.writeFile(path.join(directory, fileName), photo.buffer, { flag: 'w' });
      photoUrls.push(`/uploads/inventory/${slug}/${fileName}`);
    }

    const primaryPhotoUrl = photoUrls[0] || null;

    const result = await client.query(
      `INSERT INTO inventory_items (sku, barcode, name, quantity, notes, tracking_mode, status, slug, photo_url, photo_urls, current_status, created_by_user_id)
       VALUES ($1, $1, $2, $3, $4, 'quantity_reusable', 'active', $1, $5, $6, 'warehouse', $7::uuid)
       RETURNING id, slug, name, quantity, notes, photo_url AS "photoUrl", photo_urls AS "photoUrls", current_status AS "status"`,
      [slug, name, quantity, notes, primaryPhotoUrl, photoUrls, actor?.userId || null],
    );
    await client.query('COMMIT');
    await audit(actor, 'create', result.rows[0].id, `Registered warehouse item: ${name} (qty: ${quantity})`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function updateWarehouseItem(itemId, payload = {}, actor = {}) {
  const id = uuid(itemId);
  if (!id) throw Object.assign(new Error('Item ID is required.'), { status: 400 });

  const existing = await db.query(`SELECT * FROM inventory_items WHERE id = $1::uuid AND status = 'active' AND deleted_at IS NULL`, [id]);
  if (!existing.rows.length) throw Object.assign(new Error('Item not found.'), { status: 404 });

  const currentItem = existing.rows[0];
  const name = text(payload.name) || currentItem.name;
  const quantity = payload.quantity !== undefined ? Math.max(1, parseInt(payload.quantity, 10) || 1) : currentItem.quantity;
  const notes = payload.notes !== undefined ? text(payload.notes) : currentItem.notes;
  
  let newStatus = text(payload.status) || currentItem.current_status;
  if (!['warehouse', 'job', 'discarded'].includes(newStatus)) {
    throw Object.assign(new Error('Invalid status. Must be warehouse, job, or discarded.'), { status: 400 });
  }

  let jobId = null;
  if (newStatus === 'job') {
    jobId = uuid(payload.jobId);
    if (!jobId && currentItem.current_job_id) {
      jobId = currentItem.current_job_id;
    }
    if (!jobId) throw Object.assign(new Error('A job must be selected when status is At Job Site.'), { status: 400 });
    const jobRow = await db.query(`SELECT title FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL`, [jobId]);
    if (!jobRow.rows.length) throw Object.assign(new Error('Job not found.'), { status: 404 });
  }

  const result = await db.query(
    `UPDATE inventory_items
     SET name = $2, quantity = $3, notes = $4, current_status = $5, current_job_id = $6, updated_at = NOW()
     WHERE id = $1::uuid AND status = 'active' AND deleted_at IS NULL
     RETURNING id, slug, name, quantity, notes, photo_url AS "photoUrl", photo_urls AS "photoUrls", current_status AS "status", current_job_id AS "jobId"`,
    [id, name, quantity, notes, newStatus, jobId],
  );

  await captureRevision({ resourceType: 'inventory_item', resourceId: id, before: currentItem, after: result.rows[0], changeType: 'update', actor });
  await audit(actor, 'update', id, `Updated inventory item ${name}: status=${newStatus}`, jobId);
  return result.rows[0];
}

export async function sendItemToJob(itemId, jobId, actor = {}) {
  return updateWarehouseItem(itemId, { status: 'job', jobId }, actor);
}

export async function returnItemToWarehouse(itemId, actor = {}) {
  return updateWarehouseItem(itemId, { status: 'warehouse', jobId: null }, actor);
}

export async function deleteWarehouseItem(itemId, actor = {}) {
  const id = uuid(itemId);
  if (!id) throw Object.assign(new Error('Item is required.'), { status: 400 });
  const existing = await db.query(`SELECT * FROM inventory_items WHERE id = $1::uuid AND deleted_at IS NULL`, [id]);
  if (!existing.rows.length) throw Object.assign(new Error('Item not found.'), { status: 404 });
  const result = await db.query(
    `UPDATE inventory_items SET deleted_at = NOW(), deleted_by = $2::uuid, updated_at = NOW() WHERE id = $1::uuid AND deleted_at IS NULL RETURNING id, name`,
    [id, actor?.userId || null],
  );
  await captureRevision({ resourceType: 'inventory_item', resourceId: id, before: existing.rows[0], after: null, changeType: 'soft_delete', actor });
  await audit(actor, 'delete', id, `Removed ${result.rows[0].name} from inventory`);
  return { ok: true };
}

export async function restoreWarehouseItem(itemId, actor = {}) {
  const id = uuid(itemId);
  if (!id) throw Object.assign(new Error('Item is required.'), { status: 400 });
  const result = await db.query(
    `UPDATE inventory_items SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() WHERE id = $1::uuid AND deleted_at IS NOT NULL RETURNING *`,
    [id],
  );
  if (!result.rows.length) throw Object.assign(new Error('Removed item not found (or photo purged).'), { status: 404 });
  await captureRevision({ resourceType: 'inventory_item', resourceId: id, before: null, after: result.rows[0], changeType: 'restore', actor });
  await audit(actor, 'update', id, `Restored ${result.rows[0].name} to inventory`);
  return { ok: true };
}

export async function findItemBySlug(slugOrId) {
  const clean = text(slugOrId);
  if (!clean) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);
  const result = await db.query(
    `SELECT i.id, i.slug, i.name, i.quantity, i.notes, i.photo_url AS "photoUrl", i.photo_urls AS "photoUrls", i.current_status AS "status", i.current_job_id AS "jobId", oj.title AS "jobTitle"
     FROM inventory_items i LEFT JOIN ongoing_jobs oj ON oj.id = i.current_job_id
     WHERE ${isUuid ? 'i.id = $1::uuid' : 'i.slug = $1'} AND i.status = 'active' AND i.deleted_at IS NULL`,
    [clean],
  );
  return result.rows[0] || null;
}

