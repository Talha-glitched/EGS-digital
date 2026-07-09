import { SystemSettings } from '../models/SystemSettings.js';

export async function getSystemSettings() {
  let settings = await SystemSettings.findOne({ key: 'email' });
  if (!settings) {
    settings = await SystemSettings.create({
      key: 'email',
      useResend: false,
      resendDomain: 'masuood.exhibitgraphicsign.com',
    });
  }
  return settings;
}

export async function updateSystemSettings(updateData) {
  let settings = await SystemSettings.findOne({ key: 'email' });
  if (!settings) {
    settings = new SystemSettings({ key: 'email' });
  }
  if (updateData.useResend !== undefined) {
    settings.useResend = Boolean(updateData.useResend);
  }
  if (updateData.resendDomain !== undefined) {
    settings.resendDomain = String(updateData.resendDomain).trim();
  }
  await settings.save();
  return settings;
}
