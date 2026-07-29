import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchGlobalLeads, deleteLeadWithUndo, deleteLeads, crmApiFetch, fetchLeadById } from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { relationshipSortAccessors } from '../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useSpotlightDeepLink } from '../hooks/useSpotlightDeepLink.js';
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
import { HeartHandshake, Clock3, UserRound, AlertTriangle, Search, X, UserPlus, Loader2 } from 'lucide-react';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import { DeliveryStatusBadge } from '../components/leads/LeadTableComponents.jsx';
import RelationshipStatusBadge from '../components/leads/RelationshipStatusBadge.jsx';
import AddContactModal from '../components/leads/AddContactModal.jsx';
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
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 50;

  // Refs to prevent duplicate concurrent fetches and scroll flicker
  const isFetchingRef = useRef(false);
  const observerTarget = useRef(null);

  // Selected lead drawer state & Add contact modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort } = useTableSort({
    defaultKey: 'nextFollowUp',
    defaultDir: 'asc',
    accessors: relationshipSortAccessors,
  });

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then((items) => setCampaigns(items || []))
      .catch(console.error);
  }, []);

  const leadFilterSchema = useMemo(
    () => buildLeadFilterSchema({
      campaignOptions: campaigns.map((c) => ({ value: c._id, label: c.projectName })),
      fieldOptions: {
        name: buildDistinctFieldOptions(leads, (r) => r.name),
        email: buildDistinctFieldOptions(leads, (r) => r.email),
        companyName: buildDistinctFieldOptions(leads, (r) => r.companyName),
        domain: buildDistinctFieldOptions(leads, (r) => r.domain),
      },
    }),
    [campaigns, leads],
  );

  const {
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
    activeCount: advancedActiveCount,
  } = useTableFilters([], leadFilterSchema);

  const filterParams = useMemo(() => {
    const params = {};
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (!advancedFilters) return params;
    const activeFiltersObj = {};
    Object.keys(advancedFilters).forEach((key) => {
      const val = advancedFilters[key];
      if (val === undefined || val === null || val === '' || val === 'any') return;
      if (Array.isArray(val)) {
        if (val.length) {
          params[key] = val.join(',');
          activeFiltersObj[key] = val;
        }
      } else if (typeof val === 'object') {
        if (val.value !== undefined && val.value !== null && val.value !== '' && val.value !== 'any') {
          params[key] = val.value;
          activeFiltersObj[key] = val;
        } else if (Array.isArray(val.values) && val.values.length) {
          params[key] = val.values.join(',');
          activeFiltersObj[key] = val;
        }
      } else if (typeof val === 'string' && val.trim() && val.trim() !== 'any') {
        params[key] = val.trim();
        activeFiltersObj[key] = val.trim();
      }
    });
    if (Object.keys(activeFiltersObj).length > 0) {
      params.filters = JSON.stringify(activeFiltersObj);
    }
    return params;
  }, [searchTerm, advancedFilters]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    isFetchingRef.current = true;
    try {
      const data = await fetchGlobalLeads({
        rightPocOnly: true,
        page: 1,
        limit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      setLeads(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [sortKey, sortDir, filterParams, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadInitialData]);

  const hasMore = leads.length < total;

  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || leads.length >= total || loading) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    const nextPage = Math.floor(leads.length / limit) + 1;
    try {
      const data = await fetchGlobalLeads({
        rightPocOnly: true,
        page: nextPage,
        limit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      const newItems = data.items || [];
      if (newItems.length > 0) {
        setLeads((prev) => {
          const existingIds = new Set(prev.map((l) => String(l._id)));
          const filteredNew = newItems.filter((l) => !existingIds.has(String(l._id)));
          return [...prev, ...filteredNew];
        });
      }
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 150);
    }
  }, [loading, leads.length, total, limit, sortKey, sortDir, filterParams]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !isFetchingRef.current) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, loadNextPage]);

  useSpotlightDeepLink(async (leadId) => {
    try {
      const target = leads.find((l) => String(l._id) === String(leadId))
        || await fetchLeadById(leadId);
      if (target) setSelectedLead(target);
    } catch (err) {
      console.error(err);
    }
  });

  const selection = useRowSelection(leads);

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
    onRestored: () => loadInitialData(),
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
    onRestored: () => loadInitialData(),
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

  const handleContactCreated = (newContact) => {
    if (newContact) {
      setLeads((prev) => [newContact, ...prev]);
      setTotal((t) => t + 1);
    }
    loadInitialData();
  };

  return (
    <PageShell>
      <PageSection>
        <MetricGrid cols={4}>
          <StatCard compact label="Right POCs" value={total} icon={HeartHandshake} tone="brand" helpText="Contacts confirmed as the correct decision-maker" />
          <StatCard compact label="Overdue follow-ups" value={summary.overdue} icon={AlertTriangle} tone="warning" helpText="On this page of loaded results" />
          <StatCard compact label="Due this week" value={summary.upcoming} icon={Clock3} tone="info" helpText="Scheduled touches in the next 7 days" />
          <StatCard compact label="Nurture / later" value={summary.nurture} icon={UserRound} tone="neutral" helpText="Good relationships with softer timing" />
        </MetricGrid>
      </PageSection>

      <PageSection>
        <PageToolbar
          start={(
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <AdvancedFilterPopover
                schema={leadFilterSchema}
                filters={advancedFilters}
                matchMode={advancedMatchMode}
                onChange={setAdvancedFilters}
              />
              <div className="relative flex-1 min-w-56 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search right POCs by name, email, company, owner…"
                  className="crm-input w-full text-xs py-1.5 pr-7"
                  style={{ paddingLeft: '2.25rem' }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact(true)}
                className="crm-btn-primary flex items-center gap-1.5 text-xs shrink-0 ml-auto"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Contact</span>
              </button>
            </div>
          )}
          meta={<ToolbarCount>Showing {leads.length} of {total} right POCs</ToolbarCount>}
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
          ) : leads.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="No right POCs found"
              description="No contacts match your current search or filter criteria."
              action={(
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setAdvancedFilters({}); }}
                  className="crm-btn-secondary"
                >
                  Reset search & filters
                </button>
              )}
            />
          ) : (
            <>
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
              <DataTableShell minWidth={1200} className="is-below-stats">
                <table className="crm-table min-w-[1200px]">
                  <thead>
                    <tr className="crm-table-head">
                      <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                      <SortableTableHeader label="Contact" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Email status" sortKey="deliveryStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Last interaction" sortKey="lastInteraction" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Relationship" sortKey="relationshipStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Owner" sortKey="owner" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Next follow-up" sortKey="nextFollowUp" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <SortableTableHeader label="Notes" sortKey="notes" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
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
                                <div className="truncate text-xs text-neutral-500">{lead.designation || lead.email || 'Decision maker'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="truncate font-medium text-neutral-800">{lead.companyName || '—'}</div>
                            <div className="truncate text-xs text-neutral-400">{lead.campaignName}</div>
                          </td>
                          <td>
                            <DeliveryStatusBadge status={lead.deliveryStatus} />
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

              {/* Infinite Scroll Loading Sentinel */}
              <div ref={observerTarget} className="py-4 flex items-center justify-center border-t border-neutral-100 text-xs text-neutral-400">
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" />
                    <span>Loading more right POCs…</span>
                  </div>
                ) : hasMore ? (
                  <span>Scroll to load more right POCs…</span>
                ) : leads.length > 0 ? (
                  <span>All {total} right POCs loaded</span>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </PageSection>

      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onCreated={handleContactCreated}
      />

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
          loadInitialData();
        }}
      />
    </PageShell>
  );
}
