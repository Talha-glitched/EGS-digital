import { capResendBatchSize, RESEND_MAX_EMAILS_PER_REQUEST } from '../constants/resendLimits.js';

export async function getResendMetrics(options = {}) {
  const { status, search, limit = 100 } = options;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      total: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      rates: {
        deliverability: '0.0%',
        open: '0.0%',
        click: '0.0%',
        bounce: '0.0%',
      },
      emails: [],
    };
  }

  try {
    const cappedLimit = capResendBatchSize(limit);
    const res = await fetch(`https://api.resend.com/emails?limit=${cappedLimit}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API failed: ${res.status} - ${text}`);
    }

    const json = await res.json();
    let data = json.data || [];

    if (status && status !== 'all') {
      const statusKey = String(status).toLowerCase();
      data = data.filter((email) => String(email.last_event || '').toLowerCase() === statusKey);
    }

    if (search) {
      const query = String(search).trim().toLowerCase();
      data = data.filter((email) => {
        const to = Array.isArray(email.to) ? email.to.join(' ') : String(email.to || '');
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
      }
    }

    const deliverabilityRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : '100.0';
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0';
    const clickRate = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : '0.0';
    const bounceRate = total > 0 ? ((bounced / total) * 100).toFixed(1) : '0.0';

    return {
      configured: true,
      total,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      failed,
      rates: {
        deliverability: `${deliverabilityRate}%`,
        open: `${openRate}%`,
        click: `${clickRate}%`,
        bounce: `${bounceRate}%`,
      },
      emails: data.map((e) => ({
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
      rates: {
        deliverability: '0.0%',
        open: '0.0%',
        click: '0.0%',
        bounce: '0.0%',
      },
      emails: [],
    };
  }
}
