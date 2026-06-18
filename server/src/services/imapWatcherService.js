import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { SendJob } from '../models/SendJob.js';
import { classifyReplyIntent } from './openaiService.js';
import { freezeLeadSequence, purgeLeadFromQueue } from './sequenceService.js';
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

const MAX_REPLY_TEXT = 2000;
let isSyncing = false;
let syncTimer = null;

async function findLeadForMessage(message) {
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

  const fromAddress =
    extractMailboxFromHeader(headerSection, 'Reply-To') ||
    String(message.envelope?.from?.[0]?.address || '').trim().toLowerCase();
  if (!fromAddress) return null;

  return Lead.findOne({
    email: fromAddress,
    deliveryStatus: { $in: ['Emailed Outbound', 'Replied'] },
  }).sort({ updatedAt: -1 });
}

async function handleBounceMessage(message, text) {
  const fromAddr = message.envelope?.from?.[0]?.address || '';
  if (!isBounceSender(fromAddr) && !/delivery status notification|undeliverable/i.test(text)) {
    return null;
  }

  const bouncedEmail = extractBouncedEmailFromBody(text);
  if (!bouncedEmail) return null;

  const lead = await Lead.findOne({ email: bouncedEmail }).sort({ updatedAt: -1 });
  if (!lead) return { bouncedEmail, leadFound: false };

  await freezeLeadSequence(lead._id, 'bounce');
  await Suppression.updateOne(
    { email: lead.email },
    { $set: { email: lead.email, reason: 'bounced', campaignId: lead.campaignId, leadId: lead._id } },
    { upsert: true }
  );
  await purgeLeadFromQueue(lead._id);

  return { bouncedEmail, leadId: lead._id };
}

async function handleHumanReply(lead, message, text) {
  const messageId = String(message.envelope?.messageId || '').trim();
  if (messageId && (await Reply.exists({ messageId }))) {
    return { duplicate: true };
  }

  const { intent, confidence } = await classifyReplyIntent(text);
  const from = message.envelope?.from?.map((item) => item.address).join(', ') || lead.email;
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

  await Reply.create({
    campaignId: lead.campaignId,
    leadId: lead._id,
    email: lead.email,
    from,
    subject,
    text: text.slice(0, MAX_REPLY_TEXT),
    messageId: messageId || stableSyntheticMessageId(message.uid, process.env.EMAIL_IMAP_HOST),
    receivedAt: message.envelope?.date || new Date(),
    intent: replyIntent,
    threadHistory,
  });

  if (intent === 'Opt Out') {
    await freezeLeadSequence(lead._id, 'opt_out');
    await Suppression.updateOne(
      { email: lead.email },
      { $set: { email: lead.email, reason: 'opted_out', campaignId: lead.campaignId, leadId: lead._id } },
      { upsert: true }
    );
    await purgeLeadFromQueue(lead._id);
  } else {
    await freezeLeadSequence(lead._id, 'reply');
  }

  return { stored: true, intent: replyIntent, confidence, companyName: company?.companyName, projectName: project?.projectName };
}

export async function syncImapMailbox() {
  if (isSyncing) return { skipped: true };
  isSyncing = true;

  const stats = {
    scanned: 0,
    replies: 0,
    bounces: 0,
    optOuts: 0,
    skippedDuplicate: 0,
    skippedNoLead: 0,
    error: null,
  };

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * resolveImapSyncDays());
      const uids = await client.search({ since });
      const maxMsgs = Math.min(Number(process.env.EMAIL_IMAP_SYNC_MAX_MESSAGES) || 4000, 20000);
      const cappedUids = uids.length > maxMsgs ? uids.slice(-maxMsgs) : uids;
      const imapHost = process.env.EMAIL_IMAP_HOST || 'imap';

      for await (const message of client.fetch(cappedUids, { envelope: true, source: true, uid: true }, { uid: true })) {
        stats.scanned += 1;
        const text = String(message.source || '').slice(0, MAX_REPLY_TEXT * 2);
        const fromAddr = message.envelope?.from?.[0]?.address || '';

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
        if (messageId && (await Reply.exists({ messageId }))) {
          stats.skippedDuplicate += 1;
          continue;
        }

        const result = await handleHumanReply(lead, message, text);
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
    console.error('IMAP watcher failed:', error.message);
  } finally {
    await client.logout().catch(() => {});
    isSyncing = false;
  }

  return stats;
}

export function startImapWatcher() {
  if (syncTimer) return;
  const intervalMs = Number(process.env.IMAP_WATCH_INTERVAL_MS) || 3 * 60 * 1000;
  syncTimer = setInterval(() => {
    syncImapMailbox().catch((err) => console.error('IMAP sync error:', err.message));
  }, intervalMs);
  syncImapMailbox().catch(() => {});
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

  const replies = await Reply.find(query).sort({ receivedAt: -1 }).limit(Math.min(limit, 500)).lean();
  if (!replies.length) return [];

  const leadIds = replies.map((r) => r.leadId);
  const campaignIds = [...new Set(replies.map((r) => String(r.campaignId)))];

  const [leads, campaigns] = await Promise.all([
    Lead.find({ _id: { $in: leadIds } }).lean(),
    ProjectCampaign.find({ _id: { $in: campaignIds } }).select('projectName').lean(),
  ]);

  const companyIds = leads.map((l) => l.companyId).filter(Boolean);
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();

  const leadMap = new Map(leads.map((l) => [String(l._id), l]));
  const campaignMap = new Map(campaigns.map((c) => [String(c._id), c]));
  const companyMap = new Map(companies.map((c) => [String(c._id), c]));

  return replies.map((reply) => {
    const lead = leadMap.get(String(reply.leadId));
    const company = lead ? companyMap.get(String(lead.companyId)) : null;
    const campaign = campaignMap.get(String(reply.campaignId));
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
      threadHistory: reply.threadHistory || [
        { type: 'inbound', body: reply.text, subject: reply.subject, timestamp: reply.receivedAt },
      ],
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
      body: `Sequence step ${job.stepIndex + 1} delivered.`,
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
