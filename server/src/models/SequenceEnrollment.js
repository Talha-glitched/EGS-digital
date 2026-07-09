import mongoose from 'mongoose';

const sequenceEnrollmentSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', required: true, index: true },
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sequence', required: true },
    launchBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'SequenceLaunch', default: null, index: true },
    currentStepIndex: { type: Number, default: 0 },
    currentNodeId: { type: String, default: null },
    nextSendAt: { type: Date, default: null, index: true },
    frozen: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

sequenceEnrollmentSchema.index({ leadId: 1, sequenceId: 1 }, { unique: true });

export const SequenceEnrollment =
  mongoose.models.SequenceEnrollment || mongoose.model('SequenceEnrollment', sequenceEnrollmentSchema);
