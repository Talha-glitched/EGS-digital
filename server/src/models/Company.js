import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    industry: { type: String, default: '', trim: true },
    boothNumber: { type: String, default: '', trim: true },
    projectsAssociated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign' }],
    globalStatus: {
      type: String,
      enum: ['Lead', 'Active Prospect', 'Client Partner', 'Blacklisted', 'Target', 'target'],
      default: 'Lead',
    },
    city: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    genericEmails: [{ type: String, trim: true, lowercase: true }],
    genericPhone: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false }
);

companySchema.index({ deletedAt: 1, companyName: 1 });
companySchema.index({ deletedAt: 1, globalStatus: 1 });
companySchema.index({ deletedAt: 1, city: 1, country: 1 });
companySchema.index({ projectsAssociated: 1, deletedAt: 1 });

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

