import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncResendHistory } from '../src/services/resendService.js';
import { Lead } from '../src/models/Lead.js';
import { recordBouncedEmailForLead, getLeadEmailCandidates } from '../src/utils/contactEmails.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('No RESEND_API_KEY configured');
    await mongoose.disconnect();
    return;
  }

  console.log('Fetching all Resend email logs to sync bounces...');
  const resendEmails = await syncResendHistory(apiKey, { limit: 5000 });
  console.log('Total Resend API emails fetched:', resendEmails.length);

  const bouncedItems = resendEmails.filter((item) => item.last_event === 'bounced' || item.last_event === 'failed');
  console.log(`Found ${bouncedItems.length} bounced/failed items from Resend.`);

  let updatedLeadsCount = 0;

  for (const item of bouncedItems) {
    const rawTo = Array.isArray(item.to) ? item.to[0] : item.to;
    const match = String(rawTo || '').match(/<([^>]+)>/);
    const recipientEmail = (match && match[1] ? match[1] : rawTo).trim().toLowerCase();

    if (!recipientEmail) continue;

    const lead = await Lead.findOne({
      $or: [
        { email: new RegExp(recipientEmail, 'i') },
        { outreachEmail: new RegExp(recipientEmail, 'i') },
        { emailApollo: new RegExp(recipientEmail, 'i') },
        { emailHunter: new RegExp(recipientEmail, 'i') },
        { emailLusha: new RegExp(recipientEmail, 'i') },
        { emailPersonal: new RegExp(recipientEmail, 'i') }
      ]
    });

    if (lead) {
      const result = recordBouncedEmailForLead(lead, recipientEmail, 'bounced', new Date(item.created_at || Date.now()));
      if (result.applied) {
        await lead.save();
        updatedLeadsCount++;
        console.log(`Recorded bounce for ${recipientEmail} on Lead ${lead._id} (${lead.name || lead.email}) - Source: ${result.source}`);
      }
    }
  }

  console.log(`Successfully synced bounces for ${updatedLeadsCount} leads.`);
  await mongoose.disconnect();
}

run().catch(console.error);
