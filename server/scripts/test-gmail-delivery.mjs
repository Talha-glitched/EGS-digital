import dotenv from 'dotenv';
import { sendAuthenticatedMail } from '../src/services/mailTransport.js';
import { createImapClient } from '../src/services/mailTransport.js';

dotenv.config();

const gmail = process.argv[2] || 'm.talha2703@gmail.com';
const subject = `EGS Gmail delivery test ${Date.now()}`;

console.log('Sending to:', gmail);
const info = await sendAuthenticatedMail({
  to: gmail,
  subject,
  text: 'If you receive this in Gmail inbox or spam, external SMTP delivery works.',
  html: '<p>If you receive this in Gmail inbox or spam, external SMTP delivery works.</p>',
});
console.log('SMTP result:', {
  messageId: info.messageId,
  response: info.response,
  accepted: info.accepted,
  rejected: info.rejected,
});

console.log('\nChecking INBOX for bounces (last 20)...');
const client = createImapClient();
await client.connect();
const lock = await client.getMailboxLock('INBOX');
try {
  const total = client.mailbox.exists;
  const fromSeq = Math.max(1, total - 19);
  for await (const msg of client.fetch(`${fromSeq}:*`, { envelope: true, source: true })) {
    const from = msg.envelope?.from?.[0]?.address || '';
    const subj = msg.envelope?.subject || '';
    if (/mailer-daemon|postmaster|delivery|undeliver|failed/i.test(from + subj)) {
      const text = String(msg.source || '').slice(0, 800);
      console.log('\n--- BOUNCE/Delivery notice ---');
      console.log('From:', from);
      console.log('Subject:', subj);
      console.log('Snippet:', text.replace(/\r?\n/g, ' ').slice(0, 400));
    }
  }
} finally {
  lock.release();
  await client.logout();
}
