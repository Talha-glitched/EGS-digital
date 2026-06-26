import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLeadResponseMeta,
  getCompanyResponseMeta,
  enrichLeadsWithResponse,
} from '../src/utils/leadResponse.js';

test('getLeadResponseMeta detects email replies', () => {
  const meta = getLeadResponseMeta({
    deliveryStatus: 'Replied',
    repliedAt: '2026-01-10T10:00:00.000Z',
  });
  assert.equal(meta.hasResponded, true);
  assert.deepEqual(meta.responseChannels, ['email']);
});

test('getLeadResponseMeta detects multi-channel responses', () => {
  const meta = getLeadResponseMeta({
    coldCall: { response: 'Call me next week', date: '2026-02-01T09:00:00.000Z' },
    whatsapp: { response: 'Thanks' },
    linkedinOutreach: { dmResponded: true, dmDate: '2026-01-15T12:00:00.000Z' },
  });
  assert.equal(meta.hasResponded, true);
  assert.ok(meta.responseChannels.includes('phone'));
  assert.ok(meta.responseChannels.includes('whatsapp'));
  assert.ok(meta.responseChannels.includes('linkedin'));
});

test('getCompanyResponseMeta aggregates contact responses', () => {
  const leads = [
    { _id: '1', deliveryStatus: 'Pending Inqueue' },
    { _id: '2', whatsapp: { response: 'Interested' }, updatedAt: '2026-03-01T08:00:00.000Z' },
  ];
  const meta = getCompanyResponseMeta(leads);
  assert.equal(meta.hasResponded, true);
  assert.equal(meta.respondingContactCount, 1);
});

test('enrichLeadsWithResponse includes inbound manual interactions', () => {
  const [lead] = enrichLeadsWithResponse(
    [{ _id: 'abc', deliveryStatus: 'Emailed Outbound' }],
    [{ leadId: 'abc', direction: 'inbound', occurredAt: '2026-04-01T10:00:00.000Z' }],
  );
  assert.equal(lead.hasResponded, true);
  assert.ok(lead.responseChannels.includes('manual'));
});
