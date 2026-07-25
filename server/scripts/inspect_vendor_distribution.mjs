import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lead } from '../src/models/Lead.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const allLeads = await Lead.find({ deletedAt: null }).lean();
  console.log('Total non-deleted leads in DB:', allLeads.length);

  let apolloCount = 0;
  let hunterCount = 0;
  let lushaCount = 0;
  let personalCount = 0;
  let purelyManualCount = 0;

  const vendorBreakdown = {
    Apollo: 0,
    Hunter: 0,
    Lusha: 0,
    Personal: 0,
    Manual: 0,
  };

  for (const lead of allLeads) {
    const hasApollo = Boolean(lead.emailApollo?.trim());
    const hasHunter = Boolean(lead.emailHunter?.trim());
    const hasLusha = Boolean(lead.emailLusha?.trim());
    const hasPersonal = Boolean(lead.emailPersonal?.trim());
    const primary = lead.primarySource || 'Manual';

    if (hasApollo) apolloCount++;
    if (hasHunter) hunterCount++;
    if (hasLusha) lushaCount++;
    if (hasPersonal) personalCount++;

    if (!hasApollo && !hasHunter && !hasLusha && !hasPersonal) {
      purelyManualCount++;
    }

    // Determine actual source attribution
    let inferredSource = 'Manual';
    if (lead.outreachEmailSource) {
      inferredSource = lead.outreachEmailSource;
    } else if (hasApollo) {
      inferredSource = 'Apollo';
    } else if (hasHunter) {
      inferredSource = 'Hunter';
    } else if (hasLusha) {
      inferredSource = 'Lusha';
    } else if (hasPersonal) {
      inferredSource = 'Personal';
    } else if (primary && primary !== 'Manual') {
      inferredSource = primary;
    }

    vendorBreakdown[inferredSource] = (vendorBreakdown[inferredSource] || 0) + 1;
  }

  console.log('\n=== DIRECT FIELD COUNT ===');
  console.log({ apolloCount, hunterCount, lushaCount, personalCount, purelyManualCount });

  console.log('\n=== INFERRED VENDOR BREAKDOWN ===');
  console.log(vendorBreakdown);

  await mongoose.disconnect();
}

run().catch(console.error);
