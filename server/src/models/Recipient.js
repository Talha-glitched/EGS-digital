import crypto from 'crypto';
import mongoose from 'mongoose';

const recipientSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, default: '', trim: true },
    company: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'failed', 'replied', 'unsubscribed', 'skipped'],
      default: 'queued',
      index: true,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
    messageId: { type: String, default: '', index: true },
    failureReason: { type: String, default: '' },
    sentAt: { type: Date, default: null },
    repliedAt: { type: Date, default: null },
    unsubscribedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

recipientSchema.index({ campaignId: 1, email: 1 }, { unique: true });

export const Recipient =
  mongoose.models.Recipient || mongoose.model('Recipient', recipientSchema);
