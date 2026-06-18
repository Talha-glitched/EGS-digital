import mongoose from 'mongoose';

const suppressionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    reason: {
      type: String,
      enum: ['opted_out', 'bounced', 'blacklisted', 'unsubscribe', 'hard-fail'],
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectCampaign',
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
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
