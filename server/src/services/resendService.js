import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';
import { Reply } from '../models/Reply.js';
import { Lead } from '../models/Lead.js';

export async function getResendMetrics(options = {}) {
  const { status, search, limit = 100, campaignId } = options;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      total: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      replied: 0,
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

  try {
    let allEmails = [];
    let hasMore = true;
    let afterCursor = null;
    let pageCount = 0;
    
    // Retrieve more pages if we need to filter by a specific campaign
    const maxPages = campaignId ? 25 : (limit ? Math.ceil(limit / 100) : 3);

    while (hasMore && pageCount < maxPages) {
      let url = `https://api.resend.com/emails?limit=100`;
      if (afterCursor) {
        url += `&after=${afterCursor}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend API failed: ${res.status} - ${text}`);
      }

      const json = await res.json();
      const pageData = json.data || [];

      if (pageData.length === 0) {
        hasMore = false;
      } else {
        allEmails.push(...pageData);
        afterCursor = pageData[pageData.length - 1].id;
        
        if (pageData.length < 100) {
          hasMore = false;
        }
      }
      pageCount++;
    }

    let data = allEmails;

    // Filter by campaign leads if campaignId is specified
    if (campaignId) {
      const leads = await Lead.find({ campaignId }).select('email lastMessageId').lean();
      const campaignEmails = new Set(leads.map((l) => String(l.email).toLowerCase()));
      const campaignMessageIds = new Set(leads.map((l) => String(l.lastMessageId || '').trim()).filter(Boolean));

      data = data.filter((email) => {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const emailStr = String(to || '').trim().toLowerCase();
        const emailId = String(email.id || '').trim();

        return campaignEmails.has(emailStr) || campaignMessageIds.has(emailId);
      });
    }

    // Map replies from DB
    try {
      const recipientEmails = data.map((email) => {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        return String(to || '').trim().toLowerCase();
      }).filter(Boolean);

      if (recipientEmails.length > 0) {
        const replies = await Reply.find({ email: { $in: recipientEmails } }).select('email').lean();
        const repliedSet = new Set(replies.map((r) => r.email.toLowerCase()));

        data = data.map((email) => {
          const to = Array.isArray(email.to) ? email.to[0] : email.to;
          const emailStr = String(to || '').trim().toLowerCase();
          if (repliedSet.has(emailStr)) {
            return { ...email, last_event: 'received' };
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
      data = data.filter((email) => String(email.last_event || '').toLowerCase() === statusKey);
    }

    // Apply search filter if requested
    if (search) {
      const query = String(search).trim().toLowerCase();
      data = data.filter((email) => {
        const to = Array.isArray(email.to) ? email.to[0] : email.to;
        const subject = String(email.subject || '');
        const from = String(email.from || '');
        return `${to} ${subject} ${from}`.toLowerCase().includes(query);
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
      const eventStatus = String(email.last_event || '').toLowerCase();
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

    // Apply pagination/limit limits to returned array if campaignId isn't loaded
    // (If campaignId is loaded, we want to show all sent emails for that campaign)
    const resultEmails = (!campaignId && limit) ? data.slice(0, limit) : data;

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
        status: e.last_event,
        createdAt: e.created_at,
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
