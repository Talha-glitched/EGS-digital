import mongoose from 'mongoose';

const audienceSnapshotSchema = new mongoose.Schema(
  {
    importedCampaignIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign' }],
    importedCampaignNames: [{ type: String, trim: true }],
    includeCompanyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    includeLeadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    excludeCompanyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    excludeLeadIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  },
  { _id: false },
);

const sequenceLaunchSchema = new mongoose.Schema(
  {
    sequenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sequence', required: true, index: true },
    audience: { type: audienceSnapshotSchema, default: () => ({}) },
    enrolledCount: { type: Number, default: 0 },
    restartedCount: { type: Number, default: 0 },
    mergedCount: { type: Number, default: 0 },
    launchedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, versionKey: false },
);

sequenceLaunchSchema.index({ sequenceId: 1, launchedAt: -1 });

export const SequenceLaunch =
  mongoose.models.SequenceLaunch || mongoose.model('SequenceLaunch', sequenceLaunchSchema);
