import { useEffect, useState, useMemo, useCallback } from 'react';
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
  EmptyState 
} from '../components/ui/primitives.jsx';
import { 
  Users, 
  PhoneCall, 
  MessageSquare,
  Plus,
} from 'lucide-react';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import { DeliveryStatusBadge } from '../components/leads/LeadTableComponents.jsx';
import PocQualificationBadge from '../components/leads/PocQualificationBadge.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import { VendorEmailColumns, VendorEmailHeaders } from '../components/leads/VendorEmailCells.jsx';
import AddContactModal from '../components/leads/AddContactModal.jsx';
import TablePagination from '../components/ui/TablePagination.jsx';
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Selected lead drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    crmApiFetch('/api/admin/projects')
      .then(setCampaigns)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [advancedActiveCount]);

  useEffect(() => {
    loadData();
  }, [page, limit, advancedActiveCount]);

  const tableTotal = advancedActiveCount ? advancedFilteredLeads.length : total;

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'name',
    defaultDir: 'asc',
    accessors: leadSortAccessors,
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
    if (!cleanPhone) return alert('No phone number configured for WhatsApp.');

    const name = lead.name || 'there';
    const message = encodeURIComponent(`Hi ${name}, thanks for replying to our email regarding your custom footprint layout at the upcoming exhibition. Let's align execution vectors here!`);
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
            <AdvancedFilterPopover
              schema={leadFilterSchema}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
          )}
          meta={<ToolbarCount>{tableTotal} total records</ToolbarCount>}
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

        <Card className="overflow-hidden">
        {loading ? (
          <LoadingState label="Fetching global leads..." />
        ) : tableLeads.length === 0 ? (
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
            <TablePagination
              page={page}
              limit={limit}
              total={tableTotal}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              noun="leads"
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
            <DataTableShell minWidth={1200}>
            <table className="crm-table min-w-[1100px]">
              <thead>
                <tr className="crm-table-head">
                  <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                  <SortableTableHeader label="Contact" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <VendorEmailHeaders sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} SortableTableHeader={SortableTableHeader} />
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
                {tableLeads.map((lead) => {
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
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-600">
                            {initials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--color-ink)]">
                              {lead.name || '—'}
                            </div>
                            <div className="truncate text-xs text-neutral-500">{lead.designation || 'Decision maker'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="truncate font-medium text-neutral-800">{lead.companyName || '—'}</div>
                      </td>
                      <VendorEmailColumns lead={lead} />
                      <td className=" font-semibold text-brand-dark max-w-[150px] truncate" title={lead.campaignName || 'No campaign'}>
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
            <TablePagination
              page={page}
              limit={limit}
              total={tableTotal}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              noun="leads"
              className="is-bottom"
            />
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
          loadData();
          openDrawer(lead);
        }}
      />
    </PageShell>
  );
}
