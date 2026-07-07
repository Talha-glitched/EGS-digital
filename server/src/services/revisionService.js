import mongoose from 'mongoose';
import { RecordRevision } from '../models/RecordRevision.js';

const RESOURCE_MODELS = {};

export function registerRevisionModel(resourceType, model) {
  RESOURCE_MODELS[resourceType] = model;
}

function assertDb() {
  if (!mongoose.connection?.readyState) {
    const error = new Error('Database not available.');
    error.status = 503;
    throw error;
  }
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

async function nextRevisionNumber(resourceType, resourceId) {
  const latest = await RecordRevision.findOne({ resourceType, resourceId })
    .sort({ revisionNumber: -1 })
    .select('revisionNumber')
    .lean();
  return (latest?.revisionNumber || 0) + 1;
}

export async function captureRevision({
  resourceType,
  resourceId,
  before = null,
  after = null,
  changeType,
  actor = {},
  rollbackOfRevisionId = null,
}) {
  assertDb();
  const beforeLean = leanDoc(before);
  const afterLean = leanDoc(after);
  const revisionNumber = await nextRevisionNumber(resourceType, String(resourceId));

  return RecordRevision.create({
    resourceType,
    resourceId: String(resourceId),
    revisionNumber,
    snapshot: beforeLean,
    snapshotAfter: afterLean,
    changeType,
    changedFields: diffFields(beforeLean || {}, afterLean || {}),
    changedBy: actor.displayName || 'admin',
    userId: actor.userId || null,
    rollbackOfRevisionId,
  });
}

export async function listRevisions(resourceType, resourceId, { page = 1, limit = 30 } = {}) {
  assertDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const query = { resourceType, resourceId: String(resourceId) };
  const [items, total] = await Promise.all([
    RecordRevision.find(query).sort({ revisionNumber: -1 }).skip(skip).limit(safeLimit).lean(),
    RecordRevision.countDocuments(query),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
}

export async function listRecentRevisions({ limit = 50 } = {}) {
  assertDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return RecordRevision.find().sort({ createdAt: -1 }).limit(safeLimit).lean();
}

export async function getRevisionById(id) {
  assertDb();
  const revision = await RecordRevision.findById(id).lean();
  if (!revision) {
    const error = new Error('Revision not found.');
    error.status = 404;
    throw error;
  }
  return revision;
}

export async function rollbackToRevision(revisionId, actor = {}) {
  assertDb();
  const revision = await RecordRevision.findById(revisionId).lean();
  if (!revision) {
    const error = new Error('Revision not found.');
    error.status = 404;
    throw error;
  }

  const Model = RESOURCE_MODELS[revision.resourceType];
  if (!Model) {
    const error = new Error(`Rollback not supported for resource type: ${revision.resourceType}`);
    error.status = 400;
    throw error;
  }

  const targetState = revision.snapshotAfter || revision.snapshot;
  if (!targetState) {
    const error = new Error('Revision has no restorable snapshot.');
    error.status = 400;
    throw error;
  }

  const existing = await Model.findById(revision.resourceId);
  const before = leanDoc(existing);

  const payload = { ...targetState };
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;

  let restored;
  if (existing) {
    Object.assign(existing, payload);
    if (payload.deletedAt === undefined && existing.deletedAt) {
      existing.deletedAt = null;
      existing.deletedBy = null;
    }
    restored = await existing.save();
  } else {
    restored = await Model.create({ ...payload, _id: revision.resourceId });
  }

  await captureRevision({
    resourceType: revision.resourceType,
    resourceId: revision.resourceId,
    before,
    after: restored,
    changeType: 'rollback',
    actor,
    rollbackOfRevisionId: revision._id,
  });

  return restored;
}

export function buildDeleteLabel(resourceType, doc) {
  if (!doc) return `Deleted ${resourceType}`;
  if (resourceType === 'task') return `Deleted task: ${doc.title || 'Untitled'}`;
  if (resourceType === 'lead') return `Deleted contact: ${doc.name || doc.email || 'Contact'}`;
  if (resourceType === 'company') return `Deleted company: ${doc.companyName || 'Company'}`;
  if (resourceType === 'opportunity') return `Deleted opportunity: ${doc.name || 'Opportunity'}`;
  if (resourceType === 'interaction') return `Deleted interaction: ${doc.subject || doc.type || 'Interaction'}`;
  if (resourceType === 'sequence') return `Deleted sequence: ${doc.name || 'Sequence'}`;
  if (resourceType === 'project') return `Deleted campaign: ${doc.projectName || 'Campaign'}`;
  return `Deleted ${resourceType}`;
}

export async function softDeleteRecord({
  Model,
  resourceType,
  id,
  actor = {},
}) {
  assertDb();
  const record = await Model.findById(id);
  if (!record || record.deletedAt) {
    const error = new Error(`${resourceType} not found.`);
    error.status = 404;
    throw error;
  }

  const before = leanDoc(record);
  const deletedAt = new Date();
  const deletedBy = actor.displayName || 'admin';
  const update = { deletedAt, deletedBy };
  if (typeof record.version === 'number') {
    update.version = record.version + 1;
  }

  const updated = await Model.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: false },
  );
  if (!updated) {
    const error = new Error(`${resourceType} not found.`);
    error.status = 404;
    throw error;
  }

  await captureRevision({
    resourceType,
    resourceId: id,
    before,
    after: updated,
    changeType: 'soft_delete',
    actor,
  });

  return {
    ok: true,
    id: String(updated._id),
    resourceType,
    label: buildDeleteLabel(resourceType, updated),
  };
}

export async function restoreRecord({ Model, resourceType, id, actor = {} }) {
  assertDb();
  const record = await Model.findById(id);
  if (!record) {
    const error = new Error(`${resourceType} not found.`);
    error.status = 404;
    throw error;
  }

  const before = leanDoc(record);
  const update = { deletedAt: null, deletedBy: null };
  if (typeof record.version === 'number') {
    update.version = record.version + 1;
  }

  const updated = await Model.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: false },
  );
  if (!updated) {
    const error = new Error(`${resourceType} not found.`);
    error.status = 404;
    throw error;
  }

  await captureRevision({
    resourceType,
    resourceId: id,
    before,
    after: updated,
    changeType: 'restore',
    actor,
  });

  return updated;
}
