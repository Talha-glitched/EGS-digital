import { useEffect, useMemo, useState } from 'react';
import {
  crmApiFetch,
  formatCurrency,
  updateOpportunity,
  deleteOpportunityWithUndo,
} from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
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
  LayoutGrid,
  List,
  Plus,
  Settings2,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import CreateOpportunityModal from '../components/sales/CreateOpportunityModal.jsx';
import PipelineStageEditorModal from '../components/sales/PipelineStageEditorModal.jsx';
import OpportunityDrawer from '../components/sales/OpportunityDrawer.jsx';
import Drawer from '../components/ui/Drawer.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildOpportunityFilterSchema,
} from '../components/ui/advancedFilter/index.js';

const DEFAULT_STAGES = ['New Lead', 'Contacted', 'Qualified', 'Discovery / Site Visit', 'Brief Received', 'Estimate In Progress', 'Proposal Sent', 'Decision Maker Review', 'Negotiation', 'Contract Sent', 'Closed Won', 'Closed Lost'];
const STAGE_TONES = { 'Closed Won': 'success', 'Closed Lost': 'neutral', Negotiation: 'warning', 'Contract Sent': 'success', 'New Lead': 'info' };
const STAGE_ACCENTS = ['#7c3aed', '#2563eb', '#0284c7', '#0891b2', '#0d9488', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#be123c', '#059669', '#64748b'];
const LATE_STAGES = new Set(['Negotiation', 'Contract Sent', 'Decision Maker Review']);

const DEMO_OPPORTUNITIES = [
  { _id: 'demo-1', name: 'GITEX 2026 flagship stand', companyId: { companyName: 'Nexa Technologies' }, stage: 'New Lead', valueAed: 185000, eventName: 'GITEX Global 2026', nextAction: 'Confirm stand size and procurement contact', expectedCloseDate: '2026-07-18', owner: 'Masuood', createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-20T10:00:00Z', lastModifiedBy: 'Masuood', tags: ['Inbound', 'Exhibition'] },
  { _id: 'demo-2', name: 'Arab Health pavilion build', companyId: { companyName: 'Medline Gulf' }, stage: 'Contacted', valueAed: 320000, eventName: 'Arab Health 2027', nextAction: 'Follow up on concept brief', expectedCloseDate: '2026-08-05', owner: 'Talha', createdAt: '2026-06-17T10:00:00Z', updatedAt: '2026-06-18T10:00:00Z', lastModifiedBy: 'Talha', tags: ['Apollo', 'Pavilion'] },
  { _id: 'demo-3', name: 'Graduation ceremony production', companyId: { companyName: 'Northbridge University' }, stage: 'Qualified', valueAed: 460000, eventName: 'Class of 2027', nextAction: 'Arrange venue walkthrough', expectedCloseDate: '2026-07-30', owner: 'Masuood', createdAt: '2026-06-15T10:00:00Z', updatedAt: '2026-06-16T10:00:00Z', lastModifiedBy: 'Masuood', tags: ['Referral', 'Graduation'] },
  { _id: 'demo-4', name: 'ADIPEC double-decker stand', companyId: { companyName: 'Apex Energy Systems' }, stage: 'Discovery / Site Visit', valueAed: 680000, eventName: 'ADIPEC 2026', nextAction: 'Site visit Tuesday at 11:00', expectedCloseDate: '2026-07-12', owner: 'Talha', createdAt: '2026-06-18T10:00:00Z', updatedAt: '2026-06-19T10:00:00Z', lastModifiedBy: 'Talha', tags: ['Strategic', 'Exhibition'] },
  { _id: 'demo-5', name: 'Dubai Mall seasonal activation', companyId: { companyName: 'Maison Verde' }, stage: 'Brief Received', valueAed: 140000, eventName: 'Q4 Retail Activation', nextAction: 'Complete material and access review', expectedCloseDate: '2026-07-22', owner: 'Joy', createdAt: '2026-06-13T10:00:00Z', updatedAt: '2026-06-14T10:00:00Z', lastModifiedBy: 'Joy', tags: ['Retail', 'Repeat client'] },
  { _id: 'demo-6', name: 'Corporate HQ wayfinding', companyId: { companyName: 'Crescent Holdings' }, stage: 'Estimate In Progress', valueAed: 95000, eventName: 'HQ Fitout', nextAction: 'Finalize bill of quantities', expectedCloseDate: '2026-07-08', owner: 'Joy', createdAt: '2026-06-11T10:00:00Z', updatedAt: '2026-06-12T10:00:00Z', lastModifiedBy: 'Joy', tags: ['Fitout'] },
  { _id: 'demo-7', name: 'Gulfood custom island stand', companyId: { companyName: 'Al Noor Foods' }, stage: 'Proposal Sent', valueAed: 275000, eventName: 'Gulfood 2027', nextAction: 'Proposal review call Thursday', expectedCloseDate: '2026-07-04', owner: 'Masuood', createdAt: '2026-06-16T10:00:00Z', updatedAt: '2026-06-17T10:00:00Z', lastModifiedBy: 'Masuood', tags: ['Proposal sent', 'Exhibition'] },
  { _id: 'demo-8', name: 'Regional brand rollout', companyId: { companyName: 'Vertex Mobility' }, stage: 'Decision Maker Review', valueAed: 510000, eventName: 'UAE Retail Rollout', nextAction: 'Secure CFO approval meeting', expectedCloseDate: '2026-06-30', owner: 'Talha', createdAt: '2026-06-08T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z', lastModifiedBy: 'Talha', tags: ['Multi-site', 'High value'] },
  { _id: 'demo-9', name: 'Orion Defence pavilion', companyId: { companyName: 'Orion Defence' }, stage: 'Negotiation', valueAed: 740000, eventName: 'Dubai Airshow 2027', nextAction: 'Resolve payment milestone terms', expectedCloseDate: '2026-06-27', owner: 'Masuood', createdAt: '2026-06-04T10:00:00Z', updatedAt: '2026-06-06T10:00:00Z', lastModifiedBy: 'Masuood', tags: ['Negotiation', 'Strategic'] },
  { _id: 'demo-10', name: 'University ceremony programme', companyId: { companyName: 'Emirates Technical University' }, stage: 'Contract Sent', valueAed: 390000, eventName: 'Graduation 2027', nextAction: 'Receive signed contract and deposit', expectedCloseDate: '2026-06-24', owner: 'Joy', createdAt: '2026-06-19T10:00:00Z', updatedAt: '2026-06-20T10:00:00Z', lastModifiedBy: 'Joy', tags: ['Contract sent', 'Graduation'] },
  { _id: 'demo-11', name: 'Philips congress adaptation', companyId: { companyName: 'Philips Middle East' }, stage: 'Closed Won', valueAed: 225000, eventName: 'Healthcare Congress', nextAction: 'Handover to production', expectedCloseDate: '2026-06-20', owner: 'Talha', createdAt: '2026-05-31T10:00:00Z', updatedAt: '2026-06-01T10:00:00Z', lastModifiedBy: 'Talha', tags: ['Won', 'Repeat client'] },
  { _id: 'demo-12', name: 'Hospitality exhibition stand', companyId: { companyName: 'Harbour Hospitality' }, stage: 'Closed Lost', valueAed: 165000, eventName: 'The Hotel Show', nextAction: 'Record loss reason and nurture', expectedCloseDate: '2026-06-15', owner: 'Joy', createdAt: '2026-05-22T10:00:00Z', updatedAt: '2026-05-25T10:00:00Z', lastModifiedBy: 'Joy', tags: ['Lost'] },
];

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SalesPipelinePage() {
  const [data, setData] = useState({ items: [], stages: DEFAULT_STAGES, owners: [] });
  const [companies, setCompanies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showStageEditor, setShowStageEditor] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [previewItems, setPreviewItems] = useState(DEMO_OPPORTUNITIES);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [dragOverStage, setDragOverStage] = useState('');

  const selectedDemo = useMemo(
    () => (String(selectedId).startsWith('demo-') ? previewItems.find((item) => item._id === selectedId) : null),
    [selectedId, previewItems],
  );

  async function load() {
    const [status, opportunities, companyData, projectData, leadsData] = await Promise.all([
      crmApiFetch('/api/admin/status'),
      crmApiFetch('/api/admin/sales/opportunities'),
      crmApiFetch('/api/admin/companies?limit=500'),
      crmApiFetch('/api/admin/projects'),
      crmApiFetch('/api/admin/leads?limit=500').catch(() => ({ items: [] })),
    ]);
    if (status?.username) setCurrentUser(status.username);
    setData(opportunities);
    setCompanies(companyData.items || []);
    setCampaigns(projectData || []);
    setContacts(leadsData.items || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const previewMode = data.items.length === 0;
  const visibleItems = previewMode ? previewItems : data.items;
  const stages = data.stages?.length ? data.stages : DEFAULT_STAGES;

  const opportunitySchema = useMemo(() => buildOpportunityFilterSchema(stages), [stages]);
  const {
    filtered: advancedFilteredItems,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(visibleItems, opportunitySchema);

  const filtered = advancedFilteredItems;

  const active = visibleItems.filter((item) => !['Closed Won', 'Closed Lost'].includes(item.stage));
  const pipelineValue = active.reduce((sum, item) => sum + (item.valueAed || 0), 0);
  const lateStageCount = active.filter((item) => LATE_STAGES.has(item.stage)).length;
  const avgDealValue = active.length ? Math.round(pipelineValue / active.length) : 0;

  async function handleOpportunityUpdated(updated) {
    if (previewMode) {
      setPreviewItems((items) => items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
      return;
    }
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
    }));
  }

  async function moveOpportunity(id, stage) {
    if (String(id).startsWith('demo-')) {
      setPreviewItems((items) => items.map((item) => item._id === id ? { ...item, stage } : item));
      return;
    }
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

  async function deleteOpportunityItem(item) {
    if (String(item._id).startsWith('demo-')) {
      setPreviewItems((items) => items.filter((row) => row._id !== item._id));
      return;
    }
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
          <StatCard compact label="Open pipeline" value={formatCurrency(pipelineValue)} helpText="Total potential contract value" icon={Target} />
          <StatCard compact label="Avg deal value" value={formatCurrency(avgDealValue)} helpText="Average value across active deals" icon={TrendingUp} tone="success" />
          <StatCard compact label="Late-stage deals" value={lateStageCount} helpText="In negotiation, review, or contract sent" icon={UserRound} tone="info" />
        </MetricGrid>
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
              ? 'Drag cards between columns or use the stage menu · click a card to open details'
              : `${filtered.length} opportunit${filtered.length === 1 ? 'y' : 'ies'} · click a row to open details`}
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
              onDelete={deleteOpportunityItem}
            />
          ) : (
            <PipelineTable
              items={filtered}
              stages={stages}
              onMove={moveOpportunity}
              onOpen={setSelectedId}
              onDelete={deleteOpportunityItem}
            />
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
        opportunityId={selectedId && !String(selectedId).startsWith('demo-') ? selectedId : ''}
        onClose={() => setSelectedId('')}
        onUpdated={handleOpportunityUpdated}
        onDelete={deleteOpportunityItem}
        stages={stages}
      />

      <Drawer
        open={Boolean(selectedDemo)}
        onClose={() => setSelectedId('')}
        title={selectedDemo?.name || 'Opportunity'}
        subtitle={selectedDemo?.companyId?.companyName || 'Sales opportunity'}
        size="lg"
      >
        {selectedDemo && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-neutral-500">Stage</p><p className="font-semibold">{selectedDemo.stage}</p></div>
              <div><p className="text-xs text-neutral-500">Value</p><p className="font-semibold">{formatCurrency(selectedDemo.valueAed)}</p></div>
              <div><p className="text-xs text-neutral-500">Owner</p><p className="font-semibold">{selectedDemo.owner}</p></div>
              <div><p className="text-xs text-neutral-500">Event</p><p className="font-semibold">{selectedDemo.eventName || '—'}</p></div>
              <div><p className="text-xs text-neutral-500">Opened</p><p className="font-semibold">{formatShortDate(selectedDemo.createdAt)}</p></div>
              <div><p className="text-xs text-neutral-500">Last updated</p><p className="font-semibold">{formatShortDate(selectedDemo.updatedAt)} by {selectedDemo.lastModifiedBy}</p></div>
            </div>
            {selectedDemo.nextAction && <p><span className="font-semibold">Next action:</span> {selectedDemo.nextAction}</p>}
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}

function PipelineBoard({ stages, items, dragOverStage, setDragOverStage, onMove, onOpen, onDelete }) {
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
                <p className="mt-1 text-[11px] font-medium tabular-nums text-neutral-500">{formatCurrency(stageValue)}</p>
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

function PipelineTable({ items, stages, onMove, onOpen, onDelete }) {
  return (
    <DataTableShell minWidth={1120}>
      <table className="crm-table">
        <thead>
          <tr className="crm-table-head">
            <th>Opportunity</th>
            <th>Company</th>
            <th className="crm-pipeline-stage-cell">Stage</th>
            <th className="text-right">Value</th>
            <th>Owner</th>
            <th>Opened</th>
            <th>Last updated</th>
            <th className="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ClickableTableRow key={item._id} onClick={() => onOpen(item._id)}>
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
              <td className="text-right tabular-nums font-medium text-neutral-800">{formatCurrency(item.valueAed)}</td>
              <td className="text-neutral-700">{item.owner || '—'}</td>
              <td className="text-neutral-500">{formatShortDate(item.createdAt || item.expectedCloseDate)}</td>
              <td className="text-neutral-500">
                <span className="block">{formatShortDate(item.updatedAt)}</span>
                <span className="text-[11px] text-neutral-400">{item.lastModifiedBy || item.owner || '—'}</span>
              </td>
              <td className="text-center" onClick={stopRowClick}>
                <DeleteIconButton
                  label={`Delete ${item.name}`}
                  onClick={() => onDelete?.(item)}
                />
              </td>
            </ClickableTableRow>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}

function OpportunityCard({ item, stages, onMove, onOpen, onDelete, index }) {
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
        {onDelete ? (
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
      <div className="mt-3 flex flex-wrap gap-1.5">{(item.tags || []).map((tag) => <span key={tag} className="crm-deal-tag">{tag}</span>)}</div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-sm font-bold tabular-nums text-[var(--color-ink)]">{formatCurrency(item.valueAed)}</p>
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
