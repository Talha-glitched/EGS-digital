import { query } from './src/db/index.js';

async function test() {
  try {
    const res = await query(`
      SELECT
        COALESCE(pcm.source, 'Manual') AS "source",
        COUNT(*) FILTER (WHERE sj.status = 'sent')::int AS "sent",
        COUNT(*) FILTER (WHERE sj.status IN ('failed', 'cancelled', 'migration_held'))::int AS "failed",
        COUNT(DISTINCT CASE WHEN (
          sj.status = 'failed' AND (
            sj.error_message ILIKE '%bounce%'
            OR sj.error_message ILIKE '%smtp%'
            OR sj.error_message ILIKE '%suppress%'
            OR sj.error_message = 'Bounced / Invalid'
            OR sj.error_message ILIKE '%mail server%'
            OR sj.error_message ILIKE '%ECONN%'
            OR sj.error_message ILIKE '%ETIMEDOUT%'
          )
        ) OR cc.lead_state = 'Bounced / Invalid' OR EXISTS(SELECT 1 FROM endpoint_suppressions es WHERE LOWER(es.endpoint) = LOWER(sj.recipient_email) AND es.reason = 'bounced') THEN cc.id END)::int AS "bounced",
        COUNT(DISTINCT CASE WHEN m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, FALSE) = FALSE THEN m.id END)::int AS "replied"
      FROM send_jobs sj
      LEFT JOIN sequence_enrollments se ON se.id = sj.enrollment_id
      LEFT JOIN campaign_contacts cc ON cc.id = se.campaign_contact_id
      LEFT JOIN person_organization_roles por ON por.id = cc.role_id
      LEFT JOIN LATERAL (
        SELECT pcm2.source
        FROM person_contact_methods pcm2
        WHERE pcm2.person_id = COALESCE(por.person_id, sj.lead_id::uuid)
        ORDER BY CASE WHEN pcm2.normalized_value = LOWER(sj.recipient_email) THEN 0 ELSE 1 END, pcm2.id
        LIMIT 1
      ) pcm ON TRUE
      LEFT JOIN conversations conv ON conv.campaign_contact_id = cc.id
      LEFT JOIN messages m ON m.conversation_id = conv.id
      GROUP BY COALESCE(pcm.source, 'Manual')
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

test();
