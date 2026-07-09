import dotenv from 'dotenv';
import { createTransporter, createImapClient } from '../src/services/mailTransport.js';

dotenv.config();

const users = [
  {
    name: 'User 1 (Talha)',
    email: process.env.EMAIL_SMTP_USER,
  },
  {
    name: 'User 2 (Masuood)',
    email: process.env.EMAIL_SMTP_USER2,
  }
];

console.log('Running Dynamic SMTP & IMAP Credentials Check...');
console.log('==================================================');

for (const u of users) {
  if (!u.email) {
    console.log(`[${u.name}] Skipped: email not set in environment.`);
    continue;
  }

  console.log(`[${u.name}] Resolving credentials for ${u.email}...`);

  // Test SMTP
  console.log(`[${u.name}] Testing SMTP connection...`);
  try {
    const transporter = createTransporter(u.email);
    await transporter.verify();
    console.log(`[${u.name}] SMTP Verify: SUCCESS`);
  } catch (err) {
    console.error(`[${u.name}] SMTP Verify: FAILED - ${err.message}`);
  }

  // Test IMAP
  console.log(`[${u.name}] Testing IMAP connection...`);
  try {
    const client = createImapClient(u.email);
    await client.connect();
    console.log(`[${u.name}] IMAP Connect: SUCCESS`);
    await client.logout();
  } catch (err) {
    console.error(`[${u.name}] IMAP Connect: FAILED - ${err.message}`);
  }
  console.log('--------------------------------------------------');
}
