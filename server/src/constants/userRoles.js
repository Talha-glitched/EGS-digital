// Held by no role, so an unmapped route resolves to a permission nobody has.
export const DENY_PERMISSION = 'route:unmapped';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_REP: 'sales_rep',
  VIEWER: 'viewer',
  DESIGNER: 'designer',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SALES_MANAGER]: 'Sales Manager',
  [ROLES.SALES_REP]: 'Sales Rep',
  [ROLES.VIEWER]: 'Viewer',
  [ROLES.DESIGNER]: 'Designer',
};

const ALL_READ = [
  'dashboard:read',
  'campaigns:read',
  'sequences:read',
  'contacts:read',
  'companies:read',
  'relationships:read',
  'pipeline:read',
  'tasks:read',
  'inbox:read',
  'finance:read',
  'reports:read',
  'audit:read',
];

const ALL_WRITE = [
  'campaigns:write',
  'sequences:write',
  'contacts:write',
  'companies:write',
  'relationships:write',
  'pipeline:write',
  'tasks:write',
  'inbox:write',
  'finance:write',
];

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    ...ALL_READ,
    ...ALL_WRITE,
    'users:manage',
    'export:data',
    'rollback:execute',
  ],
  [ROLES.SALES_MANAGER]: [
    ...ALL_READ,
    ...ALL_WRITE,
    'export:data',
    'rollback:execute',
    'audit:read',
  ],
  [ROLES.SALES_REP]: [
    'dashboard:read',
    'campaigns:read',
    'campaigns:write',
    'sequences:read',
    'contacts:read',
    'contacts:write',
    'companies:read',
    'companies:write',
    'relationships:read',
    'relationships:write',
    'pipeline:read',
    'pipeline:write',
    'tasks:read',
    'tasks:write',
    'inbox:read',
    'inbox:write',
  ],
  [ROLES.VIEWER]: [...ALL_READ],
  [ROLES.DESIGNER]: [
    'dashboard:read',
    'pipeline:read',
    'pipeline:write',
    'tasks:read',
    'tasks:write',
  ],
};

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
}

export function roleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

// Checked BEFORE the prefix map. Financial surfaces live under /sales, so
// prefix matching alone gave them pipeline permissions — which meant a designer
// could edit payment positions and a viewer could read margin and outstanding
// balances. These rules scope money to finance permissions regardless of where
// the route happens to sit.
export const SENSITIVE_ROUTE_RULES = [
  { test: /\/settlement(\/|$)/, read: 'finance:read', write: 'finance:write' },
  { test: /^\/sales\/settlement-queues/, read: 'finance:read', write: 'finance:write' },
  { test: /\/costing(\/|$)/, read: 'finance:read', write: 'finance:write' },
  { test: /^\/reports(\/|$)/, read: 'reports:read', write: 'reports:read' },
];

export const ROUTE_PERMISSION_MAP = [
  { prefix: '/users', read: 'users:manage', write: 'users:manage' },
  // Previously unmapped and therefore reachable by every authenticated role.
  // Releasing a launch batch actually sends outbound email, so it must be a
  // sequence write rather than a fall-through read.
  { prefix: '/email', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/sent-emails', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/replies', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/audience-preview', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/campaigns', read: 'campaigns:read', write: 'campaigns:write' },
  { prefix: '/sync', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/reports', read: 'reports:read', write: 'reports:read' },
  { prefix: '/inventory', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/resources', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/suppliers', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/settings', read: 'dashboard:read', write: 'users:manage' },
  { prefix: '/system-settings', read: 'dashboard:read', write: 'users:manage' },
  // Dispatches real outbound email; was previously reachable by any role.
  { prefix: '/send-jobs', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/send-delivery', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/communications-workspace', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/resend', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/vendor-performance', read: 'reports:read', write: 'reports:read' },
  // Personal surfaces every signed-in user needs: their own daily review,
  // working view and password.
  { prefix: '/daily-reviews', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/dashboard', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/profile', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/audit-log', read: 'audit:read', write: 'audit:read' },
  { prefix: '/revisions', read: 'audit:read', write: 'rollback:execute' },
  { prefix: '/projects', read: 'campaigns:read', write: 'campaigns:write', export: 'export:data' },
  { prefix: '/sequences', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/leads', read: 'contacts:read', write: 'contacts:write' },
  { prefix: '/interactions', read: 'contacts:read', write: 'contacts:write' },
  { prefix: '/companies', read: 'companies:read', write: 'companies:write' },
  { prefix: '/sales', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/field', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/employee-operations', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/communications', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/inbox', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/finance', read: 'finance:read', write: 'finance:write' },
  { prefix: '/analytics', read: 'reports:read', write: 'reports:read' },
  { prefix: '/search', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/workspace', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/mailbox-usage', read: 'sequences:read', write: 'sequences:read' },
];

export function permissionForRequest(method, path) {
  const normalized = path.replace(/^\/api\/admin/, '') || '/';
  if (normalized === '/users/active' || normalized === '/users/roles') {
    return 'dashboard:read';
  }
  if (normalized.endsWith('/restore') || normalized.includes('/rollback')) {
    return 'rollback:execute';
  }
  const isRead = method === 'GET' || method === 'HEAD';

  // Money rules win over location-based prefixes.
  const sensitive = SENSITIVE_ROUTE_RULES.find((row) => row.test.test(normalized));
  if (sensitive) return isRead ? sensitive.read : sensitive.write;

  const entry = ROUTE_PERMISSION_MAP.find(
    (row) => normalized === row.prefix || normalized.startsWith(`${row.prefix}/`)
  );
  // Default-deny. This previously returned 'dashboard:read', which every role
  // holds, so any route nobody remembered to map was open to all authenticated
  // users — including releasing an email launch batch. An unmapped route is a
  // mapping bug, and it should fail closed rather than silently grant access.
  if (!entry) return DENY_PERMISSION;
  if (normalized.includes('/export') && entry.export) return entry.export;
  if (isRead) return entry.read;
  return entry.write;
}
