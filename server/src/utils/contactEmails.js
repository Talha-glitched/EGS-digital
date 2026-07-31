import { isValidEmail, normalizeEmail } from './normalizeDomain.js';

const EMAIL_FIELDS = [
  'email',
  'emailApollo',
  'emailHunter',
  'emailLusha',
  'emailPersonal',
  'outreachEmail',
];

const VENDOR_FIELD_MAP = {
  Apollo: 'emailApollo',
  Hunter: 'emailHunter',
  Lusha: 'emailLusha',
  Personal: 'emailPersonal',
};

/** Discovery fields for multi-address blast (deduped, case-insensitive). */
const BLAST_FIELDS = ['emailApollo', 'emailHunter', 'emailLusha', 'emailPersonal', 'email'];

export function splitContactEmails(value) {
  return String(value || '')
    .split(/[;,\n]/)
    .map((email) => normalizeEmail(email))
    .filter((email) => email && isValidEmail(email));
}

export function joinContactEmails(values = []) {
  return [...new Set(
    values.flatMap((value) => splitContactEmails(value)),
  )].join('; ');
}

/** Append incoming emails onto an existing ;-separated field without duplicates. */
export function mergeEmailField(existing, incoming) {
  return joinContactEmails([existing, incoming]);
}

export function firstContactEmail(value) {
  return splitContactEmails(value)[0] || '';
}

export function getLeadEmailCandidates(lead) {
  return [...new Set(EMAIL_FIELDS.flatMap((field) => splitContactEmails(lead?.[field])))];
}

/**
 * Distinct addresses for blast outreach. Exact duplicates across vendor fields
 * are removed. Confirmed outreachEmail wins alone once a reply confirmed it.
 */
export function getBlastSendEmails(lead) {
  const confirmed = getOutreachEmail(lead);
  if (confirmed) return [confirmed];

  return [...new Set(BLAST_FIELDS.flatMap((field) => splitContactEmails(lead?.[field])))];
}

/** Internal dedup / legacy — not the confirmed outreach channel. */
export function getPrimaryLeadEmail(lead) {
  return splitContactEmails(lead?.email)[0] || getLeadEmailCandidates(lead)[0] || '';
}

/** Confirmed outreach address — only set after a reply from that mailbox. */
export function getOutreachEmail(lead) {
  const outreach = firstContactEmail(lead?.outreachEmail);
  return outreach && isValidEmail(outreach) ? outreach : '';
}

export function detectEmailVendor(lead, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return '';

  for (const [vendor, field] of Object.entries(VENDOR_FIELD_MAP)) {
    if (splitContactEmails(lead?.[field]).includes(normalized)) return vendor;
  }

  if (normalizeEmail(lead?.email) === normalized) return lead?.primarySource || 'Manual';
  return 'Manual';
}

/**
 * Pick send target when only one address is needed (UI previews, non-blast sends):
 * confirmed outreach email first, else vendor discovery address, else primary/manual.
 */
export function getSendTargetEmail(lead, { vendor } = {}) {
  const confirmed = getOutreachEmail(lead);
  if (confirmed) return confirmed;

  if (vendor && VENDOR_FIELD_MAP[vendor]) {
    const vendorEmail = firstContactEmail(lead?.[VENDOR_FIELD_MAP[vendor]]);
    if (vendorEmail && isValidEmail(vendorEmail)) return vendorEmail;
  }

  for (const field of ['emailHunter', 'emailApollo', 'emailLusha', 'emailPersonal']) {
    const candidate = firstContactEmail(lead?.[field]);
    if (candidate && isValidEmail(candidate)) return candidate;
  }

  const manualEmail = firstContactEmail(lead?.email);
  if (manualEmail && isValidEmail(manualEmail)) return manualEmail;

  return '';
}

export function setOutreachEmail(lead, email, source = '') {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) {
    return { applied: false, reason: 'invalid-email' };
  }

  const existing = normalizeEmail(lead?.outreachEmail);
  if (existing && existing === normalized) {
    lead.outreachEmailSource = source || lead.outreachEmailSource || detectEmailVendor(lead, normalized) || 'Manual';
    return {
      applied: true,
      outreachEmail: normalized,
      source: lead.outreachEmailSource,
    };
  }

  const candidates = getLeadEmailCandidates(lead);
  const isKnown = candidates.includes(normalized) || normalizeEmail(lead?.email) === normalized;
  if (!isKnown && candidates.length > 0) {
    return { applied: false, reason: 'email-not-on-lead' };
  }

  lead.outreachEmail = normalized;
  lead.outreachEmailSource = source || detectEmailVendor(lead, normalized) || 'Manual';
  return {
    applied: true,
    outreachEmail: normalized,
    source: lead.outreachEmailSource,
  };
}

/**
 * Infer which vendor mailbox worked — last send target, sole vendor email, or primary source match.
 */
export function inferOutreachEmail(lead, { lastSentEmail = '' } = {}) {
  if (firstContactEmail(lead?.outreachEmail)) {
    return {
      email: firstContactEmail(lead.outreachEmail),
      source: lead.outreachEmailSource || detectEmailVendor(lead, lead.outreachEmail) || 'Manual',
      method: 'existing',
    };
  }

  const sent = normalizeEmail(lastSentEmail);
  if (sent && isValidEmail(sent)) {
    const fromReply = applyOutreachEmailFromReply(lead, sent);
    if (fromReply.applied) {
      return { email: lead.outreachEmail, source: lead.outreachEmailSource, method: 'last-send' };
    }
  }

  const vendorOptions = Object.entries(VENDOR_FIELD_MAP)
    .map(([vendor, field]) => ({ vendor, email: firstContactEmail(lead?.[field]) }))
    .filter((row) => row.email && isValidEmail(row.email));

  if (vendorOptions.length === 1) {
    setOutreachEmail(lead, vendorOptions[0].email, vendorOptions[0].vendor);
    return { email: lead.outreachEmail, source: lead.outreachEmailSource, method: 'sole-vendor' };
  }

  const primary = String(lead?.primarySource || '').trim();
  const primaryMatch = vendorOptions.find((row) => row.vendor === primary);
  if (primaryMatch) {
    setOutreachEmail(lead, primaryMatch.email, primaryMatch.vendor);
    return { email: lead.outreachEmail, source: lead.outreachEmailSource, method: 'primary-source' };
  }

  return null;
}

export function applyOutreachEmailFromReply(lead, senderEmail, systemInbox = '', receivedAt = new Date()) {
  const normalized = normalizeEmail(senderEmail);
  if (!normalized || !isValidEmail(normalized)) {
    return { applied: false, reason: 'invalid-sender' };
  }

  const candidates = getLeadEmailCandidates(lead);
  if (!candidates.includes(normalized)) {
    return { applied: false, reason: 'sender-not-on-lead' };
  }

  const source = detectEmailVendor(lead, normalized) || 'Manual';
  lead.outreachEmail = normalized;
  lead.outreachEmailSource = source;
  lead.deliveryStatus = 'Replied';
  
  const incomingDate = receivedAt ? new Date(receivedAt) : new Date();
  if (!lead.repliedAt || incomingDate > new Date(lead.repliedAt)) {
    lead.repliedAt = incomingDate;
  }

  if (lead.outcome === 'Pending' || !lead.outcome) {
    lead.outcome = 'Replied';
  }

  if (!Array.isArray(lead.confirmedEmails)) {
    lead.confirmedEmails = [];
  }

  const cleanInbox = normalizeEmail(systemInbox);
  const existingIdx = lead.confirmedEmails.findIndex((c) => normalizeEmail(c.email) === normalized);
  if (existingIdx >= 0) {
    lead.confirmedEmails[existingIdx].source = source;
    lead.confirmedEmails[existingIdx].confirmedAt = new Date();
    if (cleanInbox) lead.confirmedEmails[existingIdx].systemInbox = cleanInbox;
  } else {
    lead.confirmedEmails.push({
      email: normalized,
      source,
      confirmedAt: new Date(),
      systemInbox: cleanInbox,
    });
  }

  return { applied: true, outreachEmail: normalized, source, confirmedEmails: lead.confirmedEmails };
}

export function resolveLeadVendorSource(lead) {
  if (lead?.outreachEmailSource) return lead.outreachEmailSource;
  if (firstContactEmail(lead?.emailApollo)) return 'Apollo';
  if (firstContactEmail(lead?.emailHunter)) return 'Hunter';
  if (firstContactEmail(lead?.emailLusha)) return 'Lusha';
  if (firstContactEmail(lead?.emailPersonal)) return 'Personal';
  if (lead?.primarySource && lead.primarySource !== 'Manual') return lead.primarySource;
  return 'Manual';
}

export function recordBouncedEmailForLead(lead, bouncedEmail, reason = 'bounced', bouncedAt = new Date()) {
  const normalized = normalizeEmail(bouncedEmail);
  if (!normalized || !isValidEmail(normalized)) {
    return { applied: false, reason: 'invalid-email' };
  }

  const candidates = getLeadEmailCandidates(lead);
  if (!candidates.includes(normalized)) {
    return { applied: false, reason: 'email-not-on-lead' };
  }

  const source = detectEmailVendor(lead, normalized) || 'Manual';

  if (!Array.isArray(lead.bouncedEmails)) {
    lead.bouncedEmails = [];
  }

  const existingIdx = lead.bouncedEmails.findIndex((b) => normalizeEmail(b.email) === normalized);
  if (existingIdx >= 0) {
    lead.bouncedEmails[existingIdx].source = source;
    lead.bouncedEmails[existingIdx].bouncedAt = bouncedAt;
    lead.bouncedEmails[existingIdx].reason = reason;
  } else {
    lead.bouncedEmails.push({
      email: normalized,
      source,
      bouncedAt,
      reason,
    });
  }

  const bouncedSet = new Set((lead.bouncedEmails || []).map((b) => normalizeEmail(b.email)));
  const allBounced = candidates.every((cand) => bouncedSet.has(cand));

  if (allBounced || candidates.length <= 1) {
    lead.deliveryStatus = 'Bounced / Invalid';
  }

  return { applied: true, bouncedEmail: normalized, source, allBounced };
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

export function pickDedupEmail({
  apolloEmail = '',
  hunterEmail = '',
  lushaEmail = '',
  personalEmail = '',
  primaryEmail = '',
}) {
  return (
    firstContactEmail(apolloEmail)
    || firstContactEmail(lushaEmail)
    || firstContactEmail(hunterEmail)
    || firstContactEmail(personalEmail)
    || firstContactEmail(primaryEmail)
    || ''
  );
}

export function normalizePersonName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
