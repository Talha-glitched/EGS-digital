import dotenv from 'dotenv';
import { createImapClient } from '../src/services/mailTransport.js';

dotenv.config();

const client = createImapClient();
await client.connect();
const boxes = await client.list();
console.log('Mailboxes:', boxes.map((b) => b.path).slice(0, 30));

for (const folder of ['INBOX', 'Sent', 'INBOX.Sent', '[Gmail]/Sent Mail']) {
  try {
    const lock = await client.getMailboxLock(folder);
    try {
      const total = client.mailbox.exists;
      console.log(`\n${folder}: ${total} messages`);
      if (total > 0) {
        const fromSeq = Math.max(1, total - 4);
        for await (const msg of client.fetch(`${fromSeq}:*`, { envelope: true, uid: true })) {
          console.log(' ', {
            uid: msg.uid,
            subject: msg.envelope?.subject,
            to: msg.envelope?.to?.map((a) => a.address),
            date: msg.envelope?.date,
          });
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.log(`${folder}: not available (${err.message})`);
  }
}

await client.logout();
