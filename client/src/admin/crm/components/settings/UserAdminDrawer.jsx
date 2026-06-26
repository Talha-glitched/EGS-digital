import { useState } from 'react';
import {
  KeyRound,
  Pencil,
  Shield,
  UserRound,
} from 'lucide-react';
import Drawer from '../ui/Drawer.jsx';
import { Alert } from '../ui/primitives.jsx';
import RoleBadge from './RoleBadge.jsx';
import { formatSettingsWhen, userInitials } from './settingsUtils.js';
import { resetUserPassword, updateUser } from '../../crmApi.js';

export default function UserAdminDrawer({
  user,
  emailReady,
  onClose,
  onEdit,
  onUpdated,
  onCredentialsIssued,
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function runAction(action, fn) {
    if (!user) return;
    setBusy(action);
    setError('');
    try {
      const result = await fn();
      if (result?.temporaryPassword) {
        onCredentialsIssued?.(result);
      } else {
        onUpdated?.();
      }
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <Drawer
      open={Boolean(user)}
      onClose={onClose}
      title={user?.displayName || 'Team member'}
      subtitle={user?.email || 'User account'}
      size="md"
      footer={(
        <button type="button" className="crm-btn-secondary w-full" onClick={onClose}>
          Close
        </button>
      )}
    >
      {user && (
        <div className="crm-settings-drawer space-y-5">
          {error && <Alert>{error}</Alert>}

          {!emailReady && (
            <Alert tone="warning">
              SMTP email is not configured on the server. Password resets will still work, but credentials cannot be emailed until EMAIL_SMTP_* is set.
            </Alert>
          )}

          <section className="crm-settings-detail-hero">
            <div className="crm-settings-detail-hero-icon">
              <span className="text-sm font-bold">{userInitials(user.displayName)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={user.role} />
                <span className={`crm-settings-status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{user.displayName}</p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </section>

          <section className="crm-settings-detail-grid">
            <DetailItem icon={UserRound} label="Last login" value={user.lastLoginAt ? formatSettingsWhen(user.lastLoginAt) : 'Never'} />
            <DetailItem icon={Shield} label="Must change password" value={user.mustChangePassword ? 'Yes' : 'No'} />
          </section>

          <section className="crm-settings-action-list">
            <h3 className="crm-settings-section-title">Account actions</h3>
            <button
              type="button"
              className="crm-settings-action-btn"
              onClick={() => onEdit?.(user)}
            >
              <Pencil className="h-4 w-4" />
              <span>
                <strong>Edit profile & role</strong>
                <small>Update name, role, or set a manual password</small>
              </span>
            </button>
            <button
              type="button"
              className="crm-settings-action-btn"
              disabled={!user.isActive || busy === 'reset-email' || !emailReady}
              onClick={() => runAction('reset-email', () => resetUserPassword(user.id, { sendEmail: true }))}
            >
              <KeyRound className="h-4 w-4" />
              <span>
                <strong>{busy === 'reset-email' ? 'Resetting…' : 'Reset password & email'}</strong>
                <small>Generate a temporary password and email it to the user</small>
              </span>
            </button>
            <button
              type="button"
              className="crm-settings-action-btn"
              disabled={!user.isActive || busy === 'reset-only'}
              onClick={() => runAction('reset-only', () => resetUserPassword(user.id, { sendEmail: false }))}
            >
              <KeyRound className="h-4 w-4" />
              <span>
                <strong>{busy === 'reset-only' ? 'Generating…' : 'Generate password only'}</strong>
                <small>Create a temporary password and show it here without sending email</small>
              </span>
            </button>
            <button
              type="button"
              className="crm-settings-action-btn"
              disabled={busy === 'toggle'}
              onClick={() => runAction('toggle', () => updateUser(user.id, { isActive: !user.isActive }))}
            >
              <Shield className="h-4 w-4" />
              <span>
                <strong>{busy === 'toggle' ? 'Updating…' : user.isActive ? 'Deactivate account' : 'Activate account'}</strong>
                <small>{user.isActive ? 'Prevent sign-in without deleting history' : 'Allow this user to sign in again'}</small>
              </span>
            </button>
          </section>
        </div>
      )}
    </Drawer>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="crm-settings-detail-item">
      <p className="crm-settings-detail-label">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="crm-settings-detail-value">{value}</p>
    </div>
  );
}
