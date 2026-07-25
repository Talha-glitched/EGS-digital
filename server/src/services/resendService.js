import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';
import { SendJob } from '../models/SendJob.js';

// Helper to extract clean email address from "Name <email@domain.com>" or "email@domain.com"
function extractCleanEmail(raw) {
  if (!raw) return '';
  const str = String(raw).trim().toLowerCase();
  const match = str.match(/<([^>]+)>/);
  return (match && match[1] ? match[1] : str).trim().toLowerCase();
}

// Helper to parse raw .eml file content into clean text
function extractTextFromEml(emlString) {
  if (!emlString) return '';

  const bodyMatch = emlString.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let htmlOrText = bodyMatch ? bodyMatch[1] : '';

  if (!htmlOrText) {
    const parts = emlString.split(/\r?\n\r?\n/);
    if (parts.length > 1) {
      htmlOrText = parts.slice(1).join('\n\n');
    }
  }

  let decoded = htmlOrText
    .replace(/=\r?\n/g, '')
    .replace(/=3D/gi, '=')
    .replace(/=20/g, ' ')
    .replace(/=0A/gi, '\n')
    .replace(/=0D/gi, '\r');

  let plain = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');

  return plain.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

/**
 * Synchronize external Resend API history into memory & database if needed
 */
export async function syncResendHistory(apiKey, options = {}) {
  const { campaignId, limit } = options;
  let resendEmails = [];
  let hasMore = true;
  let afterCursor = null;
  let pageCount = 0;
  const maxPages = limit ? Math.max(1, Math.ceil(limit / 100)) : 100;

  try {
    while (hasMore && pageCount < maxPages) {
      let url = `https://api.resend.com/emails?limit=100`;
      if (afterCursor) {
        url += `&after=${afterCursor}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) break;

      const json = await res.json();
      const pageData = json.data || [];

      if (pageData.length === 0) {
        hasMore = false;
      } else {
        resendEmails.push(...pageData);
        afterCursor = pageData[pageData.length - 1].id;
        if (pageData.length < 100) hasMore = false;
      }
      pageCount++;
    }
  } catch (err) {
    console.warn('[ResendSync] API fetch warning:', err.message);
  }
  return resendEmails;
}

export async function getResendMetrics(options = {}) {
  const { status, search, limit = null, campaignId } = options;
  const apiKey = process.env.RESEND_API_KEY;

  try {
    // 1. Query DB SendJob for sent outreach emails
    const sendJobQuery = { status: 'sent' };
    if (campaignId) {
      sendJobQuery.campaignId = campaignId;
    }

    const dbSendJobs = await SendJob.find(sendJobQuery)
      .populate({ path: 'leadId', select: 'email outreachEmail name designation campaignId' })
      .sort({ sentAt: -1, createdAt: -1 })
      .lean();

    const dbEmails = dbSendJobs.map((job) => {
      const recipient = job.recipientEmail || job.leadId?.outreachEmail || job.leadId?.email || '';
      return {
        id: job.providerMessageId || String(job._id),
        dbJobId: String(job._id),
        from: process.env.RESEND_FROM_EMAIL || 'Rana <rana@masuood.exhibitgraphicsign.com>',
        to: [recipient],
        subject: job.renderedSubject || '(No subject)',
        body: job.renderedBody || '',
        status: 'sent',
        createdAt: job.sentAt || job.createdAt,
        leadId: job.leadId?._id ? String(job.leadId._id) : null,
        leadName: job.leadId?.name || '',
        campaignId: job.campaignId ? String(job.campaignId) : (job.leadId?.campaignId ? String(job.leadId.campaignId) : null),
        source: 'database',
      };
    });

    // 2. Fetch external Resend API emails to combine with database logs (if configured)
    let apiEmails = [];
    if (apiKey) {
      const fetchedApi = await syncResendHistory(apiKey, { campaignId, limit });
      apiEmails = fetchedApi.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        status: e.last_event,
        createdAt: e.created_at,
        source: 'resend_api',
      }));
    }

    // Merge DB sends & Resend API sends by ID / recipient email
    const seenIds = new Set(dbEmails.map((e) => e.id));
    const mergedEmails = [...dbEmails];

    for (const apiItem of apiEmails) {
      if (!seenIds.has(apiItem.id)) {
        seenIds.add(apiItem.id);
        mergedEmails.push(apiItem);
      }
    }

    let data = mergedEmails;

    // Filter by campaign if campaignId is specified
    if (campaignId) {
      const leads = await Lead.find({ campaignId })
        .select('email outreachEmail emailApollo emailHunter emailLusha emailPersonal lastMessageId')
        .lean();

      const campaignEmails = new Set();
      for (const l of leads) {
        if (l.email) campaignEmails.add(l.email.toLowerCase().trim());
        if (l.outreachEmail) campaignEmails.add(l.outreachEmail.toLowerCase().trim());
        if (l.emailApollo) campaignEmails.add(l.emailApollo.toLowerCase().trim());
        if (l.emailHunter) campaignEmails.add(l.emailHunter.toLowerCase().trim());
        if (l.emailLusha) campaignEmails.add(l.emailLusha.toLowerCase().trim());
        if (l.emailPersonal) {
          l.emailPersonal.split(';').forEach((e) => {
            if (e.trim()) campaignEmails.add(e.toLowerCase().trim());
          });
        }
      }
      const campaignMessageIds = new Set(leads.map((l) => String(l.lastMessageId || '').trim()).filter(Boolean));

      data = data.filter((email) => {
        if (email.campaignId && String(email.campaignId) === String(campaignId)) {
          return true;
        }
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const cleanTo = extractCleanEmail(to);
        const emailId = String(email.id || '').trim();

        return campaignEmails.has(cleanTo) || campaignMessageIds.has(emailId);
      });
    }

    // 3. Map replies from database Reply collection & Resend Receiving API
    try {
      const recipientEmails = data
        .map((email) => extractCleanEmail(Array.isArray(email.to) ? email.to[0] : email.to))
        .filter(Boolean);

      const replyMap = new Map();

      // Fetch received emails directly from Resend Receiving API if API key is present
      if (apiKey) {
        try {
          const receivingRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (receivingRes.ok) {
            const receivingJson = await receivingRes.json();
            const receivedList = receivingJson.data || [];
            for (const rItem of receivedList) {
              const cleanFrom = extractCleanEmail(rItem.from);
              if (cleanFrom) {
                let apiText = (rItem.text || rItem.html || '').trim();
                
                // If top-level text/html is null, fetch detail or raw.download_url to extract exact email body
                if (!apiText && rItem.id) {
                  try {
                    const detailRes = await fetch(`https://api.resend.com/emails/receiving/${rItem.id}`, {
                      headers: { Authorization: `Bearer ${apiKey}` },
                    });
                    if (detailRes.ok) {
                      const detailJson = await detailRes.json();
                      apiText = (detailJson.text || detailJson.html || '').trim();
                      if (!apiText && detailJson.raw?.download_url) {
                        const rawRes = await fetch(detailJson.raw.download_url);
                        const rawEml = await rawRes.text();
                        apiText = extractTextFromEml(rawEml);
                      }
                    }
                  } catch (dErr) {
                    console.warn(`[ResendMetrics] EML download failed for ${rItem.id}:`, dErr.message);
                  }
                }

                if (!apiText && rItem.raw?.download_url) {
                  try {
                    const rawRes = await fetch(rItem.raw.download_url);
                    const rawEml = await rawRes.text();
                    apiText = extractTextFromEml(rawEml);
                  } catch (rErr) {
                    console.warn(`[ResendMetrics] Direct raw download failed for ${rItem.id}:`, rErr.message);
                  }
                }

                replyMap.set(cleanFrom, {
                  text: apiText || '',
                  intent: 'Neutral',
                  receivedAt: rItem.created_at || new Date(),
                  subject: rItem.subject || '',
                  from: rItem.from || '',
                });
              }
            }
          }
        } catch (rErr) {
          console.warn('[ResendMetrics] Receiving API skipped:', rErr.message);
        }
      }

      // Fetch replies stored in database Reply collection
      if (recipientEmails.length > 0) {
        const replyQuery = campaignId
          ? { $or: [{ campaignId }, { email: { $in: recipientEmails } }] }
          : { email: { $in: recipientEmails } };

        const replies = await Reply.find(replyQuery)
          .select('email leadId from subject text intent receivedAt createdAt threadHistory')
          .sort({ createdAt: -1 })
          .lean();

        const leadIds = replies.map((r) => r.leadId).filter(Boolean);
        const repliedLeads = leadIds.length > 0
          ? await Lead.find({ _id: { $in: leadIds } })
              .select('email outreachEmail emailApollo emailHunter emailLusha emailPersonal')
              .lean()
          : [];

        const leadToEmailsMap = new Map();
        for (const l of repliedLeads) {
          const emails = [];
          if (l.email) emails.push(l.email.toLowerCase().trim());
          if (l.outreachEmail) emails.push(l.outreachEmail.toLowerCase().trim());
          if (l.emailApollo) emails.push(l.emailApollo.toLowerCase().trim());
          if (l.emailHunter) emails.push(l.emailHunter.toLowerCase().trim());
          if (l.emailLusha) emails.push(l.emailLusha.toLowerCase().trim());
          if (l.emailPersonal) {
            l.emailPersonal.split(';').forEach((e) => {
              if (e.trim()) emails.push(e.toLowerCase().trim());
            });
          }
          leadToEmailsMap.set(String(l._id), emails);
        }

        for (const r of replies) {
          const replyText = (r.text || '').trim()
            || r.threadHistory?.find((t) => t.type === 'inbound' && t.body?.trim())?.body
            || r.threadHistory?.[0]?.body
            || '';
          const info = {
            text: replyText,
            intent: r.intent || 'Neutral',
            receivedAt: r.receivedAt || r.createdAt,
            subject: r.subject || '',
            from: r.from || r.email || '',
          };
          if (r.email) replyMap.set(r.email.toLowerCase().trim(), info);
          if (r.from) {
            const cleanFrom = extractCleanEmail(r.from);
            if (cleanFrom) replyMap.set(cleanFrom, info);
          }
          if (r.leadId && leadToEmailsMap.has(String(r.leadId))) {
            for (const emailVar of leadToEmailsMap.get(String(r.leadId))) {
              if (!replyMap.has(emailVar) || !replyMap.get(emailVar)?.text) {
                replyMap.set(emailVar, info);
              }
            }
          }
        }

        data = data.map((email) => {
          const to = Array.isArray(email.to) ? email.to[0] : email.to;
          const cleanTo = extractCleanEmail(to);
          const replyInfo = replyMap.get(cleanTo);
          if (replyInfo) {
            return {
              ...email,
              last_event: 'received',
              reply: replyInfo,
            };
          }
          return email;
        });
      }
    } catch (err) {
      console.error('Failed to map replies to Resend emails:', err);
    }

    // Apply status filter if requested
    if (status && status !== 'all') {
      const statusKey = String(status).toLowerCase();
      data = data.filter((email) => String(email.last_event || email.status || '').toLowerCase() === statusKey);
    }

    // Apply search filter if requested
    if (search) {
      const query = String(search).trim().toLowerCase();
      data = data.filter((email) => {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const cleanTo = extractCleanEmail(to);
        const subject = String(email.subject || '');
        const from = String(email.from || '');
        const replyText = String(email.reply?.text || '');
        return `${cleanTo} ${subject} ${from} ${replyText}`.toLowerCase().includes(query);
      });
    }

    let total = data.length;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let complained = 0;
    let failed = 0;
    let received = 0;

    for (const email of data) {
      const eventStatus = String(email.last_event || email.status || '').toLowerCase();
      if (eventStatus === 'delivered') {
        delivered++;
      } else if (eventStatus === 'opened') {
        delivered++;
        opened++;
      } else if (eventStatus === 'clicked') {
        delivered++;
        opened++;
        clicked++;
      } else if (eventStatus === 'bounced') {
        bounced++;
      } else if (eventStatus === 'complained') {
        complained++;
      } else if (eventStatus === 'failed') {
        failed++;
      } else if (eventStatus === 'sent') {
        delivered++;
      } else if (eventStatus === 'received') {
        delivered++;
        opened++;
        received++;
      }
    }

    const deliverabilityRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '100.0';
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0';
    const clickRate = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : '0.0';
    const bounceRate = total > 0 ? ((bounced / total) * 100).toFixed(1) : '0.0';
    const receivedRate = total > 0 ? ((received / total) * 100).toFixed(1) : '0.0';

    // Apply limit to returned emails array if specified
    const resultEmails = (limit && limit > 0) ? data.slice(0, limit) : data;

    return {
      configured: true,
      total,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      failed,
      received,
      rates: {
        deliverability: `${deliverabilityRate}%`,
        open: `${openRate}%`,
        click: `${clickRate}%`,
        bounce: `${bounceRate}%`,
        received: `${receivedRate}%`,
      },
      emails: resultEmails.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        body: e.body || '',
        status: e.last_event || e.status,
        createdAt: e.createdAt || e.created_at,
        leadId: e.leadId || null,
        leadName: e.leadName || '',
        reply: e.reply || null,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch Resend metrics:', error);
    return {
      configured: true,
      error: error.message,
      total: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      received: 0,
      rates: {
        deliverability: '0.0%',
        open: '0.0%',
        click: '0.0%',
        bounce: '0.0%',
        received: '0.0%',
      },
      emails: [],
    };
  }
}
