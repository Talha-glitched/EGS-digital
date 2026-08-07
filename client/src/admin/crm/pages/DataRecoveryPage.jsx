import { useEffect, useMemo, useState } from 'react';
import { fetchRecentRevisions, rollbackRevision } from '../crmApi.js';
import {
  Alert,
  EmptyState,
  LoadingState,
  MetricGrid,
  PageSection,
  PageShell,
  StatCard,
} from '../components/ui/primitives.jsx';
import { ChevronRight, Database, History, RotateCcw, Trash2 } from 'lucide-react';
import SettingsPageHeader from '../components/settings/SettingsPageHeader.jsx';
import SettingsShell from '../components/settings/SettingsShell.jsx';
import SettingsFilterSelect from '../components/settings/SettingsFilterSelect.jsx';
import ChangeTypeBadge from '../components/settings/ChangeTypeBadge.jsx';
import RevisionDetailDrawer from '../components/settings/RevisionDetailDrawer.jsx';
import { useConfirmDeleteDialog } from '../context/ConfirmDeleteContext.jsx';
import {
  formatSettingsWhen,
  resourceLabel,
  snapshotTitle,
} from '../components/settings/settingsUtils.js';
import SearchInput from '../components/ui/SearchInput.jsx';

const TYPE_FILTERS = [
  { value: 'all', label: 'All resources' },
  { value: 'company', label: 'Companies' },
  { value: 'lead', label: 'Contacts' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'task', label: 'Tasks' },
  { value: 'sequence', label: 'Sequences' },
  { value: 'interaction', label: 'Interactions' },
];

const CHANGE_FILTERS = [
  { value: 'all', label: 'All changes' },
  { value: 'soft_delete', label: 'Deletions' },
  { value: 'restore', label: 'Restores' },
  { value: 'update', label: 'Updates' },
  { value: 'rollback', label: 'Rollbacks' },
];

export default function DataRecoveryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [changeFilter, setChangeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [selectedPreview, setSelectedPreview] = useState(null);
  const { confirmDelete: confirmRollback } = useConfirmDeleteDialog();

  async function load() {
    const rows = await fetchRecentRevisions(120);
    setItems(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.resourceType !== typeFilter) return false;
      if (changeFilter !== 'all' && item.changeType !== changeFilter) return false;
      if (!query) return true;
      const snapshot = item.snapshotAfter || item.snapshot || {};
      const haystack = [
        item.resourceType,
        item.resourceId,
        item.changedBy,
        item.changeType,
        snapshotTitle(item.resourceType, snapshot),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [items, typeFilter, changeFilter, search]);

  const stats = useMemo(() => {
    const deletions = items.filter((item) => item.changeType === 'soft_delete').length;
    const rollbacks = items.filter((item) => item.changeType === 'rollback').length;
    const types = new Set(items.map((item) => item.resourceType)).size;
    return { deletions, rollbacks, types };
  }, [items]);

  function openDetail(item) {
    setSelectedId(item._id);
    setSelectedPreview(item);
  }

  async function handleRollback(revision) {
    const id = revision?._id || revision;
    const ok = await confirmRollback({
      title: 'Rollback to this version?',
      message: 'This will restore the record to the state captured in this revision.',
      confirmLabel: 'Rollback',
      icon: RotateCcw,
      accent: 'emerald',
      confirmClass: 'crm-btn-primary',
      footerNote: 'This creates a new revision. Nothing is deleted, and the current state stays recoverable.',
    });
    if (!ok) return;

    setBusyId(id);
    setError('');
    try {
      await rollbackRevision(id);
      await load();
      setSelectedId('');
      setSelectedPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <PageShell>
      <SettingsShell>
        <div className="crm-settings-page">
          <SettingsPageHeader
            title="Data recovery"
            subtitle="Review version history and roll back changes. Click any revision for the full diff."
          />

          <PageSection>
            <MetricGrid cols={3}>
              <StatCard compact label="Revisions" value={items.length} icon={Database} tone="brand" />
              <StatCard compact label="Deletions" value={stats.deletions} icon={Trash2} tone="warning" />
              <StatCard compact label="Rollbacks" value={stats.rollbacks} icon={RotateCcw} tone="info" helpText={`${stats.types} resource types`} />
            </MetricGrid>
          </PageSection>

          <PageSection>
            <div className="crm-settings-toolbar">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search record, user, ID…"
                className="crm-settings-search"
              />
              <SettingsFilterSelect
                label="Resource type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={TYPE_FILTERS}
              />
              <SettingsFilterSelect
                label="Change type"
                value={changeFilter}
                onChange={setChangeFilter}
                options={CHANGE_FILTERS}
              />
              <span className="crm-settings-toolbar-meta">{filtered.length} shown</span>
            </div>

            {error && <Alert className="mb-3">{error}</Alert>}

            {loading ? (
              <LoadingState label="Loading revisions…" />
            ) : filtered.length === 0 ? (
              <EmptyState title="No revisions found" description="Try a different filter or search term." />
            ) : (
              <div className="crm-settings-feed">
                {filtered.map((item) => {
                  const snapshot = item.snapshotAfter || item.snapshot;
                  return (
                    <button
                      key={item._id}
                      type="button"
                      className="crm-settings-feed-item"
                      onClick={() => openDetail(item)}
                    >
                      <div className="crm-settings-feed-icon is-recovery">
                        <History className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <ChangeTypeBadge changeType={item.changeType} />
                          <span className="crm-settings-badge is-neutral">v{item.revisionNumber}</span>
                          <span className="text-xs text-neutral-400">{formatSettingsWhen(item.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-[var(--color-ink)]">
                          {snapshotTitle(item.resourceType, snapshot)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {resourceLabel(item.resourceType)} · {item.changedBy || 'admin'}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                    </button>
                  );
                })}
              </div>
            )}
          </PageSection>
        </div>
      </SettingsShell>

      <RevisionDetailDrawer
        revisionId={selectedId}
        preview={selectedPreview}
        rollingBack={busyId === selectedId}
        onClose={() => { setSelectedId(''); setSelectedPreview(null); }}
        onRollback={handleRollback}
      />
    </PageShell>
  );
}
