const EMAIL_SPLIT = /[,;|\n]+/;

export function normalizeGenericEmails(value) {
  if (value == null) return [];

  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(EMAIL_SPLIT)
      : [value];

  const seen = new Set();
  const emails = [];
  for (const item of rawItems) {
    const email = String(item ?? '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function formatCompanyRecord(company) {
  if (!company) return company;
  const obj = typeof company.toObject === 'function' ? company.toObject() : { ...company };
  const genericEmails = normalizeGenericEmails(
    obj.genericEmails?.length ? obj.genericEmails : obj.genericEmail,
  );
  const { genericEmail, ...rest } = obj;
  return { ...rest, genericEmails };
}
