import db from '../db/index.js';

const RESOURCE_MODELS = {};

export function registerRevisionModel(resourceType, model) {
  RESOURCE_MODELS[resourceType] = model;
}

function leanDoc(doc) {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
}

function diffFields(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes = [];
  for (const field of keys) {
    if (field === '_id' || field === '__v' || field === 'updatedAt' || field === 'createdAt') continue;
    const from = before[field];
    const to = after[field];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to });
    }
  }
  return changes;
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

  try {
    const res = await db.query(
      `INSERT INTO audit_events (action_name, user_name, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, created_at`,
      [
        changeType || 'update',
        changedBy,
        resourceType,
        String(resourceId),
        JSON.stringify({ before: beforeLean, after: afterLean, changes: diffFields(beforeLean || {}, afterLean || {}) })
      ]
    );
    return res.rows[0];
  } catch (err) {
    console.warn('[RevisionService] Failed to capture revision in PG:', err.message);
    return null;
  }
}

export async function listRevisions(resourceType, resourceId, { page = 1, limit = 30 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const res = await db.query(
    `SELECT id, action_name AS change_type, user_name AS changed_by, payload, created_at
     FROM audit_events
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [resourceType, String(resourceId), safeLimit, offset]
  );

  const countRes = await db.query(
    `SELECT COUNT(*) FROM audit_events WHERE entity_type = $1 AND entity_id = $2`,
    [resourceType, String(resourceId)]
  );

  const total = Number(countRes.rows[0]?.count) || 0;

  return { items: res.rows, total, page: safePage, limit: safeLimit };
}

export async function listRecentRevisions({ limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const res = await db.query(
    `SELECT id, action_name AS change_type, user_name AS changed_by, entity_type, entity_id, payload, created_at
     FROM audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return res.rows;
}

export async function getRevisionById(id) {
  const res = await db.query(
    `SELECT id, action_name AS change_type, user_name AS changed_by, entity_type, entity_id, payload, created_at
     FROM audit_events
     WHERE id::text = $1 LIMIT 1`,
    [String(id)]
  );
  if (!res.rows.length) {
    const error = new Error('Revision not found.');
    error.status = 404;
    throw error;
  }
  return res.rows[0];
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
