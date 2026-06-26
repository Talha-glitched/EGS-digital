import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ROLES, isValidRole, ROLE_LABELS } from '../constants/userRoles.js';
import { hashPassword, serializeUser, verifyPassword } from './authService.js';
import { sendUserCredentialsEmail } from './userEmailService.js';
import { generateTemporaryPassword } from '../utils/temporaryPassword.js';

function assertDb() {
  if (!mongoose.connection?.readyState) {
    const error = new Error('Database not available.');
    error.status = 503;
    throw error;
  }
}

export async function listUsers({ includeInactive = true } = {}) {
  assertDb();
  const query = includeInactive ? {} : { isActive: true };
  const users = await User.find(query).sort({ displayName: 1 }).lean();
  return users.map(serializeUser);
}

export async function listActiveUsers() {
  assertDb();
  const users = await User.find({ isActive: true }).sort({ displayName: 1 }).lean();
  return users.map((u) => ({
    id: String(u._id),
    email: u.email,
    displayName: u.displayName,
    role: u.role,
  }));
}

export async function getUserById(id) {
  assertDb();
  const user = await User.findById(id).lean();
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  return serializeUser(user);
}

export async function createUser(payload, actor = {}) {
  assertDb();
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

  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('A user with this email already exists.');
    error.status = 409;
    throw error;
  }

  const user = await User.create({
    email,
    displayName,
    passwordHash: await hashPassword(password),
    role,
    isActive: payload.isActive !== false,
    mustChangePassword: Boolean(payload.mustChangePassword),
    createdBy: actor.userId || null,
  });

  return serializeUser(user);
}

export async function updateUser(id, payload) {
  assertDb();
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  if (payload.displayName !== undefined) {
    user.displayName = String(payload.displayName).trim();
  }
  if (payload.role !== undefined) {
    if (!isValidRole(payload.role)) {
      const error = new Error('Invalid role.');
      error.status = 400;
      throw error;
    }
    user.role = payload.role;
  }
  if (payload.isActive !== undefined) {
    user.isActive = Boolean(payload.isActive);
  }
  if (payload.mustChangePassword !== undefined) {
    user.mustChangePassword = Boolean(payload.mustChangePassword);
  }

  await user.save();
  return serializeUser(user);
}

export async function setUserPassword(id, newPassword, { self = false, mustChangePassword } = {}) {
  assertDb();
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  if (!newPassword || String(newPassword).length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.status = 400;
    throw error;
  }

  user.passwordHash = await hashPassword(newPassword);
  if (self) user.mustChangePassword = false;
  else if (mustChangePassword !== undefined) user.mustChangePassword = Boolean(mustChangePassword);
  await user.save();
  return { ok: true };
}

export async function issueUserCredentials(id, {
  password,
  sendEmail = true,
  mustChangePassword = true,
  welcome = false,
} = {}) {
  assertDb();
  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  if (!user.isActive) {
    const error = new Error('Cannot send credentials to an inactive user.');
    error.status = 400;
    throw error;
  }

  const plainPassword = password || generateTemporaryPassword();
  await setUserPassword(id, plainPassword, { mustChangePassword });
  const serialized = serializeUser(await User.findById(id).lean());

  let emailed = false;
  if (sendEmail) {
    await sendUserCredentialsEmail({
      user: serialized,
      password: plainPassword,
      welcome,
    });
    emailed = true;
  }

  return {
    ok: true,
    emailed,
    temporaryPassword: plainPassword,
    user: serialized,
    loginUrl: process.env.CLIENT_URL
      ? `${String(process.env.CLIENT_URL).replace(/\/$/, '')}/admin/crm`
      : '/admin/crm',
  };
}

export async function changeOwnPassword(userId, currentPassword, newPassword) {
  assertDb();
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    const error = new Error('Current password is incorrect.');
    error.status = 401;
    throw error;
  }
  return setUserPassword(userId, newPassword, { self: true });
}

export function getRoleOptions() {
  return Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
}
