import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import ResendEmailsWorkspace from '../components/resend/ResendEmailsWorkspace.jsx';
import { Alert, EmptyState, LoadingState, PageSection, PageShell } from '../components/ui/primitives.jsx';

export default function ResendEmailsPage() {
  const [settings, setSettings] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await crmApiFetch('/api/admin/resend/metrics');
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load Resend emails.');
      setMetrics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    crmApiFetch('/api/admin/system-settings')
      .then(setSettings)
      .catch(() => setSettings({ useResend: false }));
  }, []);

  useEffect(() => {
    if (!settings?.useResend) {
      setLoading(false);
      return;
    }
    loadMetrics().catch(console.error);
  }, [settings?.useResend, loadMetrics]);

  if (settings === null) {
    return (
      <PageShell>
        <LoadingState label="Loading Resend emails…" />
      </PageShell>
    );
  }

  if (!settings.useResend) {
    return (
      <PageShell>
        <PageSection>
          <EmptyState
            icon={Zap}
            title="Resend delivery is not enabled"
            description="Enable Resend API delivery in email settings to view outbound delivery logs, opens, and clicks."
            action={(
              <Link to="/admin/crm/settings/email" className="crm-btn-primary text-xs">
                Open email settings
              </Link>
            )}
          />
        </PageSection>
      </PageShell>
    );
  }

  if (loading && !metrics) {
    return (
      <PageShell>
        <LoadingState label="Loading Resend delivery data…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {error && (
        <PageSection>
          <Alert tone="critical">{error}</Alert>
        </PageSection>
      )}

      <PageSection>
        <ResendEmailsWorkspace
          metrics={metrics}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadMetrics(true)}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </PageSection>
    </PageShell>
  );
}
