import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  crmApiFetch,
  formatCurrency,
  updateOngoingJob,
  deleteOngoingJobWithUndo,
  deleteOngoingJobs,
} from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { ongoingJobSortAccessors } from '../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useSpotlightDeepLink } from '../hooks/useSpotlightDeepLink.js';
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  PageShell,
  PageSection,
  MetricGrid,
  StatCard,
  cn,
} from '../components/ui/primitives.jsx';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  List,
  MessagesSquare,
  Plus,
  Settings2,
  Users,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import CreateOngoingJobModal from '../components/sales/CreateOngoingJobModal.jsx';
import OngoingJobStageEditorModal from '../components/sales/OngoingJobStageEditorModal.jsx';
import OngoingJobDrawer from '../components/sales/OngoingJobDrawer.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildOngoingJobFilterSchema,
} from '../components/ui/advancedFilter/index.js';

const DEFAULT_STAGES = [
  'Inquiry',
  'Waiting Adv/ PO',
  'In Production',
  'Installation',
  'Waiting Balance Payment',
  'Job Done',
  'Quotation Sent',
  'Job Lost',
  'Design',
  'Ready',
];
const STAGE_TONES = {
  'Job Done': 'success',
  'Job Lost': 'neutral',
  'Waiting Balance Payment': 'warning',
  'Waiting Adv/ PO': 'warning',
  Inquiry: 'info',
  Design: 'info',
  Ready: 'success',
  'In Production': 'warning',
  Installation: 'info',
  'Quotation Sent': 'info',
};
const STAGE_ACCENTS = ['#0284c7', '#ca8a04', '#ea580c', '#0d9488', '#d97706', '#059669', '#2563eb', '#64748b', '#7c3aed', '#0891b2'];
const LATE_STAGES = new Set(['Installation', 'Waiting Balance Payment', 'Ready']);

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getExecutionSummary(item) {
  return item.executionSummary || {
    totalTasks: 0,
    openTasks: 0,
    clientStakeholders: (item.primaryLeadId ? 1 : 0) + (item.stakeholderLeadIds?.length || 0),
    internalCollaborators: (item.owner ? 1 : 0) + (item.collaborators?.length || 0),
  };
}

export default function OngoingJobsPage() {
  const [data, setData] = useState({ items: [], stages: DEFAULT_STAGES, owners: [] });
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState('admin');
  const [isDesigner, setIsDesigner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [dragOverStage, setDragOverStage] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  async function load() {
    const [status, ongoingJobs] = await Promise.all([
      crmApiFetch('/api/admin/status'),
      crmApiFetch('/api/admin/sales/ongoing-jobs'),
    ]);
    const designer = status?.user?.role === 'designer';
    if (status?.username) setCurrentUser(status.username);
    setIsDesigner(designer);
    setData(ongoingJobs);
    if (!designer) {
      const [companyData, projectData, leadsData] = await Promise.all([
        crmApiFetch('/api/admin/companies?limit=500'),
        crmApiFetch('/api/admin/projects'),
        crmApiFetch('/api/admin/leads?limit=500').catch(() => ({ items: [] })),
      ]);
      setCompanies(companyData.items || []);
      setCampaigns(projectData || []);
      setContacts(leadsData.items || []);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  useSpotlightDeepLink({
    recordType: 'ongoing_job',
    onOpen: (job) => setSelectedId(job._id),
    findRecord: useCallback((id) => data.items?.find((item) => String(item._id) === String(id)), [data.items]),
    resolveRecord: useCallback(async (id) => ({ _id: id }), []),
    ready: !loading,
  });

  const visibleItems = data.items || [];
  const stages = data.stages?.length ? data.stages : DEFAULT_STAGES;

  const ongoingJobSchema = useMemo(() => buildOngoingJobFilterSchema(stages), [stages]);
  const {
    filtered: advancedFilteredItems,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(visibleItems, ongoingJobSchema);

  const filtered = advancedFilteredItems;

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'updatedAt',
    defaultDir: 'desc',
    accessors: ongoingJobSortAccessors,
  });

  const sortedItems = useMemo(() => sortItems(filtered), [filtered, sortItems]);

  const selection = useRowSelection(sortedItems);

  const active = visibleItems.filter((item) => !['Job Done', 'Job Lost', 'Closed Won', 'Closed Lost'].includes(item.stage));
  const pipelineValue = active.reduce((sum, item) => sum + (item.valueAed || 0), 0);
  const lateStageCount = active.filter((item) => LATE_STAGES.has(item.stage)).length;
  const avgDealValue = active.length ? Math.round(pipelineValue / active.length) : 0;
  const openExecutionTasks = active.reduce((sum, item) => sum + (getExecutionSummary(item).openTasks || 0), 0);
  const activeStakeholders = active.reduce((sum, item) => sum + (getExecutionSummary(item).clientStakeholders || 0), 0);
  const activeCollaborators = active.reduce((sum, item) => sum + (getExecutionSummary(item).internalCollaborators || 0), 0);

  async function handleOngoingJobUpdated(updated) {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
    }));
  }

  async function moveOngoingJob(id, stage) {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => item._id === id ? { ...item, stage } : item),
    }));
    try {
      await updateOngoingJob(id, { stage });
    } catch (err) {
      setError(err.message);
      await load();
    }
  }

  function handlePipelineSaved(config) {
    setData((current) => ({
      ...current,
      stages: config.stages.map((stage) => stage.name),
    }));
    load().catch(() => {});
  }

  const confirmDeleteOngoingJob = useConfirmDelete({
    resourceType: 'ongoing_job',
    deleteFn: deleteOngoingJobWithUndo,
    onRemoved: (id) => {
      setData((current) => ({
        ...current,
        items: current.items.filter((item) => item._id !== id),
      }));
      if (selectedId === id) setSelectedId('');
    },
    onRestored: () => load(),
    defaultConfirm: 'Delete this Ongoing Job? You can undo within 30 seconds.',
  });

  const runBulkDeleteOngoingJobs = useBulkDelete({
    resourceType: 'ongoing_job',
    bulkDeleteFn: deleteOngoingJobs,
    getLabelForId: (id) => {
      const item = visibleItems.find((row) => row._id === id);
      return `Deleted Ongoing Job: ${item?.name || 'Ongoing Job'}`;
    },
    defaultConfirm: 'Delete these Ongoing Jobs? You can undo each within 30 seconds.',
    onRemoved: (ids) => {
      setData((current) => ({
        ...current,
        items: current.items.filter((item) => !ids.includes(item._id)),
      }));
      if (selectedId && ids.includes(selectedId)) setSelectedId('');
      selection.clearSelection();
    },
    onRestored: () => load(),
  });

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteOngoingJobs(selection.selectedArray, { noun: 'ongoing job' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteOngoingJobItem(item) {
    try {
      await confirmDeleteOngoingJob(
        item._id,
        `Deleted Ongoing Job: ${item.name || 'Ongoing Job'}`,
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <PageShell><LoadingState label="Loading Ongoing Jobs…" /></PageShell>;

  return (
    <PageShell className="max-w-none">
      <PageHeader />

      {error && <Alert>{error}</Alert>}

      {/* Reduced Compact Metrics */}
      <PageSection>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-2xs flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand shrink-0">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Active Ongoing Jobs</p>
              <p className="text-sm font-bold tabular-nums text-neutral-900">{active.length}</p>
            </div>
          </div>

          {!isDesigner && (
            <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-2xs flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Target className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Open pipeline</p>
                <p className="text-sm font-bold tabular-nums text-neutral-900">{formatCurrency(pipelineValue)}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-2xs flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Late-stage jobs</p>
              <p className="text-sm font-bold tabular-nums text-neutral-900">{lateStageCount}</p>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Buttons & Toolbar Area Right Above Pipeline */}
      <PageSection>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="crm-view-toggle" role="group" aria-label="Ongoing Jobs view">
              <button
                type="button"
                className={viewMode === 'board' ? 'is-active' : ''}
                onClick={() => setViewMode('board')}
                aria-pressed={viewMode === 'board'}
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'is-active' : ''}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
              >
                <List className="h-4 w-4" />
                Table
              </button>
            </div>

            <AdvancedFilterPopover
              schema={ongoingJobSchema}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowStageEditor(true)} className="crm-btn-secondary">
              <Settings2 className="h-4 w-4" />
              Edit stages
            </button>
            <button type="button" onClick={() => { setError(''); setShowCreate(true); }} className="crm-btn-primary">
              <Plus className="h-4 w-4" />
              New Ongoing Job
            </button>
          </div>
        </div>

        <AdvancedFilterChips
          schema={ongoingJobSchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mb-3"
        />

        <Card className={cn('mt-4', viewMode === 'board' ? 'p-4 sm:p-5' : 'overflow-hidden')}>
          {!filtered.length ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title={visibleItems.length ? 'No Ongoing Jobs match' : 'No Ongoing Jobs yet'}
              description={visibleItems.length
                ? 'Try adjusting your search or filters, or create a new Ongoing Job.'
                : 'Create your first Ongoing Job to start tracking work in progress.'}
              action={!visibleItems.length ? (
                <button type="button" onClick={() => setShowCreate(true)} className="crm-btn-primary">
                  <Plus className="h-4 w-4" />
                  Create Ongoing Job
                </button>
              ) : null}
            />
          ) : viewMode === 'board' ? (
            <OngoingJobsBoard
              stages={stages}
              items={filtered}
              dragOverStage={dragOverStage}
              setDragOverStage={setDragOverStage}
              onMove={moveOngoingJob}
              onOpen={setSelectedId}
              onDelete={isDesigner ? null : deleteOngoingJobItem}
              isDesigner={isDesigner}
            />
          ) : (
            <>
              <BulkSelectionBar
                count={selection.selectionCount}
                noun="ongoing job"
                onDelete={handleBulkDelete}
                onClear={selection.clearSelection}
                deleting={bulkDeleting}
              />
              <TableSortIndicator
                sortKey={sortKey}
                sortDir={sortDir}
                sortLabel={sortLabel}
                onToggle={() => toggleSort(sortKey)}
                onClear={clearSort}
              />
            <OngoingJobsTable
              items={sortedItems}
              stages={stages}
              onMove={moveOngoingJob}
              onOpen={setSelectedId}
              onDelete={isDesigner ? null : deleteOngoingJobItem}
              selection={isDesigner ? null : selection}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              isDesigner={isDesigner}
            />
            </>
          )}
        </Card>
      </PageSection>

      <CreateOngoingJobModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => load().catch((err) => setError(err.message))}
        companies={companies}
        campaigns={campaigns}
        contacts={contacts}
        currentUser={currentUser}
      />

      <OngoingJobStageEditorModal
        open={showStageEditor}
        onClose={() => setShowStageEditor(false)}
        stages={stages}
        onSaved={handlePipelineSaved}
      />

      <OngoingJobDrawer
        ongoingJobId={selectedId || ''}
        onClose={() => setSelectedId('')}
        onUpdated={handleOngoingJobUpdated}
        onDelete={deleteOngoingJobItem}
        stages={stages}
      />
    </PageShell>
  );
}

function OngoingJobsBoard({ stages, items, dragOverStage, setDragOverStage, onMove, onOpen, onDelete, isDesigner = false }) {
  return (
    <div className="crm-scroll crm-pipeline-scroll overflow-x-auto">
      <div className="flex min-w-max gap-2.5 sm:gap-3">
        {stages.map((stage, stageIndex) => {
          const stageItems = items.filter((item) => item.stage === stage);
          const stageValue = stageItems.reduce((sum, item) => sum + (item.valueAed || 0), 0);
          return (
            <section
              key={stage}
              className={`crm-pipeline-column ${dragOverStage === stage ? 'is-drag-over' : ''}`}
              style={{ '--stage-accent': STAGE_ACCENTS[stageIndex % STAGE_ACCENTS.length] }}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(''); }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                setDragOverStage('');
                if (id) onMove(id, stage);
              }}
            >
              <header className="crm-pipeline-column-head">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wide">{stage}</h2>
                  <Badge tone={STAGE_TONES[stage] || 'neutral'} className="py-0 px-1.5 text-[9px]">{stageItems.length}</Badge>
                </div>
                {!isDesigner && <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-neutral-500">{formatCurrency(stageValue)}</p>}
              </header>
              <div className="space-y-4">
                {stageItems.map((item, index) => (
                  <OngoingJobCard
                    key={item._id}
                    item={item}
                    index={index}
                    stages={stages}
                    onMove={onMove}
                    onOpen={onOpen}
                    onDelete={onDelete}
                    isDesigner={isDesigner}
                  />
                ))}
                {!stageItems.length && (
                  <div className="rounded-lg border border-dashed border-neutral-300 px-2 py-6 text-center text-[10px] text-neutral-400">No Ongoing Jobs</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OngoingJobsTable({ items, stages, onMove, onOpen, onDelete, selection, sortKey, sortDir, onSort, isDesigner = false }) {
  return (
    <DataTableShell minWidth={isDesigner ? 850 : 1380}>
      <table className="crm-table crm-table-excel text-xs">
        <thead>
          <tr className="crm-table-head text-[10px] uppercase tracking-wider bg-neutral-100/80">
            {selection ? <BulkSelectHeaderCell selection={selection} ariaLabel="Select all Ongoing Jobs" /> : null}
            <SortableTableHeader label="Ongoing Job" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={onSort} />
            <SortableTableHeader label="Company" sortKey="company" activeKey={sortKey} direction={sortDir} onSort={onSort} />
            <th className="crm-pipeline-stage-cell">Stage</th>
            <th>Workspace</th>
            {!isDesigner && <th>Campaign</th>}
            {!isDesigner && <SortableTableHeader label="Value" sortKey="valueAed" activeKey={sortKey} direction={sortDir} onSort={onSort} align="right" />}
            <SortableTableHeader label="Owner" sortKey="owner" activeKey={sortKey} direction={sortDir} onSort={onSort} />
            {!isDesigner && <SortableTableHeader label="Opened" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={onSort} />}
            <SortableTableHeader label="Last updated" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={onSort} />
            {!isDesigner && <th className="text-center">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200/80">
          {items.map((item) => (
            <ClickableTableRow key={item._id} onClick={() => onOpen(item._id)} className="hover:bg-sky-50/50 text-[11px] h-8">
              {selection ? (
                <BulkSelectRowCell
                  id={item._id}
                  selection={selection}
                  ariaLabel={`Select ${item.name}`}
                />
              ) : null}
              <td className="py-1 px-2.5">
                <p className="font-bold text-[var(--color-ink)] truncate max-w-[220px]">{item.name}</p>
                {item.eventName && <p className="text-[10px] text-neutral-500 truncate max-w-[220px]">{item.eventName}</p>}
              </td>
              <td className="py-1 px-2.5 text-neutral-700 truncate max-w-[150px]">{item.companyId?.companyName || '—'}</td>
              <td className="py-1 px-2.5 crm-pipeline-stage-cell" onClick={stopRowClick}>
                <select
                  aria-label={`Move ${item.name} to stage`}
                  className="crm-select h-6 py-0 px-1.5 text-[10px] font-semibold"
                  value={item.stage}
                  onChange={(e) => onMove(item._id, e.target.value)}
                >
                  {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </td>
              <td className="py-1 px-2.5">
                <OngoingJobWorkspaceSummary item={item} compact />
              </td>
              {!isDesigner && (
                <td className="py-1 px-2.5 text-neutral-700">
                  {item.campaignId?.projectName ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      <FolderKanban className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[120px]">{item.campaignId.projectName}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-400">No campaign</span>
                  )}
                </td>
              )}
              {!isDesigner && <td className="py-1 px-2.5 text-right tabular-nums font-bold text-neutral-900">{formatCurrency(item.valueAed)}</td>}
              <td className="py-1 px-2.5 text-neutral-700">{item.owner || '—'}</td>
              {!isDesigner && <td className="py-1 px-2.5 text-neutral-500 text-[10px]">{formatShortDate(item.createdAt || item.expectedCloseDate)}</td>}
              <td className="py-1 px-2.5 text-neutral-500 text-[10px]">
                <span className="block font-medium">{formatShortDate(item.updatedAt)}</span>
              </td>
              {!isDesigner && (
                <td className="py-1 px-2.5 text-center" onClick={stopRowClick}>
                  <DeleteIconButton
                    label={`Delete ${item.name}`}
                    onClick={() => onDelete?.(item)}
                    size="sm"
                  />
                </td>
              )}
            </ClickableTableRow>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}

function OngoingJobCard({ item, stages, onMove, onOpen, onDelete, index, isDesigner = false }) {
  const summary = getExecutionSummary(item);
  return (
    <article
      className="crm-deal-card is-clickable !p-3"
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item._id); }}
      onClick={() => onOpen(item._id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item._id); }}
      role="button"
      tabIndex={0}
      style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Target className="h-3 w-3" />
        </div>
        <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-[var(--color-ink)] truncate">{item.name}</p>
        {!isDesigner && onDelete ? (
          <span onClick={stopRowClick}>
            <DeleteIconButton
              label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
              size="sm"
            />
          </span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-[10px] font-medium text-neutral-600">{item.companyId?.companyName || 'Unknown company'}</p>
      {item.eventName && <p className="mt-0.5 truncate text-[9px] text-neutral-400">{item.eventName}</p>}
      <div className="mt-2">
        <OngoingJobWorkspaceSummary item={item} />
      </div>
      {!!item.tags?.length && (
        <div className="mt-1.5 flex flex-wrap gap-1">{(item.tags || []).map((tag) => <span key={tag} className="crm-deal-tag text-[9px] py-0 px-1.5">{tag}</span>)}</div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {!isDesigner && <p className="text-xs font-bold tabular-nums text-[var(--color-ink)]">{formatCurrency(item.valueAed)}</p>}
        <span className="flex items-center gap-1 text-[9px] text-neutral-400">
          <CalendarDays className="h-2.5 w-2.5" />
          {formatShortDate(item.createdAt || item.expectedCloseDate)}
        </span>
      </div>
      {summary.openTasks > 0 && (
        <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[9px] leading-snug text-amber-900 border border-amber-200/60">
          <strong>Execution:</strong> {summary.openTasks} open task{summary.openTasks === 1 ? '' : 's'}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-neutral-200/60 pt-2 text-[9px]">
        <span className="flex items-center gap-1 font-medium text-neutral-500">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-[7px] font-bold text-white">
            {String(item.owner || 'A').slice(0, 1).toUpperCase()}
          </span>
          {item.owner || 'admin'}
        </span>
        <span className="text-neutral-400">
          {formatShortDate(item.updatedAt)}
        </span>
      </div>
      <div className="relative mt-1.5" onClick={stopRowClick}>
        <select
          aria-label={`Move ${item.name} to stage`}
          className="crm-select py-0 px-1.5 text-[10px] font-semibold h-6"
          value={item.stage}
          onChange={(e) => onMove(item._id, e.target.value)}
        >
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </div>
    </article>
  );
}

function OngoingJobWorkspaceSummary({ item, compact = false }) {
  const summary = getExecutionSummary(item);
  const chips = [
    { key: 'tasks', icon: CheckSquare, label: `${summary.openTasks}/${summary.totalTasks} tasks`, tone: summary.openTasks ? 'amber' : 'neutral' },
    { key: 'stakeholders', icon: MessagesSquare, label: `${summary.clientStakeholders} client`, tone: summary.clientStakeholders ? 'sky' : 'neutral' },
    { key: 'team', icon: Users, label: `${summary.internalCollaborators} internal`, tone: summary.internalCollaborators ? 'emerald' : 'neutral' },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map(({ key, icon: Icon, label, tone }) => (
        <span
          key={key}
          className={[
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
            tone === 'amber' ? 'bg-amber-50 text-amber-800' : '',
            tone === 'sky' ? 'bg-sky-50 text-sky-800' : '',
            tone === 'emerald' ? 'bg-emerald-50 text-emerald-800' : '',
            tone === 'neutral' ? 'bg-neutral-100 text-neutral-600' : '',
          ].join(' ')}
        >
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
      ))}
    </div>
  );
}
