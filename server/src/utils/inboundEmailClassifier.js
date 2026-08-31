export function parseEmailAndName(rawFrom = '') {
  const match = String(rawFrom).match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/) || String(rawFrom).match(/<([^>]+)>/);
  let name = '';
  let email = '';

  if (match) {
    name = (match[1] || '').trim();
    email = (match[2] || match[0]).replace(/[<>]/g, '').trim().toLowerCase();
  } else {
    email = String(rawFrom).trim().toLowerCase();
  }

  if (!name && email) {
    const localPart = email.split('@')[0] || '';
    name = localPart
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return { name: name || 'Contact', email };
}

export function classifyInboundEmail(subject = '', text = '') {
  const combined = `${subject} ${text}`.toLowerCase();

  const isOOO = /automatic reply|automatische antwort|automatinis atsakymas|réponse automatique|otomatik yanıt|自动答复|out of office|out-of-office|auto-reply|autoresponder|on vacation|abwesend|off line|away from my desk/i.test(subject) ||
    /i am currently out of office|i am away from the office|automatic reply:|automatische antwort:|i will return on|i will be out of office/i.test(combined);

  if (isOOO) {
    return { status: 'Out of Office', intent: 'OOO' };
  }

  const isOptOut = /unsubscribe|stop emailing|remove me|opt out|please remove|do not contact/i.test(combined);
  if (isOptOut) {
    return { status: 'Opted Out', intent: 'Opt Out' };
  }

  return { status: 'Replied', intent: 'Neutral' };
}
