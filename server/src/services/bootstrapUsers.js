import { ROLES } from '../constants/userRoles.js';
import { hashPassword } from './authService.js';
import db from '../db/index.js';

export async function bootstrapAdminUser() {
  const email = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    console.info('ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping admin bootstrap.');
    return null;
  }

  try {
    const checkRes = await db.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(checkRes.rows[0].count, 10) === 0) {
      const passwordHash = await hashPassword(password);
      const res = await db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, email`,
        [email.split('@')[0] || 'Super Admin', email, passwordHash, ROLES.SUPER_ADMIN]
      );
      console.info(`Bootstrapped Super Admin in PostgreSQL: ${res.rows[0].email}`);
      return res.rows[0];
    }
  } catch (err) {
    console.error('Failed to bootstrap admin user in PostgreSQL:', err.message);
  }

  return null;
}
