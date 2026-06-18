import mongoose from 'mongoose';

const revenueEntrySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'AED', trim: true },
    description: { type: String, default: '', trim: true },
    closedAt: { type: Date, default: () => new Date() },
    loggedBy: { type: String, default: 'admin', trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const RevenueEntry =
  mongoose.models.RevenueEntry || mongoose.model('RevenueEntry', revenueEntrySchema);
