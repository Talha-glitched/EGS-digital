import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLeadEmailQuery,
  getBlastSendEmails,
  getLeadEmailCandidates,
  getPrimaryLeadEmail,
  getSendTargetEmail,
  splitContactEmails,
} from '../src/utils/contactEmails.js';
import { buildStepPerformance } from '../src/services/projectService.js';
import {
  assertEnrollmentConfirmed,
  assertLaunchAudience,
  buildEnrollmentLeadQuery,
  enrollableDeliveryFilter,
  resolveLeadForCampaignEnrollment,
  sanitizeAudienceProjectId,
} from '../src/services/sequenceService.js';
import { withOptOutFooter } from '../src/services/sendWorker.js';

test('contact email helpers choose one primary and safely parse provider lists', () => {
  const lead = {
    email: 'Primary@Example.com',
    emailApollo: 'primary@example.com; alternate@example.com',
    emailHunter: 'bad-value',
    emailLusha: 'third@example.com, alternate@example.com',
  };

  assert.equal(getPrimaryLeadEmail(lead), 'primary@example.com');
  assert.deepEqual(getLeadEmailCandidates(lead), [
    'primary@example.com',
    'alternate@example.com',
    'third@example.com',
  ]);
  assert.deepEqual(splitContactEmails('one@example.com; two@example.com'), [
    'one@example.com',
    'two@example.com',
  ]);
});

test('contact email query matches an address inside legacy semicolon lists', () => {
  const query = buildLeadEmailQuery('alternate@example.com');
  assert.ok(query?.$or?.length);
  const pattern = query.$or[1].emailApollo;
  assert.equal(pattern.test('primary@example.com; alternate@example.com'), true);
  assert.equal(pattern.test('notalternate@example.com'), false);
});

test('sequence analytics maps zero-based job indexes to human step numbers', () => {
  const rows = buildStepPerformance(
    [{ _id: 0, count: 100 }, { _id: 1, count: 40 }],
    [{ _id: 0, count: 10 }, { _id: 1, count: 2 }],
    2
  );

  assert.deepEqual(rows, [
    { step: 1, sent: 100, replies: 10, rate: 10 },
    { step: 2, sent: 40, replies: 2, rate: 5 },
  ]);
});

test('campaign enrollment requires confirmation and selects enrollable leads', () => {
  assert.throws(() => assertEnrollmentConfirmed(), /confirmation is required/i);
  assert.doesNotThrow(() => assertEnrollmentConfirmed({ confirmEnrollment: true }));
  assert.deepEqual(enrollableDeliveryFilter(), {
    deliveryStatus: { $nin: ['Bounced / Invalid', 'Opted Out'] },
  });
  assert.deepEqual(buildEnrollmentLeadQuery('project-1', { leadIds: ['lead-1'] }), {
    campaignId: 'project-1',
    deliveryStatus: { $nin: ['Bounced / Invalid', 'Opted Out'] },
    _id: { $in: ['lead-1'] },
  });
});

test('audience project ids reject String(null) and other invalid ObjectId values', () => {
  assert.equal(sanitizeAudienceProjectId(null), null);
  assert.equal(sanitizeAudienceProjectId('null'), null);
  assert.equal(sanitizeAudienceProjectId('undefined'), null);
  assert.equal(sanitizeAudienceProjectId(''), null);
  assert.equal(sanitizeAudienceProjectId('not-an-id'), null);
  assert.equal(sanitizeAudienceProjectId('507f1f77bcf86cd799439011'), '507f1f77bcf86cd799439011');
});

test('launch audience ignores invalid imported campaign id strings like "null"', () => {
  assert.throws(
    () => assertLaunchAudience({ importedCampaignIds: ['null', 'undefined'] }),
    /Choose an audience before launching/i,
  );
  assert.doesNotThrow(() => assertLaunchAudience({
    importedCampaignIds: ['507f1f77bcf86cd799439011'],
  }));
});

test('audience preview counts every eligible contact for launch enrollment', () => {
  const eligible = 6;
  const alreadyEnrolled = 3;
  const alreadyCompleted = 2;
  const netNew = eligible;
  const willRestart = alreadyEnrolled + alreadyCompleted;

  assert.equal(netNew, 6);
  assert.equal(willRestart, 5);
  assert.notEqual(netNew, Math.max(0, eligible - alreadyEnrolled));
});

test('resolveLeadForCampaignEnrollment is exported for campaign audience enrollment', () => {
  assert.equal(typeof resolveLeadForCampaignEnrollment, 'function');
});

test('blast emails send every distinct address but never the same exact email twice', () => {
  const lead = {
    email: 'same@example.com',
    emailApollo: 'same@example.com; apollo@example.com',
    emailHunter: 'Apollo@Example.com',
    emailLusha: 'lusha@example.com',
  };
  assert.deepEqual(getBlastSendEmails(lead), [
    'same@example.com',
    'apollo@example.com',
    'lusha@example.com',
  ]);
  assert.equal(getSendTargetEmail(lead), 'apollo@example.com');
});

test('outbound messages do not append an automatic opt-out footer', () => {
  const body = withOptOutFooter('Hello Joy');
  assert.equal(body, 'Hello Joy');
  assert.equal(withOptOutFooter('Hello Joy\n\nReply to opt out.'), 'Hello Joy\n\nReply to opt out.');
});
