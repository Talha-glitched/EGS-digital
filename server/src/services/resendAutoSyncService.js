import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { Reply } from '../models/Reply.js';

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
    const res = await fetch('https://api.resend.com/emails/receiving?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[ResendAutoSync] API fetch failed:', res.status, errText);
      return { success: false, error: errText };
    }

    const body = await res.json();
    const items = Array.isArray(body.data) ? body.data : [];

    let leadsCreated = 0;
    let leadsUpdated = 0;
    let repliesLogged = 0;

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
          pocQualification: { status: 'Confirmed' },
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



      const existingReply = await Reply.findOne({
        $or: [
          { resendEmailId: item.id },
          { messageId: item.message_id || item.id },
        ],
        deletedAt: null,
      });

      if (!existingReply) {
        await Reply.create({
          campaignId: lead.campaignId || null,
          leadId: lead._id,
          companyId: lead.companyId || null,
          email,
          from: item.from || email,
          subject: item.subject || 'Inbound Email',
          text: bodyText || item.subject || '',
          messageId: item.message_id || item.id,
          resendEmailId: item.id,
          receivedAt: item.created_at ? new Date(item.created_at) : new Date(),
          intent,
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        });
        repliesLogged += 1;
      } else if (!existingReply.text && bodyText) {
        existingReply.text = bodyText;
        await existingReply.save();
      }
    }

    const stats = {
      success: true,
      totalFetched: items.length,
      leadsCreated,
      leadsUpdated,
      repliesLogged,
      timestamp: new Date().toISOString(),
    };

    if (leadsCreated > 0 || leadsUpdated > 0 || repliesLogged > 0) {
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

  console.info(`[ResendAutoSync] Background reply sync started (every ${Math.round(intervalMs / 60000)}m).`);
}

export function stopResendAutoSyncCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
