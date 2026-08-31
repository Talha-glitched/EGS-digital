import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyInboundEmail } from '../src/utils/inboundEmailClassifier.js';

test('inboundEmailClassifier - German auto-replies', () => {
  const t1 = classifyInboundEmail('Automatische Antwort: AW: Inquiry', 'Ich bin bis zum 05.09. nicht im Büro.');
  assert.equal(t1.intent, 'OOO');
  assert.equal(t1.status, 'Out of Office');

  const t2 = classifyInboundEmail('Abwesenheitsnotiz: VTEX partnership', 'Vielen Dank für Ihre Nachricht. Ich befinde mich im Urlaub.');
  assert.equal(t2.intent, 'OOO');

  const t3 = classifyInboundEmail('Re: Presentation', 'Ich bin derzeit außer Haus und habe keinen Zugriff auf E-Mails.');
  assert.equal(t3.intent, 'OOO');
});

test('inboundEmailClassifier - English and multilingual auto-replies', () => {
  const t1 = classifyInboundEmail('Automatic reply: Meeting next week', 'I am currently out of the office on annual leave.');
  assert.equal(t1.intent, 'OOO');

  const t2 = classifyInboundEmail('Réponse automatique: Demande de stand', 'Je suis actuellement absent du bureau.');
  assert.equal(t2.intent, 'OOO');

  const t3 = classifyInboundEmail('Auto-Reply', 'I will return on Monday.');
  assert.equal(t3.intent, 'OOO');
});

test('inboundEmailClassifier - Auto-Submitted headers', () => {
  const t1 = classifyInboundEmail('Re: Follow up', 'Thank you', 'Auto-Submitted: auto-replied\r\nFrom: test@example.de');
  assert.equal(t1.intent, 'OOO');
});

test('inboundEmailClassifier - Real human replies are not marked as OOO', () => {
  const t1 = classifyInboundEmail('Re: Exhibition stand in Dubai', 'Thanks Talha, we are interested. Can you send over the price catalogue?');
  assert.equal(t1.intent, 'Neutral');
  assert.equal(t1.status, 'Replied');

  const t2 = classifyInboundEmail('Re: Meeting', 'Please unsubscribe our team from this list.');
  assert.equal(t2.intent, 'Opt Out');
  assert.equal(t2.status, 'Opted Out');
});
