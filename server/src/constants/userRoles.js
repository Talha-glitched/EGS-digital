export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_REP: 'sales_rep',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.SALES_MANAGER]: 'Sales Manager',
  [ROLES.SALES_REP]: 'Sales Rep',
  [ROLES.VIEWER]: 'Viewer',
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

export const ROUTE_PERMISSION_MAP = [
  { prefix: '/users', read: 'users:manage', write: 'users:manage' },
  { prefix: '/audit-log', read: 'audit:read', write: 'audit:read' },
  { prefix: '/revisions', read: 'audit:read', write: 'rollback:execute' },
  { prefix: '/projects', read: 'campaigns:read', write: 'campaigns:write', export: 'export:data' },
  { prefix: '/sequences', read: 'sequences:read', write: 'sequences:write' },
  { prefix: '/leads', read: 'contacts:read', write: 'contacts:write' },
  { prefix: '/interactions', read: 'contacts:read', write: 'contacts:write' },
  { prefix: '/companies', read: 'companies:read', write: 'companies:write' },
  { prefix: '/sales', read: 'pipeline:read', write: 'pipeline:write' },
  { prefix: '/inbox', read: 'inbox:read', write: 'inbox:write' },
  { prefix: '/finance', read: 'finance:read', write: 'finance:write' },
  { prefix: '/analytics', read: 'reports:read', write: 'reports:read' },
  { prefix: '/search', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/workspace', read: 'dashboard:read', write: 'dashboard:read' },
  { prefix: '/mailbox-usage', read: 'sequences:read', write: 'sequences:read' },
];

export function permissionForRequest(method, path) {
  const normalized = path.replace(/^\/api\/admin/, '') || '/';
  if (normalized.endsWith('/restore') || normalized.includes('/rollback')) {
    return 'rollback:execute';
  }
  const entry = ROUTE_PERMISSION_MAP.find(
    (row) => normalized === row.prefix || normalized.startsWith(`${row.prefix}/`)
  );
  if (!entry) return 'dashboard:read';
  if (normalized.includes('/export') && entry.export) return entry.export;
  if (method === 'GET' || method === 'HEAD') return entry.read;
  return entry.write;
}
