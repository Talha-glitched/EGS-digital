export const SENSITIVE_DATA_PASSCODE =
  import.meta.env.VITE_CRM_SENSITIVE_PASSCODE || 'egsadmin@1234';

export const SENSITIVE_SESSION_KEY = 'crm-sensitive-data-unlocked';

export function maskEmail(value = '') {
  const text = String(value || '').trim();
  if (!text) return '••••••••@••••••.•••';
  const [local, domain] = text.split('@');
  if (!domain) return '•'.repeat(Math.min(text.length, 10));
  const maskedLocal =
    local.length <= 1
      ? '•••'
      : `${local[0]}${'•'.repeat(Math.min(Math.max(local.length - 1, 3), 7))}`;
  const domainParts = domain.split('.');
  const tld = domainParts.pop() || '•••';
  const maskedDomain = `${domainParts[0]?.[0] || '•'}${'•'.repeat(5)}.${tld}`;
  return `${maskedLocal}@${maskedDomain}`;
}

export function maskPhone(value = '') {
  const text = String(value || '').trim();
  if (!text) return '••• ••• ••••';
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 4) return '••• ••• ••••';
  return `••• ••• ${digits.slice(-4)}`;
}

export function maskSensitiveValue(value = '', kind = 'text') {
  if (kind === 'email') return maskEmail(value);
  if (kind === 'phone' || kind === 'tel') return maskPhone(value);
  const text = String(value || '').trim();
  if (!text) return '••••••••';
  return '•'.repeat(Math.min(Math.max(text.length, 8), 14));
}
