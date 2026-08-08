import { startSendWorker } from './sendWorker.js';
import { startImapWatcher } from './imapWatcherService.js';
import { startAnalyticsCron } from './analyticsCronService.js';
import { getMailConfigStatus } from './mailTransport.js';
import { recalculateAllCampaignCoverageStats } from './projectService.js';
import { startResendAutoSyncCron } from './resendAutoSyncService.js';
import { startInventoryPhotoRetentionCron } from './inventoryPhotoRetentionService.js';

export function initializeCrmRuntime() {
  const { imapReady, imap2Ready } = getMailConfigStatus();

  startSendWorker();
  console.info('CRM send worker started (MongoDB queue, no Redis).');

  if (imapReady || imap2Ready) {
    startImapWatcher();
    console.info('IMAP watcher started.');
  }

  startAnalyticsCron();
  console.info('Analytics cron started.');

  startResendAutoSyncCron();
  console.info('Resend automatic reply sync started.');

  startInventoryPhotoRetentionCron();
  console.info('Inventory photo retention cron started.');

  // Keep exhibitor / POC coverage accurate for every campaign (existing + future imports).
  recalculateAllCampaignCoverageStats()
    .then((result) => {
      console.info(`[CRM] Recalculated coverage stats for ${result.updated} campaign(s).`);
    })
    .catch((err) => {
      console.error('[CRM] Coverage stats backfill failed:', err.message);
    });
}
