import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ROLES, getPermissionsForRole } from '../constants/userRoles.js';

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function buildSessionFromUser(user) {
  const role = user.role || ROLES.SALES_REP;
  return {
    userId: String(user._id),
    email: user.email,
    displayName: user.displayName,
    username: user.displayName,
    role,
    permissions: getPermissionsForRole(role),
    mustChangePassword: Boolean(user.mustChangePassword),
    expiresAt: null,
  };
}

export async function findUserByEmail(email) {
  if (!mongoose.connection?.readyState) return null;
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  return User.findOne({ email: normalized });
}

export async function validateUserCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

export async function recordUserLogin(user, ip) {
  user.lastLoginAt = new Date();
  user.lastLoginIp = ip || null;
  await user.save();
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
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
