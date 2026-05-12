git fetch originimport crypto from 'crypto';

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
  return process.env.ADMIN_SESSION_SECRET || '';
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
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && getSecret());
}

export function validateAdminCredentials(username, password) {
  if (!isAdminConfigured()) {
    return false;
  }

  return (
    timingSafeEqualString(username, process.env.ADMIN_USERNAME) &&
    timingSafeEqualString(password, process.env.ADMIN_PASSWORD)
  );
}

export function createAdminCookie(username) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
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
    return session;
  } catch {
    return null;
  }
}

export function setAdminCookie(res, username) {
  const cookie = createAdminCookie(username);
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
  req.admin = session;
  return next();
}
