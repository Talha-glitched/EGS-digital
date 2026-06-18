import mongoose from 'mongoose';

const sendJobSchema = new mongoose.Schema(
  {
    bullJobId: { type: String, default: '', index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SequenceEnrollment', required: true },
    stepIndex: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
      default: 'pending',
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false }
);

sendJobSchema.index({ status: 1, scheduledFor: 1 });
sendJobSchema.index({ enrollmentId: 1, stepIndex: 1, status: 1 });

export const SendJob = mongoose.models.SendJob || mongoose.model('SendJob', sendJobSchema);
