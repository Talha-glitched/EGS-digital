import mongoose from 'mongoose';

const financialMetricsSchema = new mongoose.Schema(
  {
    tokensConsumed: { type: Number, default: 0 },
    calculatedAiCostUSD: { type: Number, default: 0 },
  },
  { _id: false }
);

const trackingMetricsSchema = new mongoose.Schema(
  {
    emailsDeliveredCount: { type: Number, default: 0 },
    isOpened: { type: Boolean, default: false },
    totalOpenCount: { type: Number, default: 0 },
    lastOpenTimestamp: { type: Date, default: null },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    sources: [{ type: String, trim: true }],
    primarySource: { type: String, default: '', trim: true },
    deliveryStatus: {
      type: String,
      enum: ['Pending Inqueue', 'Emailed Outbound', 'Bounced / Invalid', 'Opted Out', 'Replied'],
      default: 'Pending Inqueue',
      index: true,
    },
    financialMetrics: { type: financialMetricsSchema, default: () => ({}) },
    trackingMetrics: { type: trackingMetricsSchema, default: () => ({}) },
    lastMessageId: { type: String, default: '', index: true },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

leadSchema.index({ campaignId: 1, email: 1 }, { unique: true });

export const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
