import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
import db from '../db/index.js';

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
 * Synchronize external Resend API history into memory
 */
export async function syncResendHistory(apiKey, options = {}) {
  const { limit } = options;
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
    // 1. Query PostgreSQL messages for sent outbound emails
    let querySql = `
      SELECT m.id, m.external_message_id, m.subject, m.body, m.delivery_state, m.occurred_at,
             p.display_name AS person_name, pcm.normalized_value AS recipient_email,
             ca.campaign_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.participant_role = 'recipient'
      LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
      LEFT JOIN people p ON pcm.person_id = p.id
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
      LEFT JOIN campaign_accounts ca ON cc.campaign_account_id = ca.id
      WHERE m.direction = 'outbound'
    `;
    const queryParams = [];

    if (campaignId) {
      queryParams.push(campaignId);
      querySql += ` AND (ca.campaign_id::text = $1::text)`;
    }

    querySql += ` ORDER BY m.occurred_at DESC LIMIT 500`;

    const dbRes = await db.query(querySql, queryParams);

    const dbEmails = dbRes.rows.map((row) => {
      const recipient = row.recipient_email || '';
      return {
        id: row.external_message_id || row.id,
        dbJobId: row.id,
        from: process.env.RESEND_FROM_EMAIL || 'Rana <rana@masuood.exhibitgraphicsign.com>',
        to: [recipient],
        subject: row.subject || '(No subject)',
        body: row.body || '',
        status: row.delivery_state || 'sent',
        createdAt: row.occurred_at,
        leadName: row.person_name || '',
        campaignId: row.campaign_id ? String(row.campaign_id) : null,
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

    // 3. Map replies from PostgreSQL messages table & Resend Receiving API
    try {
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

      // Fetch inbound messages stored in PostgreSQL
      const inRes = await db.query(
        `SELECT m.subject, m.body, m.occurred_at, pcm.normalized_value AS sender_email
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.participant_role = 'sender'
         LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
         WHERE m.direction = 'inbound'
         ORDER BY m.occurred_at DESC LIMIT 200`
      );

      for (const row of inRes.rows) {
        if (row.sender_email) {
          replyMap.set(row.sender_email.toLowerCase(), {
            text: row.body || '',
            intent: 'Neutral',
            receivedAt: row.occurred_at,
            subject: row.subject || '',
            from: row.sender_email,
          });
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
      const queryStr = String(search).trim().toLowerCase();
      data = data.filter((email) => {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const cleanTo = extractCleanEmail(to);
        const subject = String(email.subject || '');
        const from = String(email.from || '');
        const replyText = String(email.reply?.text || '');
        return `${cleanTo} ${subject} ${from} ${replyText}`.toLowerCase().includes(queryStr);
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
