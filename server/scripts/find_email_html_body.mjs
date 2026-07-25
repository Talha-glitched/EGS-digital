import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  const apiKey = process.env.RESEND_API_KEY;

  console.log('=== 1. SEARCHING RESEND RECEIVING API ===');
  const res = await fetch('https://api.resend.com/emails/receiving?limit=100', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = await res.json();
  const list = json.data || [];
  console.log('Resend receiving list count:', list.length);

  for (const item of list) {
    if (JSON.stringify(item).toLowerCase().includes('raed') || JSON.stringify(item).toLowerCase().includes('aoude') || JSON.stringify(item).toLowerCase().includes('tjobava')) {
      console.log('Found matching Resend list item:', JSON.stringify(item, null, 2));
    }
  }

  console.log('=== 2. SEARCHING MONGODB REPLIES ===');
  await mongoose.connect(process.env.MONGODB_URI);
  const Reply = mongoose.models.Reply || mongoose.model('Reply', new mongoose.Schema({}, { strict: false }));
  const replies = await Reply.find({}).lean();
  console.log('MongoDB Reply count:', replies.length);

  for (const r of replies) {
    console.log('Reply ID:', r._id, 'Email:', r.email, 'From:', r.from, 'Text len:', r.text?.length, 'Thread len:', r.threadHistory?.length);
    if (JSON.stringify(r).toLowerCase().includes('raed') || JSON.stringify(r).toLowerCase().includes('personal leave') || JSON.stringify(r).toLowerCase().includes('tjobava')) {
      console.log('MATCHED MONGODB REPLY:', JSON.stringify(r, null, 2));
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
