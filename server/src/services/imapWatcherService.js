import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { SendJob } from '../models/SendJob.js';
import { classifyReplyIntent } from './openaiService.js';
import { freezeLeadSequence, purgeLeadFromQueue } from './sequenceService.js';
import { buildLeadEmailQuery, getLeadEmailCandidates, getPrimaryLeadEmail, applyOutreachEmailFromReply } from '../utils/contactEmails.js';
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

function normalizeObjectIdList(values = []) {
  return [...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter(Boolean),
  )];
}

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
  const candidates = extractMessageIdCandidatesFromHeaders(headerSection);

  if (candidates.length) {
    const leadByMessageId = await Lead.findOne({
      lastMessageId: { $in: candidates },
    });
    if (leadByMessageId) return leadByMessageId;

    const normBases = new Set(candidates.map(normalizeMessageIdToken).filter(Boolean));
    if (normBases.size) {
      const recent = await Lead.find({ lastMessageId: { $nin: ['', null] } })
        .sort({ updatedAt: -1 })
        .limit(3000)
        .select('_id lastMessageId')
        .lean();
      const hit = recent.find((row) => normBases.has(normalizeMessageIdToken(row.lastMessageId)));
      if (hit) return Lead.findById(hit._id);
    }
  }

  const resolvedFromAddress =
    extractMailboxFromHeader(headerSection, 'Reply-To') || fromAddress;
  if (!resolvedFromAddress) return null;

  const emailQuery = buildLeadEmailQuery(resolvedFromAddress);
  if (!emailQuery) return null;

  return Lead.findOne(emailQuery).sort({ updatedAt: -1 });
}

async function handleBounceMessage(message, text) {
  const fromAddr = message.envelope?.from?.[0]?.address || '';
  if (!isBounceSender(fromAddr) && !/delivery status notification|undeliverable/i.test(text)) {
    return null;
  }

  const bouncedEmail = extractBouncedEmailFromBody(text);
  if (!bouncedEmail) return null;

  const emailQuery = buildLeadEmailQuery(bouncedEmail);
  const lead = emailQuery ? await Lead.findOne(emailQuery).sort({ updatedAt: -1 }) : null;
  if (!lead) return { bouncedEmail, leadFound: false };

  await freezeLeadSequence(lead._id, 'bounce');
  await Suppression.updateOne(
    { email: bouncedEmail },
    { $set: { email: bouncedEmail, reason: 'bounced', campaignId: lead.campaignId, leadId: lead._id } },
    { upsert: true }
  );
  await purgeLeadFromQueue(lead._id);

  return { bouncedEmail, leadId: lead._id };
}

async function handleHumanReply(lead, message, text, systemInbox = '') {
  const messageId = String(message.envelope?.messageId || '').trim();
  if (messageId && (await Reply.exists({ messageId }))) {
    return { duplicate: true };
  }

  const { intent, confidence } = await classifyReplyIntent(text);

  const senderEmail = String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();
  const from = message.envelope?.from?.map((item) => item.address).join(', ') || getPrimaryLeadEmail(lead);
  const subject = message.envelope?.subject || '';

  const [company, project] = await Promise.all([
    Company.findById(lead.companyId).lean(),
    ProjectCampaign.findById(lead.campaignId).lean(),
  ]);

  const threadHistory = [
    {
      type: 'inbound',
      body: text.slice(0, MAX_REPLY_TEXT),
      subject,
      timestamp: message.envelope?.date || new Date(),
      messageId,
    },
  ];

  const replyIntent = intent === 'Opt Out' ? 'Opt Out' : intent === 'Interested' ? 'Interested' : 'Neutral';

  const replyDate = message.envelope?.date ? new Date(message.envelope.date) : new Date();
  const outreachRes = applyOutreachEmailFromReply(lead, senderEmail, systemInbox, replyDate);
  await lead.save();

  const createdReply = await Reply.create({
    campaignId: lead.campaignId,
    leadId: lead._id,
    email: lead.email,
    from,
    subject,
    text: text.slice(0, MAX_REPLY_TEXT),
    messageId: messageId || stableSyntheticMessageId(message.uid, process.env.EMAIL_IMAP_HOST),
    receivedAt: replyDate,
    intent: replyIntent,
    systemInbox: systemInbox || '',
    vendorSource: outreachRes.source || detectEmailVendor(lead, senderEmail) || 'Manual',
    threadHistory,
  });

  await ensureReplyReviewTask(createdReply, lead);

  if (intent === 'Opt Out') {
    await freezeLeadSequence(lead._id, 'opt_out');
    const suppressedEmail = buildLeadEmailQuery(senderEmail) ? senderEmail : getPrimaryLeadEmail(lead);
    const emailsToSuppress = [...new Set([suppressedEmail, ...getLeadEmailCandidates(lead)].filter(Boolean))];
    await Promise.all(emailsToSuppress.map((email) => Suppression.updateOne(
      { email },
      { $set: { email, reason: 'opted_out', campaignId: lead.campaignId, leadId: lead._id } },
      { upsert: true }
    )));
    await purgeLeadFromQueue(lead._id);
  } else {
    await freezeLeadSequence(lead._id, 'reply');
  }

  return { stored: true, intent: replyIntent, confidence, companyName: company?.companyName, projectName: project?.projectName };
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
          if (bounceResult?.leadId) stats.bounces += 1;
          continue;
        }

        const lead = await findLeadForMessage(message);
        if (!lead) {
          stats.skippedNoLead += 1;
          continue;
        }

        const messageId = String(message.envelope?.messageId || '').trim();
        const existingReply = messageId ? await Reply.findOne({ messageId }) : null;
        if (existingReply) {
          stats.skippedDuplicate += 1;
          await ensureReplyReviewTask(existingReply, lead);
          continue;
        }

        const result = await handleHumanReply(lead, message, text, normalizedEmail);
        if (result?.stored) {
          stats.replies += 1;
          if (result.intent === 'Opt Out') stats.optOuts += 1;
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
  const query = {};
  if (campaignId) query.campaignId = campaignId;

  const replies = await Reply.find(query).sort({ receivedAt: -1 }).limit(500).lean();
  if (!replies.length) return [];

  const latestByLead = new Map();
  const repliesByLead = new Map();
  for (const reply of replies) {
    const leadKey = String(reply.leadId);
    if (!latestByLead.has(leadKey)) latestByLead.set(leadKey, reply);
    const list = repliesByLead.get(leadKey) || [];
    list.push(reply);
    repliesByLead.set(leadKey, list);
  }
  const threadReplies = [...latestByLead.values()].slice(0, Math.min(Number(limit) || 100, 500));

  const leadIds = threadReplies.map((r) => r.leadId);
  const campaignIds = normalizeObjectIdList(threadReplies.map((r) => r.campaignId));

  const [leads, campaigns, outboundJobs] = await Promise.all([
    Lead.find({ _id: { $in: leadIds } }).lean(),
    ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean(),
    SendJob.find({ leadId: { $in: leadIds }, status: 'sent' }).sort({ sentAt: 1 }).lean(),
  ]);

  const companyIds = leads.map((l) => l.companyId).filter(Boolean);
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();

  const leadMap = new Map(leads.map((l) => [String(l._id), l]));
  const campaignMap = new Map(campaigns.map((c) => [String(c._id), c]));
  const companyMap = new Map(companies.map((c) => [String(c._id), c]));

  return threadReplies.map((reply) => {
    const lead = leadMap.get(String(reply.leadId));
    const company = lead ? companyMap.get(String(lead.companyId)) : null;
    const campaign = campaignMap.get(String(reply.campaignId));
    const history = [
      ...outboundJobs
        .filter((job) => String(job.leadId) === String(reply.leadId))
        .map((job) => ({
          type: 'outbound',
          step: job.stepIndex + 1,
          subject: job.renderedSubject || '',
          body: job.renderedBody || `Sequence step ${job.stepIndex + 1} delivered.`,
          timestamp: job.sentAt,
          messageId: job.providerMessageId || '',
        })),
      ...(repliesByLead.get(String(reply.leadId)) || []).map((item) => ({
        type: 'inbound',
        subject: item.subject,
        body: item.text,
        timestamp: item.receivedAt,
        messageId: item.messageId,
      })),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      _id: reply._id,
      campaignName: campaign?.projectName || 'Campaign',
      campaignId: reply.campaignId,
      pocName: lead?.name || reply.email,
      companyName: company?.companyName || '',
      designation: lead?.designation || '',
      phoneNumber: lead?.phone || '',
      intent: reply.intent,
      latestMessageBody: reply.text?.slice(0, 120) || '',
      receivedAt: reply.receivedAt,
      threadHistory: history,
    };
  });
}

export async function getInboxThread(threadId) {
  const reply = await Reply.findById(threadId).lean();
  if (!reply) {
    const error = new Error('Thread not found.');
    error.status = 404;
    throw error;
  }

  const lead = await Lead.findById(reply.leadId).lean();
  const company = lead ? await Company.findById(lead.companyId).lean() : null;
  const campaign = await ProjectCampaign.findById(reply.campaignId).lean();
  const outboundJobs = await SendJob.find({ leadId: reply.leadId, status: 'sent' })
    .sort({ sentAt: 1 })
    .lean();

  const history = [...(reply.threadHistory || [])];
  outboundJobs.forEach((job, idx) => {
    history.unshift({
      type: 'outbound',
      step: job.stepIndex + 1,
      subject: job.renderedSubject || '',
      body: job.renderedBody || `Sequence step ${job.stepIndex + 1} delivered.`,
      messageId: job.providerMessageId || '',
      timestamp: job.sentAt,
    });
  });

  history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    _id: reply._id,
    pocName: lead?.name || reply.email,
    designation: lead?.designation || '',
    companyName: company?.companyName || '',
    phoneNumber: lead?.phone || '',
    campaignName: campaign?.projectName || '',
    campaignId: reply.campaignId,
    leadId: reply.leadId,
    intent: reply.intent,
    history,
  };
}
