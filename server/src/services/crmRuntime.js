import { startSendWorker } from './sendWorker.js';
import { startImapWatcher } from './imapWatcherService.js';
import { startAnalyticsCron } from './analyticsCronService.js';
import { getMailConfigStatus } from './mailTransport.js';

export function initializeCrmRuntime() {
  const { imapReady } = getMailConfigStatus();

  startSendWorker();
  console.info('CRM send worker started (MongoDB queue, no Redis).');

  if (imapReady) {
    startImapWatcher();
    console.info('IMAP watcher started.');
  }

  startAnalyticsCron();
  console.info('Analytics cron started.');
}
