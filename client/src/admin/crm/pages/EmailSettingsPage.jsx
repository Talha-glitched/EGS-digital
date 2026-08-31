import { useEffect, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import {
  Alert,
  Card,
  PageSection,
} from '../components/ui/primitives.jsx';
import SettingsPageHeader from '../components/settings/SettingsPageHeader.jsx';
import SettingsShell from '../components/settings/SettingsShell.jsx';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Server,
  Mail,
  Send,
} from 'lucide-react';

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      <div className="h-4 w-48 rounded bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-100" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-xl bg-neutral-100" />
        <div className="h-40 rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}

function SmtpConnectionCards({ emailStatus }) {
  const accounts = Array.isArray(emailStatus?.accounts) && emailStatus.accounts.length > 0
    ? emailStatus.accounts
    : [
        {
          email: 'haider@exhibitgraphicsign.com',
          name: 'Dr. Haider',
          title: 'Project Director',
          isPrimary: true,
          smtpReady: emailStatus?.smtpReady,
          imapReady: emailStatus?.imapReady,
        },
        {
          email: 'masuood@exhibitgraphicsign.com',
          name: 'Masuood-ul-Rasheed',
          title: 'Managing Director',
          isPrimary: false,
          smtpReady: emailStatus?.smtp2Ready,
          imapReady: emailStatus?.imap2Ready,
        },
        {
          email: 'talha@exhibitgraphicsign.com',
          name: 'Talha Masuood',
          title: 'Operations & Technical Director',
          isPrimary: false,
          smtpReady: emailStatus?.smtp3Ready,
          imapReady: emailStatus?.imap3Ready,
        },
      ];

  return (
    <PageSection>
      <h2 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Configured Mailboxes ({accounts.length})</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const isConfigured = Boolean(account.email);
          const isReady = account.smtpReady !== false;

          return (
            <Card key={account.email} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-[var(--color-ink)]">{account.name}</p>
                    {account.isPrimary && (
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-3xs font-semibold text-brand">Primary</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-2xs text-neutral-500">{account.title}</p>
                  <p className="mt-1 truncate font-mono text-2xs text-neutral-400">{account.email}</p>
                </div>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isReady ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {isReady ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-2 text-2xs">
                <span className="text-neutral-500">SMTP: {isReady ? 'Ready' : 'Check credentials'}</span>
                <span className="text-neutral-400 font-mono">Port 465/587</span>
              </div>
            </Card>
          );
        })}
      </div>
    </PageSection>
  );
}

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);

  async function loadData() {
    try {
      const statusData = await crmApiFetch('/api/admin/users/email-status');
      setEmailStatus(statusData);
    } catch (err) {
      setError(err.message || 'Failed to load email configurations.');
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  return (
    <SettingsShell>
      <div className="crm-settings-page max-w-5xl">
        <SettingsPageHeader
          title="Email settings"
          subtitle="Configure outbound executive mailboxes and SMTP connection health."
        />

        {error && <Alert tone="critical" className="mb-4">{error}</Alert>}

        {loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-neutral-50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200/60 text-neutral-600">
                <Server className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-ink)]">Executive SMTP Mailboxes Active</p>
                <p className="text-xs text-neutral-500">All campaign dispatches and sequence emails are sent directly through authenticated mailboxes on wardah.tasjeel.ae.</p>
              </div>
            </div>

            <SmtpConnectionCards emailStatus={emailStatus} />
          </>
        )}
      </div>
    </SettingsShell>
  );
}
