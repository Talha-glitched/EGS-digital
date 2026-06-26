import { CHANGE_TYPE_LABELS } from './settingsUtils.js';

const TONES = {
  create: 'is-create',
  update: 'is-update',
  soft_delete: 'is-delete',
  restore: 'is-restore',
  rollback: 'is-rollback',
};

export default function ChangeTypeBadge({ changeType }) {
  return (
    <span className={`crm-settings-badge ${TONES[changeType] || 'is-neutral'}`}>
      {CHANGE_TYPE_LABELS[changeType] || changeType}
    </span>
  );
}
