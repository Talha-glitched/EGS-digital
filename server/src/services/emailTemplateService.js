const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

export function personalize(value, recipient) {
  const fallbackName = recipient.name || 'there';
  const fallbackCompany = recipient.company || 'your team';

  return String(value || '')
    .replaceAll('{{name}}', fallbackName)
    .replaceAll('{{company}}', fallbackCompany)
    .replaceAll('{{email}}', recipient.email);
}

export function renderCampaignEmail({ campaign, recipient, unsubscribeUrl }) {
  const subject = personalize(campaign.subject, recipient);
  const body = personalize(campaign.body, recipient)
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join('<br>');

  const companyLine = recipient.company
    ? `<span style="color:#5A514A;">Prepared for ${escapeHtml(recipient.company)}</span>`
    : '<span style="color:#5A514A;">Exhibitions, events, retail branding, signage, and fitouts</span>';

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#F5F1EA;color:#1A1715;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F1EA;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#EDE7DC;border:1px solid #D6CBB3;">
            <tr>
              <td style="padding:28px 30px 18px;border-bottom:1px solid #D6CBB3;">
                <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#D9262E;font-weight:700;">Exhibit Graphic Sign</div>
                <h1 style="font-size:28px;line-height:1.12;margin:12px 0 8px;font-weight:700;color:#1A1715;">${escapeHtml(subject)}</h1>
                <div style="font-size:14px;line-height:1.5;">${companyLine}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;font-size:16px;line-height:1.7;color:#2A2522;">
                ${body}
                <div style="margin-top:28px;">
                  <a href="https://exhibitgraphicsign.com/contact" style="display:inline-block;background:#1A1715;color:#F5F1EA;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;">Send a brief</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#1A1715;color:#F5F1EA;font-size:13px;line-height:1.7;">
                <strong>EGS Dubai</strong><br>
                Exhibition stands, ceremonies, retail rollouts, signage, and branded interiors.<br>
                <a href="mailto:info@exhibitgraphicsign.com" style="color:#F5F1EA;">info@exhibitgraphicsign.com</a>
                <div style="margin-top:14px;color:#D6CBB3;font-size:12px;">
                  <a href="${escapeHtml(unsubscribeUrl)}" style="color:#D6CBB3;">Unsubscribe</a> from future outreach.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
