import { Router } from 'express';
import { Webhook } from 'svix';
import { Lead } from '../models/Lead.js';
import { Reply } from '../models/Reply.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { Email } from '../models/Email.js';
import { freezeLeadSequence, purgeLeadFromQueue } from '../services/sequenceService.js';
import { buildLeadEmailQuery, getLeadEmailCandidates, getPrimaryLeadEmail, applyOutreachEmailFromReply } from '../utils/contactEmails.js';
import { syncAllResendReplies, classifyInboundEmail } from '../services/resendAutoSyncService.js';

const router = Router();
const MAX_REPLY_TEXT = 100000;

// Helper to extract clean email address from "Name <email@domain.com>" or "email@domain.com"
function extractEmailAddress(fromStr) {
  if (!fromStr) return '';
  const match = String(fromStr).match(/<([^>]+)>/);
  return (match ? match[1] : fromStr).trim().toLowerCase();
}

// Helper to extract Resend ID (e.g., "re_123456789") from In-Reply-To/References headers
function extractResendId(headerValue) {
  if (!headerValue) return null;
  const match = String(headerValue).match(/<(re_[a-zA-Z0-9]+)@/i);
  if (match) {
    return match[1];
  }
  return String(headerValue).replace(/[<>]/g, '').split('@')[0].trim();
}

router.post('/resend', async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook] ERROR: RESEND_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  // 1. Capture Svix signature headers
  const headers = {
    'svix-id': req.headers['svix-id'] || req.headers['webhook-id'],
    'svix-timestamp': req.headers['svix-timestamp'] || req.headers['webhook-timestamp'],
    'svix-signature': req.headers['svix-signature'] || req.headers['webhook-signature'],
  };

  // Ensure all required headers are present
  if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
    console.warn('[Webhook] Missing required Svix headers.');
    return res.status(400).json({ error: 'Missing webhook signature headers' });
  }

  try {
    // Verify signature using the raw body buffer
    const wh = new Webhook(secret);
    const payload = wh.verify(req.rawBody, headers);
    const { type, data } = payload;

    console.log(`[Webhook] Resend event received: ${type}`);

    if (type === 'email.bounced') {
      await handleBounce(data);
    } else if (type === 'email.received') {
      await handleReply(data);
      syncAllResendReplies().catch((e) => console.warn('[WebhookSync] Resend auto sync error:', e.message));
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Error processing Resend webhook:', err.message);
    res.status(400).json({ error: 'Invalid webhook signature or execution error' });
  }
});

// Helper for handling bounces
async function handleBounce(data) {
  const resendEmailId = data.email_id; // Resend's message ID (e.g. "re_xxxxxx")
  const rawRecipient = data.to?.[0];
  const recipient = extractEmailAddress(rawRecipient);

  if (!recipient) {
    console.warn('[Webhook Bounce] Bounce event lacks recipient email.');
    return;
  }

  console.log(`[Webhook Bounce] Processing bounce for: ${recipient} (Resend ID: ${resendEmailId})`);

  // Find lead by lastMessageId match or email address
  const queryCandidates = [];
  if (resendEmailId) {
    queryCandidates.push({ lastMessageId: resendEmailId });
  }
  const emailQuery = buildLeadEmailQuery(recipient);
  if (emailQuery) {
    queryCandidates.push(emailQuery);
  }

  if (queryCandidates.length === 0) return;

  const lead = await Lead.findOne({ $or: queryCandidates }).sort({ updatedAt: -1 });

  if (!lead) {
    console.warn(`[Webhook Bounce] Lead not found for bounce: ${recipient}`);
    return;
  }

  // Freeze sequence and record suppression details
  await freezeLeadSequence(lead._id, 'bounce');
  await Suppression.updateOne(
    { email: recipient },
    { $set: { email: recipient, reason: 'bounced', campaignId: lead.campaignId, leadId: lead._id } },
    { upsert: true }
  );
  await purgeLeadFromQueue(lead._id);

  console.log(`[Webhook Bounce] Successfully processed bounce for Lead ID: ${lead._id}`);
}

// Helper for handling replies (Inbound Mail)
async function handleReply(data) {
  const rawFrom = data.from;
  const senderEmail = extractEmailAddress(rawFrom);
  const subject = data.subject || '';
  let text = String(data.text || data.html || '').slice(0, MAX_REPLY_TEXT);
  const emailId = data.email_id || data.id;
  const apiKey = process.env.RESEND_API_KEY;
  if (!text.trim() && emailId && apiKey) {
    try {
      const detailRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        text = String(detailJson.text || detailJson.html || '').slice(0, MAX_REPLY_TEXT);
      }
    } catch (dErr) {
      console.warn(`[Webhook Reply] Detail fetch failed for ${emailId}:`, dErr.message);
    }
  }

  // Extract Resend ID from headers to match the thread
  const inReplyToHeader = data.headers?.['in-reply-to'] || data.headers?.['In-Reply-To'];
  const referencesHeader = data.headers?.['references'] || data.headers?.['References'];
  const resendInReplyToId = extractResendId(inReplyToHeader);
  const resendReferencesId = extractResendId(referencesHeader);

  console.log(`[Webhook Reply] Inbound email from: ${senderEmail} (Subject: "${subject}")`);

  const queryCandidates = [];
  if (resendInReplyToId) {
    queryCandidates.push({ lastMessageId: resendInReplyToId });
  }
  if (resendReferencesId) {
    queryCandidates.push({ lastMessageId: resendReferencesId });
  }
  const emailQuery = buildLeadEmailQuery(senderEmail);
  if (emailQuery) {
    queryCandidates.push(emailQuery);
  }

  if (queryCandidates.length === 0) return;

  const lead = await Lead.findOne({ $or: queryCandidates }).sort({ updatedAt: -1 });

  if (!lead) {
    console.warn(`[Webhook Reply] Lead not found for reply from: ${senderEmail}`);
    return;
  }

  // Deduplicate replies based on Message-ID
  const messageId = data.headers?.['message-id'] || data.headers?.['Message-ID'] || data.id;
  const existingReply = messageId ? await Reply.findOne({ messageId }) : null;
  if (existingReply) {
    console.log(`[Webhook Reply] Duplicate reply payload received. Repairing review task for Message ID: ${messageId}`);
    await ensureReplyReviewTask(existingReply, lead);
    return;
  }

  const rawTo = Array.isArray(data.to) ? data.to[0] : data.to;
  const systemInbox = extractEmailAddress(rawTo);

  // Compute deterministic suggested intent (no OpenAI call)
  const { status: targetStatus, intent: suggestedIntent } = classifyInboundEmail(subject, text);
  const replyIntent = suggestedIntent === 'Opt Out' ? 'Opt Out' : suggestedIntent === 'OOO' ? 'OOO' : 'Neutral';

  // Apply sender details to lead document
  const replyDate = data.date ? new Date(data.date) : new Date();
  const outreachRes = applyOutreachEmailFromReply(lead, senderEmail, systemInbox, replyDate);
  await lead.save();

  // Construct thread history entry
  const threadHistory = [
    {
      type: 'inbound',
      body: text,
      subject,
      timestamp: replyDate,
      messageId,
    },
  ];

  // Save the Reply document for review tasks
  const createdReply = await Reply.create({
    campaignId: lead.campaignId,
    leadId: lead._id,
    email: lead.email,
    from: rawFrom,
    subject,
    text,
    messageId,
    receivedAt: replyDate,
    intent: replyIntent,
    systemInbox: systemInbox || '',
    vendorSource: outreachRes.source || 'Manual',
    threadHistory,
  });

  // Save persistent Email document
  const existingEmail = await Email.findOne({ messageId });
  if (!existingEmail) {
    await Email.create({
      direction: 'inbound',
      from: rawFrom || senderEmail,
      fromEmail: senderEmail,
      to: Array.isArray(data.to) ? data.to : [data.to].filter(Boolean),
      toEmail: systemInbox || senderEmail,
      subject: subject || 'Inbound Email',
      body: text || subject || '',
      receivedAt: replyDate,
      messageId,
      resendEmailId: emailId || messageId,
      leadId: lead._id,
      companyId: lead.companyId || null,
      campaignId: lead.campaignId || null,
      status: 'received',
      provider: 'resend',
      suggestedIntent: replyIntent === 'OOO' ? 'Out of Office' : replyIntent === 'Opt Out' ? 'Opt Out' : 'Neutral',
      humanReview: { status: 'Unreviewed' },
    });
  }

  await ensureReplyReviewTask(createdReply, lead);

  await freezeLeadSequence(lead._id, 'reply');
  console.log(`[Webhook Reply] Human reply registered for review and sequence frozen for Lead ID: ${lead._id}`);
}

export default router;
