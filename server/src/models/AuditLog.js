import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userDisplayName: { type: String, default: 'System', trim: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'restore', 'rollback', 'login', 'logout', 'login_failed', 'export', 'import'],
      required: true,
      index: true,
    },
    resource: { type: String, default: '', trim: true, index: true },
    resourceId: { type: String, default: null, index: true },
    summary: { type: String, default: '', trim: true },
    changes: [{ field: String, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
