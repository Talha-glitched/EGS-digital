import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

export function getBaseUrl() {
  return process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
}

export function isPublicTrackableUrl(url = getBaseUrl()) {
  try {
    const parsed = new URL(String(url || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
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

function shouldSaveSentCopy() {
  const raw = String(process.env.EMAIL_IMAP_SAVE_SENT ?? 'true').toLowerCase();
  return raw !== 'false' && raw !== '0';
}

function resolveSentMailboxPath() {
  return process.env.EMAIL_IMAP_SENT_FOLDER || 'INBOX.Sent';
}

function formatFromHeader(fromName, fromEmail) {
  const email = String(fromEmail || process.env.EMAIL_SMTP_USER || '').trim();
  const name = String(fromName || process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign').trim();
  return `"${name}" <${email}>`;
}

function normalizeRecipientList(value) {
  const list = Array.isArray(value) ? value : [value];
  return list.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean);
}

async function compileOutboundMessage(mailOptions) {
  const compileTransport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });
  const info = await compileTransport.sendMail(mailOptions);
  return info.message;
}

export async function appendOutboundCopyToSent(rawMessage) {
  if (!shouldSaveSentCopy()) return;
  const { imapReady } = getMailConfigStatus();
  if (!imapReady) return;

  const folder = resolveSentMailboxPath();
  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      await client.append(folder, rawMessage, ['\\Seen']);
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error('Failed to save outbound copy to Sent folder:', error.message);
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function sendAuthenticatedMail({
  to,
  subject,
  text,
  html,
  fromName,
  fromEmail,
  inReplyTo,
  references,
}) {
  const smtpUser = String(process.env.EMAIL_SMTP_USER || '').trim();
  if (!smtpUser) {
    console.error('[Email] ERROR: EMAIL_SMTP_USER is not configured in environment variables.');
    throw new Error('EMAIL_SMTP_USER is not configured.');
  }

  const recipients = normalizeRecipientList(to);
  if (!recipients.length) {
    console.error('[Email] ERROR: At least one recipient is required.');
    throw new Error('At least one recipient is required.');
  }

  const smtpHost = process.env.EMAIL_SMTP_HOST;
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
  const secure = smtpPort === 465;
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED);
  const fromHeader = formatFromHeader(fromName, fromEmail || smtpUser);

  console.log(`[Email] Initiating email send...`);
  console.log(`[Email] Recipient(s): ${recipients.join(', ')}`);
  console.log(`[Email] From Header: ${fromHeader}`);
  console.log(`[Email] Subject: "${subject}"`);
  console.log(`[Email] SMTP Server Config: host=${smtpHost}, port=${smtpPort}, secure=${secure}, user=${smtpUser}, rejectUnauthorized=${rejectUnauthorized}`);

  const mailOptions = {
    from: fromHeader,
    to: recipients,
    replyTo: smtpUser,
    subject,
    text,
    html,
    headers: {
      'List-Unsubscribe': `<mailto:${smtpUser}?subject=unsubscribe>`,
      ...(inReplyTo && { 'In-Reply-To': inReplyTo }),
      ...(references && { 'References': Array.isArray(references) ? references.join(' ') : references }),
    },
    envelope: {
      from: smtpUser,
      to: recipients,
    },
  };

  try {
    console.log(`[Email] Compiling outbound message structure...`);
    const raw = await compileOutboundMessage(mailOptions);
    console.log(`[Email] Creating SMTP transport...`);
    const transporter = createTransporter();

    console.log(`[Email] Sending via nodemailer.transporter.sendMail...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email] nodemailer.sendMail SUCCESS. SMTP Response:`, JSON.stringify(result, null, 2));

    const accepted = normalizeRecipientList(result?.accepted);
    const missing = recipients.filter((recipient) => !accepted.includes(recipient));
    if (missing.length) {
      const rejected = result?.rejected?.length ? ` Rejected: ${result.rejected.join(', ')}` : '';
      const errorMsg = `SMTP server did not accept recipient(s): ${missing.join(', ')}.${rejected} Response: ${result?.response || 'n/a'}`;
      console.error(`[Email] ERROR: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[Email] Appending outbound copy to IMAP Sent folder...`);
    await appendOutboundCopyToSent(raw);
    console.log(`[Email] Successfully completed email process for: ${recipients.join(', ')}`);
    return result;
  } catch (error) {
    console.error(`[Email] FATAL ERROR sending email to ${recipients.join(', ')}:`, error);
    throw error;
  }
}

export function createTransporter() {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED);
  const smtpUser = String(process.env.EMAIL_SMTP_USER || '').trim();
  const domain = smtpUser.includes('@') ? smtpUser.split('@')[1] : 'exhibitgraphicsign.com';
  return nodemailer.createTransport({
    name: domain,
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: Number(process.env.EMAIL_SMTP_PORT || 465) === 465,
    auth: {
      user: smtpUser,
      pass: process.env.EMAIL_SMTP_PASS,
    },
    tls: { rejectUnauthorized },
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
