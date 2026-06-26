import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';

function assertDb() {
  if (!mongoose.connection?.readyState) {
    const error = new Error('Database not available.');
    error.status = 503;
    throw error;
  }
}

export async function writeAuditLog({
  userId = null,
  userDisplayName = 'System',
  action,
  resource = '',
  resourceId = null,
  summary = '',
  changes = [],
  metadata = {},
  ip = null,
  userAgent = null,
}) {
  assertDb();
  return AuditLog.create({
    userId,
    userDisplayName,
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : null,
    summary,
    changes,
    metadata,
    ip,
    userAgent,
  });
}

export async function listAuditLogs({
  userId,
  action,
  resource,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) {
  assertDb();
  const query = {};
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, page: safePage, limit: safeLimit };
}

export async function getAuditLogById(id) {
  assertDb();
  const item = await AuditLog.findById(id).lean();
  if (!item) {
    const error = new Error('Activity entry not found.');
    error.status = 404;
    throw error;
  }
  return item;
}

export async function getUserActivitySummary(userId) {
  assertDb();
  const uid = String(userId);
  const [lastLogin, totals, recent] = await Promise.all([
    AuditLog.findOne({ userId: uid, action: 'login' }).sort({ createdAt: -1 }).lean(),
    AuditLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(uid) } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ]),
    AuditLog.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const byAction = Object.fromEntries(totals.map((row) => [row._id, row.count]));
  return {
    lastLoginAt: lastLogin?.createdAt || null,
    totals: byAction,
    recent,
  };
}
