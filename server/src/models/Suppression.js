import mongoose from 'mongoose';

const suppressionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    reason: {
      type: String,
      enum: ['unsubscribe', 'hard-fail'],
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipient',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Suppression =
  mongoose.models.Suppression || mongoose.model('Suppression', suppressionSchema);
