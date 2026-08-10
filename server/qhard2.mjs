import db from './src/db/index.js';
// broaden: any contact lacking a usable email, or suppressed endpoint
const r = await db.query(`
  SELECT ca.campaign_id::text AS cid, COUNT(*) AS n
  FROM campaign_contacts cc
  JOIN campaign_accounts ca ON ca.id=cc.campaign_account_id
  JOIN organizations o ON o.id=ca.organization_id AND o.archived_at IS NULL
  JOIN person_organization_roles por ON por.id=cc.role_id
  JOIN people p ON p.id=por.person_id AND p.archived_at IS NULL
  LEFT JOIN LATERAL(SELECT normalized_value FROM person_contact_methods WHERE person_id=p.id AND type='email' AND COALESCE(validity,'valid')<>'invalid' ORDER BY preferred DESC NULLS LAST, created_at LIMIT 1) email ON TRUE
  LEFT JOIN LATERAL(SELECT endpoint FROM endpoint_suppressions WHERE LOWER(endpoint)=LOWER(email.normalized_value) LIMIT 1) sup ON TRUE
  WHERE email.normalized_value IS NULL OR sup.endpoint IS NOT NULL OR COALESCE(cc.delivery_state,'') IN ('Bounced / Invalid','Opted Out')
  GROUP BY 1 ORDER BY n DESC LIMIT 3`);
console.log(JSON.stringify(r.rows));
const s = await db.query(`SELECT COUNT(*) FROM endpoint_suppressions`);
console.log('suppressions total:', s.rows[0].count);
process.exit(0);
