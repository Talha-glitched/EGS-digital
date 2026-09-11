import db from '../db/index.js';

export async function getSystemSettings() {
  const res = await db.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'email' LIMIT 1`);
  if (res.rows.length > 0) {
    return res.rows[0].setting_value;
  }

  const defaultVal = {
    key: 'email',
  };

  await db.query(
    `INSERT INTO system_settings (setting_key, setting_value, description)
     VALUES ('email', $1::jsonb, 'Email configuration settings')
     ON CONFLICT (setting_key) DO NOTHING`,
    [defaultVal]
  );

  return defaultVal;
}

export async function updateSystemSettings(updateData) {
  const current = await getSystemSettings();
  const updated = {
    ...current,
    ...(updateData || {}),
    key: 'email',
  };

  await db.query(
    `INSERT INTO system_settings (setting_key, setting_value, updated_at)
     VALUES ('email', $1::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = EXCLUDED.setting_value,
       updated_at = CURRENT_TIMESTAMP`,
    [updated]
  );
  return updated;
}
