import db from '../db/index.js';

export async function convertOpenTasksToRelationshipFollowUps(leadId, companyId, contactName, actorName = 'admin') {
  if (!leadId) return { convertedTasks: 0, updatedReplies: 0 };

  try {
    const res = await db.query(
      `UPDATE tasks SET type = 'relationship_follow_up', task_type = 'relationship_follow_up', title = 'Follow up with ' || $1 || ' about their reply'
       WHERE (lead_id = $2::uuid OR description LIKE '%' || $2 || '%' OR title LIKE '%' || $2 || '%')
         AND (status = 'Open' OR status = 'pending')
         AND (type IN ('lead_follow_up', 'reply_review') OR task_type IN ('lead_follow_up', 'reply_review'))`,
      [contactName || 'contact', String(leadId)]
    );
    return { convertedTasks: res.rowCount || 0, updatedReplies: 0 };
  } catch (err) {
    console.error('Error converting open tasks to relationship followups in SQL:', err.message);
    return { convertedTasks: 0, updatedReplies: 0 };
  }
}
