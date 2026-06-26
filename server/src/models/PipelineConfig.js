import mongoose from 'mongoose';

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead', probability: 10 },
  { name: 'Contacted', probability: 20 },
  { name: 'Qualified', probability: 35 },
  { name: 'Discovery / Site Visit', probability: 45 },
  { name: 'Brief Received', probability: 50 },
  { name: 'Estimate In Progress', probability: 60 },
  { name: 'Proposal Sent', probability: 65 },
  { name: 'Decision Maker Review', probability: 70 },
  { name: 'Negotiation', probability: 80 },
  { name: 'Contract Sent', probability: 90 },
  { name: 'Closed Won', probability: 100 },
  { name: 'Closed Lost', probability: 0 },
];

const stageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    probability: { type: Number, default: 10, min: 0, max: 100 },
  },
  { _id: false },
);

const pipelineConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'sales', unique: true, index: true },
    stages: { type: [stageSchema], default: () => DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s })) },
    updatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true, versionKey: false },
);

export const PipelineConfig =
  mongoose.models.PipelineConfig || mongoose.model('PipelineConfig', pipelineConfigSchema);
