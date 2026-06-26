import mongoose from 'mongoose';

const financialLedgerSchema = new mongoose.Schema(
  {
    allocatedToolBudget: { type: Number, default: 0 },
    domainFixedCosts: { type: Number, default: 0 },
    laborCosts: { type: Number, default: 0 },
    accumulatedOpenAiCost: { type: Number, default: 0 },
    totalProjectCost: { type: Number, default: 0 },
    validatedRevenueWon: { type: Number, default: 0 },
  },
  { _id: false }
);

const projectCampaignSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    milestone: { type: String, default: '', trim: true },
    targetCompaniesCount: { type: Number, default: 0 },
    companiesWithPocsFound: { type: Number, default: 0 },
    companiesRespondedCount: { type: Number, default: 0 },
    financialLedger: { type: financialLedgerSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['Active Planning', 'Active Campaigning', 'Completed', 'Archived'],
      default: 'Active Planning',
      index: true,
    },
    statusSource: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    fromEmail: { type: String, default: '', trim: true },
    fromName: { type: String, default: 'Exhibit Graphic Sign', trim: true },
  },
  { timestamps: true, versionKey: false }
);

projectCampaignSchema.methods.recalculateCosts = function recalculateCosts() {
  const ledger = this.financialLedger || {};
  ledger.totalProjectCost =
    (ledger.allocatedToolBudget || 0) +
    (ledger.domainFixedCosts || 0) +
    (ledger.laborCosts || 0) +
    (ledger.accumulatedOpenAiCost || 0);
  this.financialLedger = ledger;
};

projectCampaignSchema.methods.getRoiPercent = function getRoiPercent() {
  const cost = this.financialLedger?.totalProjectCost || 0;
  const revenue = this.financialLedger?.validatedRevenueWon || 0;
  if (cost <= 0) return 0;
  return ((revenue - cost) / cost) * 100;
};

export const ProjectCampaign =
  mongoose.models.ProjectCampaign || mongoose.model('ProjectCampaign', projectCampaignSchema);
