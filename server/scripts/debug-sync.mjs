import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Reply } from '../src/models/Reply.js';
import { parseEmailSourceToText } from '../src/services/imapWatcherService.js';
import { ImapFlow } from 'imapflow';

dotenv.config();

const client = new ImapFlow({
  host: process.env.EMAIL_IMAP_HOST,
  port: Number(process.env.EMAIL_IMAP_PORT || 993),
  secure: Number(process.env.EMAIL_IMAP_PORT || 993) === 993,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
  logger: false,
  tls: { rejectUnauthorized: false },
});

console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!');

console.log('Connecting to IMAP...');
await client.connect();
const lock = await client.getMailboxLock('INBOX');
try {
  const uids = [150]; // Uzair email UID
  for await (const message of client.fetch(uids, { envelope: true, source: true, uid: true }, { uid: true })) {
    const rawSource = message.source;
    console.log('Buffer.isBuffer(rawSource):', Buffer.isBuffer(rawSource));
    const str1 = String(rawSource || '');
    console.log('str1 length:', str1.length);
    
    console.log('\n--- CALLING parseEmailSourceToText with Buffer ---');
    const parsedText1 = parseEmailSourceToText(rawSource);
    console.log('Parsed text 1 length:', parsedText1.length);
    console.log('Parsed text 1 snippet:', JSON.stringify(parsedText1.slice(0, 300)));
    
    console.log('\n--- CALLING parseEmailSourceToText with String ---');
    const parsedText2 = parseEmailSourceToText(str1);
    console.log('Parsed text 2 length:', parsedText2.length);
    console.log('Parsed text 2 snippet:', JSON.stringify(parsedText2.slice(0, 300)));
  }
} finally {
  lock.release();
}

await client.logout();
await mongoose.disconnect();
console.log('Disconnected.');
