#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const { default: db } = await import('../src/db/index.js');
const { syncImapMailbox } = await import('../src/services/imapWatcherService.js');

try {
  const result = await syncImapMailbox();
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.getPool().end();
}
