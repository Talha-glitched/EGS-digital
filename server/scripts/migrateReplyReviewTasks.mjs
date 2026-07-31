import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';
import { Reply } from '../src/models/Reply.js';
import { ensureReplyReviewTask } from '../src/services/replyReviewTaskService.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[Migration] Starting Reply Review & Task Type migration... (Dry Run: ${isDryRun})`);

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  try {
    // -------------------------------------------------------------
    // Step 1: Migrate stored taskType on existing tasks
    // -------------------------------------------------------------
    console.log('[Step 1] Backfilling taskType on existing tasks...');
    const relRes = await Task.updateMany(
      { isRelationshipFollowUp: true, taskType: { $ne: 'relationship_follow_up' } },
      { $set: { taskType: 'relationship_follow_up' } }
    );
    console.log(`Updated ${relRes.modifiedCount || 0} relationship follow-up tasks to taskType='relationship_follow_up'.`);

    const jobRes = await Task.updateMany(
      { opportunityId: { $ne: null }, taskType: 'general' },
      { $set: { taskType: 'ongoing_job' } }
    );
    console.log(`Updated ${jobRes.modifiedCount || 0} ongoing job tasks to taskType='ongoing_job'.`);

    // -------------------------------------------------------------
    // Step 2: Set leadStage & update repliedAt for contacts with replies
    // -------------------------------------------------------------
    console.log('[Step 2] Processing contacts with inbound replies...');
    const replyLeadIds = await Reply.distinct('leadId', { deletedAt: null });
    let leadsAdvanced = 0;

    for (const leadId of replyLeadIds) {
      if (!leadId || !mongoose.isValidObjectId(String(leadId))) continue;
      const lead = await Lead.findById(leadId);
      if (!lead) continue;

      let changed = false;
      if (lead.leadStage !== 'qualified_lead' && lead.leadStage !== 'lead') {
        lead.leadStage = 'lead';
        changed = true;
      }

      const latestReply = await Reply.findOne({ leadId: lead._id, deletedAt: null }).sort({ receivedAt: -1 }).lean();
      if (latestReply?.receivedAt) {
        const latestDate = new Date(latestReply.receivedAt);
        if (!lead.repliedAt || latestDate > new Date(lead.repliedAt)) {
          lead.repliedAt = latestDate;
          changed = true;
        }
      }

      if (changed && !isDryRun) {
        await lead.save();
        leadsAdvanced += 1;
      }
    }
    console.log(`Advanced leadStage/repliedAt for ${leadsAdvanced} contacts.`);

    // -------------------------------------------------------------
    // Step 3: Deduplicate open reply_review tasks & create missing ones
    // -------------------------------------------------------------
    console.log('[Step 3] Deduplicating & ensuring open reply_review tasks...');
    const unreviewedReplies = await Reply.find({
      'humanReview.status': { $ne: 'Reviewed' },
      deletedAt: null,
    }).sort({ receivedAt: -1 }).lean();

    const leadReplyMap = new Map();
    for (const r of unreviewedReplies) {
      const key = String(r.leadId);
      if (!leadReplyMap.has(key)) leadReplyMap.set(key, r);
    }

    let tasksDeduplicated = 0;
    let tasksCreated = 0;

    for (const [leadKey, latestReply] of leadReplyMap.entries()) {
      const lead = await Lead.findById(leadKey);
      if (!lead) continue;

      const openTasks = await Task.find({
        leadId: lead._id,
        taskType: 'reply_review',
        status: 'Open',
        deletedAt: null,
      }).sort({ dueAt: 1, createdAt: 1 });

      if (openTasks.length > 1) {
        // Keep the primary open task (earliest dueAt), close/soft-delete duplicates
        const primary = openTasks[0];
        primary.replyId = latestReply._id;
        if (!isDryRun) await primary.save();

        for (let i = 1; i < openTasks.length; i++) {
          const dup = openTasks[i];
          dup.deletedAt = new Date();
          dup.deletedBy = 'MigrationDeduplication';
          if (!isDryRun) await dup.save();
          tasksDeduplicated += 1;
        }
      } else if (openTasks.length === 1) {
        const existing = openTasks[0];
        existing.replyId = latestReply._id;
        if (!isDryRun) await existing.save();
      } else if (!isDryRun) {
        await ensureReplyReviewTask(latestReply, lead);
        tasksCreated += 1;
      }
    }
    console.log(`Deduplicated ${tasksDeduplicated} duplicate open review tasks. Created ${tasksCreated} new review tasks.`);

    // -------------------------------------------------------------
    // Step 4: Ensure partial unique index
    // -------------------------------------------------------------
    if (!isDryRun) {
      console.log('[Step 4] Ensuring partial unique index on Task...');
      try {
        await Task.syncIndexes();
        console.log('Task indexes synchronized successfully.');
      } catch (idxErr) {
        console.warn('Index sync notice:', idxErr.message);
      }
    }

    console.log('[Migration] Completed successfully!');
  } catch (err) {
    console.error('[Migration] Failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
