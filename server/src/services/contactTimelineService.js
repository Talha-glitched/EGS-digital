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
  // Query person details from PostgreSQL
  const pRes = await db.query(
    `SELECT p.id, p.display_name, por.organization_id, por.title AS designation,
            o.canonical_name AS company_name, pcm.normalized_value AS email,
            c.name AS campaign_name, c.id AS campaign_id
     FROM people p
     LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
     LEFT JOIN person_organization_roles por ON por.person_id = p.id
     LEFT JOIN organizations o ON por.organization_id = o.id
     LEFT JOIN campaign_accounts ca ON ca.organization_id = o.id
     LEFT JOIN campaigns c ON ca.campaign_id = c.id
     WHERE p.id::text = $1 OR pcm.normalized_value = $1
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

  // 1. Enrollment Event
  events.push(event(`lead-created-${person.id}`, {
    contactName,
    contactId: String(person.id),
    type: 'profile',
    title: 'Contact enrolled',
    detail: `Added to ${person.campaign_name || 'campaign'} as ${person.designation || 'point of contact'}.`,
    timestamp: new Date().toISOString(),
    actor: 'System',
    channel: 'crm',
  }));

  // 2. Query Messages (Inbound & Outbound) from PostgreSQL
  const msgRes = await db.query(
    `SELECT m.id, m.direction, m.subject, m.body, m.delivery_state, m.occurred_at
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN conversation_participants cp ON cp.conversation_id = conv.id
     LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
     WHERE pcm.person_id = $1::uuid OR pcm.normalized_value = $2
     ORDER BY m.occurred_at DESC`,
    [person.id, person.email || '']
  );

  msgRes.rows.forEach((m) => {
    const isOut = m.direction === 'outbound';
    const evt = event(`msg-${m.id}`, {
      contactName,
      contactId: String(person.id),
      type: isOut ? 'email_outbound' : 'email_inbound',
      title: m.subject ? `${isOut ? 'Sent' : 'Reply'}: ${m.subject}` : `${isOut ? 'Outbound' : 'Inbound'} email`,
      detail: (m.body || '').slice(0, 500) || 'Email message.',
      timestamp: m.occurred_at,
      actor: isOut ? 'Sequence' : contactName,
      channel: 'email',
      meta: { subject: m.subject, body: m.body, direction: m.direction },
    });
    if (evt) events.push(evt);
  });

  // 3. Query Tasks from PostgreSQL
  try {
    const taskRes = await db.query(
      `SELECT id, title, description, status, priority, due_at, completed_at, created_at
       FROM tasks
       ORDER BY created_at DESC LIMIT 100`
    );
    taskRes.rows.forEach((t) => {
      const evt = event(`task-${t.id}`, {
        contactName,
        contactId: String(person.id),
        type: 'task',
        title: t.status === 'completed' ? `Task completed: ${t.title}` : `Follow-up: ${t.title}`,
        detail: t.description || '',
        timestamp: t.completed_at || t.due_at || t.created_at,
        actor: 'Team',
        channel: 'task',
        meta: { priority: t.priority, status: t.status },
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
      campaignName: person.campaign_name || 'Campaign',
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
    `SELECT p.id, p.display_name, por.title AS designation, pcm.normalized_value AS email
     FROM person_organization_roles por
     JOIN people p ON por.person_id = p.id
     LEFT JOIN person_contact_methods pcm ON pcm.person_id = p.id AND pcm.type = 'email'
     WHERE por.organization_id = $1::uuid`,
    [company.id]
  );

  const people = pRes.rows;
  const events = [];

  // Query messages for company
  const msgRes = await db.query(
    `SELECT m.id, m.direction, m.subject, m.body, m.occurred_at, p.display_name AS person_name
     FROM messages m
     JOIN conversations conv ON m.conversation_id = conv.id
     LEFT JOIN conversation_participants cp ON cp.conversation_id = conv.id
     LEFT JOIN person_contact_methods pcm ON cp.person_contact_method_id = pcm.id
     LEFT JOIN person_organization_roles por ON por.person_id = pcm.person_id
     LEFT JOIN people p ON pcm.person_id = p.id
     WHERE por.organization_id = $1::uuid
     ORDER BY m.occurred_at DESC LIMIT 100`,
    [company.id]
  );

  msgRes.rows.forEach((m) => {
    const isOut = m.direction === 'outbound';
    const evt = event(`msg-${m.id}`, {
      contactName: m.person_name || 'Contact',
      contactId: String(company.id),
      type: isOut ? 'email_outbound' : 'email_inbound',
      title: m.subject ? `${isOut ? 'Sent' : 'Reply'}: ${m.subject}` : `${isOut ? 'Outbound' : 'Inbound'} email`,
      detail: (m.body || '').slice(0, 500) || 'Email message.',
      timestamp: m.occurred_at,
      actor: isOut ? 'Sequence' : (m.person_name || 'Contact'),
      channel: 'email',
    });
    if (evt) events.push(evt);
  });

  // Query manual interactions
  try {
    const manualInteractions = await listInteractionsForCompany(company.id);
    manualInteractions.forEach((record) => {
      events.push(manualInteractionToEvent(
        record,
        company.canonical_name,
        []
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
