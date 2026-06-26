import { useState } from 'react';
import { Copy, Check, KeyRound, Mail, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Alert } from '../ui/primitives.jsx';

export default function CredentialResultModal({ open, onClose, result }) {
  const [copied, setCopied] = useState('');

  if (!result) return null;

  const lines = [
    `Login URL: ${result.loginUrl || ''}`,
    `Email: ${result.user?.email || ''}`,
    `Temporary password: ${result.temporaryPassword || ''}`,
  ].join('\n');

  async function copyText(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credentials ready"
      subtitle={result.emailed
        ? `Login details were emailed to ${result.user?.email}.`
        : 'Share these details securely with the team member.'}
      icon={KeyRound}
      size="md"
      footer={(
        <button type="button" className="crm-btn-primary w-full" onClick={onClose}>
          Done
        </button>
      )}
    >
      <div className="space-y-4">
        {result.emailed ? (
          <Alert tone="success">Email sent successfully. The user must change their password on first sign-in.</Alert>
        ) : (
          <Alert>Email was not sent. Copy the credentials below and share them through a secure channel.</Alert>
        )}

        <div className="crm-settings-credential-card">
          <CredentialRow
            label="Login URL"
            value={result.loginUrl}
            copied={copied === 'url'}
            onCopy={() => copyText('url', result.loginUrl)}
          />
          <CredentialRow
            label="Email"
            value={result.user?.email}
            copied={copied === 'email'}
            onCopy={() => copyText('email', result.user?.email)}
          />
          <CredentialRow
            label="Temporary password"
            value={result.temporaryPassword}
            copied={copied === 'password'}
            onCopy={() => copyText('password', result.temporaryPassword)}
            mono
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="crm-btn-secondary" onClick={() => copyText('all', lines)}>
            {copied === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy all
          </button>
          {result.loginUrl ? (
            <a href={result.loginUrl} target="_blank" rel="noreferrer" className="crm-btn-ghost">
              <ExternalLink className="h-4 w-4" />
              Open login
            </a>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function CredentialRow({ label, value, copied, onCopy, mono = false }) {
  return (
    <div className="crm-settings-credential-row">
      <div className="min-w-0 flex-1">
        <p className="crm-settings-credential-label">{label}</p>
        <p className={`crm-settings-credential-value${mono ? ' is-mono' : ''}`}>{value || '—'}</p>
      </div>
      <button type="button" className="crm-btn-ghost !px-2" onClick={onCopy} aria-label={`Copy ${label}`}>
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
