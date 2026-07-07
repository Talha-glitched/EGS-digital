import mongoose from 'mongoose';
import { DEFAULT_PIPELINE_STAGES } from './PipelineConfig.js';

export const OPPORTUNITY_STAGES = DEFAULT_PIPELINE_STAGES.map((stage) => stage.name);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    field: { type: String, default: '', trim: true },
    from: { type: mongoose.Schema.Types.Mixed, default: null },
    to: { type: mongoose.Schema.Types.Mixed, default: null },
    by: { type: String, default: 'admin', trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const opportunitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    primaryLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    stakeholderLeadIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }], default: [], index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    owner: { type: String, default: 'admin', trim: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    collaborators: [{ type: String, trim: true }],
    collaboratorUserIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [], index: true },
    stage: { type: String, default: 'New Lead', trim: true, index: true },
    valueAed: { type: Number, default: 0, min: 0 },
    probability: { type: Number, default: 10, min: 0, max: 100 },
    expectedCloseDate: { type: Date, default: null, index: true },
    nextAction: { type: String, default: '', trim: true },
    nextActionDueAt: { type: Date, default: null, index: true },
    services: [{ type: String, trim: true }],
    eventName: { type: String, default: '', trim: true },
    eventDate: { type: Date, default: null },
    boothNumber: { type: String, default: '', trim: true },
    standSizeSqm: { type: Number, default: null, min: 0 },
    budgetBand: { type: String, default: '', trim: true },
    proposalDeadline: { type: Date, default: null },
    lostReason: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    closedAt: { type: Date, default: null },
    lastModifiedBy: { type: String, default: '', trim: true },
    activityLog: { type: [activitySchema], default: [] },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

opportunitySchema.index({ stage: 1, expectedCloseDate: 1 });

export const Opportunity =
  mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema);
