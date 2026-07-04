const DELAY_UNITS = ['minutes', 'hours', 'days'];

export const DELAY_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

export const DELAY_PRESETS = [
  { amount: 1, unit: 'minutes', label: '1 min' },
  { amount: 5, unit: 'minutes', label: '5 min' },
  { amount: 15, unit: 'minutes', label: '15 min' },
  { amount: 30, unit: 'minutes', label: '30 min' },
  { amount: 1, unit: 'hours', label: '1 hr' },
  { amount: 1, unit: 'days', label: '1 day' },
  { amount: 3, unit: 'days', label: '3 days' },
];

export function normalizeDelayUnit(unit) {
  const value = String(unit || 'days').toLowerCase();
  return DELAY_UNITS.includes(value) ? value : 'days';
}

export function delayToMs(amount, unit = 'days') {
  const value = Number(amount) || 0;
  const normalized = normalizeDelayUnit(unit);
  if (normalized === 'minutes') return value * 60 * 1000;
  if (normalized === 'hours') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

export function formatDelayLabel(amount, unit = 'days') {
  const value = Number(amount) || 0;
  const normalized = normalizeDelayUnit(unit);
  if (!value) return 'Instant';
  if (normalized === 'minutes') return `${value} min`;
  if (normalized === 'hours') return `${value} hr`;
  return `${value} day${value === 1 ? '' : 's'}`;
}
