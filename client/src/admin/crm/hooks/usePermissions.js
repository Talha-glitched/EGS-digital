import { useMemo } from 'react';

export function usePermissions(status) {
  const permissions = status?.user?.permissions || [];

  return useMemo(
    () => ({
      permissions,
      can: (permission) => permissions.includes(permission),
      user: status?.user || null,
      displayName: status?.user?.displayName || status?.username || 'User',
      role: status?.user?.role || null,
    }),
    [permissions, status]
  );
}
