import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPermissionsForRole,
  roleHasPermission,
  permissionForRequest,
  ROLES,
} from '../src/constants/userRoles.js';
import { hashPassword, verifyPassword } from '../src/services/authService.js';

test('role permissions map grants super admin user management', () => {
  const perms = getPermissionsForRole(ROLES.SUPER_ADMIN);
  assert.ok(perms.includes('users:manage'));
  assert.ok(perms.includes('rollback:execute'));
  assert.ok(roleHasPermission(ROLES.SALES_REP, 'pipeline:write'));
  assert.equal(roleHasPermission(ROLES.SALES_REP, 'finance:read'), false);
});

test('permissionForRequest maps exports and restore paths', () => {
  assert.equal(permissionForRequest('GET', '/api/admin/projects/abc/export'), 'export:data');
  assert.equal(permissionForRequest('POST', '/api/admin/task/abc/restore'), 'rollback:execute');
  assert.equal(permissionForRequest('GET', '/api/admin/sales/tasks'), 'pipeline:read');
});

test('bcrypt password hashing round-trips', async () => {
  const hash = await hashPassword('test-password-123');
  assert.ok(hash.startsWith('$2'));
  assert.equal(await verifyPassword('test-password-123', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});
