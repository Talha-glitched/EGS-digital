import db from '../src/db/index.js';
import { normalizeTimelineText } from '../src/services/contactTimelineService.js';

async function main() {
  await db.query('BEGIN READ ONLY');
  try {
    const [messages, interactions, tasks, coverage, timelineRisks] = await Promise.all([
      db.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE body IS NULL OR BTRIM(body) = '')::int AS blank_body,
               COUNT(*) FILTER (WHERE body ~ '<[a-zA-Z][^>]*>')::int AS html_in_body,
               COUNT(*) FILTER (WHERE body LIKE '%&nbsp;%' OR body LIKE '%&amp;%' OR body LIKE '%&#%')::int AS html_entities,
               COUNT(*) FILTER (WHERE body LIKE '%[object Object]%'
                                OR body LIKE '%"$oid"%'
                                OR body LIKE '%"$numberLong"%'
                                OR body LIKE '%"$date"%')::int AS bson_or_object,
               COUNT(*) FILTER (WHERE STRPOS(body, CHR(92) || 'n') > 0)::int AS literal_newlines,
               COUNT(*) FILTER (WHERE LENGTH(body) > 10000)::int AS over_10k,
               COUNT(*) FILTER (WHERE subject LIKE '%[object Object]%'
                                OR subject LIKE '%"$oid"%')::int AS bad_subject,
               COUNT(*) FILTER (WHERE html_body IS NOT NULL AND BTRIM(html_body) <> '')::int AS has_html_body
        FROM messages
        WHERE COALESCE(is_migration_duplicate, FALSE) = FALSE
      `),
      db.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE notes IS NULL OR BTRIM(notes) = '')::int AS blank_notes,
               COUNT(*) FILTER (WHERE notes LIKE '%[object Object]%'
                                OR notes LIKE '%"$oid"%'
                                OR notes LIKE '%"$numberLong"%')::int AS object_text,
               COUNT(*) FILTER (WHERE notes ~ '<[a-zA-Z][^>]*>')::int AS html_notes
        FROM interactions
        WHERE deleted_at IS NULL
      `),
      db.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE description LIKE '%[object Object]%'
                                OR description LIKE '%"$oid"%'
                                OR description LIKE '%"$numberLong"%')::int AS object_text,
               COUNT(*) FILTER (WHERE description ~ '<[a-zA-Z][^>]*>')::int AS html_description
        FROM tasks
        WHERE deleted_at IS NULL
      `),
      db.query(`
        SELECT
          (SELECT COUNT(DISTINCT p.id)::int
           FROM people p
           WHERE EXISTS (
             SELECT 1
             FROM conversations conversation
             LEFT JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
             LEFT JOIN person_organization_roles campaign_role ON campaign_role.id = campaign_contact.role_id
             WHERE campaign_role.person_id = p.id
                OR EXISTS (
                  SELECT 1
                  FROM conversation_participants participant
                  JOIN person_contact_methods method ON method.id = participant.person_contact_method_id
                  WHERE participant.conversation_id = conversation.id AND method.person_id = p.id
                )
           )) AS contacts_with_messages,
          (SELECT COUNT(DISTINCT organization.id)::int
           FROM organizations organization
           WHERE EXISTS (
             SELECT 1
             FROM conversations conversation
             JOIN campaign_contacts campaign_contact ON campaign_contact.id = conversation.campaign_contact_id
             JOIN campaign_accounts campaign_account ON campaign_account.id = campaign_contact.campaign_account_id
             WHERE campaign_account.organization_id = organization.id
           )) AS companies_with_campaign_messages,
          (SELECT COUNT(DISTINCT organization.id)::int
           FROM organizations organization
           WHERE EXISTS (
             SELECT 1
             FROM person_organization_roles role
             JOIN person_contact_methods method ON method.person_id = role.person_id
             JOIN conversation_participants participant ON participant.person_contact_method_id = method.id
             WHERE role.organization_id = organization.id
           )) AS companies_with_person_messages
      `),
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM people WHERE archived_at IS NULL) AS active_contacts,
          (SELECT COUNT(*)::int FROM organizations WHERE archived_at IS NULL) AS active_companies,
          (SELECT COUNT(*)::int FROM conversations WHERE campaign_contact_id IS NULL) AS conversations_without_campaign_contact,
          (SELECT COUNT(*)::int FROM conversations WHERE campaign_id IS NULL) AS conversations_without_campaign,
          (SELECT COUNT(*)::int FROM messages WHERE occurred_at IS NULL) AS messages_without_timestamp,
          (SELECT COUNT(*)::int FROM interactions WHERE occurred_at IS NULL AND deleted_at IS NULL) AS interactions_without_timestamp
      `),
    ]);

    const textRows = await db.query(`
      SELECT 'message_body' AS kind, body AS value FROM messages WHERE COALESCE(is_migration_duplicate, FALSE) = FALSE
      UNION ALL SELECT 'message_subject', subject FROM messages WHERE COALESCE(is_migration_duplicate, FALSE) = FALSE
      UNION ALL SELECT 'interaction_notes', notes FROM interactions WHERE deleted_at IS NULL
      UNION ALL SELECT 'task_description', description FROM tasks WHERE deleted_at IS NULL
    `);
    const normalizedQuality = textRows.rows.reduce((summary, row) => {
      const normalized = normalizeTimelineText(row.value);
      summary.scanned += 1;
      if (!normalized) summary.blankAfterNormalization += 1;
      if (/<(?:html|body|div|p|br|span|table|tr|td|a|strong|em|ul|ol|li)\b/i.test(normalized)) summary.htmlAfterNormalization += 1;
      if (/\[object Object\]|"\$(?:oid|numberLong|date)"/.test(normalized)) summary.objectTextAfterNormalization += 1;
      if (/(?:Ã.|Â.|â[\u0080-\u00BF]|ð[\u0080-\u00BF])/.test(normalized)) summary.mojibakeAfterNormalization += 1;
      return summary;
    }, {
      scanned: 0,
      blankAfterNormalization: 0,
      htmlAfterNormalization: 0,
      objectTextAfterNormalization: 0,
      mojibakeAfterNormalization: 0,
    });

    console.log(JSON.stringify({
      mode: 'PostgreSQL transaction READ ONLY; aggregate timeline text metadata only',
      messages: messages.rows[0],
      interactions: interactions.rows[0],
      tasks: tasks.rows[0],
      coverage: coverage.rows[0],
      timelineRisks: timelineRisks.rows[0],
      normalizedQuality,
    }, null, 2));
  } finally {
    await db.query('ROLLBACK');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
