import crypto from 'crypto';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { Campaign } from '../models/Campaign.js';
import { Recipient } from '../models/Recipient.js';
import { Reply } from '../models/Reply.js';
import { SendEvent } from '../models/SendEvent.js';
import { Suppression } from '../models/Suppression.js';
import { renderCampaignEmail } from './emailTemplateService.js';

const SEND_INTERVAL_MS = 18 * 1000;
const REPLY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MAX_REPLY_TEXT_LENGTH = 2000;

let senderTimer = null;
let replyTimer = null;
let isSending = false;
let isSyncingReplies = false;

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function getBaseUrl() {
  return process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function getMailConfigStatus() {
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

/** When false, skip TLS certificate verification (dev / self-signed / some proxies). Prefer NODE_EXTRA_CA_CERTS in production. */
function envTlsRejectUnauthorized(imapSpecificEnv) {
  const raw = String(imapSpecificEnv ?? process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? '').toLowerCase();
  if (raw === 'false' || raw === '0') {
    return false;
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  return true;
}

function assertAdminFeatureReady() {
  if (!hasDatabaseConnection()) {
    const error = new Error('MongoDB is required for email campaign admin.');
    error.status = 503;
    throw error;
  }
}

function assertSmtpReady() {
  const { smtpReady } = getMailConfigStatus();
  if (!smtpReady) {
    const error = new Error('SMTP settings are not configured.');
    error.status = 503;
    throw error;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildStats(total, groupedStatuses) {
  const stats = {
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    replied: 0,
    unsubscribed: 0,
    skipped: 0,
    total,
  };

  groupedStatuses.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(stats, row._id)) {
      stats[row._id] = row.count;
    }
  });

  return stats;
}

async function refreshCampaignStats(campaignId) {
  const [total, groupedStatuses] = await Promise.all([
    Recipient.countDocuments({ campaignId }),
    Recipient.aggregate([
      { $match: { campaignId: new mongoose.Types.ObjectId(campaignId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);
  const stats = buildStats(total, groupedStatuses);
  const isDone = stats.queued === 0 && stats.sending === 0;
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) {
    return null;
  }

  const nextStatus = campaign.status === 'running' && isDone ? 'completed' : campaign.status;
  campaign.stats = stats;
  campaign.status = nextStatus;
  if (nextStatus === 'completed' && !campaign.completedAt) {
    campaign.completedAt = new Date();
  }
  await campaign.save();
  return campaign.toObject();
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 465),
    secure: Number(process.env.EMAIL_SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function createImapClient() {
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
    tls: {
      rejectUnauthorized,
    },
  });
}

function getUnsubscribeUrl(recipient) {
  return `${getBaseUrl().replace(/\/$/, '')}/api/unsubscribe/${recipient.unsubscribeToken}`;
}

async function markFailed(recipient, reason) {
  recipient.status = 'failed';
  recipient.failureReason = reason;
  await recipient.save();
  await Suppression.updateOne(
    { email: recipient.email },
    {
      $setOnInsert: {
        email: recipient.email,
        reason: 'hard-fail',
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
      },
    },
    { upsert: true }
  );
  await SendEvent.create({
    campaignId: recipient.campaignId,
    recipientId: recipient._id,
    type: 'failed',
    message: reason,
  });
}

async function sendOneRecipient() {
  if (isSending || !hasDatabaseConnection()) {
    return;
  }

  isSending = true;
  try {
    const campaign = await Campaign.findOne({ status: 'running' }).sort({ updatedAt: 1 });
    if (!campaign) {
      return;
    }

    const previousSendAt = campaign.lastSendAt?.getTime() || 0;
    const waitMs = previousSendAt + SEND_INTERVAL_MS - Date.now();
    if (waitMs > 0) {
      return;
    }

    const recipient = await Recipient.findOneAndUpdate(
      { campaignId: campaign._id, status: 'queued' },
      { $set: { status: 'sending' } },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!recipient) {
      await refreshCampaignStats(campaign._id);
      return;
    }

    const suppressed = await Suppression.findOne({ email: recipient.email });
    if (suppressed) {
      recipient.status = 'skipped';
      recipient.failureReason = `Suppressed: ${suppressed.reason}`;
      await recipient.save();
      await SendEvent.create({
        campaignId: campaign._id,
        recipientId: recipient._id,
        type: 'skipped',
        message: recipient.failureReason,
      });
      await refreshCampaignStats(campaign._id);
      return;
    }

    const transporter = createTransporter();
    const rendered = renderCampaignEmail({
      campaign,
      recipient,
      unsubscribeUrl: getUnsubscribeUrl(recipient),
    });

    try {
      const result = await transporter.sendMail({
        from: `"${campaign.fromName}" <${campaign.fromEmail}>`,
        to: recipient.email,
        subject: rendered.subject,
        html: rendered.html,
      });

      recipient.status = 'sent';
      recipient.messageId = String(result.messageId || '').trim();
      recipient.sentAt = new Date();
      await recipient.save();

      campaign.lastSendAt = new Date();
      await campaign.save();

      await SendEvent.create({
        campaignId: campaign._id,
        recipientId: recipient._id,
        type: 'sent',
        messageId: recipient.messageId,
        message: 'Email sent.',
      });
    } catch (error) {
      await markFailed(recipient, error.message || 'SMTP send failed.');
    }

    await refreshCampaignStats(campaign._id);
  } finally {
    isSending = false;
  }
}

function ensureSenderLoop() {
  if (senderTimer) {
    return;
  }

  senderTimer = setInterval(() => {
    sendOneRecipient().catch((error) => console.error('Email campaign sender failed:', error));
  }, 1000);
}

async function findReplyRecipient(message) {
  const raw = String(message.source || '');
  const headerSection = getMimeHeaderSection(raw);
  const candidates = extractMessageIdCandidatesFromHeaders(headerSection);

  if (candidates.length) {
    const recipientByMessageId = await Recipient.findOne({
      messageId: { $in: candidates },
      status: { $in: ['sent', 'replied'] },
    });
    if (recipientByMessageId) {
      return recipientByMessageId;
    }

    const normBases = new Set(candidates.map(normalizeMessageIdToken).filter(Boolean));
    if (normBases.size) {
      const recent = await Recipient.find({
        status: { $in: ['sent', 'replied'] },
        messageId: { $nin: ['', null] },
      })
        .sort({ sentAt: -1 })
        .limit(5000)
        .select('_id messageId')
        .lean();

      const hit = recent.find((row) => normBases.has(normalizeMessageIdToken(row.messageId)));
      if (hit) {
        return Recipient.findById(hit._id);
      }
    }
  }

  const fromAddress =
    extractMailboxFromHeader(headerSection, 'Reply-To') ||
    normalizeEmail(message.envelope?.from?.[0]?.address);
  if (!fromAddress) {
    return null;
  }

  return Recipient.findOne({
    email: fromAddress,
    status: { $in: ['sent', 'replied'] },
  }).sort({ sentAt: -1 });
}

function extractMailboxFromHeader(headerSection, headerName) {
  const re = new RegExp(`^${headerName}:\\s*(.+)`, 'im');
  const match = re.exec(headerSection);
  if (!match) {
    return '';
  }
  const firstLine = match[1].split(/\r?\n/)[0];
  const addr = firstLine.match(/<([^>]+)>/);
  if (addr) {
    return normalizeEmail(addr[1]);
  }
  const loose = firstLine.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return loose ? normalizeEmail(loose[0]) : '';
}

function getMimeHeaderSection(source) {
  const s = String(source || '');
  const idx = s.search(/\r?\n\r?\n/);
  return idx === -1 ? s : s.slice(0, idx);
}

function normalizeMessageIdToken(value) {
  return String(value || '')
    .replace(/[\r\n]/g, ' ')
    .replace(/[<>"']/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function expandMessageIdForLookup(token) {
  const raw = String(token || '').trim();
  if (!raw) {
    return [];
  }
  const inner = raw.replace(/^<|>$/g, '').trim();
  if (!inner || !inner.includes('@')) {
    return [];
  }
  const lower = inner.toLowerCase();
  return [...new Set([raw, inner, `<${inner}>`, `<${lower}>`, lower])];
}

function extractMessageIdCandidatesFromHeaders(headerSection) {
  const variants = new Set();
  const re = /<[^\s<>]+@[^\s<>]+>/g;
  let match;
  while ((match = re.exec(headerSection)) !== null) {
    expandMessageIdForLookup(match[0]).forEach((v) => variants.add(v));
  }
  return [...variants];
}

function resolveImapSyncDays() {
  const n = Number(process.env.EMAIL_IMAP_SYNC_DAYS);
  if (Number.isFinite(n) && n > 0) {
    return Math.min(n, 730);
  }
  return 120;
}

function stableSyntheticMessageId(uid, host) {
  const safeHost = String(host || 'imap').replace(/[^a-z0-9.-]/gi, '') || 'imap';
  return `<egs-sync-uid-${uid}@${safeHost}>`;
}

function formatEnvelopeAddresses(list) {
  if (!list || !Array.isArray(list)) {
    return '';
  }
  return list
    .map((item) => {
      const addr = item?.address || '';
      const name = item?.name || '';
      if (name && addr) return `${name} <${addr}>`;
      return addr || name || '';
    })
    .filter(Boolean)
    .join(', ');
}

function cloneEnvelope(envelope) {
  if (!envelope) {
    return null;
  }
  try {
    return structuredClone(envelope);
  } catch {
    try {
      return JSON.parse(JSON.stringify(envelope));
    } catch {
      return null;
    }
  }
}

async function syncReplies() {
  const stats = {
    scanned: 0,
    stored: 0,
    skippedDuplicate: 0,
    skippedNoRecipient: 0,
    skippedNoUid: 0,
    imapMessages: 0,
    searchCapped: false,
    processingUids: 0,
    syncDays: resolveImapSyncDays(),
    note: null,
    error: null,
  };

  const { imapReady } = getMailConfigStatus();
  if (isSyncingReplies || !hasDatabaseConnection() || !imapReady) {
    stats.error = !imapReady ? 'IMAP not configured' : 'Database not ready';
    return stats;
  }

  isSyncingReplies = true;
  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * resolveImapSyncDays());
      const uids = await client.search({ since });
      stats.imapMessages = uids.length;
      const maxMsgs = Math.min(Math.max(Number(process.env.EMAIL_IMAP_SYNC_MAX_MESSAGES) || 4000, 50), 20000);
      const cappedUids = uids.length > maxMsgs ? uids.slice(-maxMsgs) : uids;
      stats.searchCapped = uids.length > maxMsgs;
      stats.processingUids = cappedUids.length;

      if (!cappedUids.length) {
        stats.note = stats.imapMessages ? `No messages in the last ${stats.syncDays} days (or folder empty).` : 'INBOX search returned no messages.';
      }

      if (cappedUids.length) {
        const imapHost = process.env.EMAIL_IMAP_HOST || 'imap';

        for await (const message of client.fetch(cappedUids, { envelope: true, source: true, uid: true }, { uid: true })) {
          stats.scanned += 1;
          const uid = message.uid || message.seq;
          if (!uid) {
            stats.skippedNoUid += 1;
            continue;
          }

          let messageId = String(message.envelope?.messageId || '').trim();
          if (!messageId) {
            messageId = stableSyntheticMessageId(uid, imapHost);
          }

          if (await Reply.exists({ messageId })) {
            stats.skippedDuplicate += 1;
            continue;
          }

          const recipient = await findReplyRecipient(message);
          if (!recipient) {
            stats.skippedNoRecipient += 1;
            continue;
          }

          const from = message.envelope?.from?.map((item) => item.address).join(', ') || recipient.email;
          const subject = message.envelope?.subject || '';
          const source = String(message.source || '');
          const text = source.slice(0, MAX_REPLY_TEXT_LENGTH);

          await Reply.create({
            campaignId: recipient.campaignId,
            recipientId: recipient._id,
            email: recipient.email,
            from,
            subject,
            text,
            messageId,
            receivedAt: message.envelope?.date || new Date(),
          });

          recipient.status = 'replied';
          recipient.repliedAt = new Date();
          await recipient.save();
          await SendEvent.create({
            campaignId: recipient.campaignId,
            recipientId: recipient._id,
            type: 'reply',
            message: `Reply received: ${subject}`,
            messageId,
          });
          await refreshCampaignStats(recipient.campaignId);
          stats.stored += 1;
        }
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    stats.error = error.message || 'IMAP sync failed';
    console.error('Email reply sync failed:', error.message);
  } finally {
    await client.logout().catch(() => {});
    isSyncingReplies = false;
  }

  return stats;
}

function ensureReplyLoop() {
  if (replyTimer) {
    return;
  }

  replyTimer = setInterval(() => {
    syncReplies().catch((error) => console.error('Email reply sync failed:', error));
  }, REPLY_SYNC_INTERVAL_MS);
}

export function initializeCampaignRuntime() {
  ensureSenderLoop();
  ensureReplyLoop();
}

export function getAdminStatus() {
  const mail = getMailConfigStatus();
  const imapTlsVerify = envTlsRejectUnauthorized(process.env.EMAIL_IMAP_TLS_REJECT_UNAUTHORIZED);
  return {
    mongodbReady: hasDatabaseConnection(),
    smtpReady: mail.smtpReady,
    imapReady: mail.imapReady,
    imapTlsVerify,
    imapSyncDays: resolveImapSyncDays(),
    throttlePerHour: 200,
  };
}

export async function createCampaign({ name, subject, body, contacts }) {
  assertAdminFeatureReady();
  const fromEmail = process.env.EMAIL_SMTP_USER || 'info@exhibitgraphicsign.com';

  const uniqueContacts = [];
  const seen = new Set();
  contacts.forEach((contact) => {
    const email = normalizeEmail(contact.email);
    if (!email || seen.has(email)) {
      return;
    }
    seen.add(email);
    uniqueContacts.push({
      email,
      name: String(contact.name || '').trim(),
      company: String(contact.company || '').trim(),
    });
  });

  const campaign = await Campaign.create({
    name,
    subject,
    body,
    fromEmail,
    stats: { total: uniqueContacts.length, queued: uniqueContacts.length },
  });

  const suppressions = await Suppression.find({ email: { $in: uniqueContacts.map((item) => item.email) } }).lean();
  const suppressed = new Map(suppressions.map((item) => [item.email, item]));

  if (uniqueContacts.length) {
    await Recipient.insertMany(
      uniqueContacts.map((contact) => {
        const suppression = suppressed.get(contact.email);
        return {
          campaignId: campaign._id,
          ...contact,
          status: suppression ? 'skipped' : 'queued',
          failureReason: suppression ? `Suppressed: ${suppression.reason}` : '',
        };
      }),
      { ordered: false }
    );
  }

  await SendEvent.insertMany(
    uniqueContacts.map((contact) => ({
      campaignId: campaign._id,
      recipientId: null,
      type: suppressed.has(contact.email) ? 'skipped' : 'queued',
      message: contact.email,
    })),
    { ordered: false }
  ).catch(() => {});

  return refreshCampaignStats(campaign._id);
}

export async function listCampaigns() {
  assertAdminFeatureReady();
  return Campaign.find().sort({ createdAt: -1 }).lean();
}

export async function getCampaign(id) {
  assertAdminFeatureReady();
  const [campaign, recipients, replies, events] = await Promise.all([
    Campaign.findById(id).lean(),
    Recipient.find({ campaignId: id }).sort({ createdAt: 1 }).limit(500).lean(),
    Reply.find({ campaignId: id }).sort({ receivedAt: -1 }).limit(100).lean(),
    SendEvent.find({ campaignId: id }).sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  if (!campaign) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  return { campaign, recipients, replies, events };
}

export async function updateCampaignStatus(id, status) {
  assertAdminFeatureReady();
  if (status === 'running') {
    assertSmtpReady();
  }

  const update = { status };
  if (status === 'running') {
    update.startedAt = new Date();
    update.completedAt = null;
  }
  if (status === 'cancelled') {
    update.completedAt = new Date();
  }

  const campaign = await Campaign.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!campaign) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  ensureSenderLoop();
  return refreshCampaignStats(id);
}

export async function unsubscribeByToken(token) {
  assertAdminFeatureReady();
  const recipient = await Recipient.findOne({ unsubscribeToken: token });
  if (!recipient) {
    return null;
  }

  recipient.status = 'unsubscribed';
  recipient.unsubscribedAt = new Date();
  await recipient.save();
  await Suppression.updateOne(
    { email: recipient.email },
    {
      $set: {
        email: recipient.email,
        reason: 'unsubscribe',
        campaignId: recipient.campaignId,
        recipientId: recipient._id,
      },
    },
    { upsert: true }
  );
  await SendEvent.create({
    campaignId: recipient.campaignId,
    recipientId: recipient._id,
    type: 'unsubscribed',
    message: 'Recipient unsubscribed.',
  });
  await refreshCampaignStats(recipient.campaignId);
  return recipient;
}

export async function syncRepliesNow() {
  return syncReplies();
}

export async function listInboxReplies({ limit = 100, campaignId } = {}) {
  assertAdminFeatureReady();
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const query = {};
  if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
    query.campaignId = new mongoose.Types.ObjectId(campaignId);
  }

  const replies = await Reply.find(query).sort({ receivedAt: -1 }).limit(capped).lean();
  if (!replies.length) {
    return [];
  }

  const campaignIds = [...new Set(replies.map((row) => String(row.campaignId)))];
  const campaigns = await Campaign.find({ _id: { $in: campaignIds } }).select('name').lean();
  const nameById = new Map(campaigns.map((c) => [String(c._id), c.name]));

  return replies.map((reply) => ({
    ...reply,
    campaignName: nameById.get(String(reply.campaignId)) || 'Campaign',
  }));
}

/**
 * Live INBOX listing for the admin UI (not only CRM-linked replies).
 * Adds crmReply when a Reply row exists, and canImport when sync would attach to a recipient.
 */
export async function listRawInboxFromImap({ limit = 150 } = {}) {
  const { imapReady } = getMailConfigStatus();
  if (!imapReady) {
    const error = new Error('IMAP is not configured.');
    error.status = 503;
    throw error;
  }

  const cap = Math.min(Math.max(Number(limit) || 150, 10), 400);
  const maxPool = Math.min(Math.max(Number(process.env.EMAIL_IMAP_RAW_LIST_MAX) || 600, cap), 1200);

  const client = createImapClient();
  const rows = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * resolveImapSyncDays());
      const uids = await client.search({ since });
      const pool = uids.length > maxPool ? uids.slice(-maxPool) : uids;
      const slice = pool.length > cap ? pool.slice(-cap) : pool;
      const imapHost = process.env.EMAIL_IMAP_HOST || 'imap';

      for await (const message of client.fetch(slice, { envelope: true, source: true, uid: true }, { uid: true })) {
        const uid = message.uid || message.seq;
        const env = message.envelope;
        const source = String(message.source || '');
        let messageId = String(env?.messageId || '').trim();
        if (!messageId && uid) {
          messageId = stableSyntheticMessageId(uid, imapHost);
        }

        rows.push({
          uid,
          messageId,
          subject: env?.subject || '',
          from: formatEnvelopeAddresses(env?.from),
          to: formatEnvelopeAddresses(env?.to),
          date: env?.date || null,
          snippet: source.slice(0, 900).replace(/\s+/g, ' ').trim(),
          envelope: cloneEnvelope(env),
          rawSource: source,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  rows.sort((a, b) => {
    const ta = new Date(a.date || 0).getTime();
    const tb = new Date(b.date || 0).getTime();
    return tb - ta;
  });

  const mongoReady = hasDatabaseConnection();
  if (mongoReady && rows.length) {
    const idVariants = new Set();
    rows.forEach((row) => {
      idVariants.add(row.messageId);
      expandMessageIdForLookup(row.messageId).forEach((v) => idVariants.add(v));
    });

    const replyList = await Reply.find({ messageId: { $in: [...idVariants] } }).lean();
    const replyByNorm = new Map();
    for (const rep of replyList) {
      replyByNorm.set(rep.messageId, rep);
      replyByNorm.set(normalizeMessageIdToken(rep.messageId), rep);
    }

    const campaignIds = [...new Set(replyList.map((r) => String(r.campaignId)))];
    const campaigns = await Campaign.find({ _id: { $in: campaignIds } }).select('name').lean();
    const nameById = new Map(campaigns.map((c) => [String(c._id), c.name]));

    for (const row of rows) {
      const rep = replyByNorm.get(row.messageId) || replyByNorm.get(normalizeMessageIdToken(row.messageId));
      if (rep) {
        row.crmReply = {
          _id: rep._id,
          campaignId: rep.campaignId,
          campaignName: nameById.get(String(rep.campaignId)) || 'Campaign',
          recipientEmail: rep.email,
        };
      }
    }
  }

  const MAX_LINK_CHECK = 150;
  let checked = 0;
  for (const row of rows) {
    if (row.crmReply) {
      row.canImport = true;
    } else if (checked < MAX_LINK_CHECK) {
      checked += 1;
      const recipient = await findReplyRecipient({ envelope: row.envelope, source: row.rawSource });
      row.canImport = Boolean(recipient);
    } else {
      row.canImport = false;
      row.canImportSkipped = true;
    }
    delete row.rawSource;
    delete row.envelope;
  }

  return {
    syncDays: resolveImapSyncDays(),
    imapUidCount: rows.length,
    messages: rows,
  };
}

export async function updateCampaignDraft(id, { name, subject, body } = {}) {
  assertAdminFeatureReady();
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  if (!['draft', 'paused'].includes(campaign.status)) {
    const error = new Error('Only draft or paused campaigns can be edited.');
    error.status = 400;
    throw error;
  }

  if (name !== undefined) {
    campaign.name = String(name || '').trim() || campaign.name;
  }
  if (subject !== undefined) {
    campaign.subject = String(subject || '').trim();
  }
  if (body !== undefined) {
    campaign.body = String(body ?? '');
  }

  if (!campaign.name || !campaign.subject || !campaign.body) {
    const error = new Error('Campaign name, subject, and body must be non-empty.');
    error.status = 400;
    throw error;
  }

  await campaign.save();
  return refreshCampaignStats(id);
}

export async function duplicateCampaign(sourceId) {
  assertAdminFeatureReady();
  const source = await Campaign.findById(sourceId).lean();
  if (!source) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  const recipients = await Recipient.find({ campaignId: sourceId }).select('email name company').lean();
  const contacts = recipients.map((row) => ({
    email: row.email,
    name: row.name || '',
    company: row.company || '',
  }));

  if (!contacts.length) {
    const error = new Error('This campaign has no recipients to duplicate.');
    error.status = 400;
    throw error;
  }

  return createCampaign({
    name: `${source.name} (copy)`,
    subject: source.subject,
    body: source.body,
    contacts,
  });
}

export async function sendTestEmail({ to, subject, body } = {}) {
  assertSmtpReady();
  const email = normalizeEmail(to);
  if (!email) {
    const error = new Error('A valid "to" email address is required.');
    error.status = 400;
    throw error;
  }

  const subj = String(subject || '').trim();
  const bd = String(body ?? '');
  if (!subj || !bd) {
    const error = new Error('Subject and body are required.');
    error.status = 400;
    throw error;
  }

  const campaign = {
    subject: subj,
    body: bd,
    fromEmail: process.env.EMAIL_SMTP_USER,
    fromName: process.env.EMAIL_FROM_NAME || 'Exhibit Graphic Sign',
  };

  const recipient = {
    email,
    name: 'Preview contact',
    company: 'Preview company',
    unsubscribeToken: `test${crypto.randomBytes(16).toString('hex')}`,
  };

  const transporter = createTransporter();
  const rendered = renderCampaignEmail({
    campaign,
    recipient,
    unsubscribeUrl: `${getBaseUrl().replace(/\/$/, '')}/api/unsubscribe/${recipient.unsubscribeToken}`,
  });

  await transporter.sendMail({
    from: `"${campaign.fromName}" <${campaign.fromEmail}>`,
    to: email,
    subject: rendered.subject,
    html: rendered.html,
  });

  return { ok: true };
}

export async function listSuppressions(limit = 200) {
  assertAdminFeatureReady();
  const capped = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  return Suppression.find().sort({ updatedAt: -1 }).limit(capped).lean();
}

export async function getCampaignOverview() {
  assertAdminFeatureReady();
  const [totalCampaigns, byStatus, inboxTotal, suppressionsTotal, running] = await Promise.all([
    Campaign.countDocuments(),
    Campaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reply.countDocuments(),
    Suppression.countDocuments(),
    Campaign.findOne({ status: 'running' }).select('name updatedAt').lean(),
  ]);

  const statusMap = {};
  byStatus.forEach((row) => {
    statusMap[row._id] = row.count;
  });

  return {
    totalCampaigns,
    inboxTotal,
    suppressionsTotal,
    runningCampaign: running,
    byStatus: statusMap,
  };
}

function csvEscape(value) {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export async function exportCampaignRecipientsCsv(id) {
  assertAdminFeatureReady();
  const campaign = await Campaign.findById(id).lean();
  if (!campaign) {
    const error = new Error('Campaign not found.');
    error.status = 404;
    throw error;
  }

  const rows = await Recipient.find({ campaignId: id }).sort({ createdAt: 1 }).lean();
  const header = ['email', 'name', 'company', 'status', 'failureReason', 'sentAt', 'messageId'].map(csvEscape).join(',');
  const lines = rows.map((row) =>
    [
      row.email,
      row.name,
      row.company,
      row.status,
      row.failureReason,
      row.sentAt ? row.sentAt.toISOString() : '',
      row.messageId,
    ]
      .map(csvEscape)
      .join(',')
  );

  return `${header}\n${lines.join('\n')}\n`;
}
