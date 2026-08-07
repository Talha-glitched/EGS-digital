import mongoose from 'mongoose';

// Ordered by each stage's own `probability` (the pipeline's real progression signal,
// already authoritative for forecasting) so the default board reads as one continuous
// sequence instead of the array order someone happened to type. `Job Lost` is pinned
// last as the terminal exit branch rather than sorting to the front at probability 0.
export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Inquiry', probability: 10 },
  { name: 'Design', probability: 25 },
  { name: 'Quotation Sent', probability: 40 },
  { name: 'Waiting Adv/ PO', probability: 50 },
  { name: 'In Production', probability: 70 },
  { name: 'Installation', probability: 80 },
  { name: 'Ready', probability: 85 },
  { name: 'Waiting Balance Payment', probability: 90 },
  { name: 'Job Done', probability: 100 },
  { name: 'Job Lost', probability: 0 },
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
