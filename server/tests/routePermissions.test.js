import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  permissionForRequest, roleHasPermission, ROLES, DENY_PERMISSION,
} from '../src/constants/userRoles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROUTER = path.join(here, '../src/routes/adminRoutes.js');
// Bypass the permission middleware entirely, so they must not be asserted on.
const PUBLIC_PATHS = new Set(['/status', '/login', '/logout']);

function declaredRoutes() {
  const src = fs.readFileSync(ROUTER, 'utf8');
  return [...src.matchAll(/router\.(get|post|patch|put|delete)\('([^']+)'/g)]
    .map((match) => ({ method: match[1].toUpperCase(), path: match[2] }))
    .filter((route) => !PUBLIC_PATHS.has(route.path));
}

test('every admin route resolves to an explicit permission', () => {
  const unmapped = declaredRoutes().filter(
    (route) => permissionForRequest(route.method, route.path) === DENY_PERMISSION,
  );
  assert.deepEqual(
    unmapped.map((route) => `${route.method} ${route.path}`), [],
    'Unmapped routes fail closed. Add them to ROUTE_PERMISSION_MAP.',
  );
});

test('an unmapped route denies every role rather than defaulting to read', () => {
  const permission = permissionForRequest('GET', '/route-that-does-not-exist');
  assert.equal(permission, DENY_PERMISSION);
  for (const role of Object.values(ROLES)) {
    assert.equal(roleHasPermission(role, permission), false, `${role} must not reach unmapped routes`);
  }
});

test('financial surfaces require finance permissions, not pipeline', () => {
  const reads = [
    'GET /sales/ongoing-jobs/abc/settlement',
    'GET /sales/settlement-queues',
    'GET /sales/ongoing-jobs/abc/costing',
  ];
  for (const entry of reads) {
    const [method, routePath] = entry.split(' ');
    assert.equal(permissionForRequest(method, routePath), 'finance:read', entry);
  }
  const writes = [
    'POST /sales/ongoing-jobs/abc/settlement/milestones',
    'POST /sales/ongoing-jobs/abc/settlement/delivery',
    'POST /sales/ongoing-jobs/abc/costing/actuals',
  ];
  for (const entry of writes) {
    const [method, routePath] = entry.split(' ');
    assert.equal(permissionForRequest(method, routePath), 'finance:write', entry);
  }
});

test('designers cannot read or change money', () => {
  const surfaces = [
    ['GET', '/sales/ongoing-jobs/abc/settlement'],
    ['POST', '/sales/ongoing-jobs/abc/settlement/milestones'],
    ['POST', '/sales/ongoing-jobs/abc/costing/actuals'],
    ['GET', '/reports/operations'],
  ];
  for (const [method, routePath] of surfaces) {
    const permission = permissionForRequest(method, routePath);
    assert.equal(
      roleHasPermission(ROLES.DESIGNER, permission), false,
      `designer must not reach ${method} ${routePath}`,
    );
  }
});

test('sending outbound email requires sequence write, not a fall-through read', () => {
  const senders = [
    ['POST', '/email/launch-batches/batch-1/send'],
    ['POST', '/send-jobs/job-1/send'],
  ];
  for (const [method, routePath] of senders) {
    assert.equal(permissionForRequest(method, routePath), 'sequences:write', `${method} ${routePath}`);
    for (const role of [ROLES.VIEWER, ROLES.DESIGNER]) {
      assert.equal(
        roleHasPermission(role, 'sequences:write'), false,
        `${role} must not be able to send email`,
      );
    }
  }
});

test('read-only roles cannot write anywhere sensitive', () => {
  const writes = declaredRoutes().filter((route) => route.method !== 'GET' && route.method !== 'HEAD');
  const reachable = writes.filter((route) => roleHasPermission(ROLES.VIEWER, permissionForRequest(route.method, route.path)));
  // A viewer may still complete their own daily review and change their own
  // password; nothing else may be writable.
  const allowed = new Set(['/daily-reviews/complete', '/profile/password']);
  assert.deepEqual(
    reachable.map((route) => route.path).filter((routePath) => !allowed.has(routePath)), [],
    'Viewer role gained write access to a route',
  );
});
