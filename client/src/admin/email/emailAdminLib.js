import { PRESETS_STORAGE_KEY } from './config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function adminApiFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(data?.message || 'Request failed.');
    }
    return data;
  });
}

export function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers, options) {
  return headers.findIndex((header) => options.includes(normalizeHeader(header)));
}

export function extractContacts(workbook, XLSX) {
  const contacts = [];
  const invalidRows = [];
  const duplicates = [];
  const seen = new Set();

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      blankrows: false,
    });
    if (!rows.length) return;

    const headerIndex = rows.findIndex((row) => row.some(Boolean));
    if (headerIndex < 0) return;

    const headers = rows[headerIndex];
    const emailIndex = findColumn(headers, ['email', 'emailaddress', 'mail', 'e-mail']);
    const nameIndex = findColumn(headers, ['name', 'fullname', 'contactname', 'person']);
    const companyIndex = findColumn(headers, ['company', 'companyname', 'organization', 'organisation', 'business']);
    const dataRows = rows.slice(headerIndex + 1);

    dataRows.forEach((row, rowIndex) => {
      const rowNumber = headerIndex + rowIndex + 2;
      const emailCandidates =
        emailIndex >= 0
          ? [row[emailIndex]]
          : row.filter((cell) => String(cell).includes('@'));

      emailCandidates.forEach((candidate) => {
        const email = String(candidate || '').trim().toLowerCase();
        if (!email) return;

        if (!EMAIL_RE.test(email)) {
          invalidRows.push({ sheetName, rowNumber, value: email });
          return;
        }

        if (seen.has(email)) {
          duplicates.push(email);
          return;
        }

        seen.add(email);
        contacts.push({
          email,
          name: nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '',
          company: companyIndex >= 0 ? String(row[companyIndex] || '').trim() : '',
        });
      });
    });
  });

  return { contacts, invalidRows, duplicates };
}

export function personalize(value, contact) {
  return String(value || '')
    .replaceAll('{{name}}', contact.name || 'there')
    .replaceAll('{{company}}', contact.company || 'your team')
    .replaceAll('{{email}}', contact.email || 'name@company.com');
}

export function renderPreviewHtml({ subject, body }, contact) {
  const previewSubject = personalize(subject, contact);
  const previewBody = personalize(body, contact)
    .split(/\r?\n/)
    .map((line) => line.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])))
    .join('<br>');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#F5F1EA;color:#1A1715;font-family:Inter,Arial,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background:#F5F1EA;padding:22px;">
      <tr><td align="center">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#EDE7DC;border:1px solid #D6CBB3;">
          <tr><td style="padding:26px 28px 16px;border-bottom:1px solid #D6CBB3;">
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#D9262E;font-weight:700;">Exhibit Graphic Sign</div>
            <h1 style="font-size:26px;line-height:1.12;margin:12px 0 8px;font-weight:700;">${previewSubject}</h1>
            <div style="font-size:14px;color:#5A514A;">Prepared for ${contact.company || 'your team'}</div>
          </td></tr>
          <tr><td style="padding:28px;font-size:16px;line-height:1.7;color:#2A2522;">
            ${previewBody}
            <div style="margin-top:26px;"><span style="display:inline-block;background:#1A1715;color:#F5F1EA;border-radius:999px;padding:13px 20px;font-weight:700;">Send a brief</span></div>
          </td></tr>
          <tr><td style="padding:20px 28px;background:#1A1715;color:#F5F1EA;font-size:13px;line-height:1.7;">
            <strong>EGS Dubai</strong><br>Exhibition stands, ceremonies, retail rollouts, signage, and branded interiors.
            <div style="margin-top:12px;color:#D6CBB3;font-size:12px;">Unsubscribe from future outreach.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function formatInboxDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePresets(list) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(list));
}
