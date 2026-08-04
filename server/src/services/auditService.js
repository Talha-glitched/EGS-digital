import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import db from '../db/index.js';

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
  const payload = {
    userDisplayName,
    summary,
    changes,
    metadata,
    userAgent,
  };

  try {
    const res = await db.query(
      `INSERT INTO audit_events (user_id, action, entity_type, entity_id, payload, ip_address)
       VALUES ($1::uuid, $2::varchar, $3::varchar, $4::uuid, $5::jsonb, $6::varchar)
       RETURNING id, user_id, action, entity_type AS resource, entity_id AS "resourceId", payload, ip_address AS ip, created_at AS "createdAt"`,
      [userId || null, action, resource || null, resourceId || null, payload, ip || null]
    );
    return res.rows[0];
  } catch (err) {
    if (mongoose.connection?.readyState) {
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
    console.error('❌ AuditLog write error:', err.message);
  }
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
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  try {
    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${pIdx++}::uuid`);
      params.push(userId);
    }
    if (action) {
      conditions.push(`action = $${pIdx++}::varchar`);
      params.push(action);
    }
    if (resource) {
      conditions.push(`entity_type = $${pIdx++}::varchar`);
      params.push(resource);
    }
    if (from) {
      conditions.push(`created_at >= $${pIdx++}::timestamptz`);
      params.push(new Date(from));
    }
    if (to) {
      conditions.push(`created_at <= $${pIdx++}::timestamptz`);
      params.push(new Date(to));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countRes = await db.query(`SELECT COUNT(*) FROM audit_events ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(safeLimit, offset);
    const itemsRes = await db.query(
      `SELECT id, user_id AS "userId", action, entity_type AS resource, entity_id AS "resourceId", payload, ip_address AS ip, created_at AS "createdAt"
       FROM audit_events ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      params
    );

    const items = itemsRes.rows.map(r => ({
      id: r.id,
      userId: r.userId,
      userDisplayName: r.payload?.userDisplayName || 'System',
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      summary: r.payload?.summary || '',
      changes: r.payload?.changes || [],
      metadata: r.payload?.metadata || {},
      ip: r.ip,
      createdAt: r.createdAt,
    }));

    return { items, total, page: safePage, limit: safeLimit };
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const query = {};
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (resource) query.resource = resource;
      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to) query.createdAt.$lte = new Date(to);
      }

      const skip = (safePage - 1) * safeLimit;
      const [items, total] = await Promise.all([
        AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
        AuditLog.countDocuments(query),
      ]);

      return { items, total, page: safePage, limit: safeLimit };
    }
    throw err;
  }
}

export async function getAuditLogById(id) {
  try {
    const res = await db.query(
      `SELECT id, user_id AS "userId", action, entity_type AS resource, entity_id AS "resourceId", payload, ip_address AS ip, created_at AS "createdAt"
       FROM audit_events WHERE id = $1::uuid LIMIT 1`,
      [id]
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        id: r.id,
        userId: r.userId,
        userDisplayName: r.payload?.userDisplayName || 'System',
        action: r.action,
        resource: r.resource,
        resourceId: r.resourceId,
        summary: r.payload?.summary || '',
        changes: r.payload?.changes || [],
        metadata: r.payload?.metadata || {},
        ip: r.ip,
        createdAt: r.createdAt,
      };
    }
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const item = await AuditLog.findById(id).lean();
      if (item) return item;
    }
  }

  const error = new Error('Activity entry not found.');
  error.status = 404;
  throw error;
}

export async function getUserActivitySummary(userId) {
  const uid = String(userId);
  try {
    const lastLoginRes = await db.query(
      `SELECT created_at FROM audit_events WHERE user_id = $1::uuid AND action = 'login' ORDER BY created_at DESC LIMIT 1`,
      [uid]
    );
    const totalsRes = await db.query(
      `SELECT action, COUNT(*)::int as count FROM audit_events WHERE user_id = $1::uuid GROUP BY action`,
      [uid]
    );
    const recentRes = await db.query(
      `SELECT id, action, entity_type AS resource, entity_id AS "resourceId", payload, created_at AS "createdAt"
       FROM audit_events WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 10`,
      [uid]
    );

    const totals = {};
    totalsRes.rows.forEach(r => { totals[r.action] = r.count; });

    return {
      lastLoginAt: lastLoginRes.rows[0]?.created_at || null,
      totals,
      recent: recentRes.rows,
    };
  } catch (err) {
    if (mongoose.connection?.readyState) {
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
    throw err;
  }
}
