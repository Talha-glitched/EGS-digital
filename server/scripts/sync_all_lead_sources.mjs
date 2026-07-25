import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lead } from '../src/models/Lead.js';
import { resolveLeadVendorSource } from '../src/utils/contactEmails.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const leads = await Lead.find({ deletedAt: null });
  console.log(`Processing ${leads.length} leads...`);

  let updatedCount = 0;

  for (const lead of leads) {
    const detected = resolveLeadVendorSource(lead);
    let changed = false;

    const sourcesSet = new Set(lead.sources || []);
    if (lead.emailApollo && !sourcesSet.has('Apollo')) { sourcesSet.add('Apollo'); changed = true; }
    if (lead.emailHunter && !sourcesSet.has('Hunter')) { sourcesSet.add('Hunter'); changed = true; }
    if (lead.emailLusha && !sourcesSet.has('Lusha')) { sourcesSet.add('Lusha'); changed = true; }
    if (lead.emailPersonal && !sourcesSet.has('Personal')) { sourcesSet.add('Personal'); changed = true; }

    if (lead.primarySource !== detected) {
      lead.primarySource = detected;
      changed = true;
    }

    if (changed) {
      lead.sources = [...sourcesSet];
      await lead.save();
      updatedCount++;
    }
  }

  console.log(`Successfully updated vendor sources for ${updatedCount} leads.`);
  await mongoose.disconnect();
}

run().catch(console.error);
