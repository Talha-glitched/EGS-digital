import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Lead = mongoose.models.Lead || mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
  const Reply = mongoose.models.Reply || mongoose.model('Reply', new mongoose.Schema({}, { strict: false }));
  const ContactInteraction = mongoose.models.ContactInteraction || mongoose.model('ContactInteraction', new mongoose.Schema({}, { strict: false }));

  const lead = await Lead.findOne({
    $or: [
      { email: /raed\.aoude/i },
      { outreachEmail: /raed\.aoude/i }
    ]
  }).lean();

  console.log('=== LEAD RECORD ===');
  console.log(JSON.stringify(lead, null, 2));

  const replies = await Reply.find({
    $or: [
      { email: /raed\.aoude/i },
      { from: /raed\.aoude/i }
    ]
  }).lean();

  console.log('=== REPLIES RECORDS ===');
  console.log(JSON.stringify(replies, null, 2));

  const interactions = await ContactInteraction.find({
    leadId: lead?._id
  }).lean();

  console.log('=== INTERACTIONS RECORDS ===');
  console.log(JSON.stringify(interactions, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
