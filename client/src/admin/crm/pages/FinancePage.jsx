import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  crmApiFetch,
  fetchFinanceOverview,
  formatCurrency,
  formatPercent,
} from '../crmApi.js';
import {
  PageShell,
  PageSection,
  MetricGrid,
  ListBody,
  Card,
  CardHeader,
  StatCard,
  LoadingState,
  EmptyState,
  Field,
  Alert,
  Badge,
} from '../components/ui/primitives.jsx';
import ClickableTableRow from '../components/ui/ClickableTableRow.jsx';
import {
  Coins,
  TrendingUp,
  Wallet,
  Plus,
  ChevronRight,
  Sparkles,
  Building2,
} from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  REVENUE_FILTER_SCHEMA,
} from '../components/ui/advancedFilter/index.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useTableSort } from '../hooks/useTableSort.js';
import { revenueSortAccessors } from '../hooks/tableSortAccessors.js';
import { useDebouncedAutoSave } from '../hooks/useDebouncedAutoSave.js';
import AutoSaveIndicator from '../components/ui/AutoSaveIndicator.jsx';

const STATUS_TONE = {
  'Active Planning': 'warning',
  'Active Campaigning': 'success',
  Completed: 'neutral',
  Archived: 'neutral',
};

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [overheadForm, setOverheadForm] = useState({
    allocatedToolBudget: '',
    domainFixedCosts: '',
    laborCosts: '',
  });
  const [revenueForm, setRevenueForm] = useState({
    amount: '',
    description: '',
  });

  const load = useCallback(async () => {
    const overview = await fetchFinanceOverview();
    setData(overview);
    setSelectedId((current) => {
      if (current && overview.projects?.some((p) => p._id === current)) return current;
      return overview.projects?.[0]?._id || null;
    });
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  const selected = data?.projects?.find((p) => p._id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const ledger = selected.financialLedger || {};
    setOverheadForm({
      allocatedToolBudget: String(ledger.allocatedToolBudget ?? ''),
      domainFixedCosts: String(ledger.domainFixedCosts ?? ''),
      laborCosts: String(ledger.laborCosts ?? ''),
    });
    setRevenueForm({ amount: '', description: '' });
    setError('');
    setMessage('');
  }, [selectedId, selected?.financialLedger]);

  const persistOverhead = useCallback(async (snapshot) => {
    if (!selectedId) return;
    setError('');
    try {
      await crmApiFetch('/api/admin/finance/overhead', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: selectedId,
          allocatedToolBudget: Number(snapshot.allocatedToolBudget) || 0,
          domainFixedCosts: Number(snapshot.domainFixedCosts) || 0,
          laborCosts: Number(snapshot.laborCosts) || 0,
        }),
      });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save project expenses.');
      throw err;
    }
  }, [selectedId, load]);

  const { status: overheadSaveStatus } = useDebouncedAutoSave({
    snapshot: overheadForm,
    onSave: persistOverhead,
    enabled: Boolean(selectedId),
    resetKey: selectedId,
  });

  useEffect(() => {
    if (overheadSaveStatus !== 'error') return;
    setError('Failed to save project expenses.');
  }, [overheadSaveStatus]);

  async function logRevenue(event) {
    event.preventDefault();
    if (!selectedId || !revenueForm.amount) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await crmApiFetch('/api/admin/finance/revenue', {
        method: 'POST',
        body: JSON.stringify({
          campaignId: selectedId,
          amount: Number(revenueForm.amount),
          description: revenueForm.description.trim(),
        }),
      });
      setRevenueForm({ amount: '', description: '' });
      setMessage('Revenue logged for this project.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading finance overview…" />
      </PageShell>
    );
  }

  const totals = data?.totals || {};

  return (
    <PageShell>
      <PageSection>
        <MetricGrid cols={4}>
          <StatCard compact label="Total spend" value={formatCurrency(totals.totalCost)} helpText="Tools, domains, labor, and AI costs" icon={Wallet} />
          <StatCard compact label="Revenue won" value={formatCurrency(totals.totalRevenue)} helpText="Closed deals logged across projects" icon={Coins} tone="success" />
          <StatCard compact label="Net position" value={formatCurrency(totals.netProfit)} helpText="Revenue minus total spend" icon={Building2} tone={totals.netProfit >= 0 ? 'success' : 'warning'} />
          <StatCard compact label="Portfolio ROI" value={formatPercent(totals.roiPercent)} helpText="Return on total campaign investment" icon={TrendingUp} tone="brand" />
        </MetricGrid>
      </PageSection>

      <PageSection>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <Card>
          <CardHeader
            title="Project expenses & revenue"
            subtitle="Select a campaign to edit its cost baselines or log a closed deal."
          />
          {!data?.projects?.length ? (
            <EmptyState
              icon={FolderPlaceholder}
              title="No projects yet"
              description="Create a project first to collect companies and contacts. Return here when you're ready to track spend and revenue."
              action={
                <Link to="/admin/crm" className="crm-btn-primary">
                  Go to Dashboard
                </Link>
              }
            />
          ) : (
            <ListBody>
              {data.projects.map((project) => {
                const ledger = project.financialLedger || {};
                const active = project._id === selectedId;
                return (
                  <button
                    key={project._id}
                    type="button"
                    onClick={() => setSelectedId(project._id)}
                    className={`crm-list-row w-full text-left hover:bg-neutral-50/80 ${active ? 'bg-brand/[0.03]' : ''}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <Coins className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{project.projectName}</p>
                        <Badge tone={STATUS_TONE[project.status] || 'neutral'}>{project.status}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {project.milestone || 'No milestone'} · Spend {formatCurrency(ledger.totalProjectCost)} · Revenue {formatCurrency(ledger.validatedRevenueWon)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-bold tabular-nums text-[var(--color-ink)]">{formatPercent(project.roiPercent)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-neutral-400">ROI</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-brand' : 'text-neutral-300'}`} />
                  </button>
                );
              })}
            </ListBody>
          )}
        </Card>

        <div className="space-y-6">
          {selected ? (
            <>
              <Card>
                <CardHeader
                  title={selected.projectName}
                  subtitle="Fixed costs and subscriptions for this campaign."
                />
                <div className="space-y-4 px-5 pb-5">
                  {error && <Alert>{error}</Alert>}
                  {message && <Alert tone="success">{message}</Alert>}
                  <AutoSaveIndicator status={overheadSaveStatus} />
                  <div className="rounded-lg border border-[var(--color-line)] bg-neutral-50/60 px-4 py-3 text-xs leading-relaxed text-neutral-600">
                    <Sparkles className="mb-1 inline h-3.5 w-3.5 text-brand" /> AI email costs are tracked automatically as sequences run. Update the manual baselines below.
                  </div>
                  <Field label="Tool subscriptions (AED)" hint="Apollo, Hunter, Lusha share for this campaign.">
                    <input
                      type="number"
                      min="0"
                      className="crm-input"
                      value={overheadForm.allocatedToolBudget}
                      onChange={(e) => setOverheadForm({ ...overheadForm, allocatedToolBudget: e.target.value })}
                    />
                  </Field>
                  <Field label="Domains & inboxes (AED)" hint="Outbound domains, DNS, mailbox setup.">
                    <input
                      type="number"
                      min="0"
                      className="crm-input"
                      value={overheadForm.domainFixedCosts}
                      onChange={(e) => setOverheadForm({ ...overheadForm, domainFixedCosts: e.target.value })}
                    />
                  </Field>
                  <Field label="Team labor (AED)" hint="Staff hours or agency fees.">
                    <input
                      type="number"
                      min="0"
                      className="crm-input"
                      value={overheadForm.laborCosts}
                      onChange={(e) => setOverheadForm({ ...overheadForm, laborCosts: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-line)] bg-white p-3 text-xs">
                    <div>
                      <p className="text-neutral-500">AI spend (auto)</p>
                      <p className="mt-0.5 font-bold tabular-nums text-[var(--color-ink)]">
                        {formatCurrency(selected.financialLedger?.accumulatedOpenAiCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Total project cost</p>
                      <p className="mt-0.5 font-bold tabular-nums text-[var(--color-ink)]">
                        {formatCurrency(selected.financialLedger?.totalProjectCost)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Log revenue" subtitle="Record a closed-won deal attributed to this project." />
                <form onSubmit={logRevenue} className="space-y-4 px-5 pb-5">
                  <Field label="Amount (AED)" required>
                    <input
                      type="number"
                      min="1"
                      className="crm-input"
                      value={revenueForm.amount}
                      onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Description" hint="Client, stand, or contract reference.">
                    <input
                      className="crm-input"
                      value={revenueForm.description}
                      onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
                      placeholder="e.g. Gitex 2026 stand build — Al Noor Foods"
                    />
                  </Field>
                  <button type="submit" disabled={busy || !revenueForm.amount} className="crm-btn-secondary w-full">
                    <Plus className="h-4 w-4" />
                    Log revenue entry
                  </button>
                </form>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={Wallet}
                title="Select a project"
                description="Choose a campaign from the list to manage its expenses and revenue."
              />
            </Card>
          )}
        </div>
      </div>
      </PageSection>

      {data?.recentRevenue?.length > 0 && (
        <PageSection>
        <Card>
          <CardHeader title="Recent revenue entries" subtitle="Latest closed deals logged across all projects." />
          <RecentRevenueTable entries={data.recentRevenue} onSelectCampaign={setSelectedId} />
        </Card>
        </PageSection>
      )}
    </PageShell>
  );
}

function RecentRevenueTable({ entries = [], onSelectCampaign }) {
  const {
    filtered: visibleRows,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(entries, REVENUE_FILTER_SCHEMA);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'date',
    defaultDir: 'desc',
    accessors: revenueSortAccessors,
  });

  const sortedRows = useMemo(() => sortItems(visibleRows), [visibleRows, sortItems]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-5 py-3">
        <AdvancedFilterPopover
          schema={REVENUE_FILTER_SCHEMA}
          filters={advancedFilters}
          matchMode={advancedMatchMode}
          onChange={setAdvancedFilters}
        />
      </div>
      <AdvancedFilterChips
        schema={REVENUE_FILTER_SCHEMA}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        className="px-5 pb-3"
      />
      <TableSortIndicator
        sortKey={sortKey}
        sortDir={sortDir}
        sortLabel={sortLabel}
        onToggle={() => toggleSort(sortKey)}
        onClear={clearSort}
      />
      <div className="crm-scroll overflow-x-auto">
        <table className="crm-table min-w-[640px]">
          <thead>
            <tr className="crm-table-head">
              <SortableTableHeader label="Project" sortKey="project" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-5 py-3" />
              <SortableTableHeader label="Company" sortKey="company" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-5 py-3" />
              <SortableTableHeader label="Description" sortKey="description" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-5 py-3" />
              <SortableTableHeader label="Amount" sortKey="amount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" className="px-5 py-3" />
              <SortableTableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((entry) => (
              <ClickableTableRow
                key={entry._id}
                onClick={() => {
                  const campaignId = entry.campaignId?._id || entry.campaignId;
                  if (campaignId) onSelectCampaign(String(campaignId));
                }}
              >
                <td className="px-5 py-3 font-medium text-[var(--color-ink)]">
                  {entry.campaignId?.projectName || '—'}
                </td>
                <td className="px-5 py-3 text-neutral-600">{entry.companyId?.companyName || '—'}</td>
                <td className="px-5 py-3 text-neutral-600">{entry.description || '—'}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                  {formatCurrency(entry.amount)}
                </td>
                <td className="px-5 py-3 text-right text-neutral-500">
                  {new Date(entry.closedAt || entry.createdAt).toLocaleDateString('en-AE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FolderPlaceholder(props) {
  return <Building2 {...props} />;
}
