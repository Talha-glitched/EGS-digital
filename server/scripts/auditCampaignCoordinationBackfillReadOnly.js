import db from '../src/db/index.js';

try {
  const result = await db.query(`
    WITH latest_responder AS (
      SELECT DISTINCT ON (cc.campaign_account_id)
             cc.campaign_account_id,cc.id AS responder_contact_id,m.id AS source_message_id,m.occurred_at
      FROM messages m JOIN conversations c ON c.id=m.conversation_id
      JOIN campaign_contacts cc ON cc.id=c.campaign_contact_id
      WHERE m.direction='inbound' AND COALESCE(m.is_migration_duplicate,FALSE)=FALSE
      ORDER BY cc.campaign_account_id,m.occurred_at DESC,m.id DESC
    )
    SELECT COUNT(*)::int AS replied_accounts,
           COUNT(*) FILTER(WHERE responder.outreach_focus_state NOT IN('active_reply','active_referral','active_manual'))::int AS responders_needing_focus,
           COUNT(sibling.id) FILTER(WHERE sibling.id<>latest_responder.responder_contact_id AND sibling.outreach_focus_state IN('pending','responded'))::int AS siblings_needing_hold,
           COUNT(DISTINCT enrollment.id) FILTER(WHERE enrollment.execution_state IN('active','processing'))::int AS live_enrollments_needing_hold
    FROM latest_responder
    JOIN campaign_contacts responder ON responder.id=latest_responder.responder_contact_id
    LEFT JOIN campaign_contacts sibling ON sibling.campaign_account_id=latest_responder.campaign_account_id
    LEFT JOIN sequence_enrollments enrollment ON enrollment.campaign_contact_id=sibling.id
  `);
  console.log(JSON.stringify(result.rows[0]));
} finally {
  await db.getPool().end();
}
