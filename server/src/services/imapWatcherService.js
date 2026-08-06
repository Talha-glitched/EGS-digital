import db from '../db/index.js';
import { classifyInboundEmail } from './resendAutoSyncService.js';
import { purgeLeadFromQueue } from './sequenceService.js';
import { ensureReplyReviewTask } from './replyReviewTaskService.js';
import { coordinateReplyFocus } from './campaignContactCoordinationService.js';
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
    `SELECT p.id, p.display_name, pcm.id AS person_contact_method_id,
            por.organization_id, cc.id AS campaign_contact_id, ca.campaign_id
     FROM person_contact_methods pcm
     JOIN people p ON pcm.person_id = p.id
     LEFT JOIN person_organization_roles por ON por.person_id = p.id
     LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
     LEFT JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
     WHERE pcm.normalized_value = $1 AND pcm.type = 'email'
     ORDER BY cc.created_at DESC NULLS LAST
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
      personContactMethodId: row.person_contact_method_id,
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
    `SELECT m.id, m.conversation_id, c.campaign_contact_id, c.campaign_id
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.external_message_id = $1 LIMIT 1`,
    [finalMsgId]
  );
  if (checkMsg.rows.length > 0) {
    const existing = checkMsg.rows[0];
    let repairedContext = false;
    if (lead.personContactMethodId) {
      const participant = await db.query(
        `INSERT INTO conversation_participants (
           conversation_id, person_contact_method_id, participant_role,
           endpoint_type_snapshot, endpoint_value_snapshot
         ) SELECT $1::uuid, $2::uuid, 'sender', 'email', $3
         WHERE NOT EXISTS (
           SELECT 1 FROM conversation_participants
           WHERE conversation_id = $1::uuid AND person_contact_method_id = $2::uuid
         ) RETURNING id`,
        [existing.conversation_id, lead.personContactMethodId, lead.email]
      );
      repairedContext = participant.rowCount > 0;
    }
    if ((!existing.campaign_contact_id && lead.campaignContactId) || (!existing.campaign_id && lead.campaignId)) {
      await db.query(
        `UPDATE conversations SET
           campaign_contact_id = COALESCE(campaign_contact_id, $2::uuid),
           campaign_id = COALESCE(campaign_id, $3::uuid)
         WHERE id = $1::uuid`,
        [existing.conversation_id, lead.campaignContactId || null, lead.campaignId || null]
      );
      repairedContext = true;
    }
    return { duplicate: true, repairedContext };
  }

  const subject = message.envelope?.subject || '';
  const { status: targetStatus, intent: suggestedIntent } = classifyInboundEmail(subject, text);
  const replyIntent = suggestedIntent === 'Opt Out' ? 'Opt Out' : suggestedIntent === 'OOO' ? 'OOO' : 'Neutral';
  const senderEmail = String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();

  const replyDate = message.envelope?.date ? new Date(message.envelope.date) : new Date();
  const headerSection = getMimeHeaderSection(String(message.source || ''));
  const referencedMessageIds = extractMessageIdCandidatesFromHeaders(headerSection)
    .filter((candidate) => normalizeMessageIdToken(candidate) !== normalizeMessageIdToken(finalMsgId));

  let conversation = null;
  if (referencedMessageIds.length) {
    const existingConversation = await db.query(
      `SELECT c.id, c.campaign_contact_id, c.campaign_id
       FROM messages parent_message
       JOIN conversations c ON c.id = parent_message.conversation_id
       WHERE parent_message.external_message_id = ANY($1::text[])
       ORDER BY parent_message.occurred_at DESC NULLS LAST
       LIMIT 1`,
      [referencedMessageIds]
    );
    conversation = existingConversation.rows[0] || null;
  }

  if (!conversation) {
    const convRes = await db.query(
      `INSERT INTO conversations (
         channel, external_thread_id, subject, campaign_contact_id, campaign_id
       ) VALUES ('email', $1, $2, $3::uuid, $4::uuid)
       RETURNING id, campaign_contact_id, campaign_id`,
      [finalMsgId, subject || 'Inbound Reply', lead.campaignContactId || null, lead.campaignId || null]
    );
    conversation = convRes.rows[0];
  } else if ((!conversation.campaign_contact_id && lead.campaignContactId) || (!conversation.campaign_id && lead.campaignId)) {
    const updated = await db.query(
      `UPDATE conversations
       SET campaign_contact_id = COALESCE(campaign_contact_id, $2::uuid),
           campaign_id = COALESCE(campaign_id, $3::uuid)
       WHERE id = $1::uuid
       RETURNING id, campaign_contact_id, campaign_id`,
      [conversation.id, lead.campaignContactId || null, lead.campaignId || null]
    );
    conversation = updated.rows[0];
  }
  const convId = conversation.id;

  if (lead.personContactMethodId) {
    await db.query(
      `INSERT INTO conversation_participants (
         conversation_id, person_contact_method_id, participant_role,
         endpoint_type_snapshot, endpoint_value_snapshot
       )
       SELECT $1::uuid, $2::uuid, 'sender', 'email', $3
       WHERE NOT EXISTS (
         SELECT 1 FROM conversation_participants
         WHERE conversation_id = $1::uuid AND participant_role = 'sender'
           AND person_contact_method_id = $2::uuid
       )`,
      [convId, lead.personContactMethodId, senderEmail || lead.email]
    );
  }

  const insertedMessage = await db.query(
    `INSERT INTO messages (conversation_id, direction, channel, external_message_id, subject, body, delivery_state, occurred_at)
     VALUES ($1::uuid, 'inbound', 'email', $2, $3, $4, 'received', $5)
     RETURNING id`,
    [convId, finalMsgId, subject || 'Inbound Reply', text.slice(0, MAX_REPLY_TEXT), replyDate]
  );

  if (lead.campaignContactId) {
    await db.query(
      `UPDATE campaign_contacts
       SET lead_state = $1, delivery_state = 'Replied', outcome = $1
       WHERE id = $2::uuid`,
      [targetStatus, lead.campaignContactId]
    );
  }

  await ensureReplyReviewTask(
    {
      id: convId,
      conversation_id: convId,
      sourceMessageId: insertedMessage.rows[0].id,
      intent: replyIntent,
      subject,
      text: text.slice(0, MAX_REPLY_TEXT),
    },
    lead
  );

  await coordinateReplyFocus({ campaignContactId: lead.campaignContactId, sourceMessageId: insertedMessage.rows[0].id });
  console.log(`[IMAP Reply] Human reply registered; campaign-account follow-up focused on Lead ID: ${lead.id}`);

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
    SELECT * FROM (
      SELECT c.id AS thread_id, c.subject, m.body, m.occurred_at, m.direction,
             p.display_name AS poc_name, o.canonical_name AS company_name,
             COALESCE(c.campaign_id, ca.campaign_id) AS campaign_id, cmp.name AS campaign_name,
             COALESCE(campaign_role.title, display_role.title) AS designation,
             phone.normalized_value AS phone_number, ps.assessment AS poc_assessment,
             m.suggested_intent,
             ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY m.occurred_at DESC) AS message_rank
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      LEFT JOIN campaign_contacts cc ON cc.id = c.campaign_contact_id
      LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
      LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = cc.role_id
      LEFT JOIN LATERAL (
        SELECT pcm.person_id
        FROM conversation_participants cp
        JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
        WHERE cp.conversation_id = c.id
        ORDER BY CASE WHEN cp.participant_role = 'sender' THEN 0 ELSE 1 END, cp.id
        LIMIT 1
      ) participant_person ON TRUE
      LEFT JOIN people p ON p.id = COALESCE(campaign_role.person_id, participant_person.person_id)
      LEFT JOIN LATERAL (
        SELECT por.id, por.organization_id, por.title
        FROM person_organization_roles por
        WHERE por.person_id = p.id
        ORDER BY CASE WHEN por.organization_id = ca.organization_id THEN 0 ELSE 1 END,
                 por.effective_to NULLS FIRST, por.created_at DESC
        LIMIT 1
      ) display_role ON TRUE
      LEFT JOIN organizations o ON o.id = COALESCE(ca.organization_id, display_role.organization_id)
      LEFT JOIN campaigns cmp ON cmp.id = COALESCE(c.campaign_id, ca.campaign_id)
      LEFT JOIN LATERAL (
        SELECT normalized_value
        FROM person_contact_methods
        WHERE person_id = p.id AND type = 'phone'
        ORDER BY preferred DESC NULLS LAST, created_at
        LIMIT 1
      ) phone ON TRUE
      LEFT JOIN LATERAL (
        SELECT assessment
        FROM poc_suitabilities
        WHERE role_id = COALESCE(campaign_role.id, display_role.id)
        ORDER BY assessed_at DESC NULLS LAST
        LIMIT 1
      ) ps ON TRUE
      WHERE m.direction = 'inbound'
        AND COALESCE(m.is_migration_duplicate, false) = false
  `;
  const params = [];
  if (campaignId) {
    params.push(campaignId);
    sql += ` AND COALESCE(c.campaign_id, ca.campaign_id) = $1::uuid`;
  }
  sql += `) inbox_rows WHERE message_rank = 1 ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
  params.push(Math.min(Number(limit) || 100, 500));

  const res = await db.query(sql, params);

  const pocStatus = (assessment) => ({
    suitable: 'Confirmed',
    unsuitable: 'WrongContact',
    redirected_with_referral: 'RedirectedWithReferral',
    redirected_without_referral: 'RedirectedNoReferral',
    unknown: 'Unverified',
  }[assessment] || 'Unverified');

  return res.rows.map((row) => ({
    _id: row.thread_id,
    campaignName: row.campaign_name || 'Direct / no campaign',
    campaignId: row.campaign_id,
    pocName: row.poc_name || 'Contact',
    companyName: row.company_name || '',
    designation: row.designation || '',
    phoneNumber: row.phone_number || '',
    hasResponded: true,
    leadStage: 'lead',
    pocQualification: { status: pocStatus(row.poc_assessment) },
    intent: row.suggested_intent || 'Neutral',
    latestMessageBody: (row.body || '').slice(0, 120),
    receivedAt: row.occurred_at,
    history: [
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
    `SELECT c.id AS thread_id, c.subject, m.id AS message_id, m.body, m.direction, m.occurred_at,
            p.id AS person_id, p.display_name AS poc_name, o.canonical_name AS company_name,
            COALESCE(c.campaign_id, ca.campaign_id) AS campaign_id,
            cmp.name AS campaign_name,
            COALESCE(campaign_role.title, display_role.title) AS designation,
            phone.normalized_value AS phone_number, ps.assessment AS poc_assessment,
            m.suggested_intent
     FROM conversations c
     JOIN messages m ON m.conversation_id = c.id
     LEFT JOIN campaign_contacts cc ON cc.id = c.campaign_contact_id
     LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
     LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = cc.role_id
     LEFT JOIN LATERAL (
       SELECT pcm.person_id
       FROM conversation_participants cp
       JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
       WHERE cp.conversation_id = c.id
       ORDER BY CASE WHEN cp.participant_role = 'sender' THEN 0 ELSE 1 END, cp.id
       LIMIT 1
     ) participant_person ON TRUE
     LEFT JOIN people p ON p.id = COALESCE(campaign_role.person_id, participant_person.person_id)
     LEFT JOIN LATERAL (
       SELECT por.id, por.organization_id, por.title
       FROM person_organization_roles por
       WHERE por.person_id = p.id
       ORDER BY CASE WHEN por.organization_id = ca.organization_id THEN 0 ELSE 1 END,
                por.effective_to NULLS FIRST, por.created_at DESC
       LIMIT 1
     ) display_role ON TRUE
     LEFT JOIN organizations o ON o.id = COALESCE(ca.organization_id, display_role.organization_id)
     LEFT JOIN campaigns cmp ON cmp.id = COALESCE(c.campaign_id, ca.campaign_id)
     LEFT JOIN LATERAL (
       SELECT normalized_value
       FROM person_contact_methods
       WHERE person_id = p.id AND type = 'phone'
       ORDER BY preferred DESC NULLS LAST, created_at
       LIMIT 1
     ) phone ON TRUE
     LEFT JOIN LATERAL (
       SELECT assessment
       FROM poc_suitabilities
       WHERE role_id = COALESCE(campaign_role.id, display_role.id)
       ORDER BY assessed_at DESC NULLS LAST
       LIMIT 1
     ) ps ON TRUE
     WHERE c.id = $1::uuid
       AND COALESCE(m.is_migration_duplicate, false) = false
     ORDER BY m.occurred_at ASC`,
    [threadId]
  );

  if (!res.rows.length) {
    const error = new Error('Thread not found.');
    error.status = 404;
    throw error;
  }

  const first = res.rows[0];
  const pocQualificationStatus = {
    suitable: 'Confirmed',
    unsuitable: 'WrongContact',
    redirected_with_referral: 'RedirectedWithReferral',
    redirected_without_referral: 'RedirectedNoReferral',
    unknown: 'Unverified',
  }[first.poc_assessment] || 'Unverified';
  const history = res.rows.map((r) => ({
    messageId: r.message_id,
    type: r.direction,
    subject: r.subject,
    body: r.body,
    timestamp: r.occurred_at,
  }));

  return {
    _id: first.thread_id,
    leadId: first.person_id,
    pocName: first.poc_name || 'Contact',
    companyName: first.company_name || '',
    campaignId: first.campaign_id,
    campaignName: first.campaign_name || 'Direct / no campaign',
    designation: first.designation || '',
    phoneNumber: first.phone_number || '',
    hasResponded: true,
    leadStage: 'lead',
    pocQualification: { status: pocQualificationStatus },
    intent: first.suggested_intent || 'Neutral',
    history,
  };
}
