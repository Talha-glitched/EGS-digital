import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  crmApiFetch,
  formatCurrency,
  updateOpportunity,
  deleteOpportunityWithUndo,
  deleteOpportunities,
} from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { opportunitySortAccessors } from '../hooks/tableSortAccessors.js';
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
import CreateOpportunityModal from '../components/sales/CreateOpportunityModal.jsx';
import PipelineStageEditorModal from '../components/sales/PipelineStageEditorModal.jsx';
import OpportunityDrawer from '../components/sales/OpportunityDrawer.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildOpportunityFilterSchema,
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

export default function SalesPipelinePage() {
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
    const [status, opportunities] = await Promise.all([
      crmApiFetch('/api/admin/status'),
      crmApiFetch('/api/admin/sales/opportunities'),
    ]);
    const designer = status?.user?.role === 'designer';
    if (status?.username) setCurrentUser(status.username);
    setIsDesigner(designer);
    setData(opportunities);
    // Designers can't access companies/contacts, skip those fetches
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
    recordType: 'opportunity',
    onOpen: (opportunity) => setSelectedId(opportunity._id),
    findRecord: useCallback((id) => data.items?.find((item) => String(item._id) === String(id)), [data.items]),
    resolveRecord: useCallback(async (id) => ({ _id: id }), []),
    ready: !loading,
  });

  const visibleItems = data.items || [];
  const stages = data.stages?.length ? data.stages : DEFAULT_STAGES;

  const opportunitySchema = useMemo(() => buildOpportunityFilterSchema(stages), [stages]);
  const {
    filtered: advancedFilteredItems,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(visibleItems, opportunitySchema);

  const filtered = advancedFilteredItems;

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'updatedAt',
    defaultDir: 'desc',
    accessors: opportunitySortAccessors,
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

  async function handleOpportunityUpdated(updated) {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
    }));
  }

  async function moveOpportunity(id, stage) {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => item._id === id ? { ...item, stage } : item),
    }));
    try {
      await updateOpportunity(id, { stage });
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

  const confirmDeleteOpportunity = useConfirmDelete({
    resourceType: 'opportunity',
    deleteFn: deleteOpportunityWithUndo,
    onRemoved: (id) => {
      setData((current) => ({
        ...current,
        items: current.items.filter((item) => item._id !== id),
      }));
      if (selectedId === id) setSelectedId('');
    },
    onRestored: () => load(),
    defaultConfirm: 'Delete this opportunity? You can undo within 30 seconds.',
  });

  const runBulkDeleteOpportunities = useBulkDelete({
    resourceType: 'opportunity',
    bulkDeleteFn: deleteOpportunities,
    getLabelForId: (id) => {
      const item = visibleItems.find((row) => row._id === id);
      return `Deleted opportunity: ${item?.name || 'Opportunity'}`;
    },
    defaultConfirm: 'Delete these opportunities? You can undo each within 30 seconds.',
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
      await runBulkDeleteOpportunities(selection.selectedArray, { noun: 'opportunity' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteOpportunityItem(item) {
    try {
      await confirmDeleteOpportunity(
        item._id,
        `Deleted opportunity: ${item.name || 'Opportunity'}`,
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <PageShell><LoadingState label="Loading sales pipeline…" /></PageShell>;

  return (
    <PageShell className="max-w-none">
      <PageHeader
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowStageEditor(true)} className="crm-btn-secondary">
              <Settings2 className="h-4 w-4" />
              Edit stages
            </button>
            <button type="button" onClick={() => { setError(''); setShowCreate(true); }} className="crm-btn-primary">
              <Plus className="h-4 w-4" />
              New opportunity
            </button>
          </div>
        )}
      />

      {error && <Alert>{error}</Alert>}

      <PageSection>
        <MetricGrid>
          <StatCard compact label="Active opportunities" value={active.length} helpText="Excludes won, lost and deferred" icon={BriefcaseBusiness} tone="brand" />
          {!isDesigner && <StatCard compact label="Open pipeline" value={formatCurrency(pipelineValue)} helpText="Total potential contract value" icon={Target} />}
          {!isDesigner && <StatCard compact label="Avg deal value" value={formatCurrency(avgDealValue)} helpText="Average value across active deals" icon={TrendingUp} tone="success" />}
          <StatCard compact label="Late-stage deals" value={lateStageCount} helpText="In negotiation, review, or contract sent" icon={UserRound} tone="info" />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Execution workload</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">{openExecutionTasks}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">Open tasks already in motion across active opportunities.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <MessagesSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Client people involved</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">{activeStakeholders}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">Primary contacts plus additional stakeholders attached to active deals.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Internal team coverage</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-ink)]">{activeCollaborators}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">Owners and collaborators currently attached to active opportunity workspaces.</p>
              </div>
            </div>
          </Card>
        </div>
      </PageSection>

      <PageSection>
        <div className="crm-pipeline-toolbar">
          <div className="flex flex-wrap items-center gap-2">
            <div className="crm-view-toggle" role="group" aria-label="Pipeline view">
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
              schema={opportunitySchema}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
          </div>

          <p className="text-xs text-neutral-500">
            {viewMode === 'board'
              ? 'Drag cards between columns, track execution readiness, and open any card to manage people, tasks, and history'
              : `${filtered.length} opportunit${filtered.length === 1 ? 'y' : 'ies'} · table view now highlights workspace coverage, campaign context, and open execution work`}
          </p>
        </div>
        <AdvancedFilterChips
          schema={opportunitySchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mt-3"
        />

        <Card className="mt-4 overflow-hidden">
          {!filtered.length ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title={visibleItems.length ? 'No opportunities match' : 'No opportunities yet'}
              description={visibleItems.length
                ? 'Try adjusting your search or filters, or create a new opportunity.'
                : 'Create your first opportunity to start tracking deals in the pipeline.'}
              action={!visibleItems.length ? (
                <button type="button" onClick={() => setShowCreate(true)} className="crm-btn-primary">
                  <Plus className="h-4 w-4" />
                  Create opportunity
                </button>
              ) : null}
            />
          ) : viewMode === 'board' ? (
            <PipelineBoard
              stages={stages}
              items={filtered}
              dragOverStage={dragOverStage}
              setDragOverStage={setDragOverStage}
              onMove={moveOpportunity}
              onOpen={setSelectedId}
              onDelete={isDesigner ? null : deleteOpportunityItem}
              isDesigner={isDesigner}
            />
          ) : (
            <>
              <BulkSelectionBar
                count={selection.selectionCount}
                noun="opportunity"
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
            <PipelineTable
              items={sortedItems}
              stages={stages}
              onMove={moveOpportunity}
              onOpen={setSelectedId}
              onDelete={isDesigner ? null : deleteOpportunityItem}
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

      <CreateOpportunityModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => load().catch((err) => setError(err.message))}
        companies={companies}
        campaigns={campaigns}
        contacts={contacts}
        currentUser={currentUser}
      />

      <PipelineStageEditorModal
        open={showStageEditor}
        onClose={() => setShowStageEditor(false)}
        stages={stages}
        onSaved={handlePipelineSaved}
      />

      <OpportunityDrawer
        opportunityId={selectedId || ''}
        onClose={() => setSelectedId('')}
        onUpdated={handleOpportunityUpdated}
        onDelete={deleteOpportunityItem}
        stages={stages}
      />
    </PageShell>
  );
}

function PipelineBoard({ stages, items, dragOverStage, setDragOverStage, onMove, onOpen, onDelete, isDesigner = false }) {
  return (
    <div className="crm-scroll crm-pipeline-scroll overflow-x-auto p-4">
      <div className="flex min-w-max gap-4">
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
                  <h2 className="text-[12px] font-bold text-[var(--color-ink)]">{stage}</h2>
                  <Badge tone={STAGE_TONES[stage] || 'neutral'}>{stageItems.length}</Badge>
                </div>
                {!isDesigner && <p className="mt-1 text-[11px] font-medium tabular-nums text-neutral-500">{formatCurrency(stageValue)}</p>}
              </header>
              <div className="space-y-2.5">
                {stageItems.map((item, index) => (
                  <OpportunityCard
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
                  <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-8 text-center text-[11px] text-neutral-400">No opportunities</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PipelineTable({ items, stages, onMove, onOpen, onDelete, selection, sortKey, sortDir, onSort, isDesigner = false }) {
  return (
    <DataTableShell minWidth={isDesigner ? 900 : 1480}>
      <table className="crm-table">
        <thead>
          <tr className="crm-table-head">
            {selection ? <BulkSelectHeaderCell selection={selection} ariaLabel="Select all opportunities" /> : null}
            <SortableTableHeader label="Opportunity" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={onSort} />
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
        <tbody>
          {items.map((item) => (
            <ClickableTableRow key={item._id} onClick={() => onOpen(item._id)}>
              {selection ? (
                <BulkSelectRowCell
                  id={item._id}
                  selection={selection}
                  ariaLabel={`Select ${item.name}`}
                />
              ) : null}
              <td>
                <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                {item.eventName && <p className="mt-0.5 text-[11px] text-neutral-500">{item.eventName}</p>}
              </td>
              <td className="text-neutral-700">{item.companyId?.companyName || '—'}</td>
              <td className="crm-pipeline-stage-cell" onClick={stopRowClick}>
                <select
                  aria-label={`Move ${item.name} to stage`}
                  className="crm-select crm-pipeline-stage-select"
                  value={item.stage}
                  onChange={(e) => onMove(item._id, e.target.value)}
                >
                  {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </td>
              <td>
                <PipelineWorkspaceSummary item={item} compact />
              </td>
              {!isDesigner && (
                <td className="text-neutral-700">
                  {item.campaignId?.projectName ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                      <FolderKanban className="h-3 w-3" />
                      <span>{item.campaignId.projectName}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-400">No campaign</span>
                  )}
                </td>
              )}
              {!isDesigner && <td className="text-right tabular-nums font-medium text-neutral-800">{formatCurrency(item.valueAed)}</td>}
              <td className="text-neutral-700">{item.owner || '—'}</td>
              {!isDesigner && <td className="text-neutral-500">{formatShortDate(item.createdAt || item.expectedCloseDate)}</td>}
              <td className="text-neutral-500">
                <span className="block">{formatShortDate(item.updatedAt)}</span>
                <span className="text-[11px] text-neutral-400">{item.lastModifiedBy || item.owner || '—'}</span>
              </td>
              {!isDesigner && (
                <td className="text-center" onClick={stopRowClick}>
                  <DeleteIconButton
                    label={`Delete ${item.name}`}
                    onClick={() => onDelete?.(item)}
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

function OpportunityCard({ item, stages, onMove, onOpen, onDelete, index, isDesigner = false }) {
  const summary = getExecutionSummary(item);
  return (
    <article
      className="crm-deal-card is-clickable"
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item._id); }}
      onClick={() => onOpen(item._id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item._id); }}
      role="button"
      tabIndex={0}
      style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Target className="h-3.5 w-3.5" />
        </div>
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-[var(--color-ink)]">{item.name}</p>
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
      <p className="mt-2 truncate text-xs font-medium text-neutral-600">{item.companyId?.companyName || 'Unknown company'}</p>
      {item.eventName && <p className="mt-0.5 truncate text-[11px] text-neutral-400">{item.eventName}</p>}
      <div className="mt-3">
        <PipelineWorkspaceSummary item={item} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{(item.tags || []).map((tag) => <span key={tag} className="crm-deal-tag">{tag}</span>)}</div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {!isDesigner && <p className="text-sm font-bold tabular-nums text-[var(--color-ink)]">{formatCurrency(item.valueAed)}</p>}
        <span className="flex items-center gap-1 text-[10px] text-neutral-500">
          <CalendarDays className="h-3 w-3" />
          {formatShortDate(item.createdAt || item.expectedCloseDate)}
        </span>
      </div>
      {item.nextAction && (
        <p className="mt-3 line-clamp-2 rounded-lg bg-sky-50 px-2.5 py-2 text-[11px] leading-relaxed text-sky-900">
          <strong>Next:</strong> {item.nextAction}
        </p>
      )}
      {summary.openTasks > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
          <strong>Execution:</strong> {summary.openTasks} open task{summary.openTasks === 1 ? '' : 's'} in motion for this opportunity workspace.
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-3">
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-[8px] font-bold text-white">
            {String(item.owner || 'A').slice(0, 1).toUpperCase()}
          </span>
          {item.owner || 'admin'}
        </span>
        <span className="text-[10px] text-neutral-400">
          Updated {formatShortDate(item.updatedAt)}
          {item.lastModifiedBy ? ` · ${item.lastModifiedBy}` : ''}
        </span>
      </div>
      <div className="relative mt-2.5" onClick={stopRowClick}>
        <select
          aria-label={`Move ${item.name} to stage`}
          className="crm-select py-1.5 text-[11px] font-semibold"
          value={item.stage}
          onChange={(e) => onMove(item._id, e.target.value)}
        >
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </div>
    </article>
  );
}

function PipelineWorkspaceSummary({ item, compact = false }) {
  const summary = getExecutionSummary(item);
  const chips = [
    { key: 'tasks', icon: CheckSquare, label: `${summary.openTasks}/${summary.totalTasks} tasks`, tone: summary.openTasks ? 'amber' : 'neutral' },
    { key: 'stakeholders', icon: MessagesSquare, label: `${summary.clientStakeholders} client`, tone: summary.clientStakeholders ? 'sky' : 'neutral' },
    { key: 'team', icon: Users, label: `${summary.internalCollaborators} internal`, tone: summary.internalCollaborators ? 'emerald' : 'neutral' },
  ];
  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-1.5'}>
      {chips.map(({ key, icon: Icon, label, tone }) => (
        <span
          key={key}
          className={[
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold',
            tone === 'amber' ? 'bg-amber-50 text-amber-800' : '',
            tone === 'sky' ? 'bg-sky-50 text-sky-800' : '',
            tone === 'emerald' ? 'bg-emerald-50 text-emerald-800' : '',
            tone === 'neutral' ? 'bg-neutral-100 text-neutral-600' : '',
          ].join(' ')}
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}
