import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { SendJob } from '../models/SendJob.js';

export async function hasLeadReceivedSequenceStep(leadId, sequenceId, stepIndex = 0) {
  if (!leadId || !sequenceId) return false;

  const enrollments = await SequenceEnrollment.find({ leadId, sequenceId }).select('_id').lean();
  if (!enrollments.length) return false;

  const sent = await SendJob.findOne({
    enrollmentId: { $in: enrollments.map((row) => row._id) },
    stepIndex,
    status: 'sent',
  }).select('_id').lean();

  return Boolean(sent);
}

export async function getLeadsWithSentSequenceStep(sequenceId, leadIds = [], stepIndex = 0) {
  if (!sequenceId || !leadIds.length) return new Set();

  const enrollments = await SequenceEnrollment.find({
    sequenceId,
    leadId: { $in: leadIds },
  }).select('_id leadId').lean();

  if (!enrollments.length) return new Set();

  const enrollmentIds = enrollments.map((row) => row._id);
  const sentJobs = await SendJob.find({
    enrollmentId: { $in: enrollmentIds },
    stepIndex,
    status: 'sent',
  }).select('enrollmentId').lean();

  const sentEnrollmentIds = new Set(sentJobs.map((row) => String(row.enrollmentId)));
  const sentLeadIds = new Set();

  for (const enrollment of enrollments) {
    if (sentEnrollmentIds.has(String(enrollment._id))) {
      sentLeadIds.add(String(enrollment.leadId));
    }
  }

  return sentLeadIds;
}

export async function getLeadsWithOpenSequenceStepJobs(sequenceId, leadIds = [], stepIndex = 0) {
  if (!sequenceId || !leadIds.length) return new Set();

  const enrollments = await SequenceEnrollment.find({
    sequenceId,
    leadId: { $in: leadIds },
  }).select('_id leadId').lean();

  if (!enrollments.length) return new Set();

  const openJobs = await SendJob.find({
    enrollmentId: { $in: enrollments.map((row) => row._id) },
    stepIndex,
    status: { $in: ['pending', 'processing', 'failed'] },
  }).select('enrollmentId').lean();

  const openEnrollmentIds = new Set(openJobs.map((row) => String(row.enrollmentId)));
  const openLeadIds = new Set();

  for (const enrollment of enrollments) {
    if (openEnrollmentIds.has(String(enrollment._id))) {
      openLeadIds.add(String(enrollment.leadId));
    }
  }

  return openLeadIds;
}
