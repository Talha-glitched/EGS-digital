import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { syncResendHistory } from '../src/services/resendService.js';
import { Lead } from '../src/models/Lead.js';

dotenv.config();

async function run() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('No RESEND_API_KEY set');
    return;
  }

  console.log('Fetching all emails from Resend API...');
  const resendEmails = await syncResendHistory(apiKey, { limit: 5000 });
  console.log('Total Resend API emails fetched:', resendEmails.length);

  const eventCounts = {};
  const bouncedEmails = [];
  const receivedEmails = [];

  for (const item of resendEmails) {
    const event = item.last_event || 'unknown';
    eventCounts[event] = (eventCounts[event] || 0) + 1;

    if (event === 'bounced' || event === 'failed') {
      const recipient = Array.isArray(item.to) ? item.to[0] : item.to;
      bouncedEmails.push({ id: item.id, to: recipient, event, subject: item.subject, createdAt: item.created_at });
    }
  }

  console.log('\n=== RESEND EVENT COUNTS ===');
  console.log(eventCounts);

  console.log(`\n=== BOUNCED/FAILED EMAILS (${bouncedEmails.length}) ===`);
  console.log(JSON.stringify(bouncedEmails.slice(0, 20), null, 2));

  // Check receiving endpoint
  const receivingRes = await fetch('https://api.resend.com/emails/receiving?limit=500', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (receivingRes.ok) {
    const receivingJson = await receivingRes.json();
    const receivedList = receivingJson.data || [];
    console.log(`\n=== RESEND RECEIVING API ITEMS (${receivedList.length}) ===`);
  }
}

run().catch(console.error);
