import db from '../db/index.js';
import { classifyInboundEmail } from './resendAutoSyncService.js';
import { freezeLeadSequence, purgeLeadFromQueue } from './sequenceService.js';
import { ensureReplyReviewTask } from './replyReviewTaskService.js';
import {
  createImapClient,
  resolveImapSyncDays,
  stableSyntheticMessageId,
  getMimeHeaderSection,
  extractMessageIdCandidatesFromHeaders,
  normalizeMessageIdToken,
  extractMailboxFromHeader,
  isBounceSender,
  extractBouncedEmailFromBody,
} from './mailTransport.js';

const MAX_REPLY_TEXT = 100000;
const activeSyncs = new Set();
let syncTimer = null;

export function decodeQuotedPrintable(str) {
  return String(str || '')
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function parseEmailSourceToText(source) {
  const s = String(source || '');
  const boundaryMatch = s.match(/boundary=["']?([^"'\r\n;]+)["']?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = s.split('--' + boundary);

    let textPart = '';
    for (const part of parts) {
      if (/content-type:\s*text\/plain/i.test(part)) {
        textPart = part;
        break;
      }
    }

    if (!textPart && parts.length > 1) {
      textPart = parts.find(p => p.trim() && !p.includes('content-type:'));
    }

    if (textPart) {
      const blankLineIdx = textPart.search(/\r?\n\r?\n/);
      let headers = '';
      let body = textPart;
      if (blankLineIdx !== -1) {
        headers = textPart.slice(0, blankLineIdx);
        body = textPart.slice(blankLineIdx + 4);
      }

      body = body.trim().replace(/--$/, '');

      if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
        body = decodeQuotedPrintable(body);
      } else if (/content-transfer-encoding:\s*base64/i.test(headers)) {
        body = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8');
      }

      return body.trim();
    }
  }

  const blankLineIdx = s.search(/\r?\n\r?\n/);
  if (blankLineIdx === -1) return s.trim();

  const headers = s.slice(0, blankLineIdx);
  let body = s.slice(blankLineIdx + 4).trim();

  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    body = decodeQuotedPrintable(body);
  } else if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    body = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8');
  }

  return body.trim();
}

async function findLeadForMessage(message) {
  const fromAddress = String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();
  const smtpUser = String(process.env.EMAIL_SMTP_USER || '').trim().toLowerCase();
  const smtpUser2 = String(process.env.EMAIL_SMTP_USER2 || '').trim().toLowerCase();
  if (fromAddress === smtpUser || (smtpUser2 && fromAddress === smtpUser2)) {
    return null;
  }

  const raw = String(message.source || '');
  const headerSection = getMimeHeaderSection(raw);
  const resolvedFromAddress = extractMailboxFromHeader(headerSection, 'Reply-To') || fromAddress;
  if (!resolvedFromAddress) return null;

  // Search person in PostgreSQL by email
  const res = await db.query(
    `SELECT p.id, p.display_name, por.organization_id, cc.id AS campaign_contact_id, ca.campaign_id
     FROM person_contact_methods pcm
     JOIN people p ON pcm.person_id = p.id
     LEFT JOIN person_organization_roles por ON por.person_id = p.id
     LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
     LEFT JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
     WHERE pcm.normalized_value = $1 AND pcm.type = 'email'
     LIMIT 1`,
    [resolvedFromAddress.toLowerCase()]
  );

  if (res.rows.length > 0) {
    const row = res.rows[0];
    return {
      _id: row.id,
      id: row.id,
      name: row.display_name,
      email: resolvedFromAddress,
      companyId: row.organization_id,
      campaignId: row.campaign_id,
      campaignContactId: row.campaign_contact_id,
    };
  }

  return null;
}

async function handleBounceMessage(message, text) {
  const fromAddr = message.envelope?.from?.[0]?.address || '';
  if (!isBounceSender(fromAddr) && !/delivery status notification|undeliverable/i.test(text)) {
    return null;
  }

  const bouncedEmail = extractBouncedEmailFromBody(text);
  if (!bouncedEmail) return null;

  // Insert into PostgreSQL endpoint_suppressions
  await db.query(
    `INSERT INTO endpoint_suppressions (endpoint, reason)
     VALUES ($1, 'bounced')
     ON CONFLICT DO NOTHING`,
    [bouncedEmail.toLowerCase()]
  );

  return { bouncedEmail, leadFound: true };
}

async function handleHumanReply(lead, message, text, systemInbox = '') {
  const messageId = String(message.envelope?.messageId || '').trim();
  const finalMsgId = messageId || stableSyntheticMessageId(message.uid, process.env.EMAIL_IMAP_HOST);

  // Check if message already exists in PostgreSQL
  const checkMsg = await db.query(
    `SELECT id FROM messages WHERE external_message_id = $1 LIMIT 1`,
    [finalMsgId]
  );
  if (checkMsg.rows.length > 0) {
    return { duplicate: true };
  }

  const subject = message.envelope?.subject || '';
  const { status: targetStatus, intent: suggestedIntent } = classifyInboundEmail(subject, text);
  const replyIntent = suggestedIntent === 'Opt Out' ? 'Opt Out' : suggestedIntent === 'OOO' ? 'OOO' : 'Neutral';
  const senderEmail = String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();

  const replyDate = message.envelope?.date ? new Date(message.envelope.date) : new Date();

  // Create conversation and message in PostgreSQL
  const convRes = await db.query(
    `INSERT INTO conversations (channel, external_thread_id, subject)
     VALUES ('email', $1, $2) RETURNING id`,
    [finalMsgId, subject || 'Inbound Reply']
  );
  const convId = convRes.rows[0].id;

  await db.query(
    `INSERT INTO messages (conversation_id, direction, channel, external_message_id, subject, body, delivery_state, occurred_at)
     VALUES ($1::uuid, 'inbound', 'email', $2, $3, $4, 'received', $5)`,
    [convId, finalMsgId, subject || 'Inbound Reply', text.slice(0, MAX_REPLY_TEXT), replyDate]
  );

  if (lead.campaignContactId) {
    await db.query(
      `UPDATE campaign_contacts SET lead_state = $1 WHERE id = $2::uuid`,
      [targetStatus, lead.campaignContactId]
    );
  }

  await ensureReplyReviewTask(
    { id: convId, conversation_id: convId, intent: replyIntent, subject, text: text.slice(0, MAX_REPLY_TEXT) },
    lead
  );

  await freezeLeadSequence(lead.id, 'reply');
  console.log(`[IMAP Reply] Human reply registered for review and sequence frozen for Lead ID: ${lead.id}`);

  return { stored: true, intent: replyIntent };
}

export async function syncImapMailboxForUser(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return { skipped: true };
  if (activeSyncs.has(normalizedEmail)) return { skipped: true };
  activeSyncs.add(normalizedEmail);

  const stats = {
    scanned: 0,
    replies: 0,
    bounces: 0,
    optOuts: 0,
    skippedDuplicate: 0,
    skippedNoLead: 0,
    error: null,
  };

  const client = createImapClient(normalizedEmail);
  client.on('error', (err) => {
    console.error(`IMAP client connection/stream error for ${normalizedEmail}:`, err.message);
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * resolveImapSyncDays());
      const uids = await client.search({ since });
      const maxMsgs = Math.min(Number(process.env.EMAIL_IMAP_SYNC_MAX_MESSAGES) || 4000, 20000);
      const cappedUids = uids.length > maxMsgs ? uids.slice(-maxMsgs) : uids;

      for await (const message of client.fetch(cappedUids, { envelope: true, source: true, uid: true }, { uid: true })) {
        stats.scanned += 1;
        const fromAddr = String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();
        const smtpUser = String(process.env.EMAIL_SMTP_USER || '').trim().toLowerCase();
        const smtpUser2 = String(process.env.EMAIL_SMTP_USER2 || '').trim().toLowerCase();
        if (fromAddr === smtpUser || (smtpUser2 && fromAddr === smtpUser2)) {
          stats.skippedNoLead += 1;
          continue;
        }

        const text = parseEmailSourceToText(message.source).slice(0, MAX_REPLY_TEXT * 2);

        if (isBounceSender(fromAddr) || /undeliverable|delivery status notification/i.test(text)) {
          const bounceResult = await handleBounceMessage(message, text);
          if (bounceResult?.bouncedEmail) stats.bounces += 1;
          continue;
        }

        const lead = await findLeadForMessage(message);
        if (!lead) {
          stats.skippedNoLead += 1;
          continue;
        }

        const result = await handleHumanReply(lead, message, text, normalizedEmail);
        if (result?.stored) {
          stats.replies += 1;
          if (result.intent === 'Opt Out') stats.optOuts += 1;
        } else if (result?.duplicate) {
          stats.skippedDuplicate += 1;
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    stats.error = error.message;
    console.error(`IMAP watcher failed for ${normalizedEmail}:`, error.message);
  } finally {
    await client.logout().catch(() => { });
    activeSyncs.delete(normalizedEmail);
  }

  return stats;
}

export async function syncImapMailbox() {
  const users = [
    process.env.EMAIL_SMTP_USER,
    process.env.EMAIL_SMTP_USER2,
  ].filter(Boolean);

  const results = {};
  for (const user of users) {
    try {
      results[user] = await syncImapMailboxForUser(user);
    } catch (err) {
      console.error(`IMAP sync failed for ${user}:`, err.message);
      results[user] = { error: err.message };
    }
  }
  return results;
}

export function startImapWatcher() {
  if (syncTimer) return;
  const intervalMs = Number(process.env.IMAP_WATCH_INTERVAL_MS) || 3 * 60 * 1000;
  syncTimer = setInterval(() => {
    syncImapMailbox().catch((err) => console.error('IMAP sync error:', err.message));
  }, intervalMs);
  syncImapMailbox().catch(() => { });
}

export function stopImapWatcher() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function listInboxThreads({ limit = 100, campaignId } = {}) {
  let sql = `
    SELECT c.id AS thread_id, c.subject, m.body, m.occurred_at, m.direction,
           p.display_name AS poc_name, o.canonical_name AS company_name,
           ca.campaign_id, cmp.name AS campaign_name
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
    LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
    LEFT JOIN people p ON pcm.person_id = p.id
    LEFT JOIN person_organization_roles por ON por.person_id = p.id
    LEFT JOIN organizations o ON por.organization_id = o.id
    LEFT JOIN campaign_accounts ca ON ca.organization_id = o.id
    LEFT JOIN campaigns cmp ON ca.campaign_id = cmp.id
    WHERE m.direction = 'inbound'
  `;
  const params = [];
  if (campaignId) {
    params.push(campaignId);
    sql += ` AND ca.campaign_id = $1::uuid`;
  }
  sql += ` ORDER BY m.occurred_at DESC LIMIT $${params.length + 1}`;
  params.push(Math.min(Number(limit) || 100, 500));

  const res = await db.query(sql, params);

  return res.rows.map((row) => ({
    _id: row.thread_id,
    campaignName: row.campaign_name || 'Campaign',
    campaignId: row.campaign_id,
    pocName: row.poc_name || 'Contact',
    companyName: row.company_name || '',
    intent: 'Neutral',
    latestMessageBody: (row.body || '').slice(0, 120),
    receivedAt: row.occurred_at,
    threadHistory: [
      {
        type: row.direction,
        subject: row.subject,
        body: row.body,
        timestamp: row.occurred_at,
      },
    ],
  }));
}

export async function getInboxThread(threadId) {
  const res = await db.query(
    `SELECT c.id AS thread_id, c.subject, m.body, m.direction, m.occurred_at,
            p.display_name AS poc_name, o.canonical_name AS company_name, ca.campaign_id
     FROM conversations c
     JOIN messages m ON m.conversation_id = c.id
     LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
     LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
     LEFT JOIN people p ON pcm.person_id = p.id
     LEFT JOIN person_organization_roles por ON por.person_id = p.id
     LEFT JOIN organizations o ON por.organization_id = o.id
     LEFT JOIN campaign_accounts ca ON ca.organization_id = o.id
     WHERE c.id = $1::uuid
     ORDER BY m.occurred_at ASC`,
    [threadId]
  );

  if (!res.rows.length) {
    const error = new Error('Thread not found.');
    error.status = 404;
    throw error;
  }

  const first = res.rows[0];
  const history = res.rows.map((r) => ({
    type: r.direction,
    subject: r.subject,
    body: r.body,
    timestamp: r.occurred_at,
  }));

  return {
    _id: first.thread_id,
    pocName: first.poc_name || 'Contact',
    companyName: first.company_name || '',
    campaignId: first.campaign_id,
    intent: 'Neutral',
    history,
  };
}
