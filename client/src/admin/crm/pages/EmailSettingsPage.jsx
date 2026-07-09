import { useEffect, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  LoadingState,
  MetricGrid,
  PageSection,
  PageShell,
  StatCard,
} from '../components/ui/primitives.jsx';
import SettingsPageHeader from '../components/settings/SettingsPageHeader.jsx';
import SettingsShell from '../components/settings/SettingsShell.jsx';
import { Mail, CheckCircle2, XCircle, ShieldCheck, Link2, BarChart3, HelpCircle, Activity } from 'lucide-react';

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Config States
  const [emailStatus, setEmailStatus] = useState(null);
  const [settings, setSettings] = useState({ useResend: false, resendDomain: '' });
  const [metrics, setMetrics] = useState(null);

  async function loadData() {
    try {
      const [statusData, settingsData] = await Promise.all([
        crmApiFetch('/api/admin/users/email-status'),
        crmApiFetch('/api/admin/system-settings'),
      ]);
      setEmailStatus(statusData);
      setSettings(settingsData);

      if (settingsData.useResend) {
        const metricsData = await crmApiFetch('/api/admin/resend/metrics').catch(() => null);
        setMetrics(metricsData);
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
      setToastMsg(checked ? 'Resend API enabled.' : 'SMTP fallback enabled.');
      setTimeout(() => setToastMsg(''), 3000);

      // Load metrics if enabled
      if (checked) {
        const metricsData = await crmApiFetch('/api/admin/resend/metrics').catch(() => null);
        setMetrics(metricsData);
      } else {
        setMetrics(null);
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

  if (loading) {
    return (
      <SettingsShell>
        <div className="p-6">
          <LoadingState label="Loading email settings…" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell>
      <div className="crm-settings-page max-w-5xl">
        <SettingsPageHeader
          title="Email settings"
          subtitle="Configure SMTP connection ready states and Resend API integrations."
        />

        {error && <Alert tone="critical" className="mb-4">{error}</Alert>}
        {toastMsg && <Alert tone="success" className="mb-4">{toastMsg}</Alert>}

        {/* Diagnostic Status Cards */}
        <PageSection>
          <h2 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Connection Ready States</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* User 1 */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-ink)]">User 1 (Primary System Sender)</h3>
                  <p className="text-[11px] text-neutral-400">talha@exhibitgraphicsign.com</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Outbound SMTP Transport</span>
                  {emailStatus?.smtpReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> Missing Config
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Inbound IMAP Sync</span>
                  {emailStatus?.imapReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> Missing Config
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* User 2 */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-ink)]">User 2 (Secondary Outreach)</h3>
                  <p className="text-[11px] text-neutral-400">masuood@exhibitgraphicsign.com</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Outbound SMTP Transport</span>
                  {emailStatus?.smtp2Ready ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> Missing Config
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Inbound IMAP Sync</span>
                  {emailStatus?.imap2Ready ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> Missing Config
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </PageSection>

        {/* Resend API Toggle Panel */}
        <PageSection>
          <Card className="p-5 border-l-4 border-brand">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Link2 className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-ink)]">Resend API Delivery Integration</h3>
                  <p className="mt-1 max-w-xl text-xs text-neutral-500">
                    Routing campaign outreach through Resend allows you to bypass standard SMTP mailserver limitations, improve deliverability rates, and view exact delivery status tracking including opens and click metrics.
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.useResend}
                  onChange={handleToggleResend}
                  disabled={saving}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
              </label>
            </div>

            {settings.useResend && (
              <form onSubmit={handleSaveDomain} className="mt-5 border-t border-[var(--color-line)] pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 max-w-md">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Verified Resend Domain name
                    </label>
                    <input
                      type="text"
                      value={settings.resendDomain}
                      onChange={(e) => setSettings({ ...settings, resendDomain: e.target.value })}
                      required
                      placeholder="e.g. masuood.exhibitgraphicsign.com"
                      className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="crm-btn-primary py-2 text-xs sm:w-28"
                  >
                    {saving ? 'Saving...' : 'Update Domain'}
                  </button>
                </div>
              </form>
            )}
          </Card>
        </PageSection>

        {/* Resend Metrics Dashboard */}
        {settings.useResend && metrics && (
          <PageSection>
            <h2 className="mb-3 text-sm font-bold text-[var(--color-ink)]">Resend Marketing Delivery Metrics</h2>
            
            {metrics.error ? (
              <Alert tone="warning" className="mb-4">
                Failed to communicate with Resend API: {metrics.error}. Check if your RESEND_API_KEY is configured in your env.
              </Alert>
            ) : !metrics.configured ? (
              <EmptyState
                icon={BarChart3}
                title="Resend configuration warning"
                description="RESEND_API_KEY is missing in your environment configuration. Check your server variables."
              />
            ) : (
              <div className="space-y-6">
                {/* Metrics Cards Grid */}
                <MetricGrid cols={4}>
                  <StatCard label="Total Sent" value={metrics.total} icon={Mail} tone="brand" />
                  <StatCard label="Deliverability" value={metrics.rates.deliverability} icon={CheckCircle2} tone="success" helpText={`${metrics.delivered} of ${metrics.total} delivered`} />
                  <StatCard label="Open Rate" value={metrics.rates.open} icon={BarChart3} tone="info" helpText={`${metrics.opened} opens tracked`} />
                  <StatCard label="Click Rate" value={metrics.rates.click} icon={Link2} tone="success" helpText={`${metrics.clicked} link clicks`} />
                </MetricGrid>

                {/* Sent logs table */}
                <Card>
                  <CardHeader title="Recent Resend Deliveries" subtitle="Logs of the latest 100 emails sent using the Resend API." />
                  {!metrics.emails?.length ? (
                    <EmptyState
                      icon={Activity}
                      title="No recent sends"
                      description="Outbox campaign messages sent using the Resend API will appear here once processed."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--color-line)] bg-neutral-50/50 font-semibold text-neutral-500 uppercase tracking-wider text-[10px]">
                            <th className="px-4 py-2.5">To Recipient</th>
                            <th className="px-4 py-2.5">Subject</th>
                            <th className="px-4 py-2.5">From Address</th>
                            <th className="px-4 py-2.5">Last Event</th>
                            <th className="px-4 py-2.5">Date Sent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-line)]">
                          {metrics.emails.map((email) => (
                            <tr key={email.id} className="hover:bg-neutral-50/50">
                              <td className="px-4 py-2.5 font-medium text-[var(--color-ink)] truncate max-w-[180px]">
                                {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                              </td>
                              <td className="px-4 py-2.5 text-neutral-600 truncate max-w-[280px]">
                                {email.subject}
                              </td>
                              <td className="px-4 py-2.5 text-neutral-500 truncate max-w-[200px]">
                                {email.from}
                              </td>
                              <td className="px-4 py-2.5">
                                <StatusBadge status={email.status} />
                              </td>
                              <td className="px-4 py-2.5 text-neutral-400">
                                {new Date(email.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </PageSection>
        )}
      </div>
    </SettingsShell>
  );
}

function StatusBadge({ status }) {
  const configs = {
    sent: { bg: 'bg-neutral-100 text-neutral-700', label: 'Sent' },
    delivered: { bg: 'bg-emerald-50 text-emerald-700', label: 'Delivered' },
    opened: { bg: 'bg-sky-50 text-sky-700', label: 'Opened' },
    clicked: { bg: 'bg-violet-50 text-violet-700', label: 'Clicked' },
    bounced: { bg: 'bg-red-50 text-red-700', label: 'Bounced' },
    complained: { bg: 'bg-amber-50 text-amber-800', label: 'Spam' },
    failed: { bg: 'bg-red-100 text-red-800', label: 'Failed' },
  };

  const c = configs[String(status).toLowerCase()] || { bg: 'bg-neutral-100 text-neutral-700', label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}
