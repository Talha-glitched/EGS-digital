import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGlobalLeads, deleteLeadWithUndo, deleteLeads } from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { relationshipSortAccessors } from '../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import {
  PageShell,
  PageSection,
  PageToolbar,
  ToolbarCount,
  Card,
  Badge,
  LoadingState,
  EmptyState,
  MetricGrid,
  StatCard,
} from '../components/ui/primitives.jsx';
import { HeartHandshake, Clock3, UserRound, AlertTriangle } from 'lucide-react';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import TablePagination from '../components/ui/TablePagination.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import RelationshipStatusBadge from '../components/leads/RelationshipStatusBadge.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  buildLeadFilterSchema,
  buildDistinctFieldOptions,
} from '../components/ui/advancedFilter/index.js';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatLastInteraction(value) {
  if (!value) return 'No interactions';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No interactions';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function lastInteractionTone(value) {
  if (!value) return 'neutral';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'neutral';
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days <= 14) return 'success';
  if (days <= 60) return 'info';
  if (days <= 180) return 'warning';
  return 'neutral';
}

function formatFollowUp(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString('en-AE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function followUpTone(value) {
  if (!value) return 'neutral';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'neutral';
  const now = new Date();
  if (date < now) return 'warning';
  const week = new Date(now.getTime() + 7 * 86400000);
  if (date <= week) return 'info';
  return 'success';
}

export default function RelationshipsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedLead, setSelectedLead] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const leadFilterSchema = useMemo(
    () => buildLeadFilterSchema({
      fieldOptions: {
        name: buildDistinctFieldOptions(leads, (r) => r.name),
        email: buildDistinctFieldOptions(leads, (r) => r.email),
        companyName: buildDistinctFieldOptions(leads, (r) => r.companyName),
      },
    }),
    [leads],
  );
  const {
    filtered: advancedFilteredLeads,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
    activeCount: advancedActiveCount,
  } = useTableFilters(leads, leadFilterSchema);

  const loadData = async () => {
    setLoading(true);
    try {
      const useWideFetch = advancedActiveCount > 0;
      const data = await fetchGlobalLeads({
        rightPocOnly: true,
        sort: 'followUp',
        page: useWideFetch ? 1 : page,
        limit: useWideFetch ? 500 : limit,
      });
      setLeads(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [advancedActiveCount]);

  useEffect(() => {
    loadData();
  }, [page, limit, advancedActiveCount]);

  const tableTotal = advancedActiveCount ? advancedFilteredLeads.length : total;

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'nextFollowUp',
    defaultDir: 'asc',
    accessors: relationshipSortAccessors,
  });

  const sortedLeads = useMemo(() => {
    const base = advancedActiveCount ? advancedFilteredLeads : leads;
    return sortItems(base);
  }, [advancedActiveCount, advancedFilteredLeads, leads, sortItems]);

  const tableLeads = useMemo(() => {
    if (!advancedActiveCount) return sortedLeads;
    const start = (page - 1) * limit;
    return sortedLeads.slice(start, start + limit);
  }, [advancedActiveCount, sortedLeads, page, limit]);

  const selection = useRowSelection(tableLeads);

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const summary = useMemo(() => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 86400000);
    let overdue = 0;
    let upcoming = 0;
    let nurture = 0;
    leads.forEach((lead) => {
      const status = lead.relationshipProfile?.status;
      const due = lead.relationshipProfile?.nextFollowUpAt ? new Date(lead.relationshipProfile.nextFollowUpAt) : null;
      if (status === 'Nurture' || status === 'Later') nurture += 1;
      if (due && !Number.isNaN(due.getTime())) {
        if (due < now) overdue += 1;
        else if (due <= week) upcoming += 1;
      }
    });
    return { overdue, upcoming, nurture };
  }, [leads]);

  const openDrawer = (lead) => setSelectedLead(lead);
  const closeDrawer = () => setSelectedLead(null);

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: (id) => {
      setLeads((prev) => prev.filter((l) => l._id !== id));
      if (selectedLead?._id === id) setSelectedLead(null);
    },
    onRestored: () => loadData(),
    defaultConfirm: 'Delete this contact? You can undo within 30 seconds.',
  });

  const runBulkDeleteLeads = useBulkDelete({
    resourceType: 'lead',
    bulkDeleteFn: deleteLeads,
    getLabelForId: (id) => {
      const lead = leads.find((l) => l._id === id);
      return `Deleted contact: ${lead?.name || lead?.email || 'Contact'}`;
    },
    defaultConfirm: 'Delete these contacts? You can undo each within 30 seconds.',
    onRemoved: (ids) => {
      setLeads((prev) => prev.filter((l) => !ids.includes(l._id)));
      if (selectedLead && ids.includes(selectedLead._id)) setSelectedLead(null);
      selection.clearSelection();
    },
    onRestored: () => loadData(),
  });

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteLeads(selection.selectedArray, { noun: 'contact' });
    } catch (err) {
      console.error(err);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteLeadItem(lead) {
    try {
      await confirmDeleteLead(
        lead._id,
        `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <PageShell>
      <PageSection>
        <MetricGrid cols={4}>
          <StatCard compact label="Right POCs" value={total} icon={HeartHandshake} tone="brand" helpText="Contacts confirmed as the correct decision-maker" />
          <StatCard compact label="Overdue follow-ups" value={summary.overdue} icon={AlertTriangle} tone="warning" helpText="On this page of results" />
          <StatCard compact label="Due this week" value={summary.upcoming} icon={Clock3} tone="info" helpText="Scheduled touches in the next 7 days" />
          <StatCard compact label="Nurture / later" value={summary.nurture} icon={UserRound} tone="neutral" helpText="Good relationships with softer timing" />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <PageToolbar
          start={(
            <AdvancedFilterPopover
              schema={leadFilterSchema}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
          )}
          meta={<ToolbarCount>{tableTotal} right POC{tableTotal === 1 ? '' : 's'}</ToolbarCount>}
        />
        <AdvancedFilterChips
          schema={leadFilterSchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mb-3"
        />

        <Card className="overflow-hidden">
          {loading ? (
            <LoadingState label="Loading relationship records…" />
          ) : tableLeads.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="No right POCs yet"
              description="Mark contacts as Right POC in the contact manager, then use the Relationship tab to set owner, follow-up timing, and notes."
              action={<Link to="/admin/crm/people" className="crm-btn-secondary">Browse all contacts</Link>}
            />
          ) : (
            <>
              <TablePagination
                page={page}
                limit={limit}
                total={tableTotal}
                onPageChange={setPage}
                onLimitChange={handleLimitChange}
                noun="right POCs"
              />
              <BulkSelectionBar
                count={selection.selectionCount}
                noun="contact"
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
              <DataTableShell minWidth={1100} className="is-below-stats">
              <table className="crm-table min-w-[1100px]">
                <thead>
                  <tr className="crm-table-head">
                    <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                    <SortableTableHeader label="Contact" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Last interaction" sortKey="lastInteraction" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Relationship" sortKey="relationshipStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Owner" sortKey="owner" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Next follow-up" sortKey="nextFollowUp" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableTableHeader label="Notes" sortKey="notes" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLeads.map((lead) => {
                    const profile = lead.relationshipProfile || {};
                    const dueTone = followUpTone(profile.nextFollowUpAt);
                    const interactionTone = lastInteractionTone(lead.lastInteractionAt);
                    return (
                      <ClickableTableRow key={lead._id} onClick={() => openDrawer(lead)}>
                        <BulkSelectRowCell
                          id={lead._id}
                          selection={selection}
                          ariaLabel={`Select ${lead.name || 'contact'}`}
                        />
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                              {initials(lead.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--color-ink)]">
                                {lead.name || '—'}
                              </p>
                              <div className="truncate text-xs text-neutral-500">{lead.designation || 'Decision maker'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="truncate font-medium text-neutral-800">{lead.companyName || '—'}</div>
                          <div className="truncate text-xs text-neutral-400">{lead.campaignName}</div>
                        </td>
                        <td>
                          <Badge tone={interactionTone}>{formatLastInteraction(lead.lastInteractionAt)}</Badge>
                        </td>
                        <td>
                          <RelationshipStatusBadge status={profile.status || 'New'} compact />
                        </td>
                        <td className="text-xs text-neutral-600">{profile.owner || '—'}</td>
                        <td>
                          <Badge tone={dueTone}>{formatFollowUp(profile.nextFollowUpAt)}</Badge>
                        </td>
                        <td className="max-w-[220px]">
                          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">
                            {profile.reminderNotes || '—'}
                          </p>
                        </td>
                        <td className="text-center" onClick={stopRowClick}>
                          <DeleteIconButton
                            label={`Delete ${lead.name || 'contact'}`}
                            onClick={() => deleteLeadItem(lead)}
                          />
                        </td>
                      </ClickableTableRow>
                    );
                  })}
                </tbody>
              </table>
              </DataTableShell>
              <TablePagination
                page={page}
                limit={limit}
                total={tableTotal}
                onPageChange={setPage}
                onLimitChange={handleLimitChange}
                noun="right POCs"
                className="is-bottom"
              />
            </>
          )}
        </Card>
      </PageSection>

      <OutreachDrawer
        lead={selectedLead}
        onClose={closeDrawer}
        initialTab="relationship"
        onDelete={deleteLeadItem}
        onLeadUpdated={(updated) => {
          setLeads((prev) => {
            if (updated.pocQualification?.status !== 'Confirmed') {
              return prev.filter((item) => item._id !== updated._id);
            }
            return prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item));
          });
          loadData();
        }}
      />
    </PageShell>
  );
}
