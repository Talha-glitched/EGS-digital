import test from 'node:test';
import assert from 'node:assert/strict';
import { getFromIdentity } from '../src/services/mailTransport.js';
import { withOptOutFooter } from '../src/services/sendWorker.js';

test('getFromIdentity resolves default fromName and fromEmail when campaign is null', () => {
  const identity = getFromIdentity(null);
  assert.equal(typeof identity.fromName, 'string');
  assert.equal(typeof identity.fromEmail, 'string');
  assert.ok(identity.fromName.length > 0);
  assert.ok(identity.fromEmail.length > 0);
});

test('getFromIdentity resolves custom project/campaign fromName if defined', () => {
  const identity = getFromIdentity({ fromName: 'Custom Campaign Sender', fromEmail: 'custom@egs.ae' });
  assert.equal(identity.fromName, 'Custom Campaign Sender');
  assert.equal(identity.fromEmail, 'custom@egs.ae');
});

test('withOptOutFooter returns original body without modification', () => {
  const text = 'Hello world outreach email';
  assert.equal(withOptOutFooter(text), 'Hello world outreach email');
});
