import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { crmApiFetch } from '../crmApi.js';
import ResendEmailsWorkspace from '../components/resend/ResendEmailsWorkspace.jsx';
import ResendAnalyticsView from '../components/resend/ResendAnalyticsView.jsx';
import { Alert, EmptyState, LoadingState, PageSection, PageShell, Tabs } from '../components/ui/primitives.jsx';

export default function ResendEmailsPage() {
  const [settings, setSettings] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('deliveries');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const tabItems = [
    { id: 'deliveries', label: 'All Deliveries', description: 'Real-time outreach sending logs, search filters, and status codes.' },
    { id: 'analytics', label: 'Performance Analytics', description: 'Visual breakdown of deliverability, circular rate gauges, conversion funnel, and weekly optimizations.' }
  ];

  const loadMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (selectedCampaignId) {
        queryParams.set('campaignId', selectedCampaignId);
      }
      const url = `/api/admin/resend/metrics?${queryParams.toString()}`;
      const data = await crmApiFetch(url);
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load Resend emails.');
      setMetrics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    crmApiFetch('/api/admin/system-settings')
      .then(setSettings)
      .catch(() => setSettings({ useResend: false }));

    crmApiFetch('/api/admin/projects')
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if (!settings?.useResend) {
      setLoading(false);
      return;
    }
    loadMetrics().catch(console.error);
  }, [settings?.useResend, selectedCampaignId, loadMetrics]);

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

      <PageSection className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--color-line)] pb-3">
          <Tabs items={tabItems} active={activeTab} onChange={setActiveTab} />
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Campaign:</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="crm-input text-xs w-full sm:w-56"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((camp) => (
                <option key={camp._id} value={camp._id}>
                  {camp.projectName}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {activeTab === 'deliveries' ? (
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
        ) : (
          <ResendAnalyticsView metrics={metrics} />
        )}
      </PageSection>
    </PageShell>
  );
}
