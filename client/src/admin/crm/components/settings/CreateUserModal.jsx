import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Alert, Field } from '../ui/primitives.jsx';
import { RefreshCw, UserPlus } from 'lucide-react';

function generateClientPassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export default function CreateUserModal({
  open,
  onClose,
  roles = [],
  user,
  onSave,
  emailReady = false,
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales_rep');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDisplayName(user?.displayName || '');
    setEmail(user?.email || '');
    setPassword('');
    setRole(user?.role || 'sales_rep');
    setSendWelcomeEmail(!user && emailReady);
    setError('');
  }, [open, user, emailReady]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { displayName, email, role };
      if (!user) {
        payload.password = password;
        payload.sendWelcomeEmail = sendWelcomeEmail && emailReady;
      } else if (password) {
        payload.password = password;
      }
      await onSave(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Edit user' : 'Add user'}
      subtitle={user ? 'Update role, display name, or set a new password.' : 'Create a CRM account and optionally email login details.'}
      icon={UserPlus}
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" className="crm-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="create-user-form" className="crm-btn-primary" disabled={busy}>
            {busy ? 'Saving…' : user ? 'Save changes' : 'Create user'}
          </button>
        </div>
      )}
    >
      <form id="create-user-form" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {!user && !emailReady && (
          <Alert tone="warning">SMTP is not configured. You can still create users, but login details cannot be emailed automatically.</Alert>
        )}

        <Field label="Display name">
          <input className="crm-input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="crm-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={Boolean(user)}
          />
        </Field>

        <Field label={user ? 'New password (optional)' : 'Temporary password'}>
          <div className="flex gap-2">
            <input
              type="text"
              className="crm-input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              minLength={8}
              autoComplete="new-password"
            />
            {!user ? (
              <button
                type="button"
                className="crm-btn-secondary shrink-0"
                onClick={() => setPassword(generateClientPassword())}
                title="Generate secure password"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </Field>

        <Field label="Role">
          <select className="crm-input w-full" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>

        {!user && emailReady ? (
          <label className="crm-settings-check-row">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
            />
            <span>
              <strong>Email login details to this user</strong>
              <small>They will be asked to change their password on first sign-in.</small>
            </span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}
