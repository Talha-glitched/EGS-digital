import db from '../db/index.js';
import { contactResponseCte } from './projectService.js';

const STATUS_BY_ASSESSMENT = {
  suitable: 'Confirmed',
  unsuitable: 'WrongContact',
  redirected_with_referral: 'RedirectedWithReferral',
  redirected_without_referral: 'RedirectedNoReferral',
  unknown: 'Unverified',
};

async function assertAccount(organizationId) {
  const result = await db.query(
    `SELECT o.id, o.canonical_name AS "companyName", o.trading_name AS "tradingName",
            o.organization_type AS "organizationType", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
            domain.normalized_value AS domain,
            COALESCE(methods.items, '[]'::jsonb) AS "contactMethods",
            COALESCE(locations.items, '[]'::jsonb) AS locations
     FROM organizations o
     LEFT JOIN LATERAL (
       SELECT normalized_value FROM organization_identifiers
       WHERE organization_id=o.id AND type='domain' AND validity<>'invalid'
       ORDER BY created_at DESC LIMIT 1
     ) domain ON TRUE
     LEFT JOIN LATERAL (
       SELECT jsonb_agg(jsonb_build_object('id',id,'type',type,'value',original_value,'normalizedValue',normalized_value,'validity',validity) ORDER BY created_at) AS items
       FROM organization_contact_methods WHERE organization_id=o.id
     ) methods ON TRUE
     LEFT JOIN LATERAL (
       SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'type',type,'address',address,'geography',geography) ORDER BY created_at) AS items
       FROM locations WHERE organization_id=o.id
     ) locations ON TRUE
     WHERE o.id=$1::uuid AND o.archived_at IS NULL`,
    [organizationId],
  );
  if (!result.rows.length) throw Object.assign(new Error('Company not found.'), { status: 404 });
  return result.rows[0];
}

export async function getAccountWorkspace(organizationId, actor = {}) {
  const company = await assertAccount(organizationId);
  const [peopleResult, campaignResult, conversationResult, jobResult, taskResult, userResult] = await Promise.all([
    db.query(
      `${contactResponseCte()}
       SELECT p.id AS "_id", p.id, por.id AS "roleId", p.display_name AS name, por.title AS designation,
              por.department, por.responsibility,
              email.normalized_value AS email, phone.normalized_value AS phone, linkedin.original_value AS "linkedinUrl",
              response.responded_at AS "respondedAt", response.last_responded_at AS "lastRespondedAt",
              COALESCE(response.reply_count,0)::int AS "replyCount",
              COALESCE(response.response_channels,ARRAY[]::text[]) AS "responseChannels",
              campaign_context.campaign_id AS "campaignId",campaign_context.campaign_name AS "campaignName",
              campaign_context.outreach_focus_state AS "campaignFocusState",campaign_context.focus_reason AS "campaignFocusReason",
              ps.assessment AS "pocAssessment", ps.reason AS "pocNotes", ps.assessed_at AS "pocAssessedAt",
              ps.referral AS "pocReferral", ps.referred_person_id AS "referredPersonId",
              kr.standing AS "relationshipStatus", kr.manually_confirmed AS "relationshipConfirmed",
              kr.owner_name AS "relationshipOwner", kr.service_categories AS "relationshipServiceCategories",
              kr.next_follow_up_at AS "relationshipNextFollowUpAt", kr.reminder_notes AS "relationshipReminderNotes"
       FROM person_organization_roles por
       JOIN people p ON p.id=por.person_id AND p.archived_at IS NULL
       LEFT JOIN LATERAL (SELECT normalized_value FROM person_contact_methods WHERE person_id=p.id AND type='email' ORDER BY preferred DESC NULLS LAST,created_at LIMIT 1) email ON TRUE
       LEFT JOIN LATERAL (SELECT normalized_value FROM person_contact_methods WHERE person_id=p.id AND type='phone' ORDER BY preferred DESC NULLS LAST,created_at LIMIT 1) phone ON TRUE
       LEFT JOIN LATERAL (SELECT original_value FROM person_contact_methods WHERE person_id=p.id AND type='linkedin' ORDER BY preferred DESC NULLS LAST,created_at LIMIT 1) linkedin ON TRUE
       LEFT JOIN LATERAL (SELECT assessment,reason,assessed_at,referral,referred_person_id FROM poc_suitabilities WHERE role_id=por.id ORDER BY assessed_at DESC NULLS LAST,id DESC LIMIT 1) ps ON TRUE
       LEFT JOIN LATERAL (SELECT standing,manually_confirmed,owner_name,service_categories,next_follow_up_at,reminder_notes FROM key_relationship_profiles WHERE role_id=por.id ORDER BY confirmed_at DESC NULLS LAST,created_at DESC LIMIT 1) kr ON TRUE
       LEFT JOIN LATERAL (
         SELECT ca.campaign_id,c.name AS campaign_name,cc.outreach_focus_state,cc.focus_reason
         FROM campaign_contacts cc JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id JOIN campaigns c ON c.id=ca.campaign_id
         WHERE cc.role_id=por.id ORDER BY cc.focus_updated_at DESC NULLS LAST,cc.created_at DESC LIMIT 1
       ) campaign_context ON TRUE
       LEFT JOIN response_summary response ON response.person_id=p.id
       WHERE por.organization_id=$1::uuid AND por.effective_to IS NULL
       ORDER BY CASE WHEN ps.assessment='suitable' AND kr.manually_confirmed=TRUE THEN 0 WHEN response.responded_at IS NOT NULL THEN 1 ELSE 2 END,p.display_name`,
      [organizationId],
    ),
    db.query(
      `SELECT c.id,c.name,c.lifecycle,c.starts_on AS "startsOn",c.ends_on AS "endsOn",ca.pursuit_state AS "pursuitState",
              COUNT(DISTINCT cc.id)::int AS "contactCount",
              COUNT(DISTINCT cc.id) FILTER(WHERE cc.delivery_state='Replied' OR cc.lead_state='Replied' OR cc.outcome='Replied')::int AS "repliedContactCount",
              COUNT(DISTINCT m.id) FILTER(WHERE m.direction='outbound')::int AS "sentCount",
              COUNT(DISTINCT m.id) FILTER(WHERE m.direction='inbound')::int AS "replyCount",
              MAX(m.occurred_at) AS "lastCommunicationAt"
       FROM campaign_accounts ca JOIN campaigns c ON c.id=ca.campaign_id
       LEFT JOIN campaign_contacts cc ON cc.campaign_account_id=ca.id
       LEFT JOIN conversations conv ON conv.campaign_contact_id=cc.id
       LEFT JOIN messages m ON m.conversation_id=conv.id AND COALESCE(m.is_migration_duplicate,FALSE)=FALSE
       WHERE ca.organization_id=$1::uuid
       GROUP BY c.id,ca.id ORDER BY MAX(m.occurred_at) DESC NULLS LAST,c.created_at DESC`,
      [organizationId],
    ),
    db.query(
      `SELECT c.id,c.subject,c.channel,c.campaign_id AS "campaignId",campaign.name AS "campaignName",
              COUNT(m.id)::int AS "messageCount",COUNT(m.id) FILTER(WHERE m.direction='inbound')::int AS "replyCount",
              MAX(m.occurred_at) AS "lastMessageAt",
              (ARRAY_AGG(m.body ORDER BY m.occurred_at DESC) FILTER(WHERE m.id IS NOT NULL))[1] AS "latestBody"
       FROM conversations c
       LEFT JOIN campaigns campaign ON campaign.id=c.campaign_id
       LEFT JOIN messages m ON m.conversation_id=c.id AND COALESCE(m.is_migration_duplicate,FALSE)=FALSE
       WHERE COALESCE(c.channel,'email')='email' AND (EXISTS(
         SELECT 1 FROM campaign_contacts cc JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
         WHERE cc.id=c.campaign_contact_id AND ca.organization_id=$1::uuid
       ) OR EXISTS(
         SELECT 1 FROM conversation_participants cp
         LEFT JOIN person_contact_methods pcm ON pcm.id=cp.person_contact_method_id
         LEFT JOIN person_organization_roles por ON por.person_id=pcm.person_id
         WHERE cp.conversation_id=c.id AND por.organization_id=$1::uuid
       ))
       GROUP BY c.id,campaign.name ORDER BY MAX(m.occurred_at) DESC NULLS LAST LIMIT 50`,
      [organizationId],
    ),
    db.query(
      `SELECT id AS "_id",id,job_number AS "jobNumber",title AS name,title,summary_stage AS stage,outcome,
              value_aed AS "valueAed",owner,owner_user_id AS "ownerUserId",next_action AS "nextAction",
              next_action_due_at AS "nextActionDueAt",target_date AS "targetDate",updated_at AS "updatedAt"
       FROM ongoing_jobs WHERE customer_organization_id=$1::uuid AND deleted_at IS NULL
       ORDER BY CASE WHEN summary_stage IN('Job Done','Job Lost','Closed Won','Closed Lost') THEN 1 ELSE 0 END,updated_at DESC`,
      [organizationId],
    ),
    db.query(
      `SELECT t.id AS "_id",t.id,t.title,t.status,t.priority,t.due_at AS "dueAt",t.owner,t.owner_user_id AS "ownerUserId",
              t.lead_id AS "leadId",t.opportunity_id AS "jobId",oj.title AS "jobTitle",oj.job_number AS "jobNumber"
       FROM tasks t LEFT JOIN ongoing_jobs oj ON oj.id=t.opportunity_id
       WHERE t.deleted_at IS NULL AND t.status IN('pending','blocked','waiting') AND (
         t.company_id=$1::uuid OR oj.customer_organization_id=$1::uuid OR EXISTS(
           SELECT 1 FROM person_organization_roles por WHERE por.person_id=t.lead_id AND por.organization_id=$1::uuid
         )
       )
       ORDER BY CASE t.status WHEN 'blocked' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END,t.due_at NULLS LAST,t.created_at DESC LIMIT 100`,
      [organizationId],
    ),
    db.query(`SELECT id AS "userId",name AS label,email AS hint FROM users WHERE is_active=TRUE ORDER BY name`),
  ]);

  const people = peopleResult.rows.map((person) => {
    const hasResponded = Boolean(person.respondedAt);
    const pocStatus = STATUS_BY_ASSESSMENT[person.pocAssessment] || 'Unverified';
    const keyRelationship = person.pocAssessment === 'suitable' && person.relationshipConfirmed === true;
    return {
      ...person,
      companyId: { _id: organizationId, companyName: company.companyName },
      companyName: company.companyName,
      hasResponded,
      leadStage: hasResponded ? 'lead' : 'contact',
      isKeyRelationship: keyRelationship,
      pocQualification: {
        status: pocStatus, notes: person.pocNotes || '', assessedAt: person.pocAssessedAt || null,
        referral: person.pocReferral || {}, referredLeadId: person.referredPersonId || null,
      },
      relationshipProfile: {
        status: person.relationshipStatus || 'New', manuallyConfirmed: person.relationshipConfirmed === true,
        owner: person.relationshipOwner || '', serviceCategories: person.relationshipServiceCategories || [],
        nextFollowUpAt: person.relationshipNextFollowUpAt || null, reminderNotes: person.relationshipReminderNotes || '',
      },
    };
  });
  const jobs = jobResult.rows;
  const activeJobs = jobs.filter((job) => !['Job Done','Job Lost','Closed Won','Closed Lost'].includes(job.stage));
  const completedJobs = jobs.filter((job) => ['Job Done','Job Lost','Closed Won','Closed Lost'].includes(job.stage));
  const tasks = taskResult.rows;
  const conversations = conversationResult.rows;

  return {
    company: {
      ...company,
      hasResponded: people.some((person) => person.hasResponded),
      respondedAt: people.map((person) => person.respondedAt).filter(Boolean).sort()[0] || null,
      lastRespondedAt: people.map((person) => person.lastRespondedAt).filter(Boolean).sort().at(-1) || null,
    },
    people,
    leads: people,
    keyRelationships: people.filter((person) => person.isKeyRelationship),
    repliedLeads: people.filter((person) => person.hasResponded && !person.isKeyRelationship),
    campaigns: campaignResult.rows,
    conversations,
    jobs: { all: jobs, active: activeJobs, completed: completedJobs },
    tasks,
    users: userResult.rows,
    currentUserId: actor?.userId || null,
    summary: {
      contacts: people.length,
      leads: people.filter((person) => person.hasResponded && !person.isKeyRelationship).length,
      keyRelationships: people.filter((person) => person.isKeyRelationship).length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      openTasks: tasks.length,
      conversations: conversations.length,
    },
  };
}
