import mongoose from 'mongoose';

const sendEventSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipient',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'reply', 'unsubscribed', 'skipped'],
      required: true,
      index: true,
    },
    message: { type: String, default: '' },
    messageId: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SendEvent =
  mongoose.models.SendEvent || mongoose.model('SendEvent', sendEventSchema);
