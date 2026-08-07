import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLeadsData, updateLeadInState, removeLeadFromState, removeLeadsFromState } from '../store/slices/leadsSlice.js';
import { fetchGlobalLeads, crmApiFetch, updateLead, deleteLeadWithUndo, deleteLeads, fetchLeadById } from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { leadSortAccessors } from '../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../components/ui/SortableTableHeader.jsx';
import { useConfirmDelete } from '../hooks/useConfirmDelete.js';
import { useSpotlightDeepLink } from '../hooks/useSpotlightDeepLink.js';
import {
  PageShell,
  PageSection,
  PageToolbar,
  ToolbarCount,
  Card,
  LoadingState,
  EmptyState,
  Alert,
} from '../components/ui/primitives.jsx';
import { 
  Users, 
  PhoneCall, 
  MessageSquare,
  Plus,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import { DeliveryStatusBadge, ResponseStatusBadge } from '../components/leads/LeadTableComponents.jsx';
import PocQualificationBadge from '../components/leads/PocQualificationBadge.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
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

// Custom inline SVG for Linkedin icon to avoid dependency issues
const Linkedin = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function PeoplePage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allTruncated, setAllTruncated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 50;

  // Refs to prevent duplicate concurrent fetches and scroll flicker
  const isFetchingRef = useRef(false);
  const observerTarget = useRef(null);

  // Selected lead drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort } = useTableSort({
    defaultKey: 'name',
    defaultDir: 'asc',
    accessors: leadSortAccessors,
  });

  const leadFilterSchema = useMemo(
    () => buildLeadFilterSchema({
      campaignOptions: campaigns.map((c) => ({ value: c._id, label: c.projectName })),
      fieldOptions: {
        name: buildDistinctFieldOptions(leads, (r) => r.name),
        email: buildDistinctFieldOptions(leads, (r) => r.email),
        designation: buildDistinctFieldOptions(leads, (r) => r.designation),
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

  const dispatch = useDispatch();

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    isFetchingRef.current = true;
    try {
      const data = await fetchGlobalLeads({
        page: 1,
        limit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      dispatch(setLeadsData({ items: data.items || [], total: data.total || 0 }));
      setLeads(data.items || []);
      setTotal(data.total || 0);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch contacts.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [sortKey, sortDir, filterParams, limit, dispatch]);

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then(setCampaigns)
      .catch(console.error);
  }, []);

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

  // Rendering every matching row into the DOM at once stops being safe well before
  // 50,000, so this asks for a much smaller ceiling instead. The API itself also
  // enforces its own hard cap independent of what we ask for — if fewer rows come
  // back than requested, that cap has been hit, and asking again would just repeat
  // the same result, so we stop offering "Show all" and say plainly how many loaded.
  const SHOW_ALL_CAP = 2000;

  const loadAllData = useCallback(async () => {
    if (isFetchingRef.current || loading) return;

    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const requestLimit = Math.min(Math.max(total, limit), SHOW_ALL_CAP);
      const data = await fetchGlobalLeads({
        page: 1,
        limit: requestLimit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      const items = data.items || [];
      setLeads(items);
      setTotal(data.total || 0);
      if (items.length < requestLimit && items.length < (data.total || 0)) {
        setAllTruncated(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 150);
    }
  }, [loading, total, limit, sortKey, sortDir, filterParams]);



  const selection = useRowSelection(leads);

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: (id) => {
      setLeads((prev) => prev.filter((l) => l._id !== id));
      if (selectedLead?._id === id) setSelectedLead(null);
      setTotal((t) => Math.max(0, t - 1));
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
      setTotal((t) => Math.max(0, t - ids.length));
    },
    onRestored: () => loadInitialData(),
  });

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await runBulkDeleteLeads(selection.selectedArray, { noun: 'contact' });
    } catch (err) {
      setError(err.message || 'Failed to delete contacts.');
    } finally {
      setBulkDeleting(false);
    }
  }

  const openDrawer = (lead) => {
    setSelectedLead(lead);
    setError('');
  };

  const closeDrawer = () => {
    setSelectedLead(null);
  };

  useSpotlightDeepLink({
    recordType: 'contact',
    onOpen: openDrawer,
    findRecord: useCallback((id) => leads.find((lead) => String(lead._id) === String(id)), [leads]),
    resolveRecord: useCallback((id) => fetchLeadById(id), []),
    ready: !loading,
  });

  const handleUpdate = async (leadId, patch) => {
    try {
      const updated = await updateLead(leadId, patch);
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, ...updated } : l));
      return updated;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update lead');
    }
  };

  const toggleLinkedinField = async (lead, field) => {
    const current = lead.linkedinOutreach?.[field] || false;
    const dateField = field === 'connSent' ? 'connDate' : field === 'accepted' ? 'acceptDate' : field === 'inmailSent' ? 'inmailDate' : field === 'dmSent' ? 'dmDate' : '';
    
    const patch = {
      linkedinOutreach: {
        [field]: !current,
      }
    };
    if (dateField) {
      patch.linkedinOutreach[dateField] = !current ? new Date() : null;
    }
    
    await handleUpdate(lead._id, patch);
  };

  const toggleWhatsappSent = async (lead) => {
    const current = lead.whatsapp?.sent || false;
    const patch = {
      whatsapp: {
        sent: !current,
        date: !current ? new Date() : null
      }
    };
    await handleUpdate(lead._id, patch);
  };

  const launchWhatsapp = (lead) => {
    const phoneNum = lead.whatsappNumber || lead.phone || lead.phoneLusha1 || '';
    const cleanPhone = phoneNum.replace(/\D/g, '');
    if (!cleanPhone) {
      setError('No phone number configured for WhatsApp on this contact.');
      return;
    }

    const name = lead.name || 'there';
    const message = encodeURIComponent(`Hi ${name}, this is the team at Exhibit Graphic Sign. Following up on your exhibition stand — happy to help with any questions.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  async function deleteLeadItem(lead) {
    try {
      await confirmDeleteLead(
        lead._id,
        `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
      );
    } catch (err) {
      setError(err.message || 'Failed to delete contact.');
    }
  }

  return (
    <PageShell>
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
                  placeholder="Search database by name, email, title…"
                  className="crm-input w-full text-xs py-1.5 pr-7"
                  style={{ paddingLeft: '2.25rem' }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          meta={
            <ToolbarCount>
              Showing {leads.length} of {total} records
            </ToolbarCount>
          }
          actions={(
            <button type="button" onClick={() => setShowAddContact(true)} className="crm-btn-primary shrink-0">
              <Plus className="h-3.5 w-3.5" />
              Add contact
            </button>
          )}
        />
        <AdvancedFilterChips
          schema={leadFilterSchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mb-3"
        />

        {error && (
          <Alert
            tone="error"
            onRetry={error === 'Failed to fetch contacts.' ? loadInitialData : undefined}
            className="mb-3"
          >
            {error}
          </Alert>
        )}

        <Card className="overflow-hidden">
        {loading ? (
          <LoadingState label="Fetching global contacts database…" />
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description="Adjust your filters or add a contact manually without a campaign."
            action={
              <button type="button" onClick={() => setShowAddContact(true)} className="crm-btn-primary">
                <Plus className="h-4 w-4" />
                Add contact
              </button>
            }
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
            <DataTableShell minWidth={1200}>
            <table className="crm-table min-w-275">
              <thead>
                <tr className="crm-table-head">
                  <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                  <SortableTableHeader label="Contact" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Email" sortKey="email" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Type" sortKey="hasResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Response" sortKey="hasResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Campaign Approach" sortKey="campaignName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th className="text-center">LinkedIn Nav</th>
                  <th className="text-center">Cold Call</th>
                  <th className="text-center">WhatsApp</th>
                  <SortableTableHeader label="POC fit" sortKey="pocStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Email status" sortKey="deliveryStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const hasCc = lead.coldCall?.made || false;
                  const hasWa = lead.whatsapp?.sent || false;
                  return (
                    <ClickableTableRow key={lead._id} onClick={() => openDrawer(lead)}>
                      <BulkSelectRowCell
                        id={lead._id}
                        selection={selection}
                        ariaLabel={`Select ${lead.name || 'contact'}`}
                      />
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">
                            {initials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">
                              {lead.name || '—'}
                            </div>
                            <div className="truncate text-xs text-neutral-500">{lead.designation || 'Decision maker'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="truncate font-medium text-neutral-800">{lead.companyName || '—'}</div>
                      </td>
                      <td className="max-w-60 truncate text-xs text-neutral-600" title={lead.email || ''}>
                        {lead.email || '—'}
                      </td>
                      <td>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${lead.hasResponded ? 'bg-sky-50 text-sky-800 ring-sky-200/70' : 'bg-neutral-100 text-neutral-600 ring-neutral-200/70'}`}>
                          {lead.hasResponded ? 'Lead' : 'Contact'}
                        </span>
                      </td>
                      <td>
                        <ResponseStatusBadge
                          hasResponded={lead.hasResponded}
                          respondedAt={lead.respondedAt}
                          responseChannels={lead.responseChannels}
                          compact
                        />
                      </td>
                      <td className=" font-semibold text-brand-dark max-w-37.5 truncate" title={lead.campaignName || 'No campaign'}>
                        {lead.campaignName || '—'}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => toggleLinkedinField(lead, 'connSent')}
                            className={`crm-toggle-btn ${lead.linkedinOutreach?.connSent ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          >
                            <Linkedin className="h-3 w-3" />
                            <span>Sent</span>
                          </button>
                          <button
                            onClick={() => toggleLinkedinField(lead, 'accepted')}
                            className={`crm-toggle-btn ${lead.linkedinOutreach?.accepted ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          >
                            <span>Accepted</span>
                          </button>
                        </div>
                      </td>
                      <td className=" text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold border ${hasCc ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}
                        >
                          <PhoneCall className="h-2.5 w-2.5" />
                          {hasCc ? (lead.coldCall?.response || 'Called') : 'Log'}
                        </span>
                      </td>
                      <td className=" text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => launchWhatsapp(lead)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => toggleWhatsappSent(lead)}
                            className={`crm-toggle-btn py-0.5 px-1.5 ${hasWa ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          >
                            <span>Sent</span>
                          </button>
                        </div>
                      </td>
                      <td>
                        <PocQualificationBadge status={lead.pocQualification?.status} compact />
                      </td>
                      <td>
                        <DeliveryStatusBadge status={lead.deliveryStatus} />
                      </td>
                      <td className="text-center" onClick={stopRowClick}>
                        <DeleteIconButton
                          label={`Delete ${lead.name || 'contact'}`}
                          onClick={() => confirmDeleteLead(
                            lead._id,
                            `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
                          )}
                        />
                      </td>
                    </ClickableTableRow>
                  );
                })}
              </tbody>
            </table>
            </DataTableShell>

            {/* Stable Bottom Infinite Scroll Footer with Load Next 50 & Show All buttons */}
            <div className="flex flex-col items-center justify-center p-4 border-t border-neutral-100 min-h-16">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>Loading contacts…</span>
                </div>
              ) : hasMore && allTruncated ? (
                <div className="max-w-sm text-center text-xs text-[var(--color-ink-muted)]">
                  Showing the first {leads.length.toLocaleString()} of {total.toLocaleString()} contacts. Narrow your search or filters to see the rest.
                </div>
              ) : hasMore ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadNextPage}
                    className="crm-btn-secondary text-xs px-4 py-2 hover:bg-neutral-100 transition"
                  >
                    Load next 50 contacts ({total - leads.length} remaining)
                  </button>
                  <button
                    type="button"
                    onClick={loadAllData}
                    className="crm-btn-secondary text-xs px-4 py-2 bg-brand/10 text-brand border-brand/30 hover:bg-brand/20 transition font-semibold"
                  >
                    Show all ({total.toLocaleString()} total)
                  </button>
                </div>
              ) : (
                <div className="text-xs text-[var(--color-ink-muted)] font-mono">
                  All {total} contacts loaded
                </div>
              )}
            </div>
          </>
        )}
      </Card>
      </PageSection>

      <OutreachDrawer
        lead={selectedLead}
        onClose={closeDrawer}
        onDelete={deleteLeadItem}
        onLeadUpdated={(updated) => setLeads((prev) => prev.map((l) => (l._id === updated._id ? { ...l, ...updated } : l)))}
      />

      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onCreated={(lead) => {
          loadInitialData();
          openDrawer(lead);
        }}
      />
    </PageShell>
  );
}
