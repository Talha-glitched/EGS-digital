import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { Reply } from '../src/models/Reply.js';
import { Email } from '../src/models/Email.js';
import { SendJob } from '../src/models/SendJob.js';

function parseEmailAndName(rawFrom = '') {
  const match = String(rawFrom).match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/) || String(rawFrom).match(/<([^>]+)>/);
  let name = '';
  let email = '';

  if (match) {
    name = (match[1] || '').trim();
    email = (match[2] || match[0]).replace(/[<>]/g, '').trim().toLowerCase();
  } else {
    email = String(rawFrom).trim().toLowerCase();
  }

  return { name: name || 'Contact', email };
}

async function runBackfill() {
  const mongoUri = process.env.MONGODB_URI;
  const apiKey = process.env.RESEND_API_KEY;

  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const existingMessageIds = new Set((await Email.find().select('messageId').lean()).map((e) => e.messageId));
  console.log(`Loaded ${existingMessageIds.size} existing Email message IDs.`);

  let totalInboundStored = 0;
  let totalOutboundStored = 0;
  let sendJobsMigrated = 0;

  // 1. Backfill from local SendJob DB collection
  console.log('Phase 1: Migrating local SendJobs to Email collection...');
  const sendJobs = await SendJob.find({ status: 'sent' }).lean();
  const leadsMap = new Map((await Lead.find({ deletedAt: null }).select('_id companyId campaignId email').lean()).map((l) => [String(l._id), l]));

  const newEmailDocs = [];
  for (const job of sendJobs) {
    const msgId = job.providerMessageId || String(job._id);
    if (!existingMessageIds.has(msgId)) {
      existingMessageIds.add(msgId);
      const recipient = job.recipientEmail || '';
      const lead = job.leadId ? leadsMap.get(String(job.leadId)) : null;

      newEmailDocs.push({
        direction: 'outbound',
        from: process.env.RESEND_FROM_EMAIL || 'Rana <rana@masuood.exhibitgraphicsign.com>',
        fromEmail: 'rana@masuood.exhibitgraphicsign.com',
        to: [recipient].filter(Boolean),
        toEmail: recipient,
        subject: job.renderedSubject || '(No subject)',
        body: job.renderedBody || '',
        sentAt: job.sentAt || job.createdAt,
        messageId: msgId,
        resendEmailId: job.providerMessageId || '',
        leadId: job.leadId || null,
        companyId: lead ? lead.companyId : null,
        campaignId: job.campaignId || (lead ? lead.campaignId : null),
        status: 'sent',
        provider: 'resend',
        humanReview: { status: 'Not Required' },
      });
      sendJobsMigrated++;
    }
  }

  if (newEmailDocs.length > 0) {
    await Email.insertMany(newEmailDocs, { ordered: false }).catch(() => {});
  }
  console.log(`Phase 1 Complete: Migrated ${sendJobsMigrated} SendJobs.`);

  // 2. Fetch Inbound Emails from Resend Receiving API
  if (apiKey) {
    console.log('Phase 2: Fetching Inbound Emails from Resend Receiving API...');
    try {
      const res = await fetch('https://api.resend.com/emails/receiving?limit=100', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const body = await res.json();
        const items = Array.isArray(body.data) ? body.data : [];
        console.log(`Found ${items.length} inbound email items from Resend.`);

        for (const item of items) {
          const { name, email } = parseEmailAndName(item.from);
          if (!email) continue;

          let bodyText = (item.text || item.html || '').trim();
          if (!bodyText && item.id) {
            try {
              const detailRes = await fetch(`https://api.resend.com/emails/receiving/${item.id}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
              });
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                bodyText = (detailJson.text || detailJson.html || '').trim();
              }
            } catch (dErr) {
              console.warn(`Detail fetch failed for ${item.id}:`, dErr.message);
            }
          }

          const msgId = item.message_id || item.id;
          if (!existingMessageIds.has(msgId)) {
            existingMessageIds.add(msgId);
            const lead = await Lead.findOne({
              email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
              deletedAt: null,
            }).lean();

            await Email.create({
              direction: 'inbound',
              from: item.from || email,
              fromEmail: email,
              to: Array.isArray(item.to) ? item.to : [item.to].filter(Boolean),
              toEmail: Array.isArray(item.to) ? parseEmailAndName(item.to[0]).email : email,
              subject: item.subject || 'Inbound Email',
              body: bodyText || item.subject || '',
              receivedAt: item.created_at ? new Date(item.created_at) : new Date(),
              messageId: msgId,
              resendEmailId: item.id,
              leadId: lead ? lead._id : null,
              companyId: lead ? lead.companyId : null,
              campaignId: lead ? lead.campaignId : null,
              status: 'received',
              provider: 'resend',
              suggestedIntent: 'Neutral',
              humanReview: { status: 'Unreviewed' },
            });
            totalInboundStored++;
          }
        }
      } else {
        console.warn('Resend Receiving API returned status:', res.status);
      }
    } catch (err) {
      console.error('Error fetching Resend inbound emails:', err.message);
    }

    // 3. Fetch Outbound Emails from Resend Outbound API
    console.log('Phase 3: Fetching Outbound Emails from Resend API...');
    try {
      const res = await fetch('https://api.resend.com/emails?limit=100', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const body = await res.json();
        const items = Array.isArray(body.data) ? body.data : [];
        console.log(`Found ${items.length} outbound email items from Resend.`);

        for (const item of items) {
          if (!item.id) continue;
          if (!existingMessageIds.has(item.id)) {
            existingMessageIds.add(item.id);
            const recipientStr = Array.isArray(item.to) ? item.to[0] : item.to;
            const { email: recipientEmail } = parseEmailAndName(recipientStr);
            const { email: senderEmail } = parseEmailAndName(item.from);

            const lead = recipientEmail
              ? await Lead.findOne({ email: new RegExp(`^${recipientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), deletedAt: null }).lean()
              : null;

            await Email.create({
              direction: 'outbound',
              from: item.from || 'System',
              fromEmail: senderEmail || item.from || '',
              to: Array.isArray(item.to) ? item.to : [item.to].filter(Boolean),
              toEmail: recipientEmail || '',
              subject: item.subject || '',
              body: item.text || item.html || '',
              sentAt: item.created_at ? new Date(item.created_at) : new Date(),
              messageId: item.id,
              resendEmailId: item.id,
              leadId: lead ? lead._id : null,
              companyId: lead ? lead.companyId : null,
              campaignId: lead ? lead.campaignId : null,
              status: item.last_event || 'sent',
              provider: 'resend',
              humanReview: { status: 'Not Required' },
            });
            totalOutboundStored++;
          }
        }
      } else {
        console.warn('Resend Outbound API returned status:', res.status);
      }
    } catch (err) {
      console.error('Error fetching Resend outbound emails:', err.message);
    }
  }

  const finalTotal = await Email.countDocuments();
  console.log('==============================================');
  console.log('Backfill Summary:');
  console.log(`- SendJobs Migrated: ${sendJobsMigrated}`);
  console.log(`- Resend Inbound Emails Stored: ${totalInboundStored}`);
  console.log(`- Resend Outbound Emails Stored: ${totalOutboundStored}`);
  console.log(`- Total Emails in Database: ${finalTotal}`);
  console.log('==============================================');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

runBackfill().catch((err) => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
