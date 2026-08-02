import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { Lead } from '../src/models/Lead.js';
import { Company } from '../src/models/Company.js';
import { Reply } from '../src/models/Reply.js';
import { Email } from '../src/models/Email.js';
import { Task } from '../src/models/Task.js';

const isDryRun = process.argv.includes('--apply') ? false : true;

async function runAudit() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not configured.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB... (DRY_RUN: ${isDryRun})`);
  await mongoose.connect(mongoUri);

  const leads = await Lead.find({ deletedAt: null }).lean();
  const replies = await Reply.find({ deletedAt: null }).lean();
  const inboundEmails = await Email.find({ direction: 'inbound' }).lean();

  console.log(`Total Leads: ${leads.length}, Total Replies: ${replies.length}, Total Inbound Emails: ${inboundEmails.length}`);

  let excludedCount = 0;
  let reclassifyWithReplyCount = 0;
  let revertedWithoutReplyCount = 0;

  const leadsToUpdateForManualReview = [];
  const leadsToRevertToStandard = [];

  for (const lead of leads) {
    const leadEmail = (lead.email || '').toLowerCase().trim();
    const name = lead.name || '';
    const companyName = lead.companyName || '';

    // Exclude Sonali or Bulwark
    if (/sonali/i.test(name) || /sonali/i.test(leadEmail) || /bulwark/i.test(companyName) || /bulwark/i.test(leadEmail)) {
      excludedCount++;
      console.log(`[EXCLUDED - Sonali/Bulwark] Lead: "${name}" (${leadEmail}) Company: "${companyName}"`);
      continue;
    }

    const replyDoc = replies.find((r) => String(r.leadId) === String(lead._id) || (leadEmail && r.email?.toLowerCase().trim() === leadEmail));
    const emailDoc = inboundEmails.find((e) => String(e.leadId) === String(lead._id) || (leadEmail && e.fromEmail === leadEmail));

    const hasActualReply = !!(replyDoc || emailDoc);

    const isClassified = ['Replied', 'Out of Office', 'Bounced / Invalid', 'Opted Out'].includes(lead.deliveryStatus) ||
      lead.hasResponded ||
      (replyDoc && replyDoc.humanReview?.status === 'Reviewed');

    if (hasActualReply) {
      reclassifyWithReplyCount++;
      leadsToUpdateForManualReview.push({ lead, replyDoc, emailDoc });
    } else if (isClassified) {
      revertedWithoutReplyCount++;
      leadsToRevertToStandard.push(lead);
    }
  }

  console.log('==================================================');
  console.log('AUDIT ANALYSIS SUMMARY:');
  console.log(`- Excluded (Sonali / Bulwark): ${excludedCount}`);
  console.log(`- Leads with ACTUAL Inbound Reply (Set to Manual Re-Classification): ${reclassifyWithReplyCount}`);
  console.log(`- Leads Classified without Actual Reply (Reverting to Standard Lead): ${revertedWithoutReplyCount}`);
  console.log('==================================================');

  if (!isDryRun) {
    console.log('APPLYING UPDATES TO DATABASE...');

    // 1. Process Leads WITH actual replies -> set to manual review
    for (const { lead, replyDoc, emailDoc } of leadsToUpdateForManualReview) {
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            deliveryStatus: 'Replied',
            hasResponded: true,
            updatedAt: new Date(),
          },
        }
      );

      if (replyDoc) {
        await Reply.updateOne(
          { _id: replyDoc._id },
          {
            $set: {
              'humanReview.status': 'Unreviewed',
              'humanReview.outcome': null,
              'humanReview.reviewedAt': null,
              'humanReview.reviewedBy': null,
            },
          }
        );
      }

      if (emailDoc) {
        await Email.updateOne(
          { _id: emailDoc._id },
          {
            $set: {
              'humanReview.status': 'Unreviewed',
              'humanReview.finalOutcome': null,
            },
          }
        );
      }

      // Ensure an Open reply_review Task exists
      const existingTask = await Task.findOne({ leadId: lead._id, taskType: 'reply_review' });
      if (!existingTask) {
        await Task.create({
          title: `Review Reply from ${lead.name || lead.email}`,
          taskType: 'reply_review',
          status: 'Open',
          leadId: lead._id,
          companyId: lead.companyId || null,
          notes: replyDoc?.text || emailDoc?.body || 'Inbound reply pending manual human classification.',
          createdAt: new Date(),
        });
      } else {
        await Task.updateOne({ _id: existingTask._id }, { $set: { status: 'Open' } });
      }
    }

    // 2. Process Leads WITHOUT actual replies -> revert to standard lead
    for (const lead of leadsToRevertToStandard) {
      const wasEmailed = lead.trackingMetrics?.emailsDeliveredCount > 0 || lead.lastSentAt;
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            deliveryStatus: wasEmailed ? 'Emailed Outbound' : 'Pending Inqueue',
            hasResponded: false,
            updatedAt: new Date(),
          },
        }
      );
    }

    console.log('SUCCESS: All database records updated successfully!');
  } else {
    console.log('DRY RUN COMPLETE. Pass --apply to persist changes.');
  }

  await mongoose.disconnect();
}

runAudit().catch((err) => {
  console.error('Error during audit:', err);
  process.exit(1);
});
