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

export function getCredentialsForEmail(fromEmail) {
  const normalizedEmail = String(fromEmail || '').trim().toLowerCase();
  const user1 = String(process.env.EMAIL_SMTP_USER || '').trim().toLowerCase();
  const user2 = String(process.env.EMAIL_SMTP_USER2 || '').trim().toLowerCase();

  if (user2 && normalizedEmail === user2) {
    return {
      user: process.env.EMAIL_SMTP_USER2.trim(),
      pass: process.env.EMAIL_SMTP_USER2_PASS,
    };
  }

  return {
    user: process.env.EMAIL_SMTP_USER ? process.env.EMAIL_SMTP_USER.trim() : '',
    pass: process.env.EMAIL_SMTP_PASS,
  };
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
  const smtp2Ready = Boolean(
    process.env.EMAIL_SMTP_HOST &&
      process.env.EMAIL_SMTP_PORT &&
      process.env.EMAIL_SMTP_USER2 &&
      process.env.EMAIL_SMTP_USER2_PASS
  );
  const imap2Ready = Boolean(
    process.env.EMAIL_IMAP_HOST &&
      process.env.EMAIL_IMAP_PORT &&
      process.env.EMAIL_SMTP_USER2 &&
      process.env.EMAIL_SMTP_USER2_PASS
  );
  return { smtpReady, imapReady, smtp2Ready, imap2Ready };
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
  const email = String(fromEmail || '').trim();
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

export async function appendOutboundCopyToSent(rawMessage, fromEmail) {
  if (!shouldSaveSentCopy()) return;
  const creds = getCredentialsForEmail(fromEmail);
  if (!creds.user || !creds.pass || !process.env.EMAIL_IMAP_HOST || !process.env.EMAIL_IMAP_PORT) return;

  const folder = resolveSentMailboxPath();
  const client = createImapClient(fromEmail);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      await client.append(folder, rawMessage, ['\\Seen']);
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error(`Failed to save outbound copy to Sent folder for ${fromEmail || 'unknown'}:`, error.message);
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

export function getResendFromEmail(fromEmail, resendDomain) {
  const domain = resendDomain || 'masuood.exhibitgraphicsign.com';
  if (!fromEmail) {
    return `info@${domain}`;
  }
  const parts = fromEmail.split('@');
  const localPart = parts[0] || 'info';
  return `${localPart}@${domain}`;
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
  const { getSystemSettings } = await import('./systemSettingsService.js');
  const settings = await getSystemSettings().catch(() => ({ useResend: false, resendDomain: 'masuood.exhibitgraphicsign.com' }));

  const recipients = normalizeRecipientList(to);
  if (!recipients.length) {
    console.error('[Email] ERROR: At least one recipient is required.');
    throw new Error('At least one recipient is required.');
  }

  if (settings.useResend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[Email] ERROR: Resend is enabled, but RESEND_API_KEY is not configured.');
      throw new Error('Resend is enabled, but RESEND_API_KEY is not configured in environment variables.');
    }

    const resendFrom = getResendFromEmail(fromEmail, settings.resendDomain);
    const fromHeader = formatFromHeader(fromName, resendFrom);

    console.log(`[Email] Initiating email send via Resend API...`);
    console.log(`[Email] Recipient(s): ${recipients.join(', ')}`);
    console.log(`[Email] From Header: ${fromHeader}`);
    console.log(`[Email] Subject: "${subject}"`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: recipients,
        reply_to: resendFrom,
        subject,
        text,
        html,
        headers: {
          ...(inReplyTo && { 'In-Reply-To': inReplyTo }),
          ...(references && { 'References': Array.isArray(references) ? references.join(' ') : references }),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Email] Resend API ERROR: ${res.status} - ${errText}`);
      throw new Error(`Resend API failed: ${res.status} - ${errText}`);
    }

    const resultJson = await res.json();
    console.log(`[Email] Resend send success. Message ID: ${resultJson.id}`);

    try {
      const mailOptions = {
        from: fromHeader,
        to: recipients,
        replyTo: resendFrom,
        subject,
        text,
        html,
        headers: {
          'List-Unsubscribe': `<mailto:${resendFrom}?subject=unsubscribe>`,
          ...(inReplyTo && { 'In-Reply-To': inReplyTo }),
          ...(references && { 'References': Array.isArray(references) ? references.join(' ') : references }),
        },
        envelope: {
          from: resendFrom,
          to: recipients,
        },
      };
      const raw = await compileOutboundMessage(mailOptions);
      await appendOutboundCopyToSent(raw, fromEmail);
    } catch (err) {
      console.error('[Email] Failed to append Resend email copy to IMAP Sent folder:', err.message);
    }

    return {
      messageId: resultJson.id,
      accepted: recipients,
      rejected: [],
    };
  }

  const creds = getCredentialsForEmail(fromEmail);
  const smtpUser = creds.user;
  if (!smtpUser) {
    console.error('[Email] ERROR: SMTP user is not configured in environment variables.');
    throw new Error('SMTP user is not configured.');
  }

  const smtpHost = process.env.EMAIL_SMTP_HOST;
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
  const secure = smtpPort === 465;
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED);
  const fromHeader = formatFromHeader(fromName, smtpUser);

  console.log(`[Email] Initiating email send via SMTP...`);
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
    const transporter = createTransporter(fromEmail);

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
    await appendOutboundCopyToSent(raw, fromEmail);
    console.log(`[Email] Successfully completed email process for: ${recipients.join(', ')}`);
    return result;
  } catch (error) {
    console.error(`[Email] FATAL ERROR sending email to ${recipients.join(', ')}:`, error);
    throw error;
  }
}

export function createTransporter(fromEmail) {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED);
  const creds = getCredentialsForEmail(fromEmail);
  const domain = creds.user.includes('@') ? creds.user.split('@')[1] : 'exhibitgraphicsign.com';
  return nodemailer.createTransport({
    name: domain,
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: Number(process.env.EMAIL_SMTP_PORT || 465) === 465,
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
    tls: { rejectUnauthorized },
  });
}

export function createImapClient(email) {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_IMAP_TLS_REJECT_UNAUTHORIZED);
  const creds = getCredentialsForEmail(email);
  return new ImapFlow({
    host: process.env.EMAIL_IMAP_HOST,
    port: Number(process.env.EMAIL_IMAP_PORT || 993),
    secure: Number(process.env.EMAIL_IMAP_PORT || 993) === 993,
    auth: {
      user: creds.user,
      pass: creds.pass,
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
