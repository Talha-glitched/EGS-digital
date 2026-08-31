import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Link2,
  ArrowRight,
  Zap,
  Server,
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

function DeliveryModeBanner({ useResend }) {
  if (useResend) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Zap className="h-4 w-4" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--color-ink)]">Resend API active</p>
          <p className="text-xs text-neutral-500">Campaign outreach is routed through Resend for delivery tracking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-neutral-50 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-600">
        <Server className="h-4 w-4" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--color-ink)]">SMTP delivery</p>
        <p className="text-xs text-neutral-500">Outbound email uses your configured SMTP mailboxes.</p>
      </div>
    </div>
  );
}

function SmtpConnectionCards({ emailStatus }) {
  const accounts = emailStatus?.accounts && emailStatus.accounts.length > 0
    ? emailStatus.accounts
    : [
        {
          email: 'talha@exhibitgraphicsign.com',
          name: 'Talha Masuood',
          title: 'Operations & Technical Director',
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
          email: 'haider@exhibitgraphicsign.com',
          name: 'Dr. Haider',
          title: 'Project Director',
          isPrimary: false,
          smtpReady: emailStatus?.smtp3Ready,
          imapReady: emailStatus?.imap3Ready,
        },
      ];

  return (
    <PageSection>
      <h2 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Configured Mailboxes ({accounts.length})</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc, idx) => (
          <Card key={acc.email || idx} className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs font-semibold text-[var(--color-ink)] truncate">
                      {acc.name || `User ${idx + 1}`}
                    </h3>
                    {acc.isPrimary && (
                      <span className="rounded bg-brand/10 px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider text-brand">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate font-mono">{acc.email}</p>
                  {acc.title && <p className="text-2xs text-neutral-400 truncate mt-0.5">{acc.title}</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Outbound SMTP</span>
                {acc.smtpReady ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                    <XCircle className="h-3.5 w-3.5" /> Missing Config
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Inbound IMAP Sync</span>
                {acc.imapReady ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                    <XCircle className="h-3.5 w-3.5" /> Missing Config
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [emailStatus, setEmailStatus] = useState(null);
  const [settings, setSettings] = useState({ useResend: false, resendDomain: '' });
  const [apiKeyStatus, setApiKeyStatus] = useState(null);

  async function loadData() {
    try {
      const settingsData = await crmApiFetch('/api/admin/system-settings');
      setSettings(settingsData);

      if (settingsData.useResend) {
        const metricsData = await crmApiFetch('/api/admin/resend/metrics').catch(() => null);
        setApiKeyStatus(metricsData);
        setEmailStatus(null);
      } else {
        const statusData = await crmApiFetch('/api/admin/users/email-status');
        setEmailStatus(statusData);
        setApiKeyStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load email configurations.');
    }
  }

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  async function handleToggleResend(e) {
    const checked = e.target.checked;
    setSaving(true);
    setError('');
    try {
      const updated = await crmApiFetch('/api/admin/system-settings', {
        method: 'PATCH',
        body: JSON.stringify({ useResend: checked }),
      });
      setSettings(updated);
      setToastMsg(checked ? 'Resend API enabled.' : 'SMTP delivery enabled.');
      setTimeout(() => setToastMsg(''), 3000);
      window.dispatchEvent(new CustomEvent('crm:settings-changed'));

      if (checked) {
        const metricsData = await crmApiFetch('/api/admin/resend/metrics').catch(() => null);
        setApiKeyStatus(metricsData);
        setEmailStatus(null);
      } else {
        const statusData = await crmApiFetch('/api/admin/users/email-status');
        setEmailStatus(statusData);
        setApiKeyStatus(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDomain(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await crmApiFetch('/api/admin/system-settings', {
        method: 'PATCH',
        body: JSON.stringify({ resendDomain: settings.resendDomain }),
      });
      setSettings(updated);
      setToastMsg('Resend domain updated.');
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save domain.');
    } finally {
      setSaving(false);
    }
  }

  const useResend = settings.useResend;

  return (
    <SettingsShell>
      <div className="crm-settings-page max-w-5xl">
        <SettingsPageHeader
          title="Email settings"
          subtitle={
            useResend
              ? 'Manage Resend API delivery and verified sending domain.'
              : 'Configure outbound email delivery via SMTP mailboxes.'
          }
        />

        {error && <Alert tone="critical" className="mb-4">{error}</Alert>}
        {toastMsg && <Alert tone="success" className="mb-4">{toastMsg}</Alert>}

        {loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <DeliveryModeBanner useResend={useResend} />

            {!useResend && <SmtpConnectionCards emailStatus={emailStatus} />}

            <PageSection>
              <Card className="border-l-4 border-brand p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-ink)]">Resend API Delivery</h3>
                      <p className="mt-1 max-w-xl text-xs text-neutral-500">
                        {useResend
                          ? 'Campaign outreach is sent through Resend. View delivery status, opens, and clicks in the Resend emails tab.'
                          : 'Enable Resend to route campaign outreach through the Resend API with delivery tracking and improved deliverability.'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={useResend}
                      checked={useResend}
                      onChange={handleToggleResend}
                      disabled={saving}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-neutral-200 transition-colors duration-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:duration-200 after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand peer-disabled:opacity-50" />
                  </label>
                </div>

                {useResend && (
                  <div className="mt-5 space-y-4 border-t border-[var(--color-line)] pt-4">
                    <div className="flex items-center justify-between rounded-lg border border-[var(--color-line)] bg-neutral-50/50 px-4 py-3">
                      <span className="text-xs text-neutral-500">API key status</span>
                      {apiKeyStatus?.error ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <XCircle className="h-3.5 w-3.5" /> Connection error
                        </span>
                      ) : apiKeyStatus?.configured ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                          <XCircle className="h-3.5 w-3.5" /> RESEND_API_KEY missing
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleSaveDomain}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="max-w-md flex-1">
                          <label htmlFor="resend-domain" className="block text-2xs font-bold uppercase tracking-wider text-neutral-500">
                            Verified Resend domain
                          </label>
                          <input
                            id="resend-domain"
                            type="text"
                            value={settings.resendDomain}
                            onChange={(e) => setSettings({ ...settings, resendDomain: e.target.value })}
                            required
                            placeholder="e.g. masuood.exhibitgraphicsign.com"
                            className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="crm-btn-primary py-2 text-xs sm:w-28"
                        >
                          {saving ? 'Saving…' : 'Update domain'}
                        </button>
                      </div>
                    </form>

                    <Link
                      to="/admin/crm/resend-emails"
                      className="group flex items-center justify-between rounded-lg border border-brand/20 bg-brand-soft/50 px-4 py-3 transition hover:border-brand/40 hover:bg-brand-soft"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-ink)]">View Resend emails</p>
                        <p className="mt-0.5 text-xs text-neutral-500">Delivery status, opens, and click tracking for API-sent outreach.</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-brand transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                )}
              </Card>
            </PageSection>
          </>
        )}
      </div>
    </SettingsShell>
  );
}
