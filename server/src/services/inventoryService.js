import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import db from '../db/index.js';
import { writeAuditLog } from './auditService.js';
import { captureRevision } from './revisionService.js';
import { getUploadSubdir } from '../utils/uploadPath.js';

const uploadRoot = getUploadSubdir('inventory');
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const PHOTO_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif' };

function text(value) { return String(value ?? '').trim() || null; }
function uuid(value) { const result = text(value); return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result) ? result : null; }
function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
}

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
    db.query(`SELECT i.id, i.slug, i.name, i.photo_url AS "photoUrl", i.current_status AS "status", i.current_job_id AS "jobId", oj.job_number AS "jobNumber", oj.title AS "jobTitle", i.label_printed_at AS "labelPrintedAt", i.created_at AS "createdAt"
      FROM inventory_items i LEFT JOIN ongoing_jobs oj ON oj.id = i.current_job_id
      WHERE i.status = 'active' AND i.deleted_at IS NULL AND i.slug IS NOT NULL ORDER BY i.created_at DESC`),
    db.query(`SELECT oj.id, oj.job_number AS "jobNumber", oj.title AS name FROM ongoing_jobs oj
      WHERE oj.deleted_at IS NULL AND COALESCE(oj.summary_stage, '') NOT IN ('Job Done','Job Lost','Closed Won','Closed Lost')
      ORDER BY oj.updated_at DESC NULLS LAST`),
  ]);
  return { items: items.rows, jobs: jobs.rows };
}

export async function listRecentlyRemovedItems() {
  const result = await db.query(
    `SELECT id, slug, name, photo_url AS "photoUrl", deleted_at AS "deletedAt"
     FROM inventory_items WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 100`,
  );
  return result.rows;
}

export async function createWarehouseItem(payload = {}, photo, actor = {}) {
  const baseName = text(payload.name);
  if (!baseName) throw Object.assign(new Error('Item name is required.'), { status: 400 });
  if (!photo) throw Object.assign(new Error('A photo is required.'), { status: 400 });
  const extension = PHOTO_EXTENSIONS[String(photo.mimetype || '').toLowerCase()];
  if (!extension) throw Object.assign(new Error('Photo must be a JPG, PNG, WebP, HEIC, or HEIF image.'), { status: 400 });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const slug = await generateUniqueSlug(client);
    const name = await nextDisplayName(client, baseName);
    const directory = path.join(uploadRoot, slug);
    await fs.mkdir(directory, { recursive: true });
    const fileName = `photo${extension}`;
    await fs.writeFile(path.join(directory, fileName), photo.buffer, { flag: 'wx' });
    const photoUrl = `/uploads/inventory/${slug}/${fileName}`;
    const result = await client.query(
      `INSERT INTO inventory_items (sku, barcode, name, tracking_mode, status, slug, photo_url, current_status, created_by_user_id)
       VALUES ($1, $1, $2, 'quantity_reusable', 'active', $1, $3, 'warehouse', $4::uuid)
       RETURNING id, slug, name, photo_url AS "photoUrl", current_status AS "status"`,
      [slug, name, photoUrl, actor?.userId || null],
    );
    await client.query('COMMIT');
    await audit(actor, 'create', result.rows[0].id, `Registered warehouse item: ${name}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function markItemsPrinted(itemIds = [], actor = {}) {
  const ids = [...new Set((Array.isArray(itemIds) ? itemIds : []).map(uuid).filter(Boolean))];
  if (!ids.length) throw Object.assign(new Error('No items were selected.'), { status: 400 });
  const result = await db.query(
    `UPDATE inventory_items SET label_printed_at = NOW(), updated_at = NOW() WHERE id = ANY($1::uuid[]) AND status = 'active' AND deleted_at IS NULL RETURNING id`,
    [ids],
  );
  await audit(actor, 'update', null, `Marked ${result.rows.length} warehouse item label(s) as printed`);
  return { ok: true, updated: result.rows.length };
}

export async function sendItemToJob(itemId, jobId, actor = {}) {
  const id = uuid(itemId);
  const job = uuid(jobId);
  if (!id || !job) throw Object.assign(new Error('Item and Job are required.'), { status: 400 });
  const jobRow = await db.query(`SELECT title FROM ongoing_jobs WHERE id = $1::uuid AND deleted_at IS NULL`, [job]);
  if (!jobRow.rows.length) throw Object.assign(new Error('Job not found.'), { status: 404 });
  const result = await db.query(
    `UPDATE inventory_items SET current_status = 'job', current_job_id = $2::uuid, updated_at = NOW() WHERE id = $1::uuid AND status = 'active' AND deleted_at IS NULL RETURNING id, name`,
    [id, job],
  );
  if (!result.rows.length) throw Object.assign(new Error('Item not found.'), { status: 404 });
  await audit(actor, 'update', id, `Sent ${result.rows[0].name} to ${jobRow.rows[0].title}`, job);
  return { ok: true };
}

export async function returnItemToWarehouse(itemId, actor = {}) {
  const id = uuid(itemId);
  if (!id) throw Object.assign(new Error('Item is required.'), { status: 400 });
  const result = await db.query(
    `UPDATE inventory_items SET current_status = 'warehouse', current_job_id = NULL, updated_at = NOW() WHERE id = $1::uuid AND status = 'active' AND deleted_at IS NULL RETURNING id, name`,
    [id],
  );
  if (!result.rows.length) throw Object.assign(new Error('Item not found.'), { status: 404 });
  await audit(actor, 'update', id, `Returned ${result.rows[0].name} to the warehouse`);
  return { ok: true };
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
  await audit(actor, 'delete', id, `Removed ${result.rows[0].name} from the warehouse tracker (photo kept for 60 days)`);
  return { ok: true };
}

export async function restoreWarehouseItem(itemId, actor = {}) {
  const id = uuid(itemId);
  if (!id) throw Object.assign(new Error('Item is required.'), { status: 400 });
  const result = await db.query(
    `UPDATE inventory_items SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() WHERE id = $1::uuid AND deleted_at IS NOT NULL RETURNING *`,
    [id],
  );
  if (!result.rows.length) throw Object.assign(new Error('Removed item not found (or its photo has already been purged).'), { status: 404 });
  if (!result.rows[0].photo_url) throw Object.assign(new Error('This item’s photo was purged after 60 days and can no longer be restored automatically — re-add it with a new photo.'), { status: 410 });
  await captureRevision({ resourceType: 'inventory_item', resourceId: id, before: null, after: result.rows[0], changeType: 'restore', actor });
  await audit(actor, 'update', id, `Restored ${result.rows[0].name} to the warehouse tracker`);
  return { ok: true };
}

export async function getItemQrSvg(slug) {
  const clean = text(slug);
  if (!clean) throw Object.assign(new Error('Item code is required.'), { status: 400 });
  const item = await db.query(`SELECT id, name FROM inventory_items WHERE slug = $1 AND status = 'active' AND deleted_at IS NULL`, [clean]);
  if (!item.rows.length) throw Object.assign(new Error('Item not found.'), { status: 404 });
  const name = item.rows[0].name;
  const targetUrl = `${CLIENT_URL}/admin/crm/inventory/i/${clean}`;
  const qrSvg = (await QRCode.toString(targetUrl, { type: 'svg', errorCorrectionLevel: 'H', margin: 0 })).trim();
  const bodyMatch = qrSvg.match(/^<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/);
  const qrViewBox = bodyMatch ? bodyMatch[1] : '0 0 33 33';
  const qrBody = bodyMatch ? bodyMatch[2] : qrSvg;

  const width = 200;
  const height = 240;
  const displayName = name.length > 26 ? `${name.slice(0, 25)}…` : name;
  const nameFontSize = name.length > 18 ? 12 : 15;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <svg x="20" y="14" width="160" height="160" viewBox="${qrViewBox}" shape-rendering="crispEdges">${qrBody}</svg>
  <text x="${width / 2}" y="196" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${nameFontSize}" font-weight="700" fill="#111111">${escapeXml(displayName)}</text>
  <text x="${width / 2}" y="220" text-anchor="middle" font-family="'Courier New', monospace" font-size="12" fill="#666666">${escapeXml(clean)}</text>
</svg>`;
}

export async function findItemBySlug(slug) {
  const clean = text(slug);
  if (!clean) return null;
  const result = await db.query(
    `SELECT i.id, i.slug, i.name, i.photo_url AS "photoUrl", i.current_status AS "status", i.current_job_id AS "jobId", oj.title AS "jobTitle"
     FROM inventory_items i LEFT JOIN ongoing_jobs oj ON oj.id = i.current_job_id WHERE i.slug = $1 AND i.status = 'active' AND i.deleted_at IS NULL`,
    [clean],
  );
  return result.rows[0] || null;
}
