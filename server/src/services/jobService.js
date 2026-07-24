import mongoose from 'mongoose';
import { Job, JOB_CATEGORIES } from '../models/Job.js';
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

export async function getJobCategories() {
  assertDb();
  const [salesPersons, responsiblePersons, typesOfJob, statuses, jobDates] = await Promise.all([
    Job.distinct('salesPerson', { deletedAt: null, salesPerson: { $ne: '' } }),
    Job.distinct('responsiblePerson', { deletedAt: null, responsiblePerson: { $ne: '' } }),
    Job.distinct('typeOfJob', { deletedAt: null, typeOfJob: { $ne: '' } }),
    Job.distinct('currentStatus', { deletedAt: null, currentStatus: { $ne: '' } }),
    Job.distinct('date', { deletedAt: null, date: { $ne: null } }),
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

  const mergedJobTypes = [...new Set([...JOB_CATEGORIES.typesOfJob, ...typesOfJob])].sort();
  const mergedStatuses = [...new Set([...JOB_CATEGORIES.statuses, ...statuses])].sort();
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

export async function listJobs({ currentStatus, salesPerson, typeOfJob, responsiblePerson, year, startDate, endDate, search, page = 1, limit = 100 } = {}) {
  assertDb();
  const query = { deletedAt: null };

  if (currentStatus && currentStatus !== 'All') {
    query.currentStatus = currentStatus;
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
    Job.find(query)
      .sort({ jobNo: -1, date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Job.countDocuments(query),
    getJobCategories(),
    Job.aggregate([
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

export async function getJob(id) {
  assertDb();
  const job = await Job.findOne({ _id: id, deletedAt: null }).lean();
  if (!job) {
    const error = new Error('Job not found.');
    error.status = 404;
    throw error;
  }
  return job;
}

export async function getNextJobNumber() {
  const highest = await Job.findOne({}).sort({ jobNo: -1 }).select('jobNo').lean();
  return (highest?.jobNo || 200) + 1;
}

export async function createJob(payload) {
  assertDb();
  let jobNo = cleanNumber(payload.jobNo, 0);
  if (!jobNo) {
    jobNo = await getNextJobNumber();
  }

  const amount = cleanNumber(payload.amount, 0);
  const received = cleanNumber(payload.received, 0);
  const balance = payload.balance !== undefined ? cleanNumber(payload.balance, 0) : Math.max(0, amount - received);

  const job = await Job.create({
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
    currentStatus: String(payload.currentStatus || 'Inquiry').trim(),
    responsiblePerson: String(payload.responsiblePerson || '').trim(),
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    amount,
    received,
    balance,
    jobReview: String(payload.jobReview || '').trim(),
    opportunityId: payload.opportunityId || null,
  });

  return job.toObject();
}

export async function updateJob(id, payload) {
  assertDb();
  const job = await Job.findOne({ _id: id, deletedAt: null });
  if (!job) {
    const error = new Error('Job not found.');
    error.status = 404;
    throw error;
  }

  const fields = [
    'jobNo', 'salesPerson', 'company', 'companyId', 'contactPerson',
    'contactNumber', 'email', 'typeOfJob', 'description', 'currentStatus',
    'responsiblePerson', 'jobReview', 'opportunityId',
  ];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      job[field] = payload[field];
    }
  });

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

export async function deleteJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('job', Job);
  return softDeleteRecord({ Model: Job, resourceType: 'job', id, actor });
}

export async function restoreJob(id, actor = {}) {
  assertDb();
  registerRevisionModel('job', Job);
  return restoreRecord({ Model: Job, resourceType: 'job', id, actor });
}

export async function createJobFromOpportunity(opportunity) {
  assertDb();
  if (!opportunity) return null;

  // Check if job already exists for this opportunity
  let existingJob = await Job.findOne({ opportunityId: opportunity._id, deletedAt: null });
  
  let companyName = '';
  let contactPerson = '';
  let contactNumber = '';
  let email = '';

  if (opportunity.companyId) {
    companyName = opportunity.companyId.companyName || opportunity.companyId.name || '';
  }
  if (opportunity.primaryLeadId) {
    contactPerson = opportunity.primaryLeadId.name || '';
    email = opportunity.primaryLeadId.email || '';
    contactNumber = opportunity.primaryLeadId.phone || '';
  }

  let jobStatus = 'Job Done';
  if (opportunity.stage === 'Closed Lost') {
    jobStatus = 'Job Lost';
  } else if (opportunity.stage === 'Closed Won') {
    jobStatus = 'Job Done';
  }

  const jobType = Array.isArray(opportunity.services) && opportunity.services.length
    ? opportunity.services[0]
    : (opportunity.name || 'General Project');

  if (existingJob) {
    existingJob.currentStatus = jobStatus;
    existingJob.amount = opportunity.valueAed || existingJob.amount;
    existingJob.balance = Math.max(0, existingJob.amount - existingJob.received);
    existingJob.salesPerson = opportunity.owner || existingJob.salesPerson;
    if (companyName) existingJob.company = companyName;
    if (opportunity.notes) existingJob.description = opportunity.notes;
    await existingJob.save();
    return existingJob.toObject();
  }

  const jobNo = await getNextJobNumber();

  const newJob = await Job.create({
    jobNo,
    date: opportunity.closedAt || new Date(),
    salesPerson: opportunity.owner || 'admin',
    company: companyName || opportunity.name,
    companyId: opportunity.companyId?._id || opportunity.companyId || null,
    contactPerson,
    contactNumber,
    email,
    typeOfJob: jobType,
    description: opportunity.notes || opportunity.name || '',
    currentStatus: jobStatus,
    responsiblePerson: opportunity.owner || 'admin',
    dueDate: opportunity.expectedCloseDate || null,
    amount: opportunity.valueAed || 0,
    received: jobStatus === 'Job Done' ? (opportunity.valueAed || 0) : 0,
    balance: jobStatus === 'Job Done' ? 0 : (opportunity.valueAed || 0),
    jobReview: opportunity.lostReason || '',
    opportunityId: opportunity._id,
  });

  return newJob.toObject();
}
