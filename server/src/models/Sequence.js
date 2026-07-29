import mongoose from 'mongoose';

const sequenceStepSchema = new mongoose.Schema(
  {
    stepOrder: { type: Number, required: true },
    dayDelay: { type: Number, default: 0 },
    delayUnit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'days' },
    subjectTemplate: { type: String, default: '' },
    bodyTemplate: { type: String, default: '' },
    useAiPersonalization: { type: Boolean, default: true },
    aiPrompt: { type: String, default: '' },
  },
  { _id: true }
);

const flowNodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['start', 'email', 'wait', 'condition'], required: true },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const flowEdgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    branch: { type: String, enum: ['default', 'true', 'false'], default: 'default' },
  },
  { _id: false },
);

const flowGraphSchema = new mongoose.Schema(
  {
    nodes: [flowNodeSchema],
    edges: [flowEdgeSchema],
  },
  { _id: false },
);

const audienceSchema = new mongoose.Schema(
  {
    importedCampaignIds: [{ type: String }],
    campaignSelections: { type: mongoose.Schema.Types.Mixed, default: {} },
    includeCompanyIds: [{ type: String }],
    includeContactIds: [{ type: String }],
    excludeCompanyIds: [{ type: String }],
    excludeContactIds: [{ type: String }],
  },
  { _id: false },
);

const sequenceSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    name: { type: String, required: true, trim: true },
    steps: [sequenceStepSchema],
    flowGraph: { type: flowGraphSchema, default: null },
    audience: { type: audienceSchema, default: () => ({}) },
    isActive: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const Sequence = mongoose.models.Sequence || mongoose.model('Sequence', sequenceSchema);
