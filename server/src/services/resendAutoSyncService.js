import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { Reply } from '../models/Reply.js';
import { Email } from '../models/Email.js';
import { ensureReplyReviewTask } from './replyReviewTaskService.js';

let cronInterval = null;

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

  if (!name && email) {
    const localPart = email.split('@')[0] || '';
    name = localPart
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return { name: name || 'Contact', email };
}

export function classifyInboundEmail(subject = '', text = '') {
  const combined = `${subject} ${text}`.toLowerCase();

  const isOOO = /automatic reply|automatische antwort|automatinis atsakymas|réponse automatique|otomatik yanıt|自动答复|out of office|out-of-office|auto-reply|autoresponder|on vacation|abwesend|off line|away from my desk/i.test(subject) ||
    /i am currently out of office|i am away from the office|automatic reply:|automatische antwort:|i will return on|i will be out of office/i.test(combined);

  if (isOOO) {
    return { status: 'Out of Office', intent: 'OOO' };
  }

  const isOptOut = /unsubscribe|stop emailing|remove me|opt out|please remove|do not contact/i.test(combined);
  if (isOptOut) {
    return { status: 'Opted Out', intent: 'Opt Out' };
  }

  return { status: 'Replied', intent: 'Neutral' };
}

export async function syncAllResendReplies() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'RESEND_API_KEY not configured.' };
  }

  try {
    let inboundFetched = 0;
    let outboundFetched = 0;
    let leadsCreated = 0;
    let leadsUpdated = 0;
    let repliesLogged = 0;
    let emailsStored = 0;

    // 1. Sync Inbound Emails from Resend Receiving API
    const receivingRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (receivingRes.ok) {
      const body = await receivingRes.json();
      const items = Array.isArray(body.data) ? body.data : [];
      inboundFetched = items.length;

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
            console.warn(`[ResendAutoSync] Detail fetch failed for ${item.id}:`, dErr.message);
          }
        }

        const { status: targetStatus, intent } = classifyInboundEmail(item.subject || '', bodyText || item.subject || '');
        const domain = email.split('@')[1] || '';
        let lead = await Lead.findOne({
          email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          deletedAt: null,
        });

        let company = null;
        if (domain) {
          company = await Company.findOne({
            domain: new RegExp(`^${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            deletedAt: null,
          });

          if (!company) {
            try {
              const compName = domain.split('.')[0].toUpperCase();
              company = await Company.create({
                companyName: compName,
                domain: domain.toLowerCase(),
                globalStatus: 'Lead',
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } catch (e) {
              console.warn('[ResendAutoSync] Company auto-create failed:', e.message);
            }
          }
        }

        if (!lead) {
          lead = await Lead.create({
            name: name || 'Contact',
            email,
            companyId: company ? company._id : null,
            companyName: company ? company.companyName : (domain || ''),
            domain: domain || (company ? company.domain : ''),
            deliveryStatus: targetStatus,
            hasResponded: true,
            pocQualification: { status: 'Unverified' },
            primarySource: 'Resend Inbound',
            sources: ['Resend Inbound'],
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
            updatedAt: new Date(),
          });
          leadsCreated += 1;
        } else {
          let changed = false;
          if (lead.deliveryStatus !== targetStatus && lead.deliveryStatus !== 'Replied') {
            lead.deliveryStatus = targetStatus;
            changed = true;
          }
          if (!lead.hasResponded) {
            lead.hasResponded = true;
            changed = true;
          }
          if (company && !lead.companyId) {
            lead.companyId = company._id;
            lead.companyName = company.companyName;
            changed = true;
          }
          if (changed) {
            await lead.save();
            leadsUpdated += 1;
          }
        }

        const msgId = item.message_id || item.id;
        const receivedDate = item.created_at ? new Date(item.created_at) : new Date();

        // Log/Update Reply collection
        const existingReply = await Reply.findOne({
          $or: [
            { resendEmailId: item.id },
            { messageId: msgId },
          ],
          deletedAt: null,
        });

        const htmlBody = item.html || item.html_body || '';

        if (!existingReply) {
          const createdReply = await Reply.create({
            campaignId: lead.campaignId || null,
            leadId: lead._id,
            companyId: lead.companyId || null,
            email,
            from: item.from || email,
            subject: item.subject || 'Inbound Email',
            text: bodyText || item.subject || '',
            html: htmlBody,
            messageId: msgId,
            resendEmailId: item.id,
            receivedAt: receivedDate,
            intent,
            createdAt: receivedDate,
          });
          repliesLogged += 1;
          await ensureReplyReviewTask(createdReply, lead);
        } else {
          let replyUpdated = false;
          if (!existingReply.text && bodyText) {
            existingReply.text = bodyText;
            replyUpdated = true;
          }
          if (!existingReply.html && htmlBody) {
            existingReply.html = htmlBody;
            replyUpdated = true;
          }
          if (replyUpdated) {
            await existingReply.save();
            await ensureReplyReviewTask(existingReply, lead);
          }
        }

        // Upsert into persistent Email collection
        const existingEmail = await Email.findOne({ messageId: msgId });
        if (!existingEmail) {
          await Email.create({
            direction: 'inbound',
            from: item.from || email,
            fromEmail: email,
            to: Array.isArray(item.to) ? item.to : [item.to].filter(Boolean),
            toEmail: Array.isArray(item.to) ? parseEmailAndName(item.to[0]).email : email,
            subject: item.subject || 'Inbound Email',
            body: bodyText || item.subject || '',
            htmlBody: htmlBody,
            receivedAt: receivedDate,
            messageId: msgId,
            resendEmailId: item.id,
            leadId: lead._id,
            companyId: lead.companyId || null,
            campaignId: lead.campaignId || null,
            status: 'received',
            provider: 'resend',
            suggestedIntent: intent === 'OOO' ? 'Out of Office' : intent === 'Opt Out' ? 'Opt Out' : 'Neutral',
            humanReview: { status: 'Unreviewed' },
          });
          emailsStored += 1;
        } else if (!existingEmail.htmlBody && htmlBody) {
          existingEmail.htmlBody = htmlBody;
          await existingEmail.save();
        }
      }
    } else {
      console.warn('[ResendAutoSync] Inbound API fetch status:', receivingRes.status);
    }

    // 2. Sync Outbound Emails from Resend Outbound API
    const outboundRes = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (outboundRes.ok) {
      const outboundJson = await outboundRes.json();
      const outboundItems = Array.isArray(outboundJson.data) ? outboundJson.data : [];
      outboundFetched = outboundItems.length;

      for (const item of outboundItems) {
        if (!item.id) continue;
        const existingOutbound = await Email.findOne({ messageId: item.id });
        if (existingOutbound) continue;

        const recipientStr = Array.isArray(item.to) ? item.to[0] : item.to;
        const { email: recipientEmail } = parseEmailAndName(recipientStr);
        const { email: senderEmail } = parseEmailAndName(item.from);

        const lead = recipientEmail
          ? await Lead.findOne({ email: new RegExp(`^${recipientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), deletedAt: null })
          : null;

        await Email.create({
          direction: 'outbound',
          from: item.from || 'System',
          fromEmail: senderEmail || item.from || '',
          to: Array.isArray(item.to) ? item.to : [item.to].filter(Boolean),
          toEmail: recipientEmail || '',
          subject: item.subject || '',
          body: item.text || item.html || '',
          htmlBody: item.html || item.text || '',
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
        emailsStored += 1;
      }
    }

    const stats = {
      success: true,
      inboundFetched,
      outboundFetched,
      leadsCreated,
      leadsUpdated,
      repliesLogged,
      emailsStored,
      timestamp: new Date().toISOString(),
    };

    if (leadsCreated > 0 || leadsUpdated > 0 || repliesLogged > 0 || emailsStored > 0) {
      console.info('[ResendAutoSync] Sync complete:', stats);
    }

    return stats;
  } catch (err) {
    console.error('[ResendAutoSync] Error during Resend auto-sync:', err);
    return { success: false, error: err.message };
  }
}

export function startResendAutoSyncCron(intervalMs = 5 * 60 * 1000) {
  if (cronInterval) return;

  syncAllResendReplies().catch((err) => {
    console.error('[ResendAutoSync] Initial sync error:', err.message);
  });

  cronInterval = setInterval(() => {
    syncAllResendReplies().catch((err) => {
      console.error('[ResendAutoSync] Periodic sync error:', err.message);
    });
  }, intervalMs);

  console.info(`[ResendAutoSync] Background email & reply sync started (every ${Math.round(intervalMs / 60000)}m).`);
}

export function stopResendAutoSyncCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
