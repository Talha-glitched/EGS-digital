import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncImapMailbox } from '../src/services/imapWatcherService.js';
import { Reply } from '../src/models/Reply.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  console.log('Triggering syncImapMailbox() now...');
  const syncResults = await syncImapMailbox();
  console.log('Sync results:', JSON.stringify(syncResults, null, 2));

  const replies = await Reply.find({
    $or: [
      { email: /raed\.aoude/i },
      { from: /raed\.aoude/i }
    ]
  }).lean();

  console.log('=== REPLIES IN DB AFTER IMAP SYNC ===');
  console.log(JSON.stringify(replies, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
