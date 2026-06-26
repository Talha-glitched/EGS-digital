import { isValidEmail, normalizeEmail } from './normalizeDomain.js';

const EMAIL_FIELDS = ['email', 'emailApollo', 'emailHunter', 'emailLusha'];

export function splitContactEmails(value) {
  return String(value || '')
    .split(/[;,\n]/)
    .map((email) => normalizeEmail(email))
    .filter((email) => email && isValidEmail(email));
}

export function getLeadEmailCandidates(lead) {
  return [...new Set(EMAIL_FIELDS.flatMap((field) => splitContactEmails(lead?.[field])))];
}

export function getPrimaryLeadEmail(lead) {
  return splitContactEmails(lead?.email)[0] || getLeadEmailCandidates(lead)[0] || '';
}

export function buildLeadEmailQuery(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) return null;

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const listPattern = new RegExp(`(^|[;,]\\s*)${escaped}(\\s*[;,]|$)`, 'i');

  return {
    $or: EMAIL_FIELDS.map((field) => ({ [field]: listPattern })),
  };
}
