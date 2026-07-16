import { Router } from 'express';
import { Webhook } from 'svix';
import { Lead } from '../models/Lead.js';
import { Reply } from '../models/Reply.js';
import { Company } from '../models/Company.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { Suppression } from '../models/Suppression.js';
import { classifyReplyIntent } from '../services/openaiService.js';
import { freezeLeadSequence, purgeLeadFromQueue } from '../services/sequenceService.js';
import { buildLeadEmailQuery, getLeadEmailCandidates, getPrimaryLeadEmail, applyOutreachEmailFromReply } from '../utils/contactEmails.js';

const router = Router();
const MAX_REPLY_TEXT = 2000;

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
  const text = String(data.text || '').slice(0, MAX_REPLY_TEXT);

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
  if (messageId && (await Reply.exists({ messageId }))) {
    console.log(`[Webhook Reply] Duplicate reply skipped. Message ID: ${messageId}`);
    return;
  }

  // Classify reply intent using OpenAI
  const { intent, confidence } = await classifyReplyIntent(text);
  const replyIntent = intent === 'Opt Out' ? 'Opt Out' : intent === 'Interested' ? 'Interested' : 'Neutral';

  // Apply sender details to lead document
  applyOutreachEmailFromReply(lead, senderEmail);
  await lead.save();

  // Construct thread history entry
  const threadHistory = [
    {
      type: 'inbound',
      body: text,
      subject,
      timestamp: data.date || new Date(),
      messageId,
    },
  ];

  // Save the Reply document
  await Reply.create({
    campaignId: lead.campaignId,
    leadId: lead._id,
    email: lead.email,
    from: rawFrom,
    subject,
    text,
    messageId,
    receivedAt: data.date || new Date(),
    intent: replyIntent,
    threadHistory,
  });

  // Freeze sequence and process opt-outs
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
    console.log(`[Webhook Reply] Opt-out processed and sequence frozen for Lead ID: ${lead._id}`);
  } else {
    await freezeLeadSequence(lead._id, 'reply');
    console.log(`[Webhook Reply] Human reply registered and sequence frozen for Lead ID: ${lead._id}`);
  }
}

export default router;
