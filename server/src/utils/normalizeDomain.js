/**
 * Strip protocols, paths, www prefix — FR-2.3 Layer 1
 */
export function normalizeDomain(input) {
  if (!input) return '';
  let value = String(input).trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.replace(/^www\./, '');
  value = value.split(/[/?#]/)[0];
  value = value.replace(/:\d+$/, '');
  value = value.replace(/\s+/g, '');
  return value;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(email || '').trim());
}
