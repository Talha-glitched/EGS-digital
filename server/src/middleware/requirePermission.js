import { userHasPermission } from '../services/authService.js';
import { attachUserToRequest } from '../utils/actor.js';
import { readAdminCookie } from '../utils/adminAuth.js';

export function requirePermission(...permissions) {
  return (req, res, next) => {
    const session = readAdminCookie(req);
    if (!session) {
      return res.status(401).json({ message: 'Admin login required.' });
    }

    attachUserToRequest(req, session);

    if (!permissions.length) return next();

    const allowed = permissions.some((perm) => userHasPermission(session, perm));
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

export function requireAuth(req, res, next) {
  return requirePermission()(req, res, next);
}
