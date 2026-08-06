import db from '../db/index.js';
import {
  listInteractionsForLead,
  listInteractionsForCompany,
  manualInteractionToEvent,
  buildRelatedContacts,
} from './interactionService.js';

function extractCleanEmail(raw) {
  if (!raw) return '';
  const str = String(raw).trim().toLowerCase();
  const match = str.match(/<([^>]+)>/);
  return (match && match[1] ? match[1] : str).trim().toLowerCase();
}

function repairMojibake(value) {
  let text = String(value || '');
  if (!/(?:Ã.|Â.|â[\u0080-\u00BF]|ð[\u0080-\u00BF])/.test(text)) return text;
  text = text.replace(
    /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â[\u0080-\u00BF]{2}|ð[\u0080-\u00BF]{3})/g,
    (sequence) => {
      const decoded = Buffer.from(sequence, 'latin1').toString('utf8');
      return decoded.includes('�') ? sequence : decoded;
    }
  );
  if (!/(?:Ã.|Â.|â[\u0080-\u00BF]|ð[\u0080-\u00BF])/.test(text)) return text;
  if ([...text].some((character) => character.codePointAt(0) > 255)) {
    return text
      .replace(/â¯/g, ' ')
      .replace(/â/g, '’')
      .replace(/â/g, '‘')
      .replace(/â/g, '“')
      .replace(/â/g, '”')
      .replace(/â/g, '–')
      .replace(/â/g, '—')
      .replace(/Â /g, ' ');
  }
  const repaired = Buffer.from(text, 'latin1').toString('utf8');
  return repaired.includes('�') ? text : repaired;
}

const HTML_TAG_PATTERN = /<(?:html|body|div|p|br|span|table|thead|tbody|tr|td|th|a|strong|b|em|i|ul|ol|li|blockquote|pre|code|img|style|script)\b/i;

function decodeQuotedPrintable(value, charset = 'utf-8') {
  const unfolded = String(value || '').replace(/=\r?\n/g, '');
  return unfolded.replace(/(?:=[0-9a-f]{2})+/gi, (encoded) => {
    const bytes = encoded.split('=').filter(Boolean).map((hex) => parseInt(hex, 16));
    try {
      return new TextDecoder(charset).decode(Uint8Array.from(bytes));
    } catch {
      return Buffer.from(bytes).toString('utf8');
    }
  });
}

function extractMimePlainText(value) {
  const source = String(value || '').replace(/\r\n?/g, '\n');
  const plainIndex = source.search(/Content-Type:\s*text\/plain\b/i);
  if (plainIndex < 0) return source;

  const headerEnd = source.indexOf('\n\n', plainIndex);
  if (headerEnd < 0) return source;
  const headers = source.slice(plainIndex, headerEnd);
  const firstBoundary = source.match(/^--([^\n]+)\n/);
  const endMarker = firstBoundary ? `\n--${firstBoundary[1]}` : null;
  const contentEnd = endMarker ? source.indexOf(endMarker, headerEnd + 2) : -1;
  let content = source.slice(headerEnd + 2, contentEnd > -1 ? contentEnd : undefined);

  const charset = headers.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1] || 'utf-8';
  const encoding = headers.match(/Content-Transfer-Encoding:\s*([^\s]+)/i)?.[1]?.toLowerCase();
  if (encoding === 'quoted-printable') content = decodeQuotedPrintable(content, charset);
  if (encoding === 'base64') {
    try {
      content = Buffer.from(content.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      // Keep the source text when the migrated payload is not valid base64.
    }
  }
  return content;
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)));
}

export function normalizeTimelineText(value, { stripHtml = true, maxLength = 50000 } = {}) {
  let text = repairMojibake(extractMimePlainText(value));
  text = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\r\n?/g, '\n');

  if (stripHtml && HTML_TAG_PATTERN.test(text)) {
    text = text
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<\/div\s*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<\/?(?:html|body|div|p|br|span|table|thead|tbody|tr|td|th|a|strong|b|em|i|ul|ol|li|blockquote|pre|code|img)\b[^>]*>/gi, '');
  }

  text = decodeHtmlEntities(text)
    .replace(/^\s*\[cid:[^\]]+\]\s*$/gim, '')
    .replace(/^\s*\[(?:picture-[^\]]+|[^\]]+\.(?:png|jpe?g|gif|svg)|design|proudofuae)\]\s*$/gim, '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return text.slice(0, maxLength);
}

function normalizeSubject(value) {
  return normalizeTimelineText(value, { stripHtml: true, maxLength: 500 })
    .replace(/\s+/g, ' ')
    .trim();
}

function messageBody(body, htmlBody) {
  return normalizeTimelineText(body) || normalizeTimelineText(htmlBody);
}

function recipientSnapshot(value) {
  if (Array.isArray(value)) return extractCleanEmail(value[0]);
  if (value && typeof value === 'object') return extractCleanEmail(Object.values(value)[0]);
  return extractCleanEmail(value);
}

function event(id, payload) {
  if (!payload.timestamp) return null;
  const ts = new Date(payload.timestamp);
  if (Number.isNaN(ts.getTime())) return null;

  const direction = payload.direction
    || payload.meta?.direction
    || (payload.type === 'email_outbound' ? 'outbound' : null)
    || (payload.type === 'email_inbound' ? 'inbound' : null);

  return {
    id,
    type: payload.type,
    title: payload.title,
    detail: payload.detail || '',
    timestamp: ts.toISOString(),
    actor: payload.actor || 'Team',
    channel: payload.channel || 'crm',
    contactName: payload.contactName || '',
    contactId: payload.contactId || null,
    source: payload.source || 'automated',
    meta: {
      ...(payload.meta || {}),
      ...(direction ? { direction } : {}),
    },
  };
}

export async function getLeadTimeline(leadId) {
  const pRes = await db.query(
    `SELECT p.id, p.display_name, p.created_at,
            role.organization_id, role.title AS designation,
            o.canonical_name AS company_name, email.normalized_value AS email
     FROM people p
     LEFT JOIN LATERAL (
       SELECT por.organization_id, por.title
       FROM person_organization_roles por
       WHERE por.person_id = p.id
       ORDER BY por.effective_to NULLS FIRST, por.created_at DESC
       LIMIT 1
     ) role ON TRUE
     LEFT JOIN organizations o ON role.organization_id = o.id
     LEFT JOIN LATERAL (
       SELECT normalized_value
       FROM person_contact_methods
       WHERE person_id = p.id AND type = 'email'
       ORDER BY preferred DESC NULLS LAST, created_at
       LIMIT 1
     ) email ON TRUE
     WHERE p.id::text = $1 OR EXISTS (
       SELECT 1 FROM person_contact_methods lookup
       WHERE lookup.person_id = p.id AND lookup.normalized_value = $1
     )
     LIMIT 1`,
    [String(leadId)]
  );

  if (!pRes.rows.length) {
    const error = new Error('Lead not found.');
    error.status = 404;
    throw error;
  }

  const person = pRes.rows[0];
  const contactName = person.display_name || person.email || 'Contact';

  const events = [];

  const profileDetail = [person.designation, person.company_name].filter(Boolean).join(' at ');
  events.push(event(`contact-created-${person.id}`, {
    contactName,
    contactId: String(person.id),
    type: 'profile',
    title: 'Contact added to CRM',
    detail: profileDetail || 'Contact record created.',
    timestamp: person.created_at,
    actor: 'System',
    channel: 'crm',
    meta: { direction: 'internal' },
  }));

  const enrollmentRes = await db.query(
    `SELECT campaign.id AS campaign_id, campaign.name AS campaign_name,
            contact.created_at, role.title AS designation
     FROM campaign_contacts contact
     JOIN campaign_accounts account ON account.id = contact.campaign_account_id
     JOIN campaigns campaign ON campaign.id = account.campaign_id
     JOIN person_organization_roles role ON role.id = contact.role_id
     WHERE role.person_id = $1::uuid
     ORDER BY contact.created_at ASC`,
    [person.id]
  );
  enrollmentRes.rows.forEach((enrollment) => {
    const enrollmentEvent = event(`campaign-enrollment-${person.id}-${enrollment.campaign_id}`, {
      contactName,
      contactId: String(person.id),
      type: 'profile',
      title: 'Added to campaign',
      detail: `${enrollment.campaign_name}${enrollment.designation ? ` · ${enrollment.designation}` : ''}`,
      timestamp: enrollment.created_at,
      actor: 'System',
      channel: 'crm',
      meta: {
        direction: 'internal',
        campaignId: enrollment.campaign_id,
        campaignName: enrollment.campaign_name,
      },
    });
    if (enrollmentEvent) events.push(enrollmentEvent);
  });

  // 2. Query Messages (Inbound & Outbound) from PostgreSQL
  const msgRes = await db.query(
    `SELECT m.id, m.direction, m.subject, m.body, m.html_body, m.delivery_state, m.occurred_at,
            m.from_snapshot, m.to_snapshot, m.suggested_intent, m.human_review_status,
            COALESCE(conv.campaign_id, ca.campaign_id) AS campaign_id,
            campaign.name AS campaign_name, COALESCE(job_links.items,'[]') AS linked_jobs
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
     LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
     LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conv.campaign_id, ca.campaign_id)
     LEFT JOIN person_organization_roles por ON por.id = cc.role_id
     LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',j.id,'title',j.title,'jobNumber',j.job_number) ORDER BY j.title) items FROM conversation_job_links l JOIN ongoing_jobs j ON j.id=l.ongoing_job_id WHERE l.conversation_id=conv.id) job_links ON TRUE
     WHERE (por.person_id = $1::uuid OR EXISTS (
       SELECT 1 FROM conversation_participants cp
       JOIN person_contact_methods pcm ON pcm.id = cp.person_contact_method_id
       WHERE cp.conversation_id = conv.id AND pcm.person_id = $1::uuid
     )) AND COALESCE(m.is_migration_duplicate, false) = false
     ORDER BY m.occurred_at DESC`,
    [person.id]
  );

  msgRes.rows.forEach((m) => {
    const isOut = m.direction === 'outbound';
    const subject = normalizeSubject(m.subject);
    const body = messageBody(m.body, m.html_body);
    const evt = event(`msg-${m.id}`, {
      contactName,
      contactId: String(person.id),
      type: isOut ? 'email_outbound' : 'email_inbound',
      title: subject ? `${isOut ? 'Sent' : 'Reply'}: ${subject}` : `${isOut ? 'Outbound' : 'Inbound'} email`,
      detail: body,
      timestamp: m.occurred_at,
      actor: isOut ? 'Sequence' : contactName,
      channel: 'email',
      meta: {
        subject,
        body,
        htmlBody: repairMojibake(m.html_body || ''),
        direction: m.direction,
        from: extractCleanEmail(m.from_snapshot),
        to: recipientSnapshot(m.to_snapshot),
        deliveryState: m.delivery_state,
        intent: m.suggested_intent,
        reviewStatus: m.human_review_status,
        campaignId: m.campaign_id,
        campaignName: m.campaign_name || 'Direct / no campaign',
        linkedJobs: m.linked_jobs || [],
        bodyUnavailable: !body,
      },
    });
    if (evt) events.push(evt);
  });

  // 3. Query Tasks from PostgreSQL
  try {
    const taskRes = await db.query(
      `SELECT id, title, description, status, priority, type, due_at, completed_at, created_at
       FROM tasks
       WHERE lead_id = $1::uuid AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 100`
      , [person.id]
    );
    taskRes.rows.forEach((t) => {
      const taskDescription = t.type === 'reply_review'
        ? 'Review the linked reply and record the outcome.'
        : normalizeTimelineText(t.description);
      const evt = event(`task-${t.id}`, {
        contactName,
        contactId: String(person.id),
        type: 'task',
        title: t.status === 'completed' ? `Task completed: ${normalizeSubject(t.title)}` : `Follow-up: ${normalizeSubject(t.title)}`,
        detail: taskDescription,
        timestamp: t.completed_at || t.created_at,
        actor: 'Team',
        channel: 'task',
        meta: { direction: 'internal', priority: t.priority, status: t.status, dueAt: t.due_at },
      });
      if (evt) events.push(evt);
    });
  } catch (tErr) {}

  // 4. Query Manual Interactions
  try {
    const manualInteractions = await listInteractionsForLead(person.id);
    manualInteractions.forEach((record) => {
      events.push(manualInteractionToEvent(
        record,
        contactName,
        buildRelatedContacts(record, new Map([[String(person.id), person]]))
      ));
    });
  } catch (iErr) {}

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    subject: {
      type: 'contact',
      id: String(person.id),
      name: contactName,
      designation: person.designation || '',
      companyName: person.company_name || '',
      email: person.email,
    },
    events,
  };
}

export async function getCompanyTimeline(companyId) {
  const cRes = await db.query(
    `SELECT o.id, o.canonical_name, oi.normalized_value AS domain
     FROM organizations o
     LEFT JOIN organization_identifiers oi ON oi.organization_id = o.id AND oi.type = 'domain'
     WHERE o.id::text = $1 OR lower(o.canonical_name) = lower($1) OR oi.normalized_value = $1
     LIMIT 1`,
    [String(companyId)]
  );

  if (!cRes.rows.length) {
    const error = new Error('Company not found.');
    error.status = 404;
    throw error;
  }

  const company = cRes.rows[0];

  // Query people in this company
  const pRes = await db.query(
    `SELECT DISTINCT ON (p.id) p.id, p.display_name, por.title AS designation, pcm.normalized_value AS email
     FROM person_organization_roles por
     JOIN people p ON por.person_id = p.id
     LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
     WHERE por.organization_id = $1::uuid
     ORDER BY p.id, pcm.preferred DESC NULLS LAST, pcm.created_at`,
    [company.id]
  );

  const people = pRes.rows;
  const events = [];

  // Query messages for company
  const msgRes = await db.query(
    `SELECT m.id, m.direction, m.subject, m.body, m.html_body, m.delivery_state, m.occurred_at,
            m.from_snapshot, m.to_snapshot, m.suggested_intent, m.human_review_status,
            p.id AS person_id, p.display_name AS person_name,
            COALESCE(conv.campaign_id, ca.campaign_id) AS campaign_id,
            campaign.name AS campaign_name, COALESCE(job_links.items,'[]') AS linked_jobs
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN campaign_contacts cc ON cc.id = conv.campaign_contact_id
     LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
     LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = cc.role_id
     LEFT JOIN LATERAL (
       SELECT method.person_id
       FROM conversation_participants participant
       JOIN person_contact_methods method ON method.id = participant.person_contact_method_id
       JOIN person_organization_roles participant_role ON participant_role.person_id = method.person_id
       WHERE participant.conversation_id = conv.id
         AND participant_role.organization_id = $1::uuid
       ORDER BY CASE WHEN participant.participant_role IN ('sender', 'recipient') THEN 0 ELSE 1 END,
                participant.id
       LIMIT 1
     ) participant_person ON TRUE
     LEFT JOIN people p ON p.id = CASE
       WHEN campaign_role.organization_id = $1::uuid THEN campaign_role.person_id
       ELSE participant_person.person_id
     END
     LEFT JOIN campaigns campaign ON campaign.id = COALESCE(conv.campaign_id, ca.campaign_id)
     LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',j.id,'title',j.title,'jobNumber',j.job_number) ORDER BY j.title) items FROM conversation_job_links l JOIN ongoing_jobs j ON j.id=l.ongoing_job_id WHERE l.conversation_id=conv.id) job_links ON TRUE
     WHERE (ca.organization_id = $1::uuid OR participant_person.person_id IS NOT NULL)
       AND COALESCE(m.is_migration_duplicate, false) = false
     ORDER BY m.occurred_at DESC LIMIT 100`,
    [company.id]
  );

  msgRes.rows.forEach((m) => {
    const isOut = m.direction === 'outbound';
    const subject = normalizeSubject(m.subject);
    const body = messageBody(m.body, m.html_body);
    const evt = event(`msg-${m.id}`, {
      contactName: m.person_name || 'Contact',
      contactId: m.person_id ? String(m.person_id) : null,
      type: isOut ? 'email_outbound' : 'email_inbound',
      title: subject ? `${isOut ? 'Sent' : 'Reply'}: ${subject}` : `${isOut ? 'Outbound' : 'Inbound'} email`,
      detail: body,
      timestamp: m.occurred_at,
      actor: isOut ? 'Sequence' : (m.person_name || 'Contact'),
      channel: 'email',
      meta: {
        subject,
        body,
        htmlBody: repairMojibake(m.html_body || ''),
        direction: m.direction,
        from: extractCleanEmail(m.from_snapshot),
        to: recipientSnapshot(m.to_snapshot),
        deliveryState: m.delivery_state,
        intent: m.suggested_intent,
        reviewStatus: m.human_review_status,
        campaignId: m.campaign_id,
        campaignName: m.campaign_name || 'Direct / no campaign',
        linkedJobs: m.linked_jobs || [],
        bodyUnavailable: !body,
      },
    });
    if (evt) events.push(evt);
  });

  // Query manual interactions
  try {
    const manualInteractions = await listInteractionsForCompany(company.id);
    const peopleMap = new Map(people.map((person) => [String(person.id), {
      name: person.display_name,
      email: person.email,
    }]));
    manualInteractions.forEach((record) => {
      const interactionPerson = peopleMap.get(String(record.leadId || ''));
      events.push(manualInteractionToEvent(
        record,
        interactionPerson?.name || company.canonical_name,
        buildRelatedContacts(record, peopleMap)
      ));
    });
  } catch (iErr) {}

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    subject: {
      type: 'company',
      id: String(company.id),
      name: company.canonical_name,
      domain: company.domain || '',
      contactCount: people.length,
    },
    events,
  };
}
