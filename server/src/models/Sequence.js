import mongoose from 'mongoose';

const sequenceStepSchema = new mongoose.Schema(
  {
    stepOrder: { type: Number, required: true },
    dayDelay: { type: Number, default: 0 },
    subjectTemplate: { type: String, default: '' },
    bodyTemplate: { type: String, default: '' },
    useAiPersonalization: { type: Boolean, default: true },
    aiPrompt: { type: String, default: '' },
  },
  { _id: true }
);

const sequenceSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', required: true, index: true },
    name: { type: String, required: true, trim: true },
    steps: [sequenceStepSchema],
    isActive: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const Sequence = mongoose.models.Sequence || mongoose.model('Sequence', sequenceSchema);
