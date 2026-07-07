import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date, default: null, index: true },
    status: { type: String, enum: ['Open', 'Done'], default: 'Open', index: true },
    priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal', index: true },
    owner: { type: String, default: 'admin', trim: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', default: null },
    notes: { type: String, default: '', trim: true },
    completedAt: { type: Date, default: null },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
    deletedViaOpportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

taskSchema.index({ status: 1, dueAt: 1 });

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
