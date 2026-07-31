import mongoose from 'mongoose';

const sendJobSchema = new mongoose.Schema(
  {
    bullJobId: { type: String, default: '', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SequenceEnrollment', required: true },
    stepIndex: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
      default: 'pending',
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    recipientEmail: { type: String, default: '', trim: true, lowercase: true },
    providerMessageId: { type: String, default: '', trim: true, index: true },
    renderedSubject: { type: String, default: '' },
    renderedBody: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    immediateLaunch: { type: Boolean, default: false },
    manualSend: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

sendJobSchema.index({ status: 1, scheduledFor: 1, manualSend: 1 });
sendJobSchema.index({ enrollmentId: 1, stepIndex: 1, status: 1 });
sendJobSchema.index({ campaignId: 1, status: 1, scheduledFor: -1 });

export const SendJob = mongoose.models.SendJob || mongoose.model('SendJob', sendJobSchema);

