import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    from: { type: String, default: '' },
    subject: { type: String, default: '' },
    text: { type: String, default: '' },
    messageId: { type: String, required: true, unique: true },
    receivedAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Reply = mongoose.models.Reply || mongoose.model('Reply', replySchema);
