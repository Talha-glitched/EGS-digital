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

export function classifyInboundEmail(subject = '', text = '', headers = '') {
  const normSubject = String(subject || '').toLowerCase();
  const normText = String(text || '').toLowerCase();
  const normHeaders = typeof headers === 'string' ? headers.toLowerCase() : JSON.stringify(headers || {}).toLowerCase();
  const combined = `${normSubject} ${normText}`;

  // 1. Header-based Auto-Reply detection
  const isHeaderAutoReply =
    /auto-submitted:\s*(auto-replied|auto-generated|auto-notified)/i.test(normHeaders) ||
    /x-autoreply:\s*yes/i.test(normHeaders) ||
    /x-autorespond:\s*yes/i.test(normHeaders) ||
    /precedence:\s*(auto_reply|junk|bulk)/i.test(normHeaders) && /auto|reply|out of office|abwesend|vacation/i.test(combined);

  // 2. Subject-based Auto-Reply & OOO patterns across languages
  const isSubjectOOO =
    // English
    /automatic reply|auto-reply|auto reply|autoreply|out of (the )?office|out-of-office|on vacation|away from (my )?(desk|office)|annual leave|maternity leave|paternity leave|paternal leave|holiday notice|vacation notice|automated response|undeliverable/i.test(normSubject) ||
    // German (Abwesenheitsnotiz, Automatische Antwort, etc.)
    /automatische antwort|abwesenheitsnotiz|abwesenheitsassistent|abwesenheitsmitteilung|abwesenheit|au[ßs]er haus|nicht im b[uü]ro|bin im urlaub|urlaubsabwesenheit|urlaubsnotiz|urlaubsmeldung|abwesend bis|derzeit abwesend/i.test(normSubject) ||
    // French, Spanish, Italian, Dutch, Portuguese, Turkish, Chinese, Lithuanian, Polish, etc.
    /r[ée]ponse automatique|absence du bureau|message d'absence|respuesta autom[áa]tica|fuera de la oficina|risposta automatica|assente dall'ufficio|automatisch antwoord|afwezigheidsbericht|afwezig|resposta autom[áa]tica|otomatik yan[ıi]t|automatinis atsakymas|automatyczna odpowied[zź]|nieobecno[sś][cć]|自动答复|自動回覆/i.test(normSubject);

  // 3. Body text patterns (common OOO openers/signatures)
  const isBodyOOO =
    // English body phrases
    /i am (currently )?(out of (the )?office|away from (the )?office|on (annual |maternity |sick |parental )?leave|on vacation|on holiday|travelling with limited access)/i.test(normText) ||
    /i will (be )?(returning|back in the office|return on|have limited access)/i.test(normText) ||
    /thank you for your email\.\s*(i am|i'm|i will be)/i.test(normText) ||
    /this is an automated (reply|response|message)/i.test(normText) ||
    // German body phrases
    /ich bin (derzeit |aktuell |vom |ab dem |bis (zum )?)?(nicht im b[uü]ro|au[ßs]er haus|abwesend|im urlaub)/i.test(normText) ||
    /vielen dank f[uü]r ihre nachricht.*(ich bin|ich befinde mich|abwesen)/i.test(normText) ||
    /w[aä]hrend meiner abwesenheit|in dringenden f[aä]llen wenden sie sich|ab dem .* bin ich wieder/i.test(normText) ||
    /ich habe derzeit keinen zugriff auf meine e-mails/i.test(normText) ||
    // French / Spanish / Dutch body phrases
    /je suis actuellement absent|je serai de retour|en cas d'urgence/i.test(normText) ||
    /estar[ée] fuera de la oficina|volver[ée] el d[íi]a/i.test(normText) ||
    /ik ben (wegens vakantie )?afwezig/i.test(normText);

  if (isHeaderAutoReply || isSubjectOOO || isBodyOOO) {
    return { status: 'Out of Office', intent: 'OOO' };
  }

  const isOptOut = /unsubscribe|stop emailing|remove me|opt out|please remove|do not contact/i.test(combined);
  if (isOptOut) {
    return { status: 'Opted Out', intent: 'Opt Out' };
  }

  return { status: 'Replied', intent: 'Neutral' };
}
