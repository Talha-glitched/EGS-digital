export const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  restore: 'Restored',
  rollback: 'Rolled back',
  login: 'Signed in',
  logout: 'Signed out',
  login_failed: 'Failed sign-in',
  export: 'Exported',
  import: 'Imported',
};

export const CHANGE_TYPE_LABELS = {
  create: 'Created',
  update: 'Updated',
  soft_delete: 'Soft deleted',
  restore: 'Restored',
  rollback: 'Rolled back',
};

export function formatSettingsWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-AE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatAuditValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return formatSettingsWhen(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function userInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function resourceLabel(resourceType) {
  const labels = {
    lead: 'Contact',
    company: 'Company',
    opportunity: 'Opportunity',
    task: 'Task',
    sequence: 'Sequence',
    interaction: 'Interaction',
    user: 'User',
  };
  return labels[resourceType] || resourceType || 'Record';
}

export function snapshotTitle(resourceType, snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') return 'Record snapshot';
  if (resourceType === 'company') return snapshot.companyName || 'Company';
  if (resourceType === 'lead') return snapshot.name || snapshot.email || 'Contact';
  if (resourceType === 'opportunity') return snapshot.name || 'Opportunity';
  if (resourceType === 'task') return snapshot.title || 'Task';
  if (resourceType === 'sequence') return snapshot.name || 'Sequence';
  if (resourceType === 'interaction') return snapshot.subject || snapshot.type || 'Interaction';
  return 'Record snapshot';
}
