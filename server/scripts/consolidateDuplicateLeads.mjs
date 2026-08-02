import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';
import { Reply } from '../src/models/Reply.js';
import { Email } from '../src/models/Email.js';
import { SendJob } from '../src/models/SendJob.js';
import { Opportunity } from '../src/models/Opportunity.js';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Starting Lead Deduplication & Consolidation...');

  const allLeads = await Lead.find({ deletedAt: null }).lean();
  console.log(`Total leads in DB: ${allLeads.length}`);

  const emailGroups = new Map();
  for (const l of allLeads) {
    if (!l.email) continue;
    const cleanEmail = l.email.toLowerCase().trim();
    if (!emailGroups.has(cleanEmail)) emailGroups.set(cleanEmail, []);
    emailGroups.get(cleanEmail).push(l);
  }

  let mergedLeadGroups = 0;
  let deletedDuplicates = 0;
  let updatedTasks = 0;
  let updatedReplies = 0;
  let updatedEmails = 0;
  let updatedSendJobs = 0;
  let updatedOpportunities = 0;

  const leadBulkOps = [];
  const secondaryIdsToDelete = [];
  const reLinkPairs = []; // { primaryId, secondaryIds }

  for (const [email, leads] of emailGroups.entries()) {
    if (leads.length === 1) {
      const singleLead = leads[0];
      if ((!singleLead.enrollments || singleLead.enrollments.length === 0) && singleLead.campaignId) {
        leadBulkOps.push({
          updateOne: {
            filter: { _id: singleLead._id },
            update: {
              $set: {
                enrollments: [
                  {
                    campaignId: singleLead.campaignId,
                    enrolledAt: singleLead.createdAt || new Date(),
                    deliveryStatus: singleLead.deliveryStatus || 'Pending Inqueue',
                    outcome: singleLead.outcome || 'Pending',
                  },
                ],
              },
            },
          },
        });
      }
      continue;
    }

    mergedLeadGroups++;

    // Pick Primary Lead (Prefer confirmed POC -> qualified stage -> repliedAt -> earliest created)
    leads.sort((a, b) => {
      const aScore = (a.pocQualification?.status === 'Confirmed' ? 10 : 0) + (a.leadStage === 'qualified_lead' ? 5 : 0) + (a.repliedAt ? 3 : 0);
      const bScore = (b.pocQualification?.status === 'Confirmed' ? 10 : 0) + (b.leadStage === 'qualified_lead' ? 5 : 0) + (b.repliedAt ? 3 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    const primaryLead = leads[0];
    const secondaryLeads = leads.slice(1);
    const secondaryIds = secondaryLeads.map((l) => l._id);
    secondaryIdsToDelete.push(...secondaryIds);
    reLinkPairs.push({ primaryId: primaryLead._id, secondaryIds });

    // Consolidate Enrollments
    const enrollmentsMap = new Map();
    if (primaryLead.enrollments && primaryLead.enrollments.length > 0) {
      primaryLead.enrollments.forEach((e) => {
        if (e.campaignId) enrollmentsMap.set(String(e.campaignId), e);
      });
    } else if (primaryLead.campaignId) {
      enrollmentsMap.set(String(primaryLead.campaignId), {
        campaignId: primaryLead.campaignId,
        enrolledAt: primaryLead.createdAt || new Date(),
        deliveryStatus: primaryLead.deliveryStatus || 'Pending Inqueue',
        outcome: primaryLead.outcome || 'Pending',
      });
    }

    for (const sec of secondaryLeads) {
      if (sec.enrollments && sec.enrollments.length > 0) {
        sec.enrollments.forEach((e) => {
          if (e.campaignId && !enrollmentsMap.has(String(e.campaignId))) {
            enrollmentsMap.set(String(e.campaignId), e);
          }
        });
      } else if (sec.campaignId && !enrollmentsMap.has(String(sec.campaignId))) {
        enrollmentsMap.set(String(sec.campaignId), {
          campaignId: sec.campaignId,
          enrolledAt: sec.createdAt || new Date(),
          deliveryStatus: sec.deliveryStatus || 'Pending Inqueue',
          outcome: sec.outcome || 'Pending',
        });
      }
    }

    const mergedApollo = [...new Set(leads.map((l) => l.emailApollo).filter(Boolean))].join('; ');
    const mergedHunter = [...new Set(leads.map((l) => l.emailHunter).filter(Boolean))].join('; ');
    const mergedLusha = [...new Set(leads.map((l) => l.emailLusha).filter(Boolean))].join('; ');
    const mergedPersonal = [...new Set(leads.map((l) => l.emailPersonal).filter(Boolean))].join('; ');

    const updatedLeadFields = {
      enrollments: Array.from(enrollmentsMap.values()),
      emailApollo: mergedApollo || primaryLead.emailApollo || '',
      emailHunter: mergedHunter || primaryLead.emailHunter || '',
      emailLusha: mergedLusha || primaryLead.emailLusha || '',
      emailPersonal: mergedPersonal || primaryLead.emailPersonal || '',
    };

    const latestRepliedAt = leads.map((l) => l.repliedAt).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
    if (latestRepliedAt) {
      updatedLeadFields.repliedAt = latestRepliedAt;
      updatedLeadFields.deliveryStatus = 'Replied';
      if (primaryLead.leadStage !== 'qualified_lead') {
        updatedLeadFields.leadStage = 'lead';
      }
    }

    leadBulkOps.push({
      updateOne: {
        filter: { _id: primaryLead._id },
        update: { $set: updatedLeadFields },
      },
    });
  }

  // Execute Bulk Updates on Lead
  if (leadBulkOps.length > 0) {
    console.log(`Executing ${leadBulkOps.length} Lead bulk updates...`);
    await Lead.bulkWrite(leadBulkOps);
  }

  // Execute Re-linking for Child Collections
  console.log(`Re-linking child documents across ${reLinkPairs.length} duplicate groups...`);
  for (const pair of reLinkPairs) {
    for (const secId of pair.secondaryIds) {
      const secTasks = await Task.find({ leadId: secId }).lean();
      for (const st of secTasks) {
        try {
          await Task.updateOne({ _id: st._id }, { $set: { leadId: pair.primaryId } });
          updatedTasks++;
        } catch (err) {
          if (err.code === 11000) {
            await Task.deleteOne({ _id: st._id });
          } else {
            throw err;
          }
        }
      }
    }

    const [rRes, eRes, sjRes, oRes] = await Promise.all([
      Reply.updateMany({ leadId: { $in: pair.secondaryIds } }, { $set: { leadId: pair.primaryId } }),
      Email.updateMany({ leadId: { $in: pair.secondaryIds } }, { $set: { leadId: pair.primaryId } }),
      SendJob.updateMany({ leadId: { $in: pair.secondaryIds } }, { $set: { leadId: pair.primaryId } }),
      Opportunity.updateMany({ primaryLeadId: { $in: pair.secondaryIds } }, { $set: { primaryLeadId: pair.primaryId } }),
    ]);

    updatedReplies += rRes.modifiedCount || 0;
    updatedEmails += eRes.modifiedCount || 0;
    updatedSendJobs += sjRes.modifiedCount || 0;
    updatedOpportunities += oRes.modifiedCount || 0;
  }

  // Delete secondary duplicate lead documents
  if (secondaryIdsToDelete.length > 0) {
    console.log(`Deleting ${secondaryIdsToDelete.length} secondary duplicate lead documents...`);
    const delRes = await Lead.deleteMany({ _id: { $in: secondaryIdsToDelete } });
    deletedDuplicates = delRes.deletedCount || 0;
  }

  console.log('==================================================');
  console.log(`DEDUPLICATION MIGRATION COMPLETE!`);
  console.log(`Merged Lead Groups: ${mergedLeadGroups}`);
  console.log(`Deleted Duplicate Lead Documents: ${deletedDuplicates}`);
  console.log(`Re-linked Tasks: ${updatedTasks}`);
  console.log(`Re-linked Replies: ${updatedReplies}`);
  console.log(`Re-linked Emails: ${updatedEmails}`);
  console.log(`Re-linked SendJobs: ${updatedSendJobs}`);
  console.log(`Re-linked Opportunities: ${updatedOpportunities}`);
  console.log('==================================================');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
