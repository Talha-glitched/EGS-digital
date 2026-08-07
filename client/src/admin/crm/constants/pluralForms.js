// Shared irregular plurals for bulk-action copy ("3 companies selected", not "3 companys").
// Anything not listed here falls back to `${noun}s`, which covers the regular cases.
export const PLURAL_FORMS = {
  company: 'companies',
  contact: 'contacts',
  opportunity: 'opportunities',
  campaign: 'campaigns',
  task: 'tasks',
  project: 'campaigns',
};

export function pluralize(noun, count) {
  if (count === 1) return `1 ${noun}`;
  const plural = PLURAL_FORMS[noun] || `${noun}s`;
  return `${count} ${plural}`;
}
