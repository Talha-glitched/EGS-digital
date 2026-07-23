import { fetchActiveUsers } from '../../crmApi.js';

export const TASK_PRIORITIES = ['Low', 'Normal', 'High'];
export const DEFAULT_TASK_OWNERS = ['Talha', 'Masuood', 'Joy', 'admin'];

export function isDemoTask(id) {
  return String(id || '').startsWith('demo-');
}

export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function isDateOnlyDue(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
}

export function formatTaskDue(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  if (isDateOnlyDue(value)) {
    return date.toLocaleDateString('en-AE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function dueTaskTone(task) {
  if (task.status === 'Done' || !task.dueAt) return 'neutral';
  const date = new Date(task.dueAt);
  if (Number.isNaN(date.getTime())) return 'neutral';
  const now = new Date();
  const due = isDateOnlyDue(task.dueAt)
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    : date;
  if (due < now) return 'warning';
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  if (due <= todayEnd) return 'info';
  return 'success';
}

export function getDeadlineTone(dueAt, status) {
  if (status === 'Done' || !dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const due = isDateOnlyDue(dueAt)
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    : date;
  if (due < now) return 'overdue';
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  if (due <= todayEnd) return 'today';
  return 'upcoming';
}

export function formatDeadlineLabel(dueAt, status) {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const tone = getDeadlineTone(dueAt, status);
  if (!tone) return null;
  const now = new Date();
  const due = isDateOnlyDue(dueAt)
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
    : date;
  const diffMs = due - now;
  const diffDays = Math.round(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  const diffHrs = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));
  if (tone === 'overdue') {
    if (diffDays === 0) return diffHrs <= 1 ? 'Overdue 1h' : `Overdue ${diffHrs}h`;
    return diffDays === 1 ? 'Overdue 1d' : `Overdue ${diffDays}d`;
  }
  if (tone === 'today') return 'Due today';
  if (diffDays === 0) return 'Due soon';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays}d`;
  const diffWeeks = Math.round(diffDays / 7);
  return diffWeeks === 1 ? 'In 1 week' : `In ${diffWeeks} weeks`;
}

export function normalizeTaskId(value) {
  if (!value) return '';
  if (typeof value === 'object' && value.id) return value.id;
  if (typeof value === 'string') return value;
  return value._id || '';
}

export function companyIdFromOpportunity(opportunityId, opportunities = []) {
  if (!opportunityId) return null;
  const opp = opportunities.find((item) => String(item._id) === String(opportunityId));
  if (!opp?.companyId) return null;
  return normalizeTaskId(opp.companyId) || null;
}

export function companyFromOpportunity(opportunityId, opportunities = []) {
  if (!opportunityId) return null;
  const opp = opportunities.find((item) => String(item._id) === String(opportunityId));
  return opp?.companyId || null;
}

export function campaignIdFromOpportunity(opportunityId, opportunities = []) {
  if (!opportunityId) return null;
  const opp = opportunities.find((item) => String(item._id) === String(opportunityId));
  if (!opp?.campaignId) return null;
  return normalizeTaskId(opp.campaignId) || null;
}


export async function loadOwnerOptions(fallbackTasks = [], extraOwners = []) {
  try {
    const users = await fetchActiveUsers();
    return buildOwnerOptions(fallbackTasks, extraOwners, users);
  } catch {
    return buildOwnerOptions(fallbackTasks, extraOwners);
  }
}

export function buildOwnerOptions(tasks = [], extraOwners = [], activeUsers = []) {
  const owners = new Set(DEFAULT_TASK_OWNERS);
  const options = [];
  const seen = new Set();
  const pushOption = (value, label = value, hint = '') => {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value: key, label, hint });
  };
  activeUsers.forEach((user) => {
    if (user?.displayName) owners.add(user.displayName);
    pushOption(user?.displayName, user?.displayName, user?.email || user?.role || '');
  });
  tasks.forEach((task) => {
    if (task.owner) owners.add(task.owner);
  });
  extraOwners.forEach((owner) => {
    if (owner) owners.add(owner);
  });
  [...owners].sort((a, b) => a.localeCompare(b)).forEach((owner) => pushOption(owner, owner));
  return options;
}
