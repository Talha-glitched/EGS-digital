import mongoose from 'mongoose';

const vendorStatsSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    leadsCount: { type: Number, default: 0 },
    opens: { type: Number, default: 0 },
    bounces: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { _id: false }
);

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['global', 'project'], required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    pocDiscoveryPercent: { type: Number, default: 0 },
    interactionProgressPercent: { type: Number, default: 0 },
    roiPercent: { type: Number, default: 0 },
    totalProjectCost: { type: Number, default: 0 },
    validatedRevenueWon: { type: Number, default: 0 },
    vendorMatrix: [vendorStatsSchema],
    activeQueues: { type: Number, default: 0 },
    computedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, versionKey: false }
);

export const AnalyticsSnapshot =
  mongoose.models.AnalyticsSnapshot || mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
