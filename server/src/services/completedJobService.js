import mongoose from 'mongoose';
import { CompletedJob, COMPLETED_JOB_CATEGORIES } from '../models/CompletedJob.js';
import { Company } from '../models/Company.js';
import { softDeleteRecord, restoreRecord, registerRevisionModel } from './revisionService.js';

function assertDb() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB connection is required for CRM.');
    error.status = 503;
    throw error;
  }
}

function cleanNumber(val, fallback = 0) {
  if (val == null || val === '') return fallback;
  const num = Number(String(val).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : fallback;
}

export async function getCompletedJobCategories() {
  assertDb();
  const [salesPersons, responsiblePersons, typesOfJob, statuses, jobDates] = await Promise.all([
    CompletedJob.distinct('salesPerson', { deletedAt: null, salesPerson: { $ne: '' } }),
    CompletedJob.distinct('responsiblePerson', { deletedAt: null, responsiblePerson: { $ne: '' } }),
    CompletedJob.distinct('typeOfJob', { deletedAt: null, typeOfJob: { $ne: '' } }),
    CompletedJob.distinct('currentStatus', { deletedAt: null, currentStatus: { $ne: '', $nin: ['Job Lost', 'Closed Lost'] } }),
    CompletedJob.distinct('date', { deletedAt: null, date: { $ne: null } }),
  ]);

  const yearsSet = new Set();
  jobDates.forEach((d) => {
    if (d) {
      const y = new Date(d).getFullYear();
      if (y && !isNaN(y) && y >= 2000 && y <= 2100) yearsSet.add(y);
    }
  });
  yearsSet.add(new Date().getFullYear());
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  const mergedJobTypes = [...new Set([...COMPLETED_JOB_CATEGORIES.typesOfJob, ...typesOfJob])].sort();
  const mergedStatuses = [...new Set([...COMPLETED_JOB_CATEGORIES.statuses.filter((s) => s !== 'Job Lost'), ...statuses])].sort();
  const mergedSalesPersons = [...new Set(salesPersons)].sort();
  const mergedResponsiblePersons = [...new Set(responsiblePersons)].sort();

  return {
    typesOfJob: mergedJobTypes,
    statuses: mergedStatuses,
    salesPersons: mergedSalesPersons,
    responsiblePersons: mergedResponsiblePersons,
    years,
  };
}

export async function listCompletedJobs({ currentStatus, salesPerson, typeOfJob, responsiblePerson, year, startDate, endDate, search, page = 1, limit = 100 } = {}) {
  assertDb();
  const query = { deletedAt: null };

  if (currentStatus && currentStatus !== 'All') {
    query.currentStatus = currentStatus;
  } else {
    // Jobs Done contains ONLY successful job records; exclude Job Lost
    query.currentStatus = { $nin: ['Job Lost', 'Closed Lost'] };
  }
  if (salesPerson && salesPerson !== 'All') {
    query.salesPerson = salesPerson;
  }
  if (typeOfJob && typeOfJob !== 'All') {
    query.typeOfJob = typeOfJob;
  }
  if (responsiblePerson && responsiblePerson !== 'All') {
    query.responsiblePerson = responsiblePerson;
  }

  if (year && year !== 'All') {
    const yr = parseInt(year, 10);
    if (!isNaN(yr)) {
      const yrStart = new Date(yr, 0, 1);
      const yrEnd = new Date(yr, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: yrStart, $lte: yrEnd };
    }
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      query.date.$lte = eDate;
    }
  }

  if (search) {
    const searchRe = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { company: searchRe },
      { contactPerson: searchRe },
      { description: searchRe },
      { email: searchRe },
      { contactNumber: searchRe },
      { salesPerson: searchRe },
      { responsiblePerson: searchRe },
      { typeOfJob: searchRe },
      { currentStatus: searchRe },
      { jobReview: searchRe },
    ];
    const numSearch = Number(search);
    if (Number.isInteger(numSearch)) {
      query.$or.push({ jobNo: numSearch });
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
  const skip = (pageNum - 1) * limitNum;

  const [items, total, categories, metricsAgg] = await Promise.all([
    CompletedJob.find(query)
      .sort({ jobNo: -1, date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    CompletedJob.countDocuments(query),
    getCompletedJobCategories(),
    CompletedJob.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalReceived: { $sum: '$received' },
          totalBalance: { $sum: '$balance' },
        },
      },
    ]),
  ]);

  const metrics = metricsAgg[0] || { totalAmount: 0, totalReceived: 0, totalBalance: 0 };

  return {
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    categories,
    metrics: {
      totalJobs: total,
      totalAmount: metrics.totalAmount,
      totalReceived: metrics.totalReceived,
      totalBalance: metrics.totalBalance,
    },
  };
}

export async function getCompletedJob(id) {
  assertDb();
  const job = await CompletedJob.findOne({ _id: id, deletedAt: null }).lean();
  if (!job) {
    const error = new Error('Completed Job not found.');
    error.status = 404;
    throw error;
  }
  return job;
}

export async function getNextJobNumber() {
  const highest = await CompletedJob.findOne({}).sort({ jobNo: -1 }).select('jobNo').lean();
  return (highest?.jobNo || 200) + 1;
}

export async function createCompletedJob(payload) {
  assertDb();
  let jobNo = cleanNumber(payload.jobNo, 0);
  if (!jobNo) {
    jobNo = await getNextJobNumber();
  }

  const amount = cleanNumber(payload.amount, 0);
  const received = cleanNumber(payload.received, 0);
  const balance = payload.balance !== undefined ? cleanNumber(payload.balance, 0) : Math.max(0, amount - received);

  const job = await CompletedJob.create({
    jobNo,
    date: payload.date ? new Date(payload.date) : new Date(),
    salesPerson: String(payload.salesPerson || '').trim(),
    company: String(payload.company || '').trim(),
    companyId: payload.companyId || null,
    contactPerson: String(payload.contactPerson || '').trim(),
    contactNumber: String(payload.contactNumber || '').trim(),
    email: String(payload.email || '').trim(),
    typeOfJob: String(payload.typeOfJob || '').trim(),
    description: String(payload.description || '').trim(),
    currentStatus: String(payload.currentStatus || 'Job Done').trim(),
    responsiblePerson: String(payload.responsiblePerson || '').trim(),
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    amount,
    received,
    balance,
    jobReview: String(payload.jobReview || '').trim(),
    opportunityId: payload.ongoingJobId || payload.opportunityId || null,
  });

  return job.toObject();
}

export async function updateCompletedJob(id, payload) {
  assertDb();
  const job = await CompletedJob.findOne({ _id: id, deletedAt: null });
  if (!job) {
    const error = new Error('Completed Job not found.');
    error.status = 404;
    throw error;
  }

  const fields = [
    'jobNo', 'salesPerson', 'company', 'companyId', 'contactPerson',
    'contactNumber', 'email', 'typeOfJob', 'description', 'currentStatus',
    'responsiblePerson', 'jobReview',
  ];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      job[field] = payload[field];
    }
  });

  if (payload.ongoingJobId !== undefined || payload.opportunityId !== undefined) {
    job.opportunityId = payload.ongoingJobId || payload.opportunityId || null;
  }

  if (payload.date !== undefined) {
    job.date = payload.date ? new Date(payload.date) : null;
  }
  if (payload.dueDate !== undefined) {
    job.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  }
  if (payload.amount !== undefined) {
    job.amount = cleanNumber(payload.amount, 0);
  }
  if (payload.received !== undefined) {
    job.received = cleanNumber(payload.received, 0);
  }
  if (payload.balance !== undefined) {
    job.balance = cleanNumber(payload.balance, 0);
  } else if (payload.amount !== undefined || payload.received !== undefined) {
    job.balance = Math.max(0, job.amount - job.received);
  }

  await job.save();
  return job.toObject();
}

export async function deleteCompletedJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('completed_job', CompletedJob);
  registerRevisionModel('job', CompletedJob);
  return softDeleteRecord({ Model: CompletedJob, resourceType: 'completed_job', id, actor });
}

export async function restoreCompletedJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('completed_job', CompletedJob);
  registerRevisionModel('job', CompletedJob);
  return restoreRecord({ Model: CompletedJob, resourceType: 'completed_job', id, actor });
}

export async function createCompletedJobFromOngoingJob(ongoingJob) {
  assertDb();
  if (!ongoingJob) return null;

  // Job Lost must remain in Ongoing Jobs history and MUST NOT create a CompletedJob!
  if (ongoingJob.stage === 'Job Lost' || ongoingJob.stage === 'Closed Lost') {
    return null;
  }

  // Only create CompletedJob for successful won jobs ('Job Done' or 'Closed Won' or 'Payment Received')
  if (ongoingJob.stage !== 'Job Done' && ongoingJob.stage !== 'Closed Won' && ongoingJob.stage !== 'Payment Received') {
    return null;
  }

  // Check if job already exists for this ongoing job
  let existingJob = await CompletedJob.findOne({
    $or: [{ opportunityId: ongoingJob._id }, { ongoingJobId: ongoingJob._id }],
    deletedAt: null,
  });
  
  let companyName = '';
  let contactPerson = '';
  let contactNumber = '';
  let email = '';

  if (ongoingJob.companyId) {
    companyName = ongoingJob.companyId.companyName || ongoingJob.companyId.name || '';
  }
  if (ongoingJob.primaryLeadId) {
    contactPerson = ongoingJob.primaryLeadId.name || '';
    email = ongoingJob.primaryLeadId.email || '';
    contactNumber = ongoingJob.primaryLeadId.phone || '';
  }

  const jobStatus = 'Job Done';
  const jobType = Array.isArray(ongoingJob.services) && ongoingJob.services.length
    ? ongoingJob.services[0]
    : (ongoingJob.name || 'General Project');

  if (existingJob) {
    existingJob.currentStatus = jobStatus;
    existingJob.amount = ongoingJob.valueAed || existingJob.amount;
    existingJob.balance = Math.max(0, existingJob.amount - existingJob.received);
    existingJob.salesPerson = ongoingJob.owner || existingJob.salesPerson;
    if (companyName) existingJob.company = companyName;
    if (ongoingJob.notes) existingJob.description = ongoingJob.notes;
    await existingJob.save();
    return existingJob.toObject();
  }

  const jobNo = await getNextJobNumber();

  const newJob = await CompletedJob.create({
    jobNo,
    date: ongoingJob.closedAt || new Date(),
    salesPerson: ongoingJob.owner || 'admin',
    company: companyName || ongoingJob.name,
    companyId: ongoingJob.companyId?._id || ongoingJob.companyId || null,
    contactPerson,
    contactNumber,
    email,
    typeOfJob: jobType,
    description: ongoingJob.notes || ongoingJob.name || '',
    currentStatus: jobStatus,
    responsiblePerson: ongoingJob.owner || 'admin',
    dueDate: ongoingJob.expectedCloseDate || null,
    amount: ongoingJob.valueAed || 0,
    received: ongoingJob.valueAed || 0,
    balance: 0,
    jobReview: ongoingJob.lostReason || '',
    opportunityId: ongoingJob._id,
  });

  return newJob.toObject();
}

// Aliases for backward compatibility
export const getJobCategories = getCompletedJobCategories;
export const listJobs = listCompletedJobs;
export const getJob = getCompletedJob;
export const createJob = createCompletedJob;
export const updateJob = updateCompletedJob;
export const deleteJob = deleteCompletedJob;
export const restoreJob = restoreCompletedJob;
export const createJobFromOpportunity = createCompletedJobFromOngoingJob;
