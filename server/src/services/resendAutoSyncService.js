import db from '../db/index.js';
import { ensureReplyReviewTask } from './replyReviewTaskService.js';

let cronInterval = null;

function parseEmailAndName(rawFrom = '') {
  const match = String(rawFrom).match(/^(?:"?([^"]*)"?\s)?<([^>]+)>$/) || String(rawFrom).match(/<([^>]+)>/);
  let name = '';
  let email = '';

  if (match) {
    name = (match[1] || '').trim();
    email = (match[2] || match[0]).replace(/[<>]/g, '').trim().toLowerCase();
  } else {
    email = String(rawFrom).trim().toLowerCase();
  }

  if (!name && email) {
    const localPart = email.split('@')[0] || '';
    name = localPart
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return { name: name || 'Contact', email };
}

export function classifyInboundEmail(subject = '', text = '') {
  const combined = `${subject} ${text}`.toLowerCase();

  const isOOO = /automatic reply|automatische antwort|automatinis atsakymas|réponse automatique|otomatik yanıt|自动答复|out of office|out-of-office|auto-reply|autoresponder|on vacation|abwesend|off line|away from my desk/i.test(subject) ||
    /i am currently out of office|i am away from the office|automatic reply:|automatische antwort:|i will return on|i will be out of office/i.test(combined);

  if (isOOO) {
    return { status: 'Out of Office', intent: 'OOO' };
  }

  const isOptOut = /unsubscribe|stop emailing|remove me|opt out|please remove|do not contact/i.test(combined);
  if (isOptOut) {
    return { status: 'Opted Out', intent: 'Opt Out' };
  }

  return { status: 'Replied', intent: 'Neutral' };
}

export async function syncAllResendReplies() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'RESEND_API_KEY not configured.' };
  }

  try {
    let inboundFetched = 0;
    let outboundFetched = 0;
    let leadsCreated = 0;
    let leadsUpdated = 0;
    let repliesLogged = 0;
    let emailsStored = 0;

    // 1. Sync Inbound Emails from Resend Receiving API
    const receivingRes = await fetch('https://api.resend.com/emails/receiving?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (receivingRes.ok) {
      const body = await receivingRes.json();
      const items = Array.isArray(body.data) ? body.data : [];
      inboundFetched = items.length;

      for (const item of items) {
        const { name, email } = parseEmailAndName(item.from);
        if (!email) continue;

        let bodyText = (item.text || item.html || '').trim();
        if (!bodyText && item.id) {
          try {
            const detailRes = await fetch(`https://api.resend.com/emails/receiving/${item.id}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (detailRes.ok) {
              const detailJson = await detailRes.json();
              bodyText = (detailJson.text || detailJson.html || '').trim();
            }
          } catch (dErr) {
            console.warn(`[ResendAutoSync] Detail fetch failed for ${item.id}:`, dErr.message);
          }
        }

        const { status: targetStatus, intent } = classifyInboundEmail(item.subject || '', bodyText || item.subject || '');
        const domain = email.split('@')[1] || '';

        // Query person in PostgreSQL by email
        let pRes = await db.query(
          `SELECT p.id, p.display_name, por.organization_id, cc.id AS campaign_contact_id
           FROM person_contact_methods pcm
           JOIN people p ON pcm.person_id = p.id
           LEFT JOIN person_organization_roles por ON por.person_id = p.id
           LEFT JOIN campaign_contacts cc ON cc.role_id = por.id
           WHERE pcm.normalized_value = $1 AND pcm.type = 'email'
           LIMIT 1`,
          [email]
        );

        let personId = null;
        let campaignContactId = null;

        if (pRes.rows.length === 0) {
          // Insert person in PostgreSQL
          const insP = await db.query(
            `INSERT INTO people (display_name) VALUES ($1) RETURNING id`,
            [name]
          );
          personId = insP.rows[0].id;

          await db.query(
            `INSERT INTO person_contact_methods (person_id, type, original_value, normalized_value, preferred)
             VALUES ($1::uuid, 'email', $2, $3, true)
             ON CONFLICT DO NOTHING`,
            [personId, email, email]
          );
          leadsCreated += 1;
        } else {
          personId = pRes.rows[0].id;
          campaignContactId = pRes.rows[0].campaign_contact_id;
          leadsUpdated += 1;
        }

        // Update campaign contact lead_state
        if (campaignContactId) {
          await db.query(
            `UPDATE campaign_contacts SET lead_state = $1 WHERE id = $2::uuid`,
            [targetStatus, campaignContactId]
          );
        }

        const msgId = item.message_id || item.id;
        const receivedDate = item.created_at ? new Date(item.created_at) : new Date();

        // Check existing message in PostgreSQL
        const existMsg = await db.query(
          `SELECT id FROM messages WHERE external_message_id = $1 LIMIT 1`,
          [msgId]
        );

        if (!existMsg.rows.length) {
          // Create conversation & message entry
          const convRes = await db.query(
            `INSERT INTO conversations (channel, external_thread_id, subject)
             VALUES ('email', $1, $2) RETURNING id`,
            [msgId, item.subject || 'Inbound Email']
          );
          const convId = convRes.rows[0].id;

          await db.query(
            `INSERT INTO messages (conversation_id, direction, channel, external_message_id, subject, body, delivery_state, occurred_at)
             VALUES ($1::uuid, 'inbound', 'email', $2, $3, $4, 'received', $5)`,
            [convId, msgId, item.subject || 'Inbound Email', bodyText || item.subject || '', receivedDate]
          );

          emailsStored += 1;
          repliesLogged += 1;

          await ensureReplyReviewTask(
            { id: convId, conversation_id: convId, intent, subject: item.subject, text: bodyText },
            { id: personId, display_name: name, email }
          );
        }
      }
    }

    // 2. Sync Outbound Emails from Resend Outbound API
    const outboundRes = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (outboundRes.ok) {
      const outboundJson = await outboundRes.json();
      const outboundItems = Array.isArray(outboundJson.data) ? outboundJson.data : [];
      outboundFetched = outboundItems.length;

      for (const item of outboundItems) {
        if (!item.id) continue;
        const existOutbound = await db.query(
          `SELECT id FROM messages WHERE external_message_id = $1 LIMIT 1`,
          [item.id]
        );
        if (existOutbound.rows.length > 0) continue;

        const convRes = await db.query(
          `INSERT INTO conversations (channel, external_thread_id, subject)
           VALUES ('email', $1, $2) RETURNING id`,
          [item.id, item.subject || 'Outbound Email']
        );
        const convId = convRes.rows[0].id;

        await db.query(
          `INSERT INTO messages (conversation_id, direction, channel, external_message_id, subject, body, delivery_state, occurred_at)
           VALUES ($1::uuid, 'outbound', 'email', $2, $3, $4, $5, $6)`,
          [convId, item.id, item.subject || '', item.text || item.html || '', item.last_event || 'sent', item.created_at ? new Date(item.created_at) : new Date()]
        );
        emailsStored += 1;
      }
    }

    const stats = {
      success: true,
      inboundFetched,
      outboundFetched,
      leadsCreated,
      leadsUpdated,
      repliesLogged,
      emailsStored,
      timestamp: new Date().toISOString(),
    };

    if (leadsCreated > 0 || leadsUpdated > 0 || repliesLogged > 0 || emailsStored > 0) {
      console.info('[ResendAutoSync] Sync complete:', stats);
    }

    return stats;
  } catch (err) {
    console.error('[ResendAutoSync] Error during Resend auto-sync:', err);
    return { success: false, error: err.message };
  }
}

export function startResendAutoSyncCron(intervalMs = 5 * 60 * 1000) {
  if (cronInterval) return;

  syncAllResendReplies().catch((err) => {
    console.error('[ResendAutoSync] Initial sync error:', err.message);
  });

  cronInterval = setInterval(() => {
    syncAllResendReplies().catch((err) => {
      console.error('[ResendAutoSync] Periodic sync error:', err.message);
    });
  }, intervalMs);

  console.info(`[ResendAutoSync] Background email & reply sync started (every ${Math.round(intervalMs / 60000)}m).`);
}

export function stopResendAutoSyncCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}
