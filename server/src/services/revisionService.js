import db from '../db/index.js';

const RESOURCE_MODELS = {};

export function registerRevisionModel(resourceType, model) {
  RESOURCE_MODELS[resourceType] = model;
}

function leanDoc(doc) {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

function isUuid(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

function diffFields(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changes = [];
  for (const field of keys) {
    if (field === '_id' || field === '__v' || field === 'updatedAt' || field === 'createdAt') continue;
    const from = before ? before[field] : undefined;
    const to = after ? after[field] : undefined;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to });
    }
  }
  return changes;
}

function formatRevisionRow(row) {
  if (!row) return null;
  const payload = row.payload || {};
  const after = payload.snapshotAfter || payload.after || payload.snapshot || null;
  const before = payload.snapshotBefore || payload.before || null;
  const snapshot = after || before || {};
  return {
    id: row.id,
    _id: row.id,
    changeType: row.action || payload.changeType || 'update',
    changedBy: payload.changedBy || payload.userDisplayName || 'admin',
    resourceType: row.entity_type || payload.resourceType || '',
    resourceId: row.entity_id || payload.resourceId || '',
    snapshotAfter: after,
    snapshotBefore: before,
    snapshot,
    changes: payload.changes || diffFields(before || {}, after || {}),
    revisionNumber: payload.revisionNumber || 1,
    createdAt: row.created_at,
    created_at: row.created_at,
    payload,
  };
}

export async function captureRevision({
  resourceType,
  resourceId,
  before = null,
  after = null,
  changeType,
  actor = {},
}) {
  const beforeLean = leanDoc(before);
  const afterLean = leanDoc(after);
  const changedBy = actor.displayName || 'admin';
  const userId = isUuid(actor?.userId) ? actor.userId : null;
  const entityUuid = isUuid(resourceId) ? resourceId : null;

  try {
    const res = await db.query(
      `INSERT INTO audit_events (action, user_id, entity_type, entity_id, payload)
       VALUES ($1, $2::uuid, $3, $4::uuid, $5::jsonb)
       RETURNING id, action, user_id, entity_type, entity_id, payload, created_at`,
      [
        changeType || 'update',
        userId,
        resourceType,
        entityUuid,
        JSON.stringify({
          changedBy,
          resourceId: String(resourceId || ''),
          resourceType,
          changeType: changeType || 'update',
          before: beforeLean,
          after: afterLean,
          snapshot: afterLean || beforeLean,
          snapshotAfter: afterLean,
          snapshotBefore: beforeLean,
          changes: diffFields(beforeLean || {}, afterLean || {})
        })
      ]
    );
    return formatRevisionRow(res.rows[0]);
  } catch (err) {
    console.warn('[RevisionService] Failed to capture revision in PG:', err.message);
    return null;
  }
}

export async function listRevisions(resourceType, resourceId, { page = 1, limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const validUuid = isUuid(resourceId);

  const res = await db.query(
    `SELECT id, action, user_id, entity_type, entity_id, payload, created_at
     FROM audit_events
     WHERE entity_type = $1 ${validUuid ? 'AND entity_id = $2::uuid' : 'AND (payload->>\'resourceId\' = $2 OR entity_id::text = $2)'}
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [resourceType, String(resourceId), safeLimit, offset]
  );

  const countRes = await db.query(
    `SELECT COUNT(*) FROM audit_events WHERE entity_type = $1 ${validUuid ? 'AND entity_id = $2::uuid' : 'AND (payload->>\'resourceId\' = $2 OR entity_id::text = $2)'}`,
    [resourceType, String(resourceId)]
  );

  const total = Number(countRes.rows[0]?.count) || 0;

  return { items: res.rows.map(formatRevisionRow), total, page: safePage, limit: safeLimit };
}

export async function listRecentRevisions({ limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const res = await db.query(
    `SELECT id, action, user_id, entity_type, entity_id, payload, created_at
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return res.rows.map(formatRevisionRow);
}

export async function getRevisionById(id) {
  if (!isUuid(id)) {
    const error = new Error('Invalid revision ID format.');
    error.status = 400;
    throw error;
  }
  const res = await db.query(
    `SELECT id, action, user_id, entity_type, entity_id, payload, created_at
     FROM audit_events
     WHERE id = $1::uuid LIMIT 1`,
    [id]
  );
  if (!res.rows.length) {
    const error = new Error('Revision not found.');
    error.status = 404;
    throw error;
  }
  return formatRevisionRow(res.rows[0]);
}

export async function rollbackToRevision(revisionId, actor = {}) {
  const revision = await getRevisionById(revisionId);
  return revision;
}

export function buildDeleteLabel(resourceType, doc) {
  if (!doc) return `Deleted ${resourceType}`;
  if (resourceType === 'task') return `Deleted task: ${doc.title || 'Untitled'}`;
  if (resourceType === 'lead') return `Deleted contact: ${doc.name || doc.email || 'Contact'}`;
  if (resourceType === 'company') return `Deleted company: ${doc.companyName || 'Company'}`;
  return `Deleted ${resourceType}`;
}

export async function softDeleteRecord({ resourceType, id, actor = {} }) {
  await captureRevision({
    resourceType,
    resourceId: id,
    changeType: 'soft_delete',
    actor,
  });

  return {
    ok: true,
    id: String(id),
    resourceType,
    label: buildDeleteLabel(resourceType, { id }),
  };
}

export async function restoreRecord({ resourceType, id, actor = {} }) {
  await captureRevision({
    resourceType,
    resourceId: id,
    changeType: 'restore',
    actor,
  });

  return { id, restored: true };
}

