import crypto from 'crypto';
import {
  buildSessionFromUser,
  validateUserCredentials,
  recordUserLogin,
} from '../services/authService.js';
import { attachUserToRequest } from './actor.js';
import { ROLES, getPermissionsForRole } from '../constants/userRoles.js';

const COOKIE_NAME = 'egs_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'egs_dev_admin_session_secret_2026';
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const [name, ...value] = cookie.split('=');
      cookies[name] = decodeURIComponent(value.join('='));
      return cookies;
    }, {});
}

export function isAdminConfigured() {
  return true;
}

/** @deprecated env-only fallback; DB users are preferred */
export function validateEnvAdminCredentials(username, password) {
  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envPass = process.env.ADMIN_PASSWORD || 'admin';
  return (
    timingSafeEqualString(username, envUser) &&
    timingSafeEqualString(password, envPass)
  );
}

export async function validateAdminCredentials(username, password) {
  const user = await validateUserCredentials(username, password);
  if (user) return buildSessionFromUser(user);

  if (validateEnvAdminCredentials(username, password)) {
    const role = ROLES.SUPER_ADMIN;
    return {
      userId: null,
      email: process.env.ADMIN_USERNAME,
      displayName: process.env.ADMIN_USERNAME,
      username: process.env.ADMIN_USERNAME,
      role,
      permissions: getPermissionsForRole(role),
      mustChangePassword: false,
      expiresAt: null,
    };
  }
  return null;
}

export async function loginAdmin(username, password, ip) {
  const user = await validateUserCredentials(username, password);
  if (user) {
    await recordUserLogin(user, ip);
    return buildSessionFromUser(user);
  }

  if (validateEnvAdminCredentials(username, password)) {
    const role = ROLES.SUPER_ADMIN;
    return {
      userId: null,
      email: process.env.ADMIN_USERNAME,
      displayName: process.env.ADMIN_USERNAME,
      username: process.env.ADMIN_USERNAME,
      role,
      permissions: getPermissionsForRole(role),
      mustChangePassword: false,
      expiresAt: null,
    };
  }
  return null;
}

export function createAdminCookie(session) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ ...session, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function enrichSession(session) {
  if (!session) return null;
  if ((!session.permissions || !session.permissions.length) && session.role) {
    return { ...session, permissions: getPermissionsForRole(session.role) };
  }
  return session;
}

export function readAdminCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  const cookie = cookies[COOKIE_NAME];
  if (!cookie || !getSecret()) {
    return null;
  }

  const [payload, signature] = cookie.split('.');
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.expiresAt || session.expiresAt < Date.now()) {
      return null;
    }
    return enrichSession(session);
  } catch {
    return null;
  }
}

export function setAdminCookie(res, session) {
  const cookie = createAdminCookie(session);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`
  );
}

export function clearAdminCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

export function requireAdmin(req, res, next) {
  const session = readAdminCookie(req);
  if (!session) {
    return res.status(401).json({ message: 'Admin login required.' });
  }
  attachUserToRequest(req, session);
  return next();
}
