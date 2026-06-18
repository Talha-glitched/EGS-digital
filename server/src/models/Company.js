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
      enum: ['Lead', 'Active Prospect', 'Client Partner', 'Blacklisted'],
      default: 'Lead',
    },
  },
  { timestamps: true, versionKey: false }
);

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
