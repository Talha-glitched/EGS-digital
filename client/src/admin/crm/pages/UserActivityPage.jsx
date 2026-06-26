import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '../crmApi.js';
import {
  Alert,
  EmptyState,
  LoadingState,
  MetricGrid,
  PageSection,
  PageShell,
  StatCard,
} from '../components/ui/primitives.jsx';
import { Activity, ChevronRight, ShieldAlert, UserRound } from 'lucide-react';
import SettingsPageHeader from '../components/settings/SettingsPageHeader.jsx';
import SettingsShell from '../components/settings/SettingsShell.jsx';
import SettingsFilterSelect from '../components/settings/SettingsFilterSelect.jsx';
import ActionBadge from '../components/settings/ActionBadge.jsx';
import ActivityDetailDrawer from '../components/settings/ActivityDetailDrawer.jsx';
import { ACTION_LABELS, formatSettingsWhen } from '../components/settings/settingsUtils.js';
import SearchInput from '../components/ui/SearchInput.jsx';

const ACTION_FILTERS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' },
  { value: 'delete', label: 'Deleted' },
  { value: 'restore', label: 'Restored' },
  { value: 'rollback', label: 'Rolled back' },
  { value: 'login', label: 'Sign-ins' },
  { value: 'export', label: 'Exports' },
];

export default function UserActivityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedPreview, setSelectedPreview] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAuditLog({ limit: 150 })
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (actionFilter !== 'all' && item.action !== actionFilter) return false;
      if (!query) return true;
      const haystack = [
        item.summary,
        item.action,
        item.resource,
        item.resourceId,
        item.userDisplayName,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [items, actionFilter, search]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = items.filter((item) => new Date(item.createdAt) >= today).length;
    const sensitive = items.filter((item) => ['delete', 'rollback', 'export'].includes(item.action)).length;
    const users = new Set(items.map((item) => item.userDisplayName).filter(Boolean)).size;
    return { todayCount, sensitive, users };
  }, [items]);

  function openDetail(item) {
    setSelectedId(item._id);
    setSelectedPreview(item);
  }

  return (
    <PageShell>
      <SettingsShell>
        <div className="crm-settings-page">
          <SettingsPageHeader
            title="Activity log"
            subtitle="Audit trail of CRM actions. Click any event for full details."
          />

          <PageSection>
            <MetricGrid cols={3}>
              <StatCard compact label="Events" value={items.length} icon={Activity} tone="brand" />
              <StatCard compact label="Today" value={stats.todayCount} icon={UserRound} tone="info" />
              <StatCard compact label="Sensitive" value={stats.sensitive} icon={ShieldAlert} tone="warning" helpText={`${stats.users} users`} />
            </MetricGrid>
          </PageSection>

          <PageSection>
            <div className="crm-settings-toolbar">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, summary, resource…"
                className="crm-settings-search"
              />
              <SettingsFilterSelect
                label="Filter by action"
                value={actionFilter}
                onChange={setActionFilter}
                options={ACTION_FILTERS}
              />
              <span className="crm-settings-toolbar-meta">{filtered.length} shown</span>
            </div>

            {error && <Alert className="mb-3">{error}</Alert>}

            {loading ? (
              <LoadingState label="Loading activity…" />
            ) : filtered.length === 0 ? (
              <EmptyState title="No activity found" description="Try a different filter or search term." />
            ) : (
              <div className="crm-settings-feed">
                {filtered.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className="crm-settings-feed-item"
                    onClick={() => openDetail(item)}
                  >
                    <div className="crm-settings-feed-icon">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionBadge action={item.action} />
                        <span className="text-[11px] text-neutral-400">{formatSettingsWhen(item.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-[var(--color-ink)]">
                        {item.summary || `${ACTION_LABELS[item.action] || item.action}${item.resource ? ` · ${item.resource}` : ''}`}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {item.userDisplayName || 'System'}
                        {item.changes?.length ? ` · ${item.changes.length} change${item.changes.length === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                  </button>
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </SettingsShell>

      <ActivityDetailDrawer
        entryId={selectedId}
        preview={selectedPreview}
        onClose={() => { setSelectedId(''); setSelectedPreview(null); }}
      />
    </PageShell>
  );
}
