import db from '../src/db/index.js';
import {
  createSequence,
  launchSequence,
  listLaunchBatches,
  previewAudience,
  updateSequence,
} from '../src/services/sequenceService.js';

try {
  const before = await db.query(`SELECT (SELECT COUNT(*) FROM sequence_launches)::int AS launches,(SELECT COUNT(*) FROM sequence_enrollments)::int AS enrollments,(SELECT COUNT(*) FROM send_jobs)::int AS jobs`);
  console.log('stage: baseline');
  const draft = await createSequence({
    name: 'Rollback sequence engine verification',
    steps: [{ dayDelay: 0, delayUnit: 'days', subjectTemplate: 'Hello {{first_name}}', bodyTemplate: 'Hello {{first_name}} at {{company_name}}' }],
    transactionOptions: { rollbackOnly: true },
  });
  if (!draft._id || draft.steps.length !== 1) throw new Error('Draft/version rollback contract failed.');
  console.log('stage: draft rollback');

  const sequence = await db.query(`SELECT s.id FROM sequences s WHERE EXISTS(SELECT 1 FROM sequence_versions sv JOIN sequence_steps step ON step.sequence_version_id=sv.id WHERE sv.sequence_id=s.id) ORDER BY s.updated_at DESC LIMIT 1`);
  const campaigns = await db.query(`SELECT DISTINCT ca.campaign_id FROM campaign_accounts ca JOIN campaign_contacts cc ON cc.campaign_account_id=ca.id WHERE COALESCE(cc.outreach_focus_state,'pending') IN('pending','active_manual') LIMIT 30`);
  if (!sequence.rows.length || !campaigns.rows.length) throw new Error('No sequence/campaign context is available for verification.');
  const revised = await updateSequence(sequence.rows[0].id, { transactionOptions: { rollbackOnly: true } });
  if (!revised._id || !revised.version) throw new Error('Existing-sequence version rollback contract failed.');
  console.log('stage: revision rollback');
  let row = null;
  let preview = null;
  for (const campaign of campaigns.rows) {
    const candidate = await previewAudience(campaign.campaign_id, { sequenceId: sequence.rows[0].id, full: true });
    if (candidate.netNew > 0) { row = { sequence_id: sequence.rows[0].id, campaign_id: campaign.campaign_id }; preview = candidate; break; }
  }
  if (!row) throw new Error('No safe net-new campaign contact is available for rollback launch verification.');
  if (!(preview.netNew > 0) || !preview.contacts.some((contact) => contact.netNew)) throw new Error('Audience eligibility preview did not find the verified net-new contact.');
  console.log('stage: audience preview');
  const launch = await launchSequence(row.sequence_id, {
    projectId: row.campaign_id,
    includeLeadIds: [preview.contacts.find((contact) => contact.netNew).leadId],
    confirmEnrollment: true,
    transactionOptions: { rollbackOnly: true },
  });
  if (!launch.dryRun || !(launch.enrolled > 0) || !launch.launchBatchId) throw new Error('Launch/enrollment/send-job rollback contract failed.');
  console.log('stage: launch rollback');
  const batches = await listLaunchBatches({ page: 1, limit: 5 });
  if (!Array.isArray(batches.items)) throw new Error('Outbox launch-batch read model is invalid.');
  const after = await db.query(`SELECT (SELECT COUNT(*) FROM sequence_launches)::int AS launches,(SELECT COUNT(*) FROM sequence_enrollments)::int AS enrollments,(SELECT COUNT(*) FROM send_jobs)::int AS jobs`);
  if (JSON.stringify(before.rows[0]) !== JSON.stringify(after.rows[0])) throw new Error('Rollback verification left launch data behind.');
  console.log(JSON.stringify({ ok: true, draftVersion: 'rolled back', audiencePreview: preview.netNew, launch: 'rolled back', outboxReadModel: 'valid', persistentCounts: after.rows[0] }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.getPool().end();
}
