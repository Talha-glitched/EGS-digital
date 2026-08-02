import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Starting Key Relationship Task Migration...');

  const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const Reply = mongoose.model('Reply', new mongoose.Schema({}, { strict: false }));

  // 1. Find all Confirmed Right POC Contacts
  const confirmedLeads = await Lead.find({
    'pocQualification.status': 'Confirmed',
    deletedAt: null,
  }).lean();

  console.log(`Found ${confirmedLeads.length} Confirmed Right POC (Key Relationship) contacts.`);

  const confirmedLeadIds = confirmedLeads.map((l) => l._id);

  // 2. Convert all open tasks for these contacts to relationship_follow_up
  const tasksToUpdate = await Task.find({
    leadId: { $in: confirmedLeadIds },
    deletedAt: null,
    status: 'Open',
    taskType: { $ne: 'relationship_follow_up' },
  }).lean();

  console.log(`Found ${tasksToUpdate.length} open tasks needing conversion to Key Relationship follow-ups...`);

  let convertedTasks = 0;
  for (const t of tasksToUpdate) {
    await Task.updateOne(
      { _id: t._id },
      {
        $set: {
          taskType: 'relationship_follow_up',
          updatedAt: new Date(),
        },
      }
    );
    convertedTasks++;
  }

  // 3. Mark unreviewed replies for these contacts as Reviewed / Not Required
  await Reply.updateMany(
    {
      leadId: { $in: confirmedLeadIds },
      'humanReview.status': 'Unreviewed',
    },
    {
      $set: {
        'humanReview.status': 'Not Required',
        'humanReview.reviewedAt': new Date(),
        'humanReview.reviewedBy': 'system_migration',
      },
    }
  );

  console.log('==================================================');
  console.log('KEY RELATIONSHIP TASK MIGRATION COMPLETE!');
  console.log(`Confirmed Right POC Contacts: ${confirmedLeads.length}`);
  console.log(`Tasks converted to Relationship Follow-ups: ${convertedTasks}`);
  console.log('==================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
