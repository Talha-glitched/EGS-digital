import { ACTION_LABELS } from './settingsUtils.js';

const TONES = {
  create: 'is-create',
  update: 'is-update',
  delete: 'is-delete',
  restore: 'is-restore',
  rollback: 'is-rollback',
  login: 'is-login',
  logout: 'is-neutral',
  login_failed: 'is-danger',
  export: 'is-info',
  import: 'is-info',
};

export default function ActionBadge({ action }) {
  return (
    <span className={`crm-settings-badge ${TONES[action] || 'is-neutral'}`}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}
