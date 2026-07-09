const MOJIBAKE_REPLACEMENTS = {
  '√≥': 'ó',
  '√§': 'ä',
  '√©': 'é',
  '√´': 'ë',
  '√º': 'ü',
  '√ñ': 'Ö',
  '√∂': 'ö',
  '√ü': 'ß',
  '√∞': 'æ',
  '√¥': 'å',
  '√°': 'á',
  '√®': 'è',
  '√¨': 'ì',
  '√≤': 'ò',
  '√∫': 'ù',
  '√¢': 'â',
  '√±': 'ñ',
  '√á': 'ç',
};

/** Repair Excel/CSV mojibake in contact names (e.g. Ram√≥n → Ramón). */
export function fixMojibakeName(value) {
  let text = String(value || '').trim();
  if (!text) return text;

  for (const [bad, good] of Object.entries(MOJIBAKE_REPLACEMENTS)) {
    if (text.includes(bad)) text = text.split(bad).join(good);
  }

  if (text.includes(';')) {
    text = text.split(';')[0].trim();
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function nameNeedsMojibakeFix(value) {
  const text = String(value || '');
  return text.includes('√') || text.includes(';');
}
