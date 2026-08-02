import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

function cleanTextString(str = '') {
  return String(str || '')
    .replace(/Latest subject: "[^"]*"\s*/gi, '')
    .replace(/\[cid:[^\]]+\]/gi, '')
    .replace(/\[picture-[^\]]+\]/gi, '')
    .replace(/\[hct[^\]]+\]/gi, '')
    .replace(/\[onenation[^\]]+\]/gi, '')
    .replace(/\[[a-z0-9_\-\.]+\.(png|jpg|jpeg|gif|svg)\]/gi, '')
    .replace(/â€¯/g, ' ')
    .replace(/\u202f/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Starting Task Deduplication & Notes Sanitization...');

  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const Reply = mongoose.model('Reply', new mongoose.Schema({}, { strict: false }));
  const Email = mongoose.model('Email', new mongoose.Schema({}, { strict: false }));

  // 1. Task Deduplication across all leads
  const openTasks = await Task.find({ deletedAt: null, status: { $ne: 'Completed' } }).sort({ createdAt: -1 }).lean();
  console.log(`Analyzing ${openTasks.length} open tasks for duplicates...`);

  const seenKeys = new Set();
  let duplicateTasksDeleted = 0;

  for (const t of openTasks) {
    const key = `${t.leadId}_${t.replyId || t.title}`;
    if (seenKeys.has(key)) {
      await Task.updateOne({ _id: t._id }, { $set: { deletedAt: new Date(), status: 'Cancelled' } });
      duplicateTasksDeleted++;
    } else {
      seenKeys.add(key);
    }
  }

  // 2. Clean Task Notes & Titles
  const allTasks = await Task.find({ deletedAt: null }).lean();
  const taskBulkOps = [];

  for (const t of allTasks) {
    const cleanNotes = cleanTextString(t.notes || '');
    const cleanTitle = cleanTextString(t.title || '');

    taskBulkOps.push({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { notes: cleanNotes, title: cleanTitle } },
      },
    });
  }

  if (taskBulkOps.length > 0) {
    await Task.bulkWrite(taskBulkOps);
  }

  // 3. Clean Reply text
  const allReplies = await Reply.find({ deletedAt: null }).lean();
  const replyBulkOps = [];

  for (const r of allReplies) {
    const cleanText = cleanTextString(r.text || '');
    replyBulkOps.push({
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { text: cleanText } },
      },
    });
  }

  if (replyBulkOps.length > 0) {
    await Reply.bulkWrite(replyBulkOps);
  }

  console.log('==================================================');
  console.log('TASK DEDUPLICATION & SANITIZATION MIGRATION COMPLETE!');
  console.log(`Duplicate tasks soft-deleted: ${duplicateTasksDeleted}`);
  console.log(`Tasks sanitized: ${taskBulkOps.length}`);
  console.log(`Replies sanitized: ${replyBulkOps.length}`);
  console.log('==================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
