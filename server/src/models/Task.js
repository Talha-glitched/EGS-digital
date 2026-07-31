import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date, default: null, index: true },
    status: { type: String, enum: ['Open', 'Done'], default: 'Open', index: true },
    priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal', index: true },
    owner: { type: String, default: '', trim: true, index: true },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectCampaign', default: null, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingJob', default: null, index: true },
    taskType: {
      type: String,
      enum: ['general', 'ongoing_job', 'reply_review', 'lead_follow_up', 'relationship_follow_up'],
      default: 'general',
      index: true,
    },
    replyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reply', default: null, index: true },
    channel: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'meeting', 'linkedin', 'other', ''],
      default: '',
    },
    interactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactInteraction', default: null },
    notes: { type: String, default: '', trim: true },
    completedAt: { type: Date, default: null },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null, trim: true },
    deletedViaOpportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingJob', default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

taskSchema.virtual('isRelationshipFollowUp')
  .get(function () { return this.taskType === 'relationship_follow_up'; })
  .set(function (val) {
    if (val) this.taskType = 'relationship_follow_up';
    else if (this.taskType === 'relationship_follow_up') this.taskType = 'general';
  });

taskSchema.virtual('ongoingJobId')
  .get(function () { return this.opportunityId; })
  .set(function (val) { this.opportunityId = val; });

taskSchema.virtual('deletedViaOngoingJobId')
  .get(function () { return this.deletedViaOpportunityId; })
  .set(function (val) { this.deletedViaOpportunityId = val; });

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

taskSchema.index({ status: 1, dueAt: 1 });
taskSchema.index({ deletedAt: 1, status: 1, owner: 1, dueAt: 1 });
taskSchema.index({ leadId: 1, taskType: 1, status: 1, deletedAt: 1 });
taskSchema.index(
  { leadId: 1, taskType: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      taskType: 'reply_review',
      status: 'Open',
      deletedAt: null,
    },
  }
);

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
