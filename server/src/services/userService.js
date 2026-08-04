import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ROLES, isValidRole, ROLE_LABELS } from '../constants/userRoles.js';
import { hashPassword, serializeUser, verifyPassword } from './authService.js';
import { sendUserCredentialsEmail } from './userEmailService.js';
import { generateTemporaryPassword } from '../utils/temporaryPassword.js';
import db from '../db/index.js';

export async function listUsers({ includeInactive = true } = {}) {
  try {
    const sql = includeInactive
      ? 'SELECT id, name AS "displayName", email, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM users ORDER BY name ASC'
      : 'SELECT id, name AS "displayName", email, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE is_active = true ORDER BY name ASC';
    const res = await db.query(sql);
    return res.rows.map(serializeUser);
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const query = includeInactive ? {} : { isActive: true };
      const users = await User.find(query).sort({ displayName: 1 }).lean();
      return users.map(serializeUser);
    }
    throw err;
  }
}

export async function listActiveUsers() {
  try {
    const res = await db.query('SELECT id, email, name AS "displayName", role FROM users WHERE is_active = true ORDER BY name ASC');
    return res.rows.map((u) => ({
      id: String(u.id),
      email: u.email,
      displayName: u.displayName,
      role: u.role,
    }));
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const users = await User.find({ isActive: true }).sort({ displayName: 1 }).lean();
      return users.map((u) => ({
        id: String(u._id),
        email: u.email,
        displayName: u.displayName,
        role: u.role,
      }));
    }
    throw err;
  }
}

export async function getUserById(id) {
  try {
    const res = await db.query(
      'SELECT id, name AS "displayName", email, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    if (res.rows.length > 0) {
      return serializeUser(res.rows[0]);
    }
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const user = await User.findById(id).lean();
      if (user) return serializeUser(user);
    }
  }

  const error = new Error('User not found.');
  error.status = 404;
  throw error;
}

export async function createUser(payload, actor = {}) {
  const email = String(payload.email || '').trim().toLowerCase();
  const displayName = String(payload.displayName || '').trim();
  const password = String(payload.password || '');
  const role = payload.role || ROLES.SALES_REP;

  if (!email || !displayName || !password) {
    const error = new Error('Email, display name, and password are required.');
    error.status = 400;
    throw error;
  }
  if (!isValidRole(role)) {
    const error = new Error('Invalid role.');
    error.status = 400;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  try {
    const res = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name AS "displayName", email, role, is_active AS "isActive", created_at AS "createdAt"`,
      [displayName, email, passwordHash, role, payload.isActive !== false]
    );
    return serializeUser(res.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Postgres Unique Constraint error
      const error = new Error('A user with this email already exists.');
      error.status = 409;
      throw error;
    }

    if (mongoose.connection?.readyState) {
      const existing = await User.findOne({ email });
      if (existing) {
        const error = new Error('A user with this email already exists.');
        error.status = 409;
        throw error;
      }

      const user = await User.create({
        email,
        displayName,
        passwordHash,
        role,
        isActive: payload.isActive !== false,
        mustChangePassword: Boolean(payload.mustChangePassword),
        createdBy: actor.userId || null,
      });

      return serializeUser(user);
    }
    throw err;
  }
}

export async function updateUser(id, payload) {
  const user = await getUserById(id);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  const updates = [];
  const params = [];
  let paramIdx = 1;

  if (payload.displayName !== undefined) {
    updates.push(`name = $${paramIdx++}`);
    params.push(String(payload.displayName).trim());
  }
  if (payload.role !== undefined) {
    if (!isValidRole(payload.role)) {
      const error = new Error('Invalid role.');
      error.status = 400;
      throw error;
    }
    updates.push(`role = $${paramIdx++}`);
    params.push(payload.role);
  }
  if (payload.isActive !== undefined) {
    updates.push(`is_active = $${paramIdx++}`);
    params.push(Boolean(payload.isActive));
  }

  if (updates.length > 0) {
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, name AS "displayName", email, role, is_active AS "isActive"`;
    try {
      const res = await db.query(sql, params);
      return serializeUser(res.rows[0]);
    } catch (err) {
      if (mongoose.connection?.readyState) {
        const mUser = await User.findById(id);
        if (mUser) {
          if (payload.displayName !== undefined) mUser.displayName = String(payload.displayName).trim();
          if (payload.role !== undefined) mUser.role = payload.role;
          if (payload.isActive !== undefined) mUser.isActive = Boolean(payload.isActive);
          await mUser.save();
          return serializeUser(mUser);
        }
      }
      throw err;
    }
  }

  return user;
}

export async function setUserPassword(id, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.status = 400;
    throw error;
  }

  const passwordHash = await hashPassword(newPassword);

  try {
    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);
    return { ok: true };
  } catch (err) {
    if (mongoose.connection?.readyState) {
      const user = await User.findById(id);
      if (user) {
        user.passwordHash = passwordHash;
        await user.save();
        return { ok: true };
      }
    }
    throw err;
  }
}

export async function issueUserCredentials(id, {
  password,
  sendEmail = true,
  welcome = false,
} = {}) {
  const user = await getUserById(id);
  if (!user.isActive) {
    const error = new Error('Cannot send credentials to an inactive user.');
    error.status = 400;
    throw error;
  }

  const plainPassword = password || generateTemporaryPassword();
  await setUserPassword(id, plainPassword);

  let emailed = false;
  if (sendEmail) {
    await sendUserCredentialsEmail({
      user,
      password: plainPassword,
      welcome,
    });
    emailed = true;
  }

  return {
    ok: true,
    emailed,
    temporaryPassword: plainPassword,
    user,
    loginUrl: process.env.CLIENT_URL
      ? `${String(process.env.CLIENT_URL).replace(/\/$/, '')}/admin/crm`
      : '/admin/crm',
  };
}

export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const user = await getUserById(userId);
  const dbUser = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const passwordHash = dbUser.rows[0]?.password_hash;
  
  const valid = await verifyPassword(currentPassword, passwordHash);
  if (!valid) {
    const error = new Error('Current password is incorrect.');
    error.status = 401;
    throw error;
  }
  return setUserPassword(userId, newPassword);
}

export function getRoleOptions() {
  return Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
}
