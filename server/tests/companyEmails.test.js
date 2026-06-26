import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGenericEmails, formatCompanyRecord } from '../src/utils/companyEmails.js';

test('normalizeGenericEmails splits, trims, and dedupes', () => {
  assert.deepEqual(
    normalizeGenericEmails(['Info@Acme.com', 'info@acme.com', 'sales@acme.com']),
    ['info@acme.com', 'sales@acme.com'],
  );
  assert.deepEqual(
    normalizeGenericEmails('info@acme.com; sales@acme.com, support@acme.com'),
    ['info@acme.com', 'sales@acme.com', 'support@acme.com'],
  );
});

test('formatCompanyRecord migrates legacy genericEmail', () => {
  const formatted = formatCompanyRecord({
    companyName: 'Acme',
    domain: 'acme.com',
    genericEmail: 'legacy@acme.com',
  });
  assert.deepEqual(formatted.genericEmails, ['legacy@acme.com']);
  assert.equal(formatted.genericEmail, undefined);
});
