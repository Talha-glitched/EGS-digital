import mongoose from 'mongoose';
import { Sequence } from '../models/Sequence.js';
import { SequenceEnrollment } from '../models/SequenceEnrollment.js';
import { Lead } from '../models/Lead.js';
import { ProjectCampaign } from '../models/ProjectCampaign.js';
import { scheduleEnrollmentJob, cancelLeadJobs } from './sendWorker.js';

export async function listSequences(projectId) {
  return Sequence.find({ campaignId: projectId }).sort({ createdAt: -1 }).lean();
}

export async function getSequence(id) {
  const seq = await Sequence.findById(id).lean();
  if (!seq) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }
  return seq;
}

export async function createSequence(projectId, payload) {
  const project = await ProjectCampaign.findById(projectId);
  if (!project) {
    const error = new Error('Project not found.');
    error.status = 404;
    throw error;
  }

  const steps = (payload.steps || []).map((step, index) => ({
    stepOrder: index + 1,
    dayDelay: Number(step.dayDelay) || 0,
    subjectTemplate: String(step.subjectTemplate || ''),
    bodyTemplate: String(step.bodyTemplate || ''),
    useAiPersonalization: step.useAiPersonalization !== false,
    aiPrompt: String(step.aiPrompt || ''),
  }));

  return Sequence.create({
    campaignId: projectId,
    name: String(payload.name || 'Outreach Sequence').trim(),
    steps,
    isActive: false,
  });
}

export async function updateSequence(id, payload) {
  const seq = await Sequence.findById(id);
  if (!seq) {
    const error = new Error('Sequence not found.');
    error.status = 404;
    throw error;
  }

  if (payload.name !== undefined) seq.name = String(payload.name).trim();
  if (payload.steps) {
    seq.steps = payload.steps.map((step, index) => ({
      stepOrder: index + 1,
      dayDelay: Number(step.dayDelay) || 0,
      subjectTemplate: String(step.subjectTemplate || ''),
      bodyTemplate: String(step.bodyTemplate || ''),
      useAiPersonalization: step.useAiPersonalization !== false,
      aiPrompt: String(step.aiPrompt || ''),
    }));
  }
  if (payload.isActive !== undefined) seq.isActive = Boolean(payload.isActive);
  await seq.save();
  return seq.toObject();
}

export async function enrollProjectLeads(projectId, sequenceId) {
  const [project, sequence] = await Promise.all([
    ProjectCampaign.findById(projectId),
    Sequence.findById(sequenceId),
  ]);

  if (!project || !sequence) {
    const error = new Error('Project or sequence not found.');
    error.status = 404;
    throw error;
  }

  if (!sequence.steps?.length) {
    const error = new Error('Sequence must have at least one step.');
    error.status = 400;
    throw error;
  }

  const leads = await Lead.find({
    campaignId: projectId,
    deliveryStatus: { $in: ['Pending Inqueue', 'Emailed Outbound'] },
  });

  let enrolled = 0;
  const now = new Date();
  const firstDelay = sequence.steps[0]?.dayDelay || 0;
  const nextSendAt = new Date(now.getTime() + firstDelay * 24 * 60 * 60 * 1000);

  for (const lead of leads) {
    const existing = await SequenceEnrollment.findOne({ leadId: lead._id, sequenceId });
    if (existing) continue;

    const enrollment = await SequenceEnrollment.create({
      leadId: lead._id,
      campaignId: projectId,
      sequenceId,
      currentStepIndex: 0,
      nextSendAt,
      frozen: false,
    });

    await scheduleEnrollmentJob(enrollment);
    enrolled += 1;
  }

  sequence.isActive = true;
  await sequence.save();
  project.status = 'Active Campaigning';
  await project.save();

  return { enrolled, sequenceId, projectId };
}

export async function freezeLeadSequence(leadId, reason = 'reply') {
  const enrollments = await SequenceEnrollment.find({ leadId, frozen: false });
  for (const enrollment of enrollments) {
    enrollment.frozen = true;
    enrollment.completedAt = new Date();
    await enrollment.save();
    await cancelLeadJobs(leadId);
  }

  const lead = await Lead.findById(leadId);
  if (!lead) return null;

  if (reason === 'reply') {
    lead.deliveryStatus = 'Replied';
    lead.repliedAt = new Date();

    const project = await ProjectCampaign.findById(lead.campaignId);
    if (project) {
      const respondedCompanies = await Lead.distinct('companyId', {
        campaignId: lead.campaignId,
        deliveryStatus: 'Replied',
      });
      project.companiesRespondedCount = respondedCompanies.length;
      await project.save();
    }
  } else if (reason === 'bounce') {
    lead.deliveryStatus = 'Bounced / Invalid';
  } else if (reason === 'opt_out') {
    lead.deliveryStatus = 'Opted Out';
  }

  await lead.save();
  return lead.toObject();
}

export async function purgeLeadFromQueue(leadId) {
  await cancelLeadJobs(leadId);
  await SequenceEnrollment.updateMany({ leadId }, { $set: { frozen: true, completedAt: new Date() } });
}
