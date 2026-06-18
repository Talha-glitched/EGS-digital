import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

export function getBaseUrl() {
  return process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
}

export function getMailConfigStatus() {
  const smtpReady = Boolean(
    process.env.EMAIL_SMTP_HOST &&
      process.env.EMAIL_SMTP_PORT &&
      process.env.EMAIL_SMTP_USER &&
      process.env.EMAIL_SMTP_PASS
  );
  const imapReady = Boolean(
    process.env.EMAIL_IMAP_HOST &&
      process.env.EMAIL_IMAP_PORT &&
      process.env.EMAIL_SMTP_USER &&
      process.env.EMAIL_SMTP_PASS
  );
  return { smtpReady, imapReady };
}

function envTlsRejectUnauthorized(imapSpecificEnv) {
  const raw = String(imapSpecificEnv ?? process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? '').toLowerCase();
  if (raw === 'false' || raw === '0') return false;
  return true;
}

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: Number(process.env.EMAIL_SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

export function createImapClient() {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_IMAP_TLS_REJECT_UNAUTHORIZED);
  return new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT || 993),
    secure: Number(process.env.EMAIL_IMAP_PORT || 993) === 993,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
    logger: false,
    tls: { rejectUnauthorized },
  });
}

export function resolveImapSyncDays() {
  const n = Number(process.env.EMAIL_IMAP_SYNC_DAYS);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 730);
  return 120;
}

export function getFromIdentity(project) {
  return {
    fromEmail: project?.fromEmail || process.env.EMAIL_SMTP_USER || '',
    fromName: project?.fromName || process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign',
  };
}

export function normalizeMessageIdToken(value) {
  return String(value || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/[<>"']/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function expandMessageIdForLookup(token) {
  const raw = String(token || '').trim();
  if (!raw) return [];
  const inner = raw.replace(/^<|>$/g, '').trim();
  if (!inner || !inner.includes('@')) return [];
  const lower = inner.toLowerCase();
  return [...new Set([raw, inner, `<${inner}>`, `<${lower}>`, lower])];
}

export function getMimeHeaderSection(source) {
  const s = String(source || '');
  const idx = s.search(/\r?\n\r?\n/);
  return idx === -1 ? s : s.slice(0, idx);
}

export function extractMessageIdCandidatesFromHeaders(headerSection) {
  const variants = new Set();
  const re = /<[^\s<>]+@[^\s<>]+>/g;
  let match;
  while ((match = re.exec(headerSection)) !== null) {
    expandMessageIdForLookup(match[0]).forEach((v) => variants.add(v));
  }
  return [...variants];
}

export function extractMailboxFromHeader(headerSection, headerName) {
  const re = new RegExp(`^${headerName}:\\s*(.+)`, 'im');
  const match = re.exec(headerSection);
  if (!match) return '';
  const firstLine = match[1].split(/\r?\n/)[0];
  const addr = firstLine.match(/<([^>]+)>/);
  if (addr) return addr[1].trim().toLowerCase();
  const loose = firstLine.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return loose ? loose[0].trim().toLowerCase() : '';
}

export function stableSyntheticMessageId(uid, host) {
  const safeHost = String(host || 'imap').replace(/[^a-z0-9.-]/gi, '') || 'imap';
  return `<egs-sync-uid-${uid}@${safeHost}>`;
}

export function isBounceSender(fromAddress) {
  const addr = String(fromAddress || '').toLowerCase();
  return (
    addr.includes('mailer-daemon') ||
    addr.includes('postmaster') ||
    addr.includes('mail delivery') ||
    addr.includes('delivery status notification')
  );
}

export function extractBouncedEmailFromBody(text) {
  const body = String(text || '');
  const patterns = [
    /(?:Final-Recipient|Original-Recipient):\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i,
    /(?:failed permanently|could not be delivered to|delivery to the following recipient failed)[^\n]*[\n\r]+[^\n]*?([^\s<>]+@[^\s<>]+)/i,
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(body);
    if (match?.[1] && !match[1].includes('mailer-daemon') && !match[1].includes('postmaster')) {
      return match[1].toLowerCase();
    }
  }
  return '';
}
