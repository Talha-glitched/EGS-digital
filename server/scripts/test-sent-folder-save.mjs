import dotenv from 'dotenv';
import { sendAuthenticatedMail } from '../src/services/mailTransport.js';
import { createImapClient } from '../src/services/mailTransport.js';

dotenv.config();

const subject = `EGS sent-folder test ${new Date().toISOString()}`;

const info = await sendAuthenticatedMail({
  to: process.env.EMAIL_SMTP_USER,
  subject,
  text: 'This message should appear in INBOX.Sent after SMTP delivery.',
});

console.log('SMTP:', { messageId: info.messageId, response: info.response });

const client = createImapClient();
await client.connect();
const lock = await client.getMailboxLock('INBOX.Sent');
try {
  const total = client.mailbox.exists;
  console.log('INBOX.Sent count:', total);
  if (total > 0) {
    for await (const msg of client.fetch(`${total}:*`, { envelope: true })) {
      console.log('Latest sent:', msg.envelope?.subject, msg.envelope?.date);
    }
  }
} finally {
  lock.release();
  await client.logout();
}
