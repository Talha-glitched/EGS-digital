import { normalizeDomain } from './normalizeDomain.js';

export function normalizeCompanyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Prefer campaign company matched by name, then website domain, then email domain. */
export function resolveCompanyForContact({
  companyName = '',
  websiteDomain = '',
  emailDomain = '',
  companiesInProject = [],
}) {
  const byDomain = new Map(companiesInProject.map((c) => [c.domain, c]));
  const byName = new Map();
  for (const company of companiesInProject) {
    const key = normalizeCompanyName(company.companyName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(company);
  }

  const nameKey = normalizeCompanyName(companyName);
  if (nameKey) {
    const nameMatches = byName.get(nameKey) || [];
    if (nameMatches.length === 1) return { company: nameMatches[0], matchType: 'name' };
    if (nameMatches.length > 1) {
      const siteDomain = normalizeDomain(websiteDomain);
      const mailDomain = normalizeDomain(emailDomain);
      const websiteMatch = nameMatches.find((c) => siteDomain && c.domain === siteDomain);
      if (websiteMatch) return { company: websiteMatch, matchType: 'name+website' };
      // Prefer the website-imported record over an email-inferred duplicate domain
      const nonEmailDuplicate = nameMatches.find((c) => mailDomain && c.domain !== mailDomain);
      if (nonEmailDuplicate) return { company: nonEmailDuplicate, matchType: 'name-prefer-website' };
      return { company: nameMatches[0], matchType: 'name-ambiguous' };
    }
  }

  const siteDomain = normalizeDomain(websiteDomain);
  if (siteDomain && byDomain.has(siteDomain)) {
    return { company: byDomain.get(siteDomain), matchType: 'website' };
  }

  const mailDomain = normalizeDomain(emailDomain);
  if (mailDomain && byDomain.has(mailDomain)) {
    return { company: byDomain.get(mailDomain), matchType: 'email-domain' };
  }

  return { company: null, matchType: 'none', preferredDomain: siteDomain || mailDomain || '' };
}

export function isGenericMailboxEmail(email) {
  const local = String(email || '').split('@')[0]?.toLowerCase() || '';
  const genericLocals = new Set([
    'info', 'contact', 'hello', 'sales', 'support', 'admin', 'office',
    'enquiry', 'enquiries', 'help', 'web', 'mail', 'team', 'marketing',
    'hr', 'jobs', 'careers', 'service', 'customerservice', 'orders',
  ]);
  return genericLocals.has(local) || genericLocals.has(local.split('.')[0]);
}
