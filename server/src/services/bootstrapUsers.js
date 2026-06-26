import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ROLES } from '../constants/userRoles.js';
import { hashPassword } from './authService.js';

export async function bootstrapAdminUser() {
  if (!mongoose.connection?.readyState) return null;

  const count = await User.countDocuments();
  if (count > 0) return null;

  const email = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) {
    console.info('No users in DB and ADMIN_USERNAME/ADMIN_PASSWORD not set — skipping bootstrap.');
    return null;
  }

  const user = await User.create({
    email,
    passwordHash: await hashPassword(password),
    displayName: email.split('@')[0] || 'Super Admin',
    role: ROLES.SUPER_ADMIN,
    isActive: true,
    mustChangePassword: false,
  });

  console.info(`Bootstrapped Super Admin user: ${user.email}`);
  return user;
}
