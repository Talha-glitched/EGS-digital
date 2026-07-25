import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getLeadTimeline } from '../src/services/contactTimelineService.js';
import { Lead } from '../src/models/Lead.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const lead = await Lead.findOne({
    $or: [
      { email: /raed\.aoude/i },
      { emailLusha: /raed\.aoude/i }
    ]
  }).lean();

  if (!lead) {
    console.log('Lead not found');
    await mongoose.disconnect();
    return;
  }

  console.log('Lead ID:', lead._id);
  const timeline = await getLeadTimeline(lead._id);
  console.log('Timeline events count:', timeline.events.length);
  console.log('=== TIMELINE EVENTS ===');
  console.log(JSON.stringify(timeline.events, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
