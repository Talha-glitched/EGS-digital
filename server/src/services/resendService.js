export async function getResendMetrics() {
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
    const res = await fetch('https://api.resend.com/emails?limit=100', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend API failed: ${res.status} - ${text}`);
    }

    const json = await res.json();
    const data = json.data || [];

    let total = data.length;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let complained = 0;
    let failed = 0;

    for (const email of data) {
      const status = String(email.last_event || '').toLowerCase();
      if (status === 'delivered') {
        delivered++;
      } else if (status === 'opened') {
        delivered++;
        opened++;
      } else if (status === 'clicked') {
        delivered++;
        opened++;
        clicked++;
      } else if (status === 'bounced') {
        bounced++;
      } else if (status === 'complained') {
        complained++;
      } else if (status === 'failed') {
        failed++;
      } else if (status === 'sent') {
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
      emails: data.map(e => ({
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
