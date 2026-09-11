import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTitleForType } from '../src/constants/interactionTypes.js';

test('Key Relationship Follow-up Integration Suite', async (t) => {
  await t.test('1. defaultTitleForType returns appropriate titles for channels and directions', () => {
    assert.equal(defaultTitleForType('phone_call', 'outbound'), 'Phone call');
    assert.equal(defaultTitleForType('phone_call', 'inbound'), 'Inbound phone call');
    assert.equal(defaultTitleForType('whatsapp', 'outbound'), 'WhatsApp / text');
    assert.equal(defaultTitleForType('meeting', 'outbound'), 'Meeting');
    assert.equal(defaultTitleForType('note', 'internal'), 'Note / summary');
  });
});
