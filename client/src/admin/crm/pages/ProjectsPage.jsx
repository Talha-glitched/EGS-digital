import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { Modal } from '../components/ui/Modal.jsx';
import {
  PageShell,
  PageHeader,
  PageSection,
  MetricGrid,
  Card,
  EmptyState,
  LoadingState,
  Alert,
  Badge,
} from '../components/ui/primitives.jsx';
import CampaignLaunchMonitorModal from '../components/projects/CampaignLaunchMonitorModal.jsx';
import {
  Megaphone,
  Plus,
  Building2,
  Users,
  MessageCircle,
  Calendar,
  Edit2,
  Send,
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

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateRange(startDate, endDate, fallbackDate) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (start && end) {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.toLocaleDateString('en-AE', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-AE', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startYear === endYear && startMonth === endMonth && startDay === endDay) {
      return `${startDay} ${startMonth} ${startYear}`;
    }
    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay}–${endDay} ${startMonth} ${startYear}`;
    }
    if (startYear === endYear) {
      return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${startYear}`;
    }
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }

  if (start) {
    return start.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (end) {
    return `Until ${end.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  if (fallbackDate) {
    const fb = new Date(fallbackDate);
    if (!isNaN(fb.getTime())) {
      return fb.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  return 'Set dates';
}

function calculateEventCountdown(startDate, endDate) {
  const start = parseLocalDate(startDate);
  if (!start) return { text: 'No date set', detail: '', tone: 'neutral', totalDays: null };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const end = parseLocalDate(endDate) || startDay;
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (today >= startDay && today <= endDay) {
    if (startDay.getTime() === endDay.getTime()) {
      return { text: 'Happening Today!', detail: 'Event is today', tone: 'success', status: 'today', totalDays: 0 };
    }
    const daysLeftInEvent = Math.round((endDay - today) / (1000 * 60 * 60 * 24));
    return {
      text: daysLeftInEvent === 0 ? 'Final Day!' : `Ongoing (${daysLeftInEvent}d left)`,
      detail: `Ends ${endDay.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}`,
      tone: 'success',
      status: 'ongoing',
      totalDays: 0,
    };
  }

  if (today > endDay) {
    const daysAgo = Math.round((today - endDay) / (1000 * 60 * 60 * 24));
    return {
      text: daysAgo === 1 ? 'Ended yesterday' : `Ended ${daysAgo}d ago`,
      detail: 'Past event',
      tone: 'neutral',
      status: 'past',
      totalDays: -daysAgo,
    };
  }

  const totalDays = Math.round((startDay - today) / (1000 * 60 * 60 * 24));

  let temp = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let months = 0;

  while (true) {
    const nextMonth = new Date(temp.getFullYear(), temp.getMonth() + 1, temp.getDate());
    if (nextMonth.getDate() !== temp.getDate()) {
      nextMonth.setDate(0);
    }
    if (nextMonth <= startDay) {
      months++;
      temp = nextMonth;
    } else {
      break;
    }
  }

  const remainingDays = Math.round((startDay - temp) / (1000 * 60 * 60 * 24));

  let breakdown = '';
  if (months > 0 && remainingDays > 0) {
    breakdown = `${months} mo${months > 1 ? 's' : ''}, ${remainingDays} d${remainingDays > 1 ? 's' : ''}`;
  } else if (months > 0) {
    breakdown = `${months} mo${months > 1 ? 's' : ''}`;
  } else {
    breakdown = `${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
  }

  let tone = 'brand';
  if (totalDays <= 7) tone = 'warning';
  else if (totalDays <= 30) tone = 'info';

  return {
    text: `in ${breakdown}`,
    detail: `${totalDays} day${totalDays === 1 ? '' : 's'} total`,
    months,
    days: remainingDays,
    totalDays,
    tone,
    status: 'future',
  };
}

function DateEditorModal({ campaign, onClose, onSave }) {
  const [startDate, setStartDate] = useState(() => {
    if (!campaign?.startDate) return '';
    const d = parseLocalDate(campaign.startDate);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    if (!campaign?.endDate) return '';
    const d = parseLocalDate(campaign.endDate);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(campaign._id, {
        startDate: startDate || null,
        endDate: endDate || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update event dates.');
    } finally {
      setSaving(false);
    }
  };

  const handleSingleDay = () => {
    if (startDate) {
      setEndDate(startDate);
    }
  };

  const handleThreeDays = () => {
    if (startDate) {
      const d = parseLocalDate(startDate);
      if (d) {
        d.setDate(d.getDate() + 2);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setEndDate(`${year}-${month}-${day}`);
      }
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <Modal
      open={Boolean(campaign)}
      onClose={onClose}
      title={`Set Event Dates — ${campaign?.projectName || 'Campaign'}`}
      subtitle="Manually enter the start and end dates of the event to calculate live countdowns."
      icon={Calendar}
      accent="brand"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">Event Start Date</label>
            <input
              type="date"
              className="crm-input"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                if (!endDate || endDate < val) {
                  setEndDate(val);
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700">
              Event End Date <span className="font-normal text-neutral-400">(Optional)</span>
            </label>
            <input
              type="date"
              className="crm-input"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-neutral-400 mr-1">Presets:</span>
          <button
            type="button"
            onClick={handleSingleDay}
            disabled={!startDate}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-2xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            1-Day Event
          </button>
          <button
            type="button"
            onClick={handleThreeDays}
            disabled={!startDate}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-2xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            3-Day Event
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-2xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-red-600"
          >
            Clear dates
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <button type="button" onClick={onClose} className="crm-btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="crm-btn-primary">
            {saving ? 'Saving…' : 'Save Event Dates'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage({ initialProjects }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(initialProjects || []);
  const [loading, setLoading] = useState(!initialProjects || initialProjects.length === 0);
  const [showWizard, setShowWizard] = useState(false);
  const [savingStageId, setSavingStageId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingDateCampaign, setEditingDateCampaign] = useState(null);
  const [activeMonitorCampaign, setActiveMonitorCampaign] = useState(null);

  const {
    filtered: visibleCampaigns,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
  } = useTableFilters(campaigns, CAMPAIGN_FILTER_SCHEMA);

  const {
    sortKey,
    sortDir,
    sortLabel,
    toggleSort,
    clearSort,
    sortItems,
  } = useTableSort({
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
    resourceType: 'campaign',
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
    resourceType: 'campaign',
    bulkDeleteFn: deleteProjects,
    getLabelForId: (id) => {
      const campaign = campaigns.find((c) => c._id === id);
      return `Deleted campaign: ${campaign?.projectName || 'Campaign'}`;
    },
    defaultConfirm: 'Delete these campaigns? Related data is kept and you can undo each within 30 seconds.',
    onRemoved: (removedIds) => {
      setCampaigns((items) => items.filter((item) => !removedIds.includes(item._id)));
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

  const reloadCampaigns = useCallback(() => {
    crmApiFetch('/api/admin/projects')
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadCampaigns();
  }, [reloadCampaigns]);

  async function handleStageChange(campaignId, payload) {
    setSavingStageId(campaignId);
    setCampaigns((prev) =>
      prev.map((c) => (c._id === campaignId ? { ...c, ...payload } : c))
    );
    try {
      const updated = await updateCampaign(campaignId, payload);
      setCampaigns((prev) =>
        prev.map((c) => (c._id === campaignId ? { ...c, ...updated } : c))
      );
    } catch (error) {
      console.error('Failed to update stage:', error);
      reloadCampaigns();
    } finally {
      setSavingStageId(null);
    }
  }

  async function handleSaveDates(campaignId, datePayload) {
    const updated = await updateCampaign(campaignId, datePayload);
    setCampaigns((prev) =>
      prev.map((c) => (c._id === campaignId ? { ...c, ...updated, ...datePayload } : c))
    );
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
    { companies: 0, pocs: 0, replied: 0 }
  );

  return (
    <PageShell>
      <PageHeader
        title="Campaigns"
        subtitle="Manage event campaigns, upload target companies, and track outreach progress across exhibitions."
        actions={
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="crm-btn-primary"
          >
            <Plus className="h-4 w-4" />
            New campaign
          </button>
        }
      />

      <MetricGrid className="mb-6">
        <InsightChip icon={Megaphone} label="Active campaigns" value={campaigns.length} />
        <InsightChip icon={Building2} label="Target companies" value={totals.companies.toLocaleString('en-AE')} />
        <InsightChip icon={Users} label="POCs found" value={totals.pocs.toLocaleString('en-AE')} />
        <InsightChip icon={MessageCircle} label="POCs responded" value={totals.replied.toLocaleString('en-AE')} />
      </MetricGrid>

      <PageSection>
        <Card className="overflow-hidden p-0">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Create a campaign for your next exhibition. Upload target companies, import contacts, then launch sequences."
              action={
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="crm-btn-primary mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Create your first campaign
                </button>
              }
            />
          ) : (
            <>
              <AdvancedFilterPopover
                schema={CAMPAIGN_FILTER_SCHEMA}
                filters={advancedFilters}
                matchMode="and"
                onChange={setAdvancedFilters}
                className="p-4"
              />
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
                  />
                  <BulkSelectionBar
                    count={selection.selectionCount}
                    noun="campaign"
                    onDelete={handleBulkDelete}
                    onClear={selection.clearSelection}
                    deleting={bulkDeleting}
                  />
                  <DataTableShell minWidth={1200}>
                    <table className="crm-table">
                      <thead>
                        <tr className="crm-table-head">
                          <BulkSelectHeaderCell selection={selection} ariaLabel="Select all campaigns" />
                          <SortableTableHeader label="Campaign" sortKey="projectName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                          <SortableTableHeader label="Stage" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="crm-table-stage-col" />
                          <SortableTableHeader label="Event Dates" sortKey="date" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                          <SortableTableHeader label="Time Remaining" sortKey="timeRemaining" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                          <SortableTableHeader label="Companies found" sortKey="targetCompaniesCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" />
                          <SortableTableHeader label="Companies reached" sortKey="companiesReached" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" />
                          <SortableTableHeader label="POCs found" sortKey="pocsFound" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" />
                          <SortableTableHeader label="POCs emailed" sortKey="pocsEmailed" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" />
                          <SortableTableHeader label="POCs responded" sortKey="pocsResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="right" />
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
                            <td className="crm-table-stage-col" onClick={stopRowClick}>
                              <CampaignStageControl
                                compact
                                status={campaign.status}
                                statusSource={campaign.statusSource}
                                saving={savingStageId === campaign._id}
                                onChange={(payload) => handleStageChange(campaign._id, payload)}
                              />
                            </td>
                            <td className="whitespace-nowrap text-xs text-neutral-600" onClick={stopRowClick}>
                              <button
                                type="button"
                                onClick={() => setEditingDateCampaign(campaign)}
                                className="group inline-flex items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50/90 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition"
                                title="Click to edit event dates"
                              >
                                <Calendar className="h-3.5 w-3.5 text-neutral-400 group-hover:text-brand" />
                                <span>{formatDateRange(campaign.startDate, campaign.endDate, campaign.createdAt)}</span>
                                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-neutral-400 group-hover:text-brand transition" />
                              </button>
                            </td>
                            <td className="whitespace-nowrap text-xs">
                              {(() => {
                                const countdown = calculateEventCountdown(campaign.startDate, campaign.endDate);
                                if (!campaign.startDate) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        stopRowClick(e);
                                        setEditingDateCampaign(campaign);
                                      }}
                                      className="text-neutral-400 hover:text-brand text-2xs italic transition"
                                    >
                                      Set event date
                                    </button>
                                  );
                                }
                                return (
                                  <div className="flex flex-col">
                                    <Badge tone={countdown.tone}>{countdown.text}</Badge>
                                    {countdown.detail && (
                                      <span className="text-[10px] text-neutral-400 mt-0.5 tabular-nums">{countdown.detail}</span>
                                    )}
                                  </div>
                                );
                              })()}
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
                            <td className="text-center" onClick={stopRowClick}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveMonitorCampaign(campaign)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-2xs font-semibold text-neutral-700 hover:border-brand/40 hover:bg-brand-soft hover:text-brand transition shadow-2xs"
                                  title="View sequence send progress & live monitor"
                                >
                                  <Send className="h-3 w-3 text-neutral-400 group-hover:text-brand" />
                                  <span>Progress</span>
                                </button>
                                <DeleteIconButton
                                  label={`Delete ${campaign.projectName}`}
                                  onClick={() => deleteCampaignItem(campaign)}
                                />
                              </div>
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
        onClose={() => {
          setShowWizard(false);
          reloadCampaigns();
        }}
        onCreated={(newCampaign) => {
          setCampaigns((prev) => {
            const exists = prev.some((c) => String(c._id) === String(newCampaign._id));
            if (exists) return prev;
            return [newCampaign, ...prev];
          });
          reloadCampaigns();
        }}
        onComplete={(projectId) => {
          setShowWizard(false);
          reloadCampaigns();
          navigate(`/admin/crm/projects/${projectId}`);
        }}
      />

      {editingDateCampaign && (
        <DateEditorModal
          campaign={editingDateCampaign}
          onClose={() => setEditingDateCampaign(null)}
          onSave={handleSaveDates}
        />
      )}

      <CampaignLaunchMonitorModal
        open={Boolean(activeMonitorCampaign)}
        onClose={() => setActiveMonitorCampaign(null)}
        projectId={activeMonitorCampaign?._id}
        projectName={activeMonitorCampaign?.projectName}
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
