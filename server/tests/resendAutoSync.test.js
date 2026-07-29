import test from 'node:test';
import assert from 'node:assert';
import { syncAllResendReplies, startResendAutoSyncCron, stopResendAutoSyncCron } from '../src/services/resendAutoSyncService.js';

test('resendAutoSyncService graceful fallback when RESEND_API_KEY is missing or invalid', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const result = await syncAllResendReplies();
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.message, 'RESEND_API_KEY not configured.');

  if (originalKey) process.env.RESEND_API_KEY = originalKey;
});

test('resendAutoSyncService start and stop cron controls', () => {
  startResendAutoSyncCron(60000);
  stopResendAutoSyncCron();
  assert.ok(true, 'Resend auto sync cron started and stopped cleanly');
});
