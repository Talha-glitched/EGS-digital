import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'email', unique: true, index: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

export const SystemSettings =
  mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
