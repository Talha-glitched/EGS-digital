import db from '../db/index.js';

export const COMPLETED_JOB_CATEGORIES = {
  typesOfJob: [
    'Large Format Printing',
    'Retail Branding & Displays',
    'Off Set printing',
    'Exhibition Stands',
    'Signages Indoor & Outdoor',
    'Vehicle Branding',
    'Digital Screen',
    'Gift Items',
    'Corporate Events Branding',
    'Constuction Site Items',
    'PVC Plates',
    'Graduation Ceremonies',
    'Product Display Stand',
    'Mall Kiosks',
    'Event Branding',
    'Uniform',
    'Showroom & Office Branding',
  ],
  statuses: [
    'Inquiry',
    'Waiting Adv/ PO',
    'In Production',
    'Installation',
    'Waiting Balance Payment',
    'Job Done',
    'Quotation Sent',
    'Job Lost',
    'Design',
    'Ready',
  ],
};

export const JOB_CATEGORIES = COMPLETED_JOB_CATEGORIES;

function cleanNumber(val, fallback = 0) {
  if (val == null || val === '') return fallback;
  const num = Number(String(val).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : fallback;
}

export async function getCompletedJobCategories() {
  try {
    const res = await db.query(
      `SELECT DISTINCT sales_person AS "salesPerson",
              responsible_person AS "responsiblePerson",
              type_of_job AS "typeOfJob",
              current_status AS "currentStatus",
              date
       FROM completed_jobs
       WHERE deleted_at IS NULL`
    );

    const salesPersons = [...new Set(res.rows.map((r) => r.salesPerson).filter(Boolean))].sort();
    const responsiblePersons = [...new Set(res.rows.map((r) => r.responsiblePerson).filter(Boolean))].sort();
    const typesOfJob = [...new Set(res.rows.map((r) => r.typeOfJob).filter(Boolean))].sort();
    const statuses = [...new Set(res.rows.map((r) => r.currentStatus).filter((s) => s && s !== 'Job Lost' && s !== 'Closed Lost'))].sort();

    const yearsSet = new Set();
    res.rows.forEach((r) => {
      if (r.date) {
        const y = new Date(r.date).getFullYear();
        if (y && !isNaN(y) && y >= 2000 && y <= 2100) yearsSet.add(y);
      }
    });
    yearsSet.add(new Date().getFullYear());
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const mergedJobTypes = [...new Set([...COMPLETED_JOB_CATEGORIES.typesOfJob, ...typesOfJob])].sort();
    const mergedStatuses = [...new Set([...COMPLETED_JOB_CATEGORIES.statuses.filter((s) => s !== 'Job Lost'), ...statuses])].sort();

    return {
      typesOfJob: mergedJobTypes,
      statuses: mergedStatuses,
      salesPersons,
      responsiblePersons,
      years,
    };
  } catch (err) {
    return {
      typesOfJob: COMPLETED_JOB_CATEGORIES.typesOfJob,
      statuses: COMPLETED_JOB_CATEGORIES.statuses.filter((s) => s !== 'Job Lost'),
      salesPersons: [],
      responsiblePersons: [],
      years: [new Date().getFullYear()],
    };
  }
}

export async function listCompletedJobs({
  currentStatus,
  salesPerson,
  typeOfJob,
  responsiblePerson,
  year,
  startDate,
  endDate,
  search,
  page = 1,
  limit = 100,
} = {}) {
  const params = [];
  const conditions = ['deleted_at IS NULL'];

  if (currentStatus && currentStatus !== 'All') {
    params.push(currentStatus);
    conditions.push(`current_status = $${params.length}`);
  } else {
    conditions.push(`current_status NOT IN ('Job Lost', 'Closed Lost')`);
  }

  if (salesPerson && salesPerson !== 'All') {
    params.push(salesPerson);
    conditions.push(`sales_person = $${params.length}`);
  }

  if (typeOfJob && typeOfJob !== 'All') {
    params.push(typeOfJob);
    conditions.push(`type_of_job = $${params.length}`);
  }

  if (responsiblePerson && responsiblePerson !== 'All') {
    params.push(responsiblePerson);
    conditions.push(`responsible_person = $${params.length}`);
  }

  if (year && year !== 'All') {
    const yr = parseInt(year, 10);
    if (!isNaN(yr)) {
      params.push(`${yr}-01-01T00:00:00.000Z`, `${yr}-12-31T23:59:59.999Z`);
      conditions.push(`date >= $${params.length - 1} AND date <= $${params.length}`);
    }
  } else if (startDate || endDate) {
    if (startDate) {
      params.push(new Date(startDate).toISOString());
      conditions.push(`date >= $${params.length}`);
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      params.push(eDate.toISOString());
      conditions.push(`date <= $${params.length}`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    const pIdx = params.length;
    let numCond = '';
    const numSearch = Number(search);
    if (Number.isInteger(numSearch)) {
      params.push(numSearch);
      numCond = ` OR job_no = $${params.length}`;
    }
    conditions.push(`(company ILIKE $${pIdx} OR contact_person ILIKE $${pIdx} OR description ILIKE $${pIdx} OR email ILIKE $${pIdx} OR contact_number ILIKE $${pIdx} OR sales_person ILIKE $${pIdx} OR responsible_person ILIKE $${pIdx} OR type_of_job ILIKE $${pIdx} OR current_status ILIKE $${pIdx} OR job_review ILIKE $${pIdx}${numCond})`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
  const offset = (pageNum - 1) * limitNum;

  const whereClause = conditions.join(' AND ');

  try {
    const listSql = `
      SELECT id AS "_id", id, job_no AS "jobNo", date, sales_person AS "salesPerson",
             company, company_id AS "companyId", contact_person AS "contactPerson",
             contact_number AS "contactNumber", email, type_of_job AS "typeOfJob",
             description, current_status AS "currentStatus", responsible_person AS "responsiblePerson",
             due_date AS "dueDate", amount, received, balance, job_review AS "jobReview",
             opportunity_id AS "opportunityId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM completed_jobs
      WHERE ${whereClause}
      ORDER BY job_no DESC NULLS LAST, date DESC NULLS LAST, created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*) FROM completed_jobs WHERE ${whereClause}`;
    const metricsSql = `SELECT SUM(amount) AS "totalAmount", SUM(received) AS "totalReceived", SUM(balance) AS "totalBalance" FROM completed_jobs WHERE ${whereClause}`;

    const [res, countRes, metricsRes, categories] = await Promise.all([
      db.query(listSql, [...params, limitNum, offset]),
      db.query(countSql, params),
      db.query(metricsSql, params),
      getCompletedJobCategories(),
    ]);

    const total = parseInt(countRes.rows[0]?.count || 0, 10);
    const metricsRow = metricsRes.rows[0] || {};

    return {
      items: res.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      categories,
      metrics: {
        totalJobs: total,
        totalAmount: Number(metricsRow.totalAmount) || 0,
        totalReceived: Number(metricsRow.totalReceived) || 0,
        totalBalance: Number(metricsRow.totalBalance) || 0,
      },
    };
  } catch (err) {
    console.error('Error listing completed jobs in PostgreSQL:', err.message);
    const categories = await getCompletedJobCategories();
    return {
      items: [],
      total: 0,
      page: pageNum,
      limit: limitNum,
      totalPages: 1,
      categories,
      metrics: { totalJobs: 0, totalAmount: 0, totalReceived: 0, totalBalance: 0 },
    };
  }
}

export async function getCompletedJob(id) {
  try {
    const res = await db.query(
      `SELECT id AS "_id", id, job_no AS "jobNo", date, sales_person AS "salesPerson",
              company, company_id AS "companyId", contact_person AS "contactPerson",
              contact_number AS "contactNumber", email, type_of_job AS "typeOfJob",
              description, current_status AS "currentStatus", responsible_person AS "responsiblePerson",
              due_date AS "dueDate", amount, received, balance, job_review AS "jobReview",
              opportunity_id AS "opportunityId", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM completed_jobs
       WHERE (id::text = $1::text) AND deleted_at IS NULL
       LIMIT 1`,
      [String(id)]
    );
    if (!res.rows[0]) {
      const error = new Error('Completed Job not found.');
      error.status = 404;
      throw error;
    }
    return res.rows[0];
  } catch (err) {
    if (err.status === 404) throw err;
    const error = new Error('Completed Job not found.');
    error.status = 404;
    throw error;
  }
}

export async function getNextJobNumber() {
  try {
    const res = await db.query(`SELECT MAX(job_no) AS max FROM completed_jobs`);
    const highest = Number(res.rows[0]?.max) || 200;
    return highest + 1;
  } catch (err) {
    return 201;
  }
}

export async function createCompletedJob(payload) {
  let jobNo = cleanNumber(payload.jobNo, 0);
  if (!jobNo) {
    jobNo = await getNextJobNumber();
  }

  const amount = cleanNumber(payload.amount, 0);
  const received = cleanNumber(payload.received, 0);
  const balance = payload.balance !== undefined ? cleanNumber(payload.balance, 0) : Math.max(0, amount - received);

  const res = await db.query(
    `INSERT INTO completed_jobs (
       job_no, date, sales_person, company, company_id, contact_person,
       contact_number, email, type_of_job, description, current_status,
       responsible_person, due_date, amount, received, balance, job_review, opportunity_id
     ) VALUES (
       $1, $2, $3, $4, $5::uuid, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14, $15, $16, $17, $18::uuid
     )
     RETURNING id AS "_id", id, job_no AS "jobNo", date, sales_person AS "salesPerson",
               company, company_id AS "companyId", contact_person AS "contactPerson",
               contact_number AS "contactNumber", email, type_of_job AS "typeOfJob",
               description, current_status AS "currentStatus", responsible_person AS "responsiblePerson",
               due_date AS "dueDate", amount, received, balance, job_review AS "jobReview",
               opportunity_id AS "opportunityId", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      jobNo,
      payload.date ? new Date(payload.date) : new Date(),
      String(payload.salesPerson || '').trim(),
      String(payload.company || '').trim(),
      payload.companyId && String(payload.companyId).length === 36 ? String(payload.companyId) : null,
      String(payload.contactPerson || '').trim(),
      String(payload.contactNumber || '').trim(),
      String(payload.email || '').trim(),
      String(payload.typeOfJob || '').trim(),
      String(payload.description || '').trim(),
      String(payload.currentStatus || 'Job Done').trim(),
      String(payload.responsiblePerson || '').trim(),
      payload.dueDate ? new Date(payload.dueDate) : null,
      amount,
      received,
      balance,
      String(payload.jobReview || '').trim(),
      payload.ongoingJobId || payload.opportunityId || null,
    ]
  );

  return res.rows[0];
}

export async function updateCompletedJob(id, payload) {
  const existing = await getCompletedJob(id);

  const amount = payload.amount !== undefined ? cleanNumber(payload.amount, 0) : existing.amount;
  const received = payload.received !== undefined ? cleanNumber(payload.received, 0) : existing.received;
  let balance = existing.balance;
  if (payload.balance !== undefined) {
    balance = cleanNumber(payload.balance, 0);
  } else if (payload.amount !== undefined || payload.received !== undefined) {
    balance = Math.max(0, amount - received);
  }

  const res = await db.query(
    `UPDATE completed_jobs SET
       job_no = COALESCE($2, job_no),
       sales_person = COALESCE($3, sales_person),
       company = COALESCE($4, company),
       company_id = COALESCE($5::uuid, company_id),
       contact_person = COALESCE($6, contact_person),
       contact_number = COALESCE($7, contact_number),
       email = COALESCE($8, email),
       type_of_job = COALESCE($9, type_of_job),
       description = COALESCE($10, description),
       current_status = COALESCE($11, current_status),
       responsible_person = COALESCE($12, responsible_person),
       job_review = COALESCE($13, job_review),
       date = COALESCE($14, date),
       due_date = COALESCE($15, due_date),
       amount = $16,
       received = $17,
       balance = $18,
       opportunity_id = COALESCE($19::uuid, opportunity_id),
       updated_at = NOW()
     WHERE (id::text = $1::text) AND deleted_at IS NULL
     RETURNING id AS "_id", id, job_no AS "jobNo", date, sales_person AS "salesPerson",
               company, company_id AS "companyId", contact_person AS "contactPerson",
               contact_number AS "contactNumber", email, type_of_job AS "typeOfJob",
               description, current_status AS "currentStatus", responsible_person AS "responsiblePerson",
               due_date AS "dueDate", amount, received, balance, job_review AS "jobReview",
               opportunity_id AS "opportunityId", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      String(id),
      payload.jobNo !== undefined ? cleanNumber(payload.jobNo, 0) : null,
      payload.salesPerson !== undefined ? String(payload.salesPerson).trim() : null,
      payload.company !== undefined ? String(payload.company).trim() : null,
      payload.companyId && String(payload.companyId).length === 36 ? String(payload.companyId) : null,
      payload.contactPerson !== undefined ? String(payload.contactPerson).trim() : null,
      payload.contactNumber !== undefined ? String(payload.contactNumber).trim() : null,
      payload.email !== undefined ? String(payload.email).trim() : null,
      payload.typeOfJob !== undefined ? String(payload.typeOfJob).trim() : null,
      payload.description !== undefined ? String(payload.description).trim() : null,
      payload.currentStatus !== undefined ? String(payload.currentStatus).trim() : null,
      payload.responsiblePerson !== undefined ? String(payload.responsiblePerson).trim() : null,
      payload.jobReview !== undefined ? String(payload.jobReview).trim() : null,
      payload.date ? new Date(payload.date) : null,
      payload.dueDate ? new Date(payload.dueDate) : null,
      amount,
      received,
      balance,
      payload.ongoingJobId || payload.opportunityId || null,
    ]
  );

  return res.rows[0];
}

export async function deleteCompletedJob(id, actor = {}) {
  const res = await db.query(
    `UPDATE completed_jobs SET deleted_at = NOW(), deleted_by = $2 WHERE (id::text = $1::text) RETURNING *`,
    [String(id), String(actor?.username || actor?.displayName || 'admin')]
  );
  return { deleted: res.rowCount > 0 };
}

export async function restoreCompletedJob(id, actor = {}) {
  const res = await db.query(
    `UPDATE completed_jobs SET deleted_at = NULL, deleted_by = NULL WHERE (id::text = $1::text) RETURNING *`,
    [String(id)]
  );
  return { restored: res.rowCount > 0 };
}

export async function createCompletedJobFromOngoingJob(ongoingJob) {
  if (!ongoingJob) return null;

  if (ongoingJob.stage === 'Job Lost' || ongoingJob.stage === 'Closed Lost') {
    return null;
  }

  if (ongoingJob.stage !== 'Job Done' && ongoingJob.stage !== 'Closed Won' && ongoingJob.stage !== 'Payment Received') {
    return null;
  }

  let existingRes = await db.query(
    `SELECT id FROM completed_jobs WHERE opportunity_id = $1::uuid AND deleted_at IS NULL LIMIT 1`,
    [String(ongoingJob._id || ongoingJob.id)]
  );

  let companyName = ongoingJob.companyName || ongoingJob.company || ongoingJob.name || '';
  let contactPerson = ongoingJob.contactPerson || '';
  let contactNumber = ongoingJob.phone || '';
  let email = ongoingJob.email || '';

  const jobStatus = 'Job Done';
  const jobType = Array.isArray(ongoingJob.services) && ongoingJob.services.length
    ? ongoingJob.services[0]
    : (ongoingJob.name || 'General Project');

  if (existingRes.rows[0]) {
    const existingId = existingRes.rows[0].id;
    return await updateCompletedJob(existingId, {
      currentStatus: jobStatus,
      amount: ongoingJob.valueAed,
      salesPerson: ongoingJob.owner,
      company: companyName,
      description: ongoingJob.notes,
    });
  }

  const jobNo = await getNextJobNumber();

  return await createCompletedJob({
    jobNo,
    date: ongoingJob.closedAt || new Date(),
    salesPerson: ongoingJob.owner || 'admin',
    company: companyName,
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
    opportunityId: ongoingJob._id || ongoingJob.id,
  });
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
