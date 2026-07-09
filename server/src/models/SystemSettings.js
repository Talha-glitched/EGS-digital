import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'email', unique: true, index: true },
    useResend: { type: Boolean, default: false },
    resendDomain: { type: String, default: 'masuood.exhibitgraphicsign.com', trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const SystemSettings =
  mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
