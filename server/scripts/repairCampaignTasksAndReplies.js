import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { default: db } = await import('../src/db/index.js');
const { classifyInboundEmail } = await import('../src/utils/inboundEmailClassifier.js');

async function main() {
  console.log('[Repair] Starting campaign tasks & replies repair...');

  // 1. Re-classify inbound messages
  const inboundMsgs = await db.query(`
    SELECT m.id, m.conversation_id, m.subject, m.body, m.suggested_intent,
           c.campaign_id, c.campaign_contact_id
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.direction = 'inbound' AND COALESCE(m.is_migration_duplicate, false) = false
  `);

  let oooCount = 0;
  let updatedMsgCount = 0;

  for (const row of inboundMsgs.rows) {
    const { intent } = classifyInboundEmail(row.subject || '', row.body || '');
    if (intent !== row.suggested_intent) {
      await db.query(
        `UPDATE messages SET suggested_intent = $1 WHERE id = $2::uuid`,
        [intent, row.id]
      );
      updatedMsgCount++;
    }
    if (intent === 'OOO') {
      oooCount++;
      if (row.campaign_contact_id) {
        await db.query(
          `UPDATE campaign_contacts SET lead_state = 'Out of Office', outcome = 'Out of Office' WHERE id = $1::uuid`,
          [row.campaign_contact_id]
        );
      }
      // Update review_items
      await db.query(
        `UPDATE review_items SET suggested_outcome = 'Out of Office' WHERE source_message_id = $1::uuid`,
        [row.id]
      );
    }
  }

  console.log(`[Repair] Inbound messages scanned: ${inboundMsgs.rows.length}, OOO identified: ${oooCount}, updated messages: ${updatedMsgCount}`);

  // 2. Repair tasks campaign_id and titles for reply_review tasks
  const repairTasks = await db.query(`
    UPDATE tasks t
    SET campaign_id = COALESCE(t.campaign_id, c.campaign_id, ca.campaign_id)
    FROM review_items ri
    JOIN messages m ON m.id = ri.source_message_id
    JOIN conversations c ON c.id = m.conversation_id
    LEFT JOIN campaign_contacts cc ON cc.id = c.campaign_contact_id
    LEFT JOIN campaign_accounts ca ON ca.id = cc.campaign_account_id
    WHERE t.review_item_id = ri.id AND t.campaign_id IS NULL
  `);

  console.log(`[Repair] Linked campaign_id on ${repairTasks.rowCount} reply review tasks.`);

  // 3. Update titles for OOO tasks
  const oooTaskTitles = await db.query(`
    UPDATE tasks t
    SET title = REPLACE(t.title, 'Review Reply from', 'Auto-reply / Out of Office:')
    FROM review_items ri
    JOIN messages m ON m.id = ri.source_message_id
    WHERE t.review_item_id = ri.id
      AND (m.suggested_intent = 'OOO' OR ri.suggested_outcome = 'Out of Office')
      AND t.title NOT LIKE 'Auto-reply%'
  `);

  console.log(`[Repair] Updated titles on ${oooTaskTitles.rowCount} OOO tasks.`);
  console.log('[Repair] Complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Repair] Error:', err);
  process.exit(1);
});
