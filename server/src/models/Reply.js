import mongoose from 'mongoose';

const threadMessageSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['outbound', 'inbound'], required: true },
    step: { type: Number, default: null },
    body: { type: String, default: '' },
    subject: { type: String, default: '' },
    timestamp: { type: Date, default: () => new Date() },
    messageId: { type: String, default: '' },
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectCampaign',
      required: false,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    from: { type: String, default: '' },
    subject: { type: String, default: '' },
    text: { type: String, default: '' },
    messageId: { type: String, required: true, unique: true },
    receivedAt: { type: Date, required: true, index: true },
    intent: {
      type: String,
      enum: ['Interested', 'Opt Out', 'Neutral', 'Bounce', 'OOO'],
      default: 'Neutral',
    },
    systemInbox: { type: String, trim: true, lowercase: true, default: '' },
    vendorSource: { type: String, default: '' },
    threadHistory: [threadMessageSchema],
    humanReview: {
      outcome: {
        type: String,
        enum: [
          'Interested',
          'Ambiguous',
          'Not Interested',
          'Referral',
          'Out of Office',
          'Unsubscribe',
          'Bounce',
          'Automated',
          'Other',
        ],
        default: null,
      },
      status: {
        type: String,
        enum: ['Unreviewed', 'Reviewed', 'Not Required'],
        default: 'Unreviewed',
        index: true,
      },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

replySchema.index({ leadId: 1, 'humanReview.status': 1, receivedAt: 1 });

export const Reply = mongoose.models.Reply || mongoose.model('Reply', replySchema);
