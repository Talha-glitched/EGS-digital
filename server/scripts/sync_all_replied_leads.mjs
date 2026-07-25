import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lead } from '../src/models/Lead.js';
import { Reply } from '../src/models/Reply.js';
import { applyOutreachEmailFromReply, getLeadEmailCandidates } from '../src/utils/contactEmails.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const apiKey = process.env.RESEND_API_KEY;
  const replies = await Reply.find({}).lean();
  console.log('Database Reply records count:', replies.length);

  let updatedCount = 0;

  for (const r of replies) {
    const senderEmail = r.from || r.email;
    if (!senderEmail) continue;

    const emailCandidates = getLeadEmailCandidates({ email: r.email, outreachEmail: r.email });
    const lead = await Lead.findOne({
      $or: [
        { _id: r.leadId },
        { email: { $in: emailCandidates } },
        { outreachEmail: { $in: emailCandidates } }
      ]
    });

    if (lead) {
      applyOutreachEmailFromReply(lead, senderEmail, r.systemInbox || 'rana@masuood.exhibitgraphicsign.com');
      lead.deliveryStatus = 'Replied';
      lead.repliedAt = r.receivedAt || r.createdAt || new Date();
      lead.outcome = 'Replied';
      await lead.save();
      updatedCount++;
      console.log(`Updated Lead ${lead._id} (${lead.name || lead.email}) => deliveryStatus: Replied`);
    }
  }

  // Also check Resend Receiving API items to sync any leads that have received responses directly
  if (apiKey) {
    try {
      const receivingRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (receivingRes.ok) {
        const receivingJson = await receivingRes.json();
        const receivedList = receivingJson.data || [];
        console.log('Resend receiving list items:', receivedList.length);

        for (const rItem of receivedList) {
          const rawFrom = rItem.from || '';
          const match = rawFrom.match(/<([^>]+)>/);
          const cleanFrom = (match && match[1] ? match[1] : rawFrom).trim().toLowerCase();

          if (!cleanFrom) continue;

          const lead = await Lead.findOne({
            $or: [
              { email: new RegExp(cleanFrom, 'i') },
              { outreachEmail: new RegExp(cleanFrom, 'i') },
              { emailApollo: new RegExp(cleanFrom, 'i') },
              { emailHunter: new RegExp(cleanFrom, 'i') },
              { emailLusha: new RegExp(cleanFrom, 'i') },
              { emailPersonal: new RegExp(cleanFrom, 'i') }
            ]
          });

          if (lead) {
            const rawTo = Array.isArray(rItem.to) ? rItem.to[0] : rItem.to;
            const systemInbox = (rawTo || '').replace(/.*<([^>]+)>.*/, '$1').trim() || 'rana@masuood.exhibitgraphicsign.com';
            applyOutreachEmailFromReply(lead, cleanFrom, systemInbox);
            lead.deliveryStatus = 'Replied';
            lead.repliedAt = new Date(rItem.created_at || Date.now());
            lead.outcome = 'Replied';
            await lead.save();
            updatedCount++;
            console.log(`Updated Lead via Resend API ${lead._id} (${lead.name || lead.email}) => deliveryStatus: Replied`);
          }
        }
      }
    } catch (rErr) {
      console.warn('Resend receiving sync error:', rErr.message);
    }
  }

  console.log(`Successfully updated ${updatedCount} lead records with Replied status.`);
  await mongoose.disconnect();
}

run().catch(console.error);
