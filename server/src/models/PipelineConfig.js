import mongoose from 'mongoose';

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Inquiry', probability: 10 },
  { name: 'Waiting Adv/ PO', probability: 50 },
  { name: 'In Production', probability: 70 },
  { name: 'Installation', probability: 80 },
  { name: 'Waiting Balance Payment', probability: 90 },
  { name: 'Job Done', probability: 100 },
  { name: 'Quotation Sent', probability: 40 },
  { name: 'Job Lost', probability: 0 },
  { name: 'Design', probability: 25 },
  { name: 'Ready', probability: 85 },
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
