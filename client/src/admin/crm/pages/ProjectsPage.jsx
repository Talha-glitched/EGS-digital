import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApiFetch, updateCampaign, deleteProjectWithUndo, deleteProjects } from '../crmApi.js';
import CampaignInitWizard from '../components/wizards/CampaignInitWizard.jsx';
import CampaignStageControl from '../components/projects/CampaignStageControl.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { campaignSortAccessors } from '../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { TableHeaderLabel } from '../components/ui/InfoTip.jsx';
import { CAMPAIGN_AUTOMATION } from '../constants/automationHints.js';
import {
  PageShell,
  PageHeader,
  PageSection,
  MetricGrid,
  Card,
  EmptyState,
  LoadingState,
} from '../components/ui/primitives.jsx';
import {
  Megaphone,
  Plus,
  Building2,
  Users,
  MessageCircle,
} from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  CAMPAIGN_FILTER_SCHEMA,
} from '../components/ui/advancedFilter/index.js';

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-AE');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProjectsPage({ initialProjects }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(initialProjects || []);
  const [loading, setLoading] = useState(!initialProjects || initialProjects.length === 0);
  const [showWizard, setShowWizard] = useState(false);
  const [savingStageId, setSavingStageId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const {
    filtered: visibleCampaigns,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(campaigns, CAMPAIGN_FILTER_SCHEMA);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'projectName',
    defaultDir: 'asc',
    accessors: campaignSortAccessors,
  });

  const sortedCampaigns = useMemo(
    () => sortItems(visibleCampaigns),
    [visibleCampaigns, sortItems],
  );

  const selection = useRowSelection(sortedCampaigns);

  const confirmDeleteCampaign = useConfirmDelete({
    resourceType: 'project',
    deleteFn: deleteProjectWithUndo,
    onRemoved: (id) => {
      setCampaigns((prev) => prev.filter((c) => c._id !== id));
      selection.clearSelection();
    },
    onRestored: () => {
      crmApiFetch('/api/admin/projects').then(setCampaigns).catch(console.error);
    },
    defaultConfirm: 'Delete this campaign? Related data is kept and you can undo within 30 seconds.',
  });

  const runBulkDeleteCampaigns = useBulkDelete({
    resourceType: 'project',
    bulkDeleteFn: deleteProjects,
    getLabelForId: (id) => {
      const campaign = campaigns.find((c) => c._id === id);
      return `Deleted campaign: ${campaign?.projectName || 'Campaign'}`;
    },
    defaultConfirm: 'Delete these campaigns? Related data is kept and you can undo each within 30 seconds.',
    onRemoved: (ids) => {
      setCampaigns((prev) => prev.filter((c) => !ids.includes(c._id)));
      selection.clearSelection();
    },
    onRestored: () => {
      crmApiFetch('/api/admin/projects').then(setCampaigns).catch(console.error);
    },
  });

  async function deleteCampaignItem(campaign) {
    const linkedCompanies = Number(campaign.targetCompaniesCount || 0);
    const linkedPocs = Number(campaign.pocsFound || 0);
    await confirmDeleteCampaign(
      campaign._id,
      `Deleted campaign: ${campaign.projectName || 'Campaign'}`,
      `Delete this campaign? It currently tracks ${linkedCompanies} target compan${linkedCompanies === 1 ? 'y' : 'ies'} and ${linkedPocs} POC${linkedPocs === 1 ? '' : 's'}. Related CRM records stay recoverable and you can undo within 30 seconds.`,
    );
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteCampaigns(selection.selectedArray, { noun: 'campaign' });
    } finally {
      setBulkDeleting(false);
    }
  }

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStageChange(campaignId, payload) {
    setSavingStageId(campaignId);
    try {
      const updated = await updateCampaign(campaignId, payload);
      setCampaigns((prev) => prev.map((campaign) => (
        campaign._id === campaignId ? { ...campaign, ...updated } : campaign
      )));
    } catch (error) {
      console.error(error);
    } finally {
      setSavingStageId(null);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Loading campaigns…" />
      </PageShell>
    );
  }

  const totals = campaigns.reduce(
    (acc, campaign) => {
      acc.companies += campaign.targetCompaniesCount || 0;
      acc.pocs += campaign.pocsFound || 0;
      acc.replied += campaign.pocsResponded || 0;
      return acc;
    },
    { companies: 0, pocs: 0, replied: 0 },
  );

  return (
    <PageShell>
      <PageHeader
        action={
          <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
            <Plus className="h-4.5 w-4.5" />
            New campaign
          </button>
        }
      />

      <PageSection>
        <MetricGrid cols={4}>
          <InsightChip icon={Megaphone} label="Active campaigns" value={campaigns.length} />
          <InsightChip icon={Building2} label="Companies found" value={formatCount(totals.companies)} />
          <InsightChip icon={Users} label="POCs found" value={formatCount(totals.pocs)} />
          <InsightChip icon={MessageCircle} label="POCs responded" value={formatCount(totals.replied)} />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <Card className="overflow-hidden">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Create a campaign for your next exhibition. Upload target companies, import contacts, then launch sequences."
              action={
                <button type="button" onClick={() => setShowWizard(true)} className="crm-btn-primary">
                  <Plus className="h-4 w-4" />
                  Create your first campaign
                </button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
                <AdvancedFilterPopover
                  schema={CAMPAIGN_FILTER_SCHEMA}
                  filters={advancedFilters}
                  matchMode={advancedMatchMode}
                  onChange={setAdvancedFilters}
                />
              </div>
              <AdvancedFilterChips
                schema={CAMPAIGN_FILTER_SCHEMA}
                filters={advancedFilters}
                onChange={setAdvancedFilters}
                className="px-4 py-3"
              />
              {visibleCampaigns.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No campaigns match"
                  description="Try adjusting your search or advanced filters."
                />
              ) : (
            <>
              <TableSortIndicator
                sortKey={sortKey}
                sortDir={sortDir}
                sortLabel={sortLabel}
                onToggle={() => toggleSort(sortKey)}
                onClear={clearSort}
              />
              <BulkSelectionBar
                count={selection.selectionCount}
                noun="campaign"
                onDelete={handleBulkDelete}
                onClear={selection.clearSelection}
                deleting={bulkDeleting}
              />
            <DataTableShell minWidth={1100}>
              <table className="crm-table">
                <thead>
                  <tr className="crm-table-head">
                    <BulkSelectHeaderCell selection={selection} ariaLabel="Select all campaigns" />
                    <SortableTableHeader label="Campaign" sortKey="projectName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Stage" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.stage} className="crm-table-stage-col" />
                    <SortableTableHeader label="Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Companies found" sortKey="targetCompaniesCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.companiesFound} align="right" />
                    <SortableTableHeader label="Companies reached" sortKey="companiesReached" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.companiesReached} align="right" />
                    <SortableTableHeader label="POCs found" sortKey="pocsFound" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.pocsFound} align="right" />
                    <SortableTableHeader label="POCs emailed" sortKey="pocsEmailed" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.pocsEmailed} align="right" />
                    <SortableTableHeader label="POCs responded" sortKey="pocsResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.pocsResponded} align="right" />
                    <SortableTableHeader label="In queue" sortKey="activeQueues" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.inQueue} align="right" />
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((campaign) => (
                    <ClickableTableRow
                      key={campaign._id}
                      onClick={() => navigate(`/admin/crm/projects/${campaign._id}`)}
                    >
                      <BulkSelectRowCell
                        id={campaign._id}
                        selection={selection}
                        ariaLabel={`Select ${campaign.projectName}`}
                      />
                      <td>
                        <p className="font-semibold text-ink">{campaign.projectName}</p>
                        {campaign.milestone ? (
                          <p className="mt-0.5 text-xs text-neutral-500">{campaign.milestone}</p>
                        ) : null}
                      </td>
                      <td className="crm-table-stage-col">
                        <CampaignStageControl
                          compact
                          status={campaign.status}
                          statusSource={campaign.statusSource}
                          saving={savingStageId === campaign._id}
                          onChange={(payload) => handleStageChange(campaign._id, payload)}
                        />
                      </td>
                      <td className="whitespace-nowrap text-xs text-neutral-600">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="text-right tabular-nums font-medium text-neutral-800">
                        {formatCount(campaign.targetCompaniesCount)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.companiesReached)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.pocsFound)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-700">
                        {formatCount(campaign.pocsEmailed)}
                      </td>
                      <td className="text-right tabular-nums font-medium text-emerald-700">
                        {formatCount(campaign.pocsResponded)}
                      </td>
                      <td className="text-right tabular-nums text-neutral-500">
                        {formatCount(campaign.activeQueues)}
                      </td>
                      <td className="text-center" onClick={stopRowClick}>
                        <DeleteIconButton
                          label={`Delete ${campaign.projectName}`}
                          onClick={() => deleteCampaignItem(campaign)}
                        />
                      </td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
            </>
              )}
            </>
          )}
        </Card>
      </PageSection>

      <CampaignInitWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={(projectId) => {
          setShowWizard(false);
          navigate(`/admin/crm/projects/${projectId}`);
        }}
      />
    </PageShell>
  );
}

function InsightChip({ icon: Icon, label, value }) {
  return (
    <div className="crm-card crm-stat-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-sm font-bold tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}
