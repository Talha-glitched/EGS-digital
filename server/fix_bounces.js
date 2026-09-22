import { query } from './src/db/index.js';

async function fixData() {
  try {
    const res = await query(`
      UPDATE campaign_contacts cc
      SET lead_state = 'Bounced / Invalid'
      FROM person_organization_roles por
      JOIN person_contact_methods pcm ON pcm.person_id = por.person_id
      JOIN endpoint_suppressions es ON LOWER(es.endpoint) = LOWER(pcm.normalized_value)
      WHERE por.id = cc.role_id
        AND es.reason = 'bounced'
        AND COALESCE(cc.lead_state, '') != 'Bounced / Invalid';
    `);
    console.log(`Updated ${res.rowCount} contacts to Bounced / Invalid.`);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

fixData();
