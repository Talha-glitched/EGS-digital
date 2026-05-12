import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema(
  {
    queued: { type: Number, default: 0 },
    sending: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    fromEmail: { type: String, required: true, trim: true },
    fromName: { type: String, default: 'Exhibit Graphic Sign', trim: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastSendAt: { type: Date, default: null },
    stats: { type: statsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Campaign =
  mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
