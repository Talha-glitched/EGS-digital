import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Reply } from '../src/models/Reply.js';
import { syncImapMailbox } from '../src/services/imapWatcherService.js';

dotenv.config();

console.log('Connecting to MongoDB...');
await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected!');

const idsToDelete = ['6a3ebf47ffbf80bd61738614', '6a49334fcbab932ffe482a77'];

console.log('Deleting corrupted replies from database...');
const deleteResult = await Reply.deleteMany({ _id: { $in: idsToDelete } });
console.log(`Deleted ${deleteResult.deletedCount} documents.`);

console.log('Triggering IMAP mailbox sync...');
const syncStats = await syncImapMailbox();
console.log('Sync finished! Stats:', JSON.stringify(syncStats, null, 2));

console.log('Verifying recreated replies...');
const recreatedReplies = await Reply.find({ _id: { $in: idsToDelete.map(id => new mongoose.Types.ObjectId(id)) } });
console.log(`Re-found ${recreatedReplies.length} of the deleted IDs.`);
for (const r of recreatedReplies) {
  console.log(`\n--- RECREATED REPLY _id: ${r._id} ---`);
  console.log('From:', r.from);
  console.log('Text (first 200 chars):', JSON.stringify(r.text?.slice(0, 200)));
  console.log('Thread History length:', r.threadHistory?.length);
  if (r.threadHistory?.length) {
    console.log('First history item body:', JSON.stringify(r.threadHistory[0].body?.slice(0, 200)));
  }
}

// In case their IDs changed due to recreation, let's look at all replies in DB
console.log('\nAll replies in DB now:');
const allReplies = await Reply.find().lean();
for (const r of allReplies) {
  console.log(`- _id: ${r._id}, Email: ${r.email}, Subject: "${r.subject}", Text snippet: ${JSON.stringify(r.text?.slice(0, 100))}`);
}

await mongoose.disconnect();
console.log('Disconnected.');
