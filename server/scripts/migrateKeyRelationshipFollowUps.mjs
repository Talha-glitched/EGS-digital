import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to DB. [Mode: ${isDryRun ? 'DRY-RUN PREVIEW' : 'LIVE MIGRATION'}]\n`);

  const keyContacts = await Lead.find({
    'pocQualification.status': 'Confirmed',
    deletedAt: null,
  }).select('_id name companyId relationshipProfile').lean();

  console.log(`Found ${keyContacts.length} confirmed Key Relationship contacts.\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let updatedLeadCount = 0;

  for (const contact of keyContacts) {
    const existingTask = await Task.findOne({
      leadId: contact._id,
      isRelationshipFollowUp: true,
      deletedAt: null,
    }).lean();

    if (existingTask) {
      skippedCount++;
      console.log(`[EXISTING TASK] Contact "${contact.name || contact._id}": task "${existingTask.title}" (${existingTask.status}) already exists.`);
    } else {
      const taskTitle = contact.name ? `Follow up with ${contact.name.trim()}` : 'Follow up with contact';
      const owner = contact.relationshipProfile?.owner || '';
      const dueAt = contact.relationshipProfile?.nextFollowUpAt || null;
      const notes = contact.relationshipProfile?.reminderNotes || '';

      if (!isDryRun) {
        await Task.create({
          title: taskTitle,
          leadId: contact._id,
          companyId: contact.companyId || null,
          isRelationshipFollowUp: true,
          status: 'Open',
          channel: '',
          owner,
          dueAt,
          notes,
        });
      }
      createdCount++;
      console.log(`[CREATE TASK] Contact "${contact.name || contact._id}": title="${taskTitle}", due=${dueAt ? dueAt.toISOString() : 'null'}, owner="${owner}"`);
    }

    if (contact.relationshipProfile?.nextFollowUpAt) {
      if (!isDryRun) {
        await Lead.updateOne(
          { _id: contact._id },
          { $unset: { 'relationshipProfile.nextFollowUpAt': '' } }
        );
      }
      updatedLeadCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total Key Contacts: ${keyContacts.length}`);
  console.log(`New Follow-up Tasks ${isDryRun ? 'would be created' : 'created'}: ${createdCount}`);
  console.log(`Contacts with existing Task recognized (skipped): ${skippedCount}`);
  console.log(`Legacy nextFollowUpAt fields ${isDryRun ? 'would be cleared' : 'cleared'}: ${updatedLeadCount}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
