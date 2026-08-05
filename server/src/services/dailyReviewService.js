import db from '../db/index.js';
import { listAllLeads } from './projectService.js';

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
             oj.summary_stage AS "stage", oj.owner, oj.value_aed AS "valueAed",
             COALESCE(oj.target_date, oj.expected_close_date) AS "targetDate",
             oj.updated_at AS "updatedAt",
             next_task.id AS "nextTaskId", next_task.title AS "nextTaskTitle",
             next_task.owner AS "nextTaskOwner", next_task.due_at AS "nextTaskDueAt"
      FROM ongoing_jobs oj
      LEFT JOIN organizations o ON oj.customer_organization_id = o.id
      LEFT JOIN LATERAL (
        SELECT t.id, t.title, t.owner, t.due_at
        FROM tasks t
        WHERE t.opportunity_id = oj.id
          AND t.status = 'pending'
          AND t.deleted_at IS NULL
        ORDER BY t.due_at ASC NULLS LAST, t.created_at DESC
        LIMIT 1
      ) next_task ON TRUE
      WHERE oj.outcome IS DISTINCT FROM 'cancelled'
        AND oj.deleted_at IS NULL
        AND oj.summary_stage NOT IN ('Job Done', 'Job Lost', 'Closed Won', 'Closed Lost')
        AND NOT EXISTS (
          SELECT 1
          FROM migration_entity_map legacy_job_map
          WHERE legacy_job_map.target_table = 'ongoing_jobs'
            AND legacy_job_map.target_entity_id = oj.id
            AND legacy_job_map.source_collection = 'jobs'
        )
      ORDER BY oj.updated_at DESC
    `;
    const res = await db.query(ojSql);

    ongoingJobs = res.rows.map((j) => ({
      _id: j._id,
      name: j.name,
      companyName: j.companyName || '—',
      stage: j.stage || 'Inquiry',
      owner: j.owner || 'Unassigned',
      valueAed: Number(j.valueAed) || 0,
      targetDate: j.targetDate || null,
      nextTask: j.nextTaskId ? {
        _id: j.nextTaskId,
        title: j.nextTaskTitle,
        owner: j.nextTaskOwner || '',
        dueAt: j.nextTaskDueAt,
      } : null,
      isOverdue: Boolean(j.nextTaskDueAt && new Date(j.nextTaskDueAt) < now),
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
    console.error('Error loading dashboard Ongoing Jobs:', err.message);
    ongoingJobs = [];
  }

  async function loadPersonWorkContext(personIds) {
    if (!personIds.length) return { tasks: new Map(), replies: new Map(), interactions: new Map() };

    const [taskRes, replyRes, interactionRes] = await Promise.all([
      db.query(
        `SELECT DISTINCT ON (lead_id)
                lead_id, id, title, owner, due_at, priority, type
         FROM tasks
         WHERE lead_id = ANY($1::uuid[])
           AND status = 'pending'
           AND deleted_at IS NULL
         ORDER BY lead_id, due_at ASC NULLS LAST, created_at DESC`,
        [personIds]
      ),
      db.query(
        `WITH inbound AS (
           SELECT m.id, m.body, m.occurred_at, m.suggested_intent,
                  COALESCE(participant_method.person_id, campaign_role.person_id) AS person_id,
                  campaign.name AS campaign_name,
                  review.status AS review_status
           FROM messages m
           JOIN conversations conversation ON conversation.id = m.conversation_id
           LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
           LEFT JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
           LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
           LEFT JOIN conversation_participants participant ON participant.conversation_id = conversation.id
           LEFT JOIN person_contact_methods participant_method ON participant_method.id = participant.person_contact_method_id
           LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conversation.campaign_id, campaign_account.campaign_id)
           LEFT JOIN review_items review ON review.source_message_id = m.id
           WHERE m.direction = 'inbound'
             AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE
         )
         SELECT DISTINCT ON (person_id)
                person_id, id, body, occurred_at, suggested_intent, campaign_name, review_status
         FROM inbound
         WHERE person_id = ANY($1::uuid[])
         ORDER BY person_id, occurred_at DESC`,
        [personIds]
      ),
      db.query(
        `SELECT person_id, MAX(occurred_at) AS last_interaction_at
         FROM interactions
         WHERE person_id = ANY($1::uuid[]) AND deleted_at IS NULL
         GROUP BY person_id`,
        [personIds]
      ),
    ]);

    return {
      tasks: new Map(taskRes.rows.map((row) => [String(row.lead_id), row])),
      replies: new Map(replyRes.rows.map((row) => [String(row.person_id), row])),
      interactions: new Map(interactionRes.rows.map((row) => [String(row.person_id), row.last_interaction_at])),
    };
  }

  function taskForDashboard(task) {
    return task ? {
      _id: task.id,
      title: task.title,
      owner: task.owner || '',
      dueAt: task.due_at,
      priority: task.priority,
      type: task.type,
    } : null;
  }

  function laterTimestamp(...values) {
    const timestamps = values.filter(Boolean).map((value) => new Date(value)).filter((value) => !Number.isNaN(value.getTime()));
    if (!timestamps.length) return null;
    return new Date(Math.max(...timestamps.map((value) => value.getTime()))).toISOString();
  }

  // -------------------------------------------------------------
  // 2. Key Relationships
  // -------------------------------------------------------------
  let keyRelationships = [];
  try {
    const rightPocs = await listAllLeads({ rightPocOnly: true, limit: 500 });
    const context = await loadPersonWorkContext(rightPocs.items.map((person) => person._id));
    keyRelationships = rightPocs.items.map((person) => {
      const task = context.tasks.get(String(person._id));
      const nextTask = taskForDashboard(task);
      const followUpAt = nextTask?.dueAt || person.relationshipProfile?.nextFollowUpAt || null;
      const followUpDate = followUpAt ? new Date(followUpAt) : null;
      const todayDubai = getDubaiBusinessDate(now);
      const followUpDubai = followUpDate && !Number.isNaN(followUpDate.getTime()) ? getDubaiBusinessDate(followUpDate) : null;
      const dueCategory = !followUpDubai ? 3 : followUpDubai < todayDubai ? 1 : followUpDubai === todayDubai ? 2 : 4;
      return {
        ...person,
        _id: person._id,
        name: person.name,
        companyName: person.companyName || '—',
        owner: person.relationshipProfile?.owner || nextTask?.owner || 'Unassigned',
        lastInteractionAt: laterTimestamp(
          person.lastRespondedAt,
          context.interactions.get(String(person._id))
        ),
        nextTask: nextTask || (followUpAt ? {
          _id: `relationship-follow-up-${person._id}`,
          title: 'Relationship follow-up',
          owner: person.relationshipProfile?.owner || '',
          dueAt: followUpAt,
        } : null),
        dueCategory,
      };
    }).sort((a, b) => a.dueCategory - b.dueCategory || new Date(a.nextTask?.dueAt || 8640000000000000) - new Date(b.nextTask?.dueAt || 8640000000000000));
  } catch (err) {
    console.error('Error loading dashboard Key Relationships:', err.message);
    keyRelationships = [];
  }

  // -------------------------------------------------------------
  // 3. Leads
  // -------------------------------------------------------------
  let leadsList = [];
  try {
    const replyLeads = await listAllLeads({ respondedOnly: true, limit: 500 });
    // Dashboard queues are intentionally MECE: a confirmed Right POC is worked
    // in Key Relationships and must not also appear in the Leads queue.
    const nonRelationshipLeads = replyLeads.items.filter(
      (person) => person.pocQualification?.status !== 'Confirmed'
    );
    const context = await loadPersonWorkContext(nonRelationshipLeads.map((person) => person._id));
    leadsList = nonRelationshipLeads.map((person) => {
      const reply = context.replies.get(String(person._id));
      const currentTask = taskForDashboard(context.tasks.get(String(person._id)));
      const hasUnreviewedReply = reply?.review_status === 'pending';
      const isOverdue = Boolean(currentTask?.dueAt && new Date(currentTask.dueAt) < now);
      return {
        ...person,
        leadStage: 'lead',
        campaignName: reply
          ? (reply.campaign_name || 'Direct / no campaign')
          : (person.campaignName || 'Direct / no campaign'),
        latestReply: reply ? {
          _id: reply.id,
          snippet: String(reply.body || '').replace(/\s+/g, ' ').trim().slice(0, 180),
          receivedAt: reply.occurred_at,
          intent: reply.suggested_intent || 'Neutral',
        } : null,
        currentTask,
        hasUnreviewedReply,
        isOverdue,
        priorityRank: hasUnreviewedReply ? 1 : isOverdue ? 2 : 3,
      };
    }).sort((a, b) => a.priorityRank - b.priorityRank || new Date(b.lastRespondedAt || 0) - new Date(a.lastRespondedAt || 0));
  } catch (err) {
    console.error('Error loading dashboard Leads:', err.message);
    leadsList = [];
  }

  return {
    ongoingJobs,
    keyRelationships,
    leads: leadsList,
    counts: {
      ongoingJobs: ongoingJobs.length,
      keyRelationships: keyRelationships.length,
      leads: leadsList.length,
    },
  };
}
