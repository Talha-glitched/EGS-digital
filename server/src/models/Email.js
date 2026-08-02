import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
      index: true,
    },
    from: { type: String, required: true, trim: true },
    fromEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    to: [{ type: String, trim: true, lowercase: true }],
    toEmail: { type: String, trim: true, lowercase: true, index: true },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    htmlBody: { type: String, default: '' },
    sentAt: { type: Date, default: null, index: true },
    receivedAt: { type: Date, default: null, index: true },
    messageId: { type: String, required: true, unique: true, index: true },
    resendEmailId: { type: String, default: '', index: true },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectCampaign',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'received'],
      default: 'sent',
      index: true,
    },
    provider: {
      type: String,
      default: 'resend',
      index: true,
    },
    suggestedIntent: {
      type: String,
      enum: ['Interested', 'Opt Out', 'Out of Office', 'Neutral'],
      default: 'Neutral',
    },
    humanReview: {
      status: {
        type: String,
        enum: ['Unreviewed', 'Reviewed', 'Not Required'],
        default: 'Unreviewed',
        index: true,
      },
      finalOutcome: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: null },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

emailSchema.index({ leadId: 1, direction: 1, createdAt: -1 });
emailSchema.index({ companyId: 1, direction: 1, createdAt: -1 });

export const Email = mongoose.models.Email || mongoose.model('Email', emailSchema);
