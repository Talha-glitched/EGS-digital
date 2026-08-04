import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ROLES, getPermissionsForRole } from '../constants/userRoles.js';
import db from '../db/index.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export function buildSessionFromUser(user) {
  const role = user.role || ROLES.SALES_REP;
  return {
    userId: String(user.id || user._id),
    email: user.email,
    displayName: user.displayName || user.name,
    username: user.displayName || user.name,
    role,
    permissions: getPermissionsForRole(role),
    mustChangePassword: Boolean(user.mustChangePassword || user.must_change_password),
    expiresAt: null,
  };
}

export async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  try {
    const res = await db.query(
      'SELECT id, name AS "displayName", email, password_hash AS "passwordHash", role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalized]
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    // Fallback to Mongoose if PG query fails
  }

  if (mongoose.connection?.readyState) {
    return User.findOne({ email: normalized }).lean();
  }
  return null;
}

export async function validateUserCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user || (user.isActive === false)) return null;
  const valid = await verifyPassword(password, user.passwordHash || user.password_hash);
  if (!valid) return null;
  return user;
}

export async function recordUserLogin(user, ip) {
  const userId = user.id || user._id;
  if (!userId) return;

  try {
    await db.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  } catch (err) {
    if (mongoose.connection?.readyState && user.save) {
      user.lastLoginAt = new Date();
      user.lastLoginIp = ip || null;
      await user.save();
    }
  }
}

export function userHasPermission(userSession, permission) {
  if (!userSession) return false;
  const permissions = userSession.permissions?.length
    ? userSession.permissions
    : getPermissionsForRole(userSession.role || ROLES.VIEWER);
  return permissions.includes(permission);
}

export function serializeUser(user) {
  return {
    id: String(user.id || user._id),
    email: user.email,
    displayName: user.displayName || user.name,
    role: user.role,
    isActive: user.isActive !== false && user.is_active !== false,
    mustChangePassword: Boolean(user.mustChangePassword || user.must_change_password),
    lastLoginAt: user.lastLoginAt || user.last_login_at || null,
    createdAt: user.createdAt || user.created_at || null,
    updatedAt: user.updatedAt || user.updated_at || null,
  };
}
