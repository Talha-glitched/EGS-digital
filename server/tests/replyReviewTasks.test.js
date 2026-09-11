import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOutreachEmailFromReply } from '../src/utils/contactEmails.js';

test('Task-Based Contacts -> Leads -> Qualified Leads Suite', async (t) => {
  await t.test('1. Out-of-order replies never move repliedAt backward', () => {
    const lead = {
      name: 'Test Contact',
      email: 'test@example.com',
      repliedAt: null,
      deliveryStatus: 'Sent',
    };

    const firstDate = new Date('2026-08-01T10:00:00Z');
    applyOutreachEmailFromReply(lead, lead.email, 'inbox@test.com', firstDate);
    assert.equal(lead.repliedAt.toISOString(), firstDate.toISOString());
    assert.equal(lead.deliveryStatus, 'Replied');

    const earlierDate = new Date('2026-07-15T08:00:00Z');
    applyOutreachEmailFromReply(lead, lead.email, 'inbox@test.com', earlierDate);
    assert.equal(lead.repliedAt.toISOString(), firstDate.toISOString());
  });
});
