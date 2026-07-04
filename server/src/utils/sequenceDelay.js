const DELAY_UNITS = new Set(['minutes', 'hours', 'days']);

export function normalizeDelayUnit(unit) {
  const value = String(unit || 'days').toLowerCase();
  return DELAY_UNITS.has(value) ? value : 'days';
}

export function delayToMs(amount, unit = 'days') {
  const value = Number(amount) || 0;
  const normalized = normalizeDelayUnit(unit);
  if (normalized === 'minutes') return value * 60 * 1000;
  if (normalized === 'hours') return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}

export function parseStepDelay(step = {}) {
  return delayToMs(step.dayDelay, step.delayUnit);
}

export function formatStepDelay(step = {}) {
  const amount = Number(step.dayDelay) || 0;
  const unit = normalizeDelayUnit(step.delayUnit);
  if (!amount) return 'instant';
  const label = unit === 'minutes' ? 'min' : unit === 'hours' ? 'hr' : 'day';
  const plural = amount === 1 ? label : `${label}s`;
  return `${amount} ${plural}`;
}
