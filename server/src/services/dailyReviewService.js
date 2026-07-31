import mongoose from 'mongoose';
import { DailyReviewRecord } from '../models/DailyReviewRecord.js';
import { OngoingJob } from '../models/OngoingJob.js';
import { Lead } from '../models/Lead.js';
import { Company } from '../models/Company.js';
import { Task } from '../models/Task.js';
import { Reply } from '../models/Reply.js';
import { ContactInteraction } from '../models/ContactInteraction.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';

export function getDubaiBusinessDate(date = new Date()) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

function parseDubaiYearMonth(date = new Date()) {
  const dateStr = getDubaiBusinessDate(date);
  const [year, month] = dateStr.split('-').map(Number);
  return { year, month };
}

export async function getTodayReviewStatus() {
  const todayDubai = getDubaiBusinessDate();
  const records = await DailyReviewRecord.find({ businessDate: todayDubai }).lean();

  const sectionsMap = new Map(records.map((r) => [r.section, r]));

  const formatSection = (secKey) => {
    const rec = sectionsMap.get(secKey);
    return rec
      ? { isCompleted: true, completedByName: rec.completedByName, completedAt: rec.completedAt }
      : { isCompleted: false, completedByName: null, completedAt: null };
  };

  return {
    businessDate: todayDubai,
    sections: {
      ongoing_jobs: formatSection('ongoing_jobs'),
      key_relationships: formatSection('key_relationships'),
      leads: formatSection('leads'),
    },
  };
}

export async function completeDailyReview(section, user) {
  if (!['ongoing_jobs', 'key_relationships', 'leads'].includes(section)) {
    const error = new Error('Invalid section.');
    error.status = 400;
    throw error;
  }

  const todayDubai = getDubaiBusinessDate();
  let userId = user?._id || user?.id || user?.userId;
  if (!userId || !mongoose.isValidObjectId(String(userId))) {
    userId = new mongoose.Types.ObjectId('000000000000000000000000');
  }

  const completedByName = (user?.displayName || user?.name || user?.username || 'Team').trim();

  try {
    const record = await DailyReviewRecord.findOneAndUpdate(
      { businessDate: todayDubai, section },
      {
        $setOnInsert: {
          businessDate: todayDubai,
          section,
          completedByUserId: userId,
          completedByName,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
    return record;
  } catch (err) {
    if (err.code === 11000 || err.message?.includes('E11000')) {
      // Simultaneous completion lost race condition: fetch winning record
      const winningRecord = await DailyReviewRecord.findOne({ businessDate: todayDubai, section });
      if (winningRecord) return winningRecord;
    }
    throw err;
  }
}

export async function getMonthlyReviewHistory(reqYear, reqMonth) {
  const currentDubai = parseDubaiYearMonth();
  let year = Number(reqYear);
  let month = Number(reqMonth);

  if (!year || isNaN(year) || year < 2000 || year > 2100) year = currentDubai.year;
  if (!month || isNaN(month) || month < 1 || month > 12) month = currentDubai.month;

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const todayDubaiDate = getDubaiBusinessDate();

  const records = await DailyReviewRecord.find({
    businessDate: { $regex: `^${monthStr}-` },
  }).lean();

  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayRecordsMap = new Map();

  for (const r of records) {
    if (!dayRecordsMap.has(r.businessDate)) {
      dayRecordsMap.set(r.businessDate, new Map());
    }
    dayRecordsMap.get(r.businessDate).set(r.section, r);
  }

  const days = [];
  let eligibleDaysCount = 0;
  let ongoingJobsCompleted = 0;
  let keyRelationshipsCompleted = 0;
  let leadsCompleted = 0;
  let allThreeCompleted = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const isFuture = dayStr > todayDubaiDate;
    const isToday = dayStr === todayDubaiDate;

    if (!isFuture) eligibleDaysCount += 1;

    const secMap = dayRecordsMap.get(dayStr) || new Map();

    const ojRec = secMap.get('ongoing_jobs');
    const krRec = secMap.get('key_relationships');
    const leadsRec = secMap.get('leads');

    const ojDone = Boolean(ojRec);
    const krDone = Boolean(krRec);
    const leadsDone = Boolean(leadsRec);

    if (!isFuture) {
      if (ojDone) ongoingJobsCompleted += 1;
      if (krDone) keyRelationshipsCompleted += 1;
      if (leadsDone) leadsCompleted += 1;
    }

    const countCompleted = (ojDone ? 1 : 0) + (krDone ? 1 : 0) + (leadsDone ? 1 : 0);
    if (!isFuture && countCompleted === 3) allThreeCompleted += 1;

    days.push({
      day: d,
      date: dayStr,
      isFuture,
      isToday,
      ongoing_jobs: {
        completed: ojDone,
        completedByName: ojRec?.completedByName || null,
        completedAt: ojRec?.completedAt || null,
      },
      key_relationships: {
        completed: krDone,
        completedByName: krRec?.completedByName || null,
        completedAt: krRec?.completedAt || null,
      },
      leads: {
        completed: leadsDone,
        completedByName: leadsRec?.completedByName || null,
        completedAt: leadsRec?.completedAt || null,
      },
      all_three: {
        status: isFuture ? 'future' : countCompleted === 3 ? 'completed' : countCompleted > 0 ? 'partial' : 'incomplete',
        count: countCompleted,
      },
    });
  }

  const calculatePct = (completed) => {
    if (!eligibleDaysCount) return 0;
    return Math.round((completed / eligibleDaysCount) * 100);
  };

  return {
    year,
    month,
    monthLabel: new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    isCurrentMonth: year === currentDubai.year && month === currentDubai.month,
    todayDubaiDate,
    eligibleDaysCount,
    percentages: {
      ongoing_jobs: calculatePct(ongoingJobsCompleted),
      key_relationships: calculatePct(keyRelationshipsCompleted),
      leads: calculatePct(leadsCompleted),
      all_three: calculatePct(allThreeCompleted),
    },
    days,
  };
}

export async function getDashboardWorkingViewData() {
  const now = new Date();

  // -------------------------------------------------------------
  // 1. Ongoing Jobs (All Active Jobs + Next Open Task)
  // -------------------------------------------------------------
  const jobs = await OngoingJob.find({ deletedAt: null, stage: { $ne: 'Job Lost' } })
    .select('name companyId primaryLeadId stage owner valueAed targetDate updatedAt')
    .populate('companyId', 'companyName')
    .sort({ updatedAt: -1 })
    .lean();

  const jobIds = jobs.map((j) => j._id);
  const openJobTasks = await Task.find({
    opportunityId: { $in: jobIds },
    status: 'Open',
    deletedAt: null,
  })
    .select('opportunityId title owner dueAt')
    .sort({ dueAt: 1, createdAt: 1 })
    .lean();

  const jobTaskMap = new Map();
  for (const t of openJobTasks) {
    const key = String(t.opportunityId);
    if (!jobTaskMap.has(key)) jobTaskMap.set(key, t);
  }

  const ongoingJobs = jobs.map((job) => {
    const nextTask = jobTaskMap.get(String(job._id)) || null;
    const isTaskOverdue = nextTask?.dueAt && new Date(nextTask.dueAt) < now;
    const isDeadlineOverdue = job.targetDate && new Date(job.targetDate) < now;
    const isOverdue = isTaskOverdue || isDeadlineOverdue;

    return {
      _id: job._id,
      name: job.name,
      companyName: job.companyId?.companyName || '—',
      stage: job.stage,
      owner: job.owner || 'admin',
      valueAed: job.valueAed || 0,
      targetDate: job.targetDate || null,
      nextTask: nextTask ? {
        _id: nextTask._id,
        title: nextTask.title,
        owner: nextTask.owner,
        dueAt: nextTask.dueAt,
      } : null,
      isOverdue,
    };
  });

  const PIPELINE_STAGE_ORDER = [
    'Inquiry',
    'Design',
    'Quotation Sent',
    'Waiting Adv/ PO',
    'In Production',
    'Installation',
    'Waiting Balance Payment',
    'Ready',
    'Job Done',
    'Job Lost',
  ];

  // Sort by pipeline stage order first, then overdue state & nearest due date
  ongoingJobs.sort((a, b) => {
    const indexA = PIPELINE_STAGE_ORDER.indexOf(a.stage);
    const indexB = PIPELINE_STAGE_ORDER.indexOf(b.stage);
    const rankA = indexA === -1 ? 999 : indexA;
    const rankB = indexB === -1 ? 999 : indexB;
    if (rankA !== rankB) return rankA - rankB;
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    const dateA = a.nextTask?.dueAt || a.targetDate || '9999-12-31';
    const dateB = b.nextTask?.dueAt || b.targetDate || '9999-12-31';
    return new Date(dateA) - new Date(dateB);
  });

  // -------------------------------------------------------------
  // 2. Key Relationships (Confirmed POCs + Urgency Sort)
  // -------------------------------------------------------------
  const keyLeads = await Lead.find({
    'pocQualification.status': 'Confirmed',
    deletedAt: null,
  })
    .select('name companyId relationshipProfile pocQualification repliedAt updatedAt')
    .populate('companyId', 'companyName')
    .lean();

  const keyLeadIds = keyLeads.map((l) => l._id);

  const openRelTasks = await Task.find({
    leadId: { $in: keyLeadIds },
    taskType: 'relationship_follow_up',
    status: 'Open',
    deletedAt: null,
  })
    .select('leadId title owner dueAt')
    .sort({ dueAt: 1 })
    .lean();

  const relTaskMap = new Map();
  for (const t of openRelTasks) {
    const key = String(t.leadId);
    if (!relTaskMap.has(key)) relTaskMap.set(key, t);
  }

  const interactions = await ContactInteraction.aggregate([
    { $match: { leadId: { $in: keyLeadIds }, deletedAt: null } },
    { $group: { _id: '$leadId', lastOccurredAt: { $max: '$occurredAt' } } },
  ]);
  const interactionMap = new Map(interactions.map((i) => [String(i._id), i.lastOccurredAt]));

  const todayDubaiDate = getDubaiBusinessDate(now);

  const keyRelationships = keyLeads.map((lead) => {
    const nextTask = relTaskMap.get(String(lead._id)) || null;
    const lastInteraction = interactionMap.get(String(lead._id)) || lead.repliedAt || lead.updatedAt;

    let dueCategory = 3; // No follow-up scheduled
    if (nextTask?.dueAt) {
      const dueStr = getDubaiBusinessDate(nextTask.dueAt);
      if (new Date(nextTask.dueAt) < now && dueStr !== todayDubaiDate) {
        dueCategory = 1; // Overdue
      } else if (dueStr === todayDubaiDate) {
        dueCategory = 2; // Due today
      } else {
        dueCategory = 4; // Scheduled later
      }
    }

    return {
      _id: lead._id,
      name: lead.name,
      companyName: lead.companyId?.companyName || '—',
      owner: lead.relationshipProfile?.owner || 'Unassigned',
      lastInteractionAt: lastInteraction || null,
      nextTask: nextTask ? {
        _id: nextTask._id,
        title: nextTask.title,
        owner: nextTask.owner,
        dueAt: nextTask.dueAt,
      } : null,
      dueCategory,
    };
  });

  // Sort by urgency: 1. Overdue -> 2. Due today -> 3. No follow-up -> 4. Longest time since last interaction
  keyRelationships.sort((a, b) => {
    if (a.dueCategory !== b.dueCategory) return a.dueCategory - b.dueCategory;
    const dateA = a.lastInteractionAt ? new Date(a.lastInteractionAt).getTime() : 0;
    const dateB = b.lastInteractionAt ? new Date(b.lastInteractionAt).getTime() : 0;
    return dateA - dateB;
  });

  // -------------------------------------------------------------
  // 3. Leads (Contacts with Inbound Replies & Open Lead Tasks)
  // -------------------------------------------------------------
  const openLeadTasks = await Task.find({
    taskType: { $in: ['reply_review', 'lead_follow_up'] },
    status: 'Open',
    deletedAt: null,
  })
    .select('leadId campaignId taskType title owner dueAt createdAt')
    .populate('campaignId', 'projectName')
    .sort({ dueAt: 1, createdAt: 1 })
    .lean();

  const leadTaskIds = openLeadTasks.map((t) => t.leadId).filter(Boolean);
  const leadDocs = await Lead.find({ _id: { $in: leadTaskIds }, deletedAt: null })
    .select('name companyId campaignId leadStage')
    .populate('companyId', 'companyName')
    .populate('campaignId', 'projectName')
    .lean();
  const leadMap = new Map(leadDocs.map((l) => [String(l._id), l]));

  // Use aggregate to get only the latest reply snippet per lead — avoids loading full
  // text/threadHistory/etc. for every reply then doing Node-side sort & dedup.
  const latestReplies = leadTaskIds.length
    ? await Reply.aggregate([
        { $match: { leadId: { $in: leadTaskIds } } },
        { $sort: { receivedAt: -1 } },
        {
          $group: {
            _id: '$leadId',
            receivedAt: { $first: '$receivedAt' },
            text: { $first: '$text' },
            subject: { $first: '$subject' },
            humanReviewStatus: { $first: '$humanReview.status' },
          },
        },
      ])
    : [];
  const replyMap = new Map(latestReplies.map((r) => [String(r._id), r]));

  const contactTasksMap = new Map();
  for (const t of openLeadTasks) {
    if (!t.leadId) continue;
    const key = String(t.leadId?._id || t.leadId);
    if (!contactTasksMap.has(key)) contactTasksMap.set(key, []);
    contactTasksMap.get(key).push(t);
  }

  const leadsList = [];
  for (const [leadKey, cTasks] of contactTasksMap.entries()) {
    const lead = leadMap.get(leadKey);
    if (!lead) continue;

    const latestReply = replyMap.get(leadKey);
    const reviewTask = cTasks.find((t) => t.taskType === 'reply_review');
    const primaryTask = reviewTask || cTasks[0];

    const hasUnreviewedReply = Boolean(reviewTask) || (latestReply?.humanReviewStatus !== 'Reviewed');
    const isOverdue = primaryTask?.dueAt && new Date(primaryTask.dueAt) < now;

    let priorityRank = 4;
    if (hasUnreviewedReply) priorityRank = 1;
    else if (isOverdue) priorityRank = 2;
    else if (primaryTask?.dueAt && getDubaiBusinessDate(primaryTask.dueAt) === todayDubaiDate) priorityRank = 3;

    leadsList.push({
      _id: lead._id,
      name: lead.name,
      companyName: lead.companyId?.companyName || '—',
      leadStage: lead.leadStage || 'contact',
      campaignName: lead.campaignId?.projectName || primaryTask.campaignId?.projectName || '—',
      latestReply: latestReply ? {
        snippet: (latestReply.text || latestReply.subject || '').slice(0, 100),
        receivedAt: latestReply.receivedAt,
      } : null,
      currentTask: primaryTask ? {
        _id: primaryTask._id,
        title: primaryTask.title,
        taskType: primaryTask.taskType,
        owner: primaryTask.owner,
        dueAt: primaryTask.dueAt,
      } : null,
      hasUnreviewedReply,
      isOverdue,
      priorityRank,
    });
  }

  leadsList.sort((a, b) => a.priorityRank - b.priorityRank);

  return {
    ongoingJobs,
    keyRelationships,
    leads: leadsList,
  };
}

