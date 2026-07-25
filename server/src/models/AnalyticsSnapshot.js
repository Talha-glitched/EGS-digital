import mongoose from 'mongoose';

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    snapshotType: { type: String, required: true, unique: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    computedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, versionKey: false }
);

export const AnalyticsSnapshot =
  mongoose.models.AnalyticsSnapshot || mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
