import db from '../db/index.js';

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
  let records = [];
  try {
    const res = await db.query(
      `SELECT business_date AS "businessDate", section, completed_by_name AS "completedByName", completed_at AS "completedAt"
       FROM daily_review_records WHERE business_date = $1`,
      [todayDubai]
    );
    records = res.rows;
  } catch (err) {
    records = [];
  }

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
  const userId = user?.id || user?._id || user?.userId || null;
  const completedByName = (user?.displayName || user?.name || user?.username || 'Team').trim();

  try {
    const res = await db.query(
      `INSERT INTO daily_review_records (business_date, section, completed_by_user_id, completed_by_name, completed_at)
       VALUES ($1, $2, $3::uuid, $4, NOW())
       ON CONFLICT (business_date, section)
       DO UPDATE SET completed_by_name = EXCLUDED.completed_by_name, completed_at = NOW()
       RETURNING business_date AS "businessDate", section, completed_by_name AS "completedByName", completed_at AS "completedAt"`,
      [todayDubai, section, userId && String(userId).length === 36 ? String(userId) : null, completedByName]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error completing daily review in PostgreSQL:', err.message);
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

  let records = [];
  try {
    const res = await db.query(
      `SELECT business_date AS "businessDate", section, completed_by_name AS "completedByName", completed_at AS "completedAt"
       FROM daily_review_records WHERE business_date LIKE $1`,
      [`${monthStr}-%`]
    );
    records = res.rows;
  } catch (err) {
    records = [];
  }

  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayRecordsMap = new Map();

  for (const r of records) {
    const list = dayRecordsMap.get(r.businessDate) || [];
    list.push(r);
    dayRecordsMap.set(r.businessDate, list);
  }

  const days = [];
  let ongoingJobsCompleted = 0;
  let keyRelationshipsCompleted = 0;
  let leadsCompleted = 0;
  let allThreeCompleted = 0;
  let eligibleDaysCount = 0;

  for (let d = 1; d <= totalDays; d += 1) {
    const dateFormatted = `${monthStr}-${String(d).padStart(2, '0')}`;
    const dayRecords = dayRecordsMap.get(dateFormatted) || [];
    const secMap = new Map(dayRecords.map((r) => [r.section, r]));

    const ojRec = secMap.get('ongoing_jobs');
    const krRec = secMap.get('key_relationships');
    const leadsRec = secMap.get('leads');

    const ojDone = Boolean(ojRec);
    const krDone = Boolean(krRec);
    const leadsDone = Boolean(leadsRec);

    const countCompleted = (ojDone ? 1 : 0) + (krDone ? 1 : 0) + (leadsDone ? 1 : 0);
    const isFuture = dateFormatted > todayDubaiDate;

    if (!isFuture) {
      eligibleDaysCount += 1;
      if (ojDone) ongoingJobsCompleted += 1;
      if (krDone) keyRelationshipsCompleted += 1;
      if (leadsDone) leadsCompleted += 1;
      if (countCompleted === 3) allThreeCompleted += 1;
    }

    days.push({
      day: d,
      date: dateFormatted,
      isFuture,
      isToday: dateFormatted === todayDubaiDate,
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

  // -------------------------------------------------------------
  // 1. Ongoing Jobs
  // -------------------------------------------------------------
  let ongoingJobs = [];
  try {
    const ojSql = `
      SELECT oj.id AS "_id", oj.title AS "name", COALESCE(o.canonical_name, o.trading_name, '') AS "companyName",
             oj.summary_stage AS "stage", oj.updated_at AS "updatedAt"
      FROM ongoing_jobs oj
      LEFT JOIN organizations o ON oj.customer_organization_id = o.id
      WHERE oj.outcome IS DISTINCT FROM 'cancelled'
      ORDER BY oj.updated_at DESC
    `;
    const res = await db.query(ojSql);
    
    // Fetch open tasks for ongoing jobs
    let openTasks = [];
    try {
      const taskRes = await db.query(
        `SELECT id AS "_id", title, due_at AS "dueAt" FROM tasks WHERE status = 'pending' ORDER BY due_at ASC`
      );
      openTasks = taskRes.rows;
    } catch (err) {}

    ongoingJobs = res.rows.map((j) => ({
      _id: j._id,
      name: j.name,
      companyName: j.companyName || '—',
      stage: j.stage || 'Inquiry',
      owner: 'admin',
      valueAed: 0,
      targetDate: null,
      nextTask: openTasks[0] ? { _id: openTasks[0]._id, title: openTasks[0].title, owner: 'admin', dueAt: openTasks[0].dueAt } : null,
      isOverdue: false,
    }));

    ongoingJobs.sort((a, b) => {
      const indexA = PIPELINE_STAGE_ORDER.indexOf(a.stage);
      const indexB = PIPELINE_STAGE_ORDER.indexOf(b.stage);
      const rankA = indexA === -1 ? 999 : indexA;
      const rankB = indexB === -1 ? 999 : indexB;
      if (rankA !== rankB) return rankA - rankB;
      return 0;
    });
  } catch (err) {
    ongoingJobs = [];
  }

  // -------------------------------------------------------------
  // 2. Key Relationships
  // -------------------------------------------------------------
  let keyRelationships = [];
  try {
    const krSql = `
      SELECT p.id AS "_id", p.display_name AS "name", COALESCE(o.canonical_name, o.trading_name, '') AS "companyName",
             p.updated_at AS "lastInteractionAt"
      FROM people p
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN organizations o ON por.organization_id = o.id
      WHERE p.archived_at IS NULL
      LIMIT 50
    `;
    const krRes = await db.query(krSql);
    keyRelationships = krRes.rows.map((lead) => ({
      _id: lead._id,
      name: lead.name,
      companyName: lead.companyName || '—',
      owner: 'admin',
      lastInteractionAt: lead.lastInteractionAt || null,
      nextTask: null,
      dueCategory: 3,
    }));
  } catch (err) {
    keyRelationships = [];
  }

  // -------------------------------------------------------------
  // 3. Leads
  // -------------------------------------------------------------
  let leadsList = [];
  try {
    const leadSql = `
      SELECT p.id AS "_id", p.display_name AS "name", COALESCE(o.canonical_name, o.trading_name, '') AS "companyName"
      FROM people p
      LEFT JOIN person_organization_roles por ON por.person_id = p.id
      LEFT JOIN organizations o ON por.organization_id = o.id
      WHERE p.archived_at IS NULL
      LIMIT 50
    `;
    const lRes = await db.query(leadSql);
    leadsList = lRes.rows.map((lead) => ({
      _id: lead._id,
      name: lead.name,
      companyName: lead.companyName || '—',
      leadStage: 'contact',
      campaignName: '—',
      latestReply: null,
      currentTask: null,
      hasUnreviewedReply: false,
      isOverdue: false,
      priorityRank: 4,
    }));
  } catch (err) {
    leadsList = [];
  }

  return {
    ongoingJobs,
    keyRelationships,
    leads: leadsList,
  };
}
