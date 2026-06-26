import mongoose from 'mongoose';

const recordRevisionSchema = new mongoose.Schema(
  {
    resourceType: { type: String, required: true, trim: true, index: true },
    resourceId: { type: String, required: true, trim: true, index: true },
    revisionNumber: { type: Number, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    snapshotAfter: { type: mongoose.Schema.Types.Mixed, default: null },
    changeType: {
      type: String,
      enum: ['create', 'update', 'soft_delete', 'restore', 'rollback'],
      required: true,
    },
    changedFields: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],
    changedBy: { type: String, default: 'admin', trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rollbackOfRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecordRevision', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

recordRevisionSchema.index({ resourceType: 1, resourceId: 1, revisionNumber: -1 });
recordRevisionSchema.index({ createdAt: -1 });

export const RecordRevision =
  mongoose.models.RecordRevision || mongoose.model('RecordRevision', recordRevisionSchema);
