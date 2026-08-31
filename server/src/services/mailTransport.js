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

export function deriveNameFromEmail(email) {
  const lower = String(email || '').toLowerCase();
  if (lower.includes('masuood')) return 'Masuood-ul-Rasheed';
  if (lower.includes('haider')) return 'Dr. Haider';
  if (lower.includes('talha')) return 'Talha Masuood';
  const prefix = String(email || '').split('@')[0] || '';
  if (!prefix) return 'Exhibit Graphic Sign';
  const cleaned = prefix.split(/[._-]/)[0];
  return cleaned ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : 'Exhibit Graphic Sign';
}

export function deriveTitleFromEmail(email) {
  const lower = String(email || '').toLowerCase();
  if (lower.includes('haider')) return 'Project Director · Exhibit Graphic Sign LLC';
  if (lower.includes('masuood')) return 'Managing Director · Exhibit Graphic Sign LLC';
  if (lower.includes('talha')) return 'Operations & Technical Director · Exhibit Graphic Sign LLC';
  return 'Exhibit Graphic Sign LLC';
}

export function getConfiguredEmailAccounts() {
  const accounts = [];
  const seenEmails = new Set();

  const defaultSmtpHost = process.env.EMAIL_SMTP_HOST || 'wardah.tasjeel.ae';
  const defaultSmtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
  const defaultImapHost = process.env.EMAIL_IMAP_HOST || defaultSmtpHost;
  const defaultImapPort = Number(process.env.EMAIL_IMAP_PORT || 993);

  // 1. Check EMAIL_ACCOUNTS JSON env var
  if (process.env.EMAIL_ACCOUNTS) {
    try {
      const parsed = JSON.parse(process.env.EMAIL_ACCOUNTS);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const email = String(item.email || item.user || '').trim();
          if (email && email.includes('@') && !seenEmails.has(email.toLowerCase())) {
            seenEmails.add(email.toLowerCase());
            accounts.push({
              email,
              user: email,
              pass: item.pass || item.password || '',
              name: item.name || item.displayName || deriveNameFromEmail(email),
              title: item.title || deriveTitleFromEmail(email),
              smtpHost: item.smtpHost || item.host || defaultSmtpHost,
              smtpPort: Number(item.smtpPort || item.port || defaultSmtpPort),
              imapHost: item.imapHost || defaultImapHost,
              imapPort: Number(item.imapPort || defaultImapPort),
              isPrimary: accounts.length === 0,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[MailTransport] Failed to parse EMAIL_ACCOUNTS JSON:', err.message);
    }
  }

  // 2. Check numbered users (EMAIL_SMTP_USER, EMAIL_SMTP_USER2 ... EMAIL_SMTP_USER20)
  const scanKeys = [
    { userKey: 'EMAIL_SMTP_USER', passKey: 'EMAIL_SMTP_PASS', nameKey: 'EMAIL_SMTP_USER_NAME', titleKey: 'EMAIL_SMTP_USER_TITLE' },
  ];
  for (let i = 2; i <= 20; i++) {
    scanKeys.push({
      userKey: `EMAIL_SMTP_USER${i}`,
      altUserKey: `EMAIL_SMTP_USER_${i}`,
      passKey: `EMAIL_SMTP_USER${i}_PASS`,
      altPassKey: `EMAIL_SMTP_USER_${i}_PASS`,
      nameKey: `EMAIL_SMTP_USER${i}_NAME`,
      altNameKey: `EMAIL_SMTP_USER_${i}_NAME`,
      titleKey: `EMAIL_SMTP_USER${i}_TITLE`,
      altTitleKey: `EMAIL_SMTP_USER_${i}_TITLE`,
      smtpHostKey: `EMAIL_SMTP_USER${i}_HOST`,
      smtpPortKey: `EMAIL_SMTP_USER${i}_PORT`,
      imapHostKey: `EMAIL_IMAP_USER${i}_HOST`,
      imapPortKey: `EMAIL_IMAP_USER${i}_PORT`,
    });
  }

  for (let i = 0; i < scanKeys.length; i++) {
    const k = scanKeys[i];
    const userVal = process.env[k.userKey] || (k.altUserKey ? process.env[k.altUserKey] : '');
    const email = String(userVal || '').trim();
    if (email && email.includes('@') && !seenEmails.has(email.toLowerCase())) {
      seenEmails.add(email.toLowerCase());
      const passVal = process.env[k.passKey] || (k.altPassKey ? process.env[k.altPassKey] : '') || '';
      const nameVal = process.env[k.nameKey] || (k.altNameKey ? process.env[k.altNameKey] : '') || (i === 0 ? (process.env.EMAIL_FROM_NAME || deriveNameFromEmail(email)) : deriveNameFromEmail(email));
      const titleVal = process.env[k.titleKey] || (k.altTitleKey ? process.env[k.altTitleKey] : '') || deriveTitleFromEmail(email);
      const hostVal = (k.smtpHostKey && process.env[k.smtpHostKey]) || defaultSmtpHost;
      const portVal = Number((k.smtpPortKey && process.env[k.smtpPortKey]) || defaultSmtpPort);
      const imapHostVal = (k.imapHostKey && process.env[k.imapHostKey]) || defaultImapHost;
      const imapPortVal = Number((k.imapPortKey && process.env[k.imapPortKey]) || defaultImapPort);

      accounts.push({
        email,
        user: email,
        pass: passVal,
        name: nameVal,
        title: titleVal,
        smtpHost: hostVal,
        smtpPort: portVal,
        imapHost: imapHostVal,
        imapPort: imapPortVal,
        isPrimary: accounts.length === 0,
      });
    }
  }

  // 3. Check EMAIL_SMTP_USERS delimited format: email1:pass1:Name1,email2:pass2:Name2
  if (process.env.EMAIL_SMTP_USERS) {
    const entries = process.env.EMAIL_SMTP_USERS.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    for (const entry of entries) {
      const [entryEmail, entryPass, entryName, entryTitle] = entry.split(':').map((s) => s?.trim());
      if (entryEmail && entryEmail.includes('@') && !seenEmails.has(entryEmail.toLowerCase())) {
        seenEmails.add(entryEmail.toLowerCase());
        accounts.push({
          email: entryEmail,
          user: entryEmail,
          pass: entryPass || '',
          name: entryName || deriveNameFromEmail(entryEmail),
          title: entryTitle || deriveTitleFromEmail(entryEmail),
          smtpHost: defaultSmtpHost,
          smtpPort: defaultSmtpPort,
          imapHost: defaultImapHost,
          imapPort: defaultImapPort,
          isPrimary: accounts.length === 0,
        });
      }
    }
  }

  return accounts;
}

export function getCredentialsForEmail(fromEmail) {
  const normalizedEmail = String(fromEmail || '').trim().toLowerCase();
  const accounts = getConfiguredEmailAccounts();

  if (normalizedEmail) {
    const matched = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
    if (matched) {
      return {
        user: matched.user,
        pass: matched.pass,
        name: matched.name,
        title: matched.title,
        host: matched.smtpHost,
        port: matched.smtpPort,
        imapHost: matched.imapHost,
        imapPort: matched.imapPort,
      };
    }
  }

  const primary = accounts[0];
  if (primary) {
    return {
      user: primary.user,
      pass: primary.pass,
      name: primary.name,
      title: primary.title,
      host: primary.smtpHost,
      port: primary.smtpPort,
      imapHost: primary.imapHost,
      imapPort: primary.imapPort,
    };
  }

  return {
    user: process.env.EMAIL_SMTP_USER ? process.env.EMAIL_SMTP_USER.trim() : '',
    pass: process.env.EMAIL_SMTP_PASS || '',
    name: process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign',
    title: 'Exhibit Graphic Sign LLC',
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    imapHost: process.env.EMAIL_IMAP_HOST,
    imapPort: Number(process.env.EMAIL_IMAP_PORT || 993),
  };
}

export function getMailConfigStatus() {
  const accounts = getConfiguredEmailAccounts();
  const accountsStatus = accounts.map((acc, index) => {
    const smtpReady = Boolean(acc.smtpHost && acc.smtpPort && acc.user && acc.pass);
    const imapReady = Boolean(acc.imapHost && acc.imapPort && acc.user && acc.pass);
    return {
      index: index + 1,
      email: acc.email,
      name: acc.name,
      title: acc.title,
      user: acc.user,
      smtpHost: acc.smtpHost,
      smtpPort: acc.smtpPort,
      imapHost: acc.imapHost,
      imapPort: acc.imapPort,
      smtpReady,
      imapReady,
      isPrimary: Boolean(acc.isPrimary),
    };
  });

  const primary = accountsStatus[0];
  const secondary = accountsStatus[1];

  return {
    smtpReady: Boolean(primary?.smtpReady),
    imapReady: Boolean(primary?.imapReady),
    smtp2Ready: Boolean(secondary?.smtpReady),
    imap2Ready: Boolean(secondary?.imapReady),
    accounts: accountsStatus,
  };
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
  const saveAction = (async () => {
    const client = createImapClient(fromEmail);
    try {
      await client.connect();
      const lock = await client.getMailboxLock(folder);
      try {
        await client.append(folder, rawMessage, ['\\Seen']);
      } finally {
        lock.release();
      }
    } finally {
      try {
        await client.logout();
      } catch {
        /* ignore */
      }
    }
  })();

  const timeoutAction = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('IMAP append timeout (4s exceeded)')), 4000)
  );

  try {
    await Promise.race([saveAction, timeoutAction]);
  } catch (error) {
    console.error(`Failed to save outbound copy to Sent folder for ${fromEmail || 'unknown'}:`, error.message);
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
  campaignId,
  attachments,
}) {
  const recipients = normalizeRecipientList(to);
  if (!recipients.length) {
    console.error('[Email] ERROR: At least one recipient is required.');
    throw new Error('At least one recipient is required.');
  }

  const creds = getCredentialsForEmail(fromEmail);
  const smtpUser = creds.user;
  if (!smtpUser) {
    console.error('[Email] ERROR: SMTP user is not configured in environment variables.');
    throw new Error('SMTP user is not configured (EMAIL_SMTP_USER).');
  }

  const smtpHost = creds.smtpHost || creds.host || process.env.EMAIL_SMTP_HOST || 'wardah.tasjeel.ae';
  const formattedAttachments = Array.isArray(attachments) ? attachments : [];
  const smtpPort = Number(creds.smtpPort || creds.port || process.env.EMAIL_SMTP_PORT || 465);
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
    attachments: formattedAttachments,
    headers: {
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
    let result;
    try {
      result = await transporter.sendMail(mailOptions);
    } catch (primaryErr) {
      const isConnTimeout = /timeout|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNREFUSED|ENOTFOUND|greeting/i.test(primaryErr.message || '');
      const primaryPort = Number(creds.smtpPort || creds.port || process.env.EMAIL_SMTP_PORT || 465);
      const fallbackPort = primaryPort === 465 ? 587 : 465;

      if (isConnTimeout) {
        console.warn(`[Email] Primary Port ${primaryPort} timed out/failed (${primaryErr.message}). Retrying on Port ${fallbackPort}...`);
        try {
          const fallbackTransporter = createTransporter(fromEmail, { port: fallbackPort, secure: fallbackPort === 465 });
          result = await fallbackTransporter.sendMail(mailOptions);
          console.log(`[Email] Fallback to Port ${fallbackPort} SUCCESS.`);
        } catch (fallbackErr) {
          console.error(`[Email] Port ${fallbackPort} retry also failed:`, fallbackErr.message);
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }
    console.log(`[Email] nodemailer.sendMail SUCCESS. SMTP Response:`, JSON.stringify(result, null, 2));

    const accepted = normalizeRecipientList(result?.accepted);
    const missing = recipients.filter((recipient) => !accepted.includes(recipient));
    if (missing.length) {
      const rejected = result?.rejected?.length ? ` Rejected: ${result.rejected.join(', ')}` : '';
      const errorMsg = `SMTP server did not accept recipient(s): ${missing.join(', ')}.${rejected} Response: ${result?.response || 'n/a'}`;
      console.error(`[Email] ERROR: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`[Email] Appending outbound copy to IMAP Sent folder asynchronously...`);
    appendOutboundCopyToSent(raw, fromEmail).catch((err) => {
      console.error('[Email] IMAP append error:', err.message);
    });

    console.log(`[Email] Successfully completed email process for: ${recipients.join(', ')}`);
    return result;
  } catch (error) {
    console.error(`[Email] FATAL ERROR sending email to ${recipients.join(', ')}:`, error.message || error);
    throw error;
  }
}

export function createTransporter(fromEmail, overrideOptions = {}) {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED);
  const creds = getCredentialsForEmail(fromEmail);
  const domain = creds.user.includes('@') ? creds.user.split('@')[1] : 'exhibitgraphicsign.com';
  const port = Number(overrideOptions.port || creds.smtpPort || creds.port || process.env.EMAIL_SMTP_PORT || 465);
  const host = overrideOptions.host || creds.smtpHost || creds.host || process.env.EMAIL_SMTP_HOST || 'wardah.tasjeel.ae';
  const secure = overrideOptions.secure !== undefined ? overrideOptions.secure : port === 465;

  return nodemailer.createTransport({
    name: domain,
    host,
    port,
    secure,
    ...(port === 587 && { requireTLS: true }),
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
    tls: { rejectUnauthorized },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export function createImapClient(email, overrideOptions = {}) {
  const rejectUnauthorized = envTlsRejectUnauthorized(process.env.EMAIL_IMAP_TLS_REJECT_UNAUTHORIZED);
  const creds = getCredentialsForEmail(email);
  const port = Number(overrideOptions.port || creds.imapPort || process.env.EMAIL_IMAP_PORT || 993);
  const host = overrideOptions.host || creds.imapHost || process.env.EMAIL_IMAP_HOST || 'wardah.tasjeel.ae';

  return new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
    logger: false,
    tls: { rejectUnauthorized },
    connectionTimeout: 8000,
  });
}

export function resolveImapSyncDays() {
  const n = Number(process.env.EMAIL_IMAP_SYNC_DAYS);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 730);
  return 120;
}

export function getFromIdentity(project) {
  const customEmail = project?.fromEmail || project?.from_email;
  const customName = project?.fromName || project?.from_name;
  const accounts = getConfiguredEmailAccounts();
  const primary = accounts[0] || {};

  const resolvedEmail = customEmail || primary.email || 'haider@exhibitgraphicsign.com';
  const matchedAccount = accounts.find((a) => a.email.toLowerCase() === String(resolvedEmail).toLowerCase());
  const resolvedName = customName || matchedAccount?.name || (customEmail ? deriveNameFromEmail(customEmail) : (process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign'));
  const resolvedTitle = matchedAccount?.title || deriveTitleFromEmail(resolvedEmail);

  return {
    fromEmail: resolvedEmail,
    fromName: resolvedName,
    fromTitle: resolvedTitle,
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
