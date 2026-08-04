import mongoose from 'mongoose';
import { User } from '../models/User.js';
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

  // Try PostgreSQL bootstrap
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
    // Fallback to Mongoose if PG not active
    if (mongoose.connection?.readyState) {
      const count = await User.countDocuments();
      if (count === 0) {
        const user = await User.create({
          email,
          passwordHash: await hashPassword(password),
          displayName: email.split('@')[0] || 'Super Admin',
          role: ROLES.SUPER_ADMIN,
          isActive: true,
          mustChangePassword: false,
        });
        console.info(`Bootstrapped Super Admin user in MongoDB: ${user.email}`);
        return user;
      }
    }
  }

  return null;
}
