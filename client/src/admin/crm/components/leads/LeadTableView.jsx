import { useMemo, useState, useEffect } from 'react';
import LeadFilterToolbar from './LeadFilterToolbar.jsx';
import OutreachDrawer from './OutreachDrawer.jsx';
import { DeliveryStatusBadge, SourceAttributionChips } from './LeadTableComponents.jsx';
import { VendorEmailColumns, VendorEmailHeaders } from './VendorEmailCells.jsx';
import { EmptyState } from '../ui/primitives.jsx';
import TablePagination from '../ui/TablePagination.jsx';
import DataTableShell from '../ui/DataTableShell.jsx';
import ClickableTableRow, { stopRowClick } from '../ui/ClickableTableRow.jsx';
import {
  AdvancedFilterChips,
  useTableFilters,
  buildLeadFilterSchema,
  buildDistinctFieldOptions,
} from '../ui/advancedFilter/index.js';
import { useBulkDelete } from '../../hooks/useBulkDelete.js';
import { useTableSort } from '../../hooks/useTableSort.js';
import { leadSortAccessors } from '../../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../ui/SortableTableHeader.jsx';
import DeleteIconButton from '../ui/DeleteIconButton.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../ui/BulkSelectTable.jsx';
import { useRowSelection } from '../../hooks/useRowSelection.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { updateLead, deleteLeadWithUndo, deleteLeads } from '../../crmApi.js';
import { 
  Users, 
  PhoneCall, 
  MessageSquare, 
  Download,
} from 'lucide-react';

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

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function LeadTableView({ leadsData = [], campaignsList = [], projectId, onLeadUpdated, onCompanyClick, onLeadRemoved, onRestored }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const leadFilterSchema = useMemo(
    () => buildLeadFilterSchema({
      campaignOptions: campaignsList.map((camp) => ({ value: camp._id, label: camp.projectName })),
      fieldOptions: {
        name: buildDistinctFieldOptions(leadsData, (r) => r.name),
        email: buildDistinctFieldOptions(leadsData, (r) => r.email),
        designation: buildDistinctFieldOptions(leadsData, (r) => r.designation),
        companyName: buildDistinctFieldOptions(leadsData, (r) => r.companyName),
        domain: buildDistinctFieldOptions(leadsData, (r) => r.domain),
      },
    }),
    [campaignsList, leadsData],
  );
  const {
    filtered: filteredLeads,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(leadsData, leadFilterSchema);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'name',
    defaultDir: 'asc',
    accessors: leadSortAccessors,
  });

  const sortedLeads = useMemo(
    () => sortItems(filteredLeads),
    [filteredLeads, sortItems],
  );

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedLeads.slice(start, start + limit);
  }, [sortedLeads, page, limit]);

  const selection = useRowSelection(paginatedLeads);

  useEffect(() => {
    setPage(1);
  }, [advancedFilters, advancedMatchMode, leadsData.length]);

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: (id) => {
      onLeadRemoved?.(id);
      if (selectedLead?._id === id) setSelectedLead(null);
      selection.clearSelection();
    },
    onRestored,
    defaultConfirm: 'Delete this contact? You can undo within 30 seconds.',
  });

  const runBulkDeleteLeads = useBulkDelete({
    resourceType: 'lead',
    bulkDeleteFn: deleteLeads,
    getLabelForId: (id) => {
      const lead = leadsData.find((l) => l._id === id);
      return `Deleted contact: ${lead?.name || lead?.email || 'Contact'}`;
    },
    defaultConfirm: 'Delete these contacts? You can undo each within 30 seconds.',
    onRemoved: (ids) => {
      ids.forEach((id) => onLeadRemoved?.(id));
      if (selectedLead && ids.includes(selectedLead._id)) setSelectedLead(null);
      selection.clearSelection();
    },
    onRestored,
  });

  async function deleteLeadItem(lead) {
    await confirmDeleteLead(
      lead._id,
      `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
    );
  }

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

  const handleUpdate = async (leadId, patch) => {
    try {
      const updated = await updateLead(leadId, patch);
      if (onLeadUpdated) onLeadUpdated(updated);
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

  const triggerDownload = () => {
    window.open(`/api/admin/projects/${projectId}/export`, '_blank');
  };

  return (
    <div className="crm-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <LeadFilterToolbar
          advancedSchema={leadFilterSchema}
          advancedFilters={advancedFilters}
          advancedMatchMode={advancedMatchMode}
          onAdvancedFiltersChange={setAdvancedFilters}
        />
        {projectId && (
          <button 
            onClick={triggerDownload} 
            className="crm-btn-secondary shrink-0 flex items-center gap-1.5 self-start"
            title="Download Campaign Tracker Spreadsheet"
          >
            <Download className="h-4 w-4" />
            Download Sheet
          </button>
        )}
      </div>
      <AdvancedFilterChips
        schema={leadFilterSchema}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        className="px-4 pb-3"
      />

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={leadsData.length ? 'No leads match your filters' : 'No leads yet'}
          description={
            leadsData.length
              ? 'Try clearing the search or filters above.'
              : 'Import contacts from the Import tab — companies are created automatically from each contact’s email domain.'
          }
        />
      ) : (
        <>
          <TablePagination
            page={page}
            limit={limit}
            total={filteredLeads.length}
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
          <table className="crm-table">
            <thead>
              <tr className="crm-table-head">
                <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                <SortableTableHeader label="Contact" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-4 py-3" />
                <VendorEmailHeaders sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} SortableTableHeader={SortableTableHeader} />
                <th className="px-4 py-3 text-center">LinkedIn Nav</th>
                <th className="px-4 py-3 text-center">Cold Call</th>
                <th className="px-4 py-3 text-center">WhatsApp</th>
                <SortableTableHeader label="Outbox" sortKey="deliveryStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-4 py-3" />
                <SortableTableHeader label="Outcome" sortKey="outcome" activeKey={sortKey} direction={sortDir} onSort={toggleSort} className="px-4 py-3" />
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                const hasCc = lead.coldCall?.made || false;
                const hasWa = lead.whatsapp?.sent || false;
                return (
                  <ClickableTableRow key={lead._id} onClick={() => openDrawer(lead)}>
                    <BulkSelectRowCell
                      id={lead._id}
                      selection={selection}
                      ariaLabel={`Select ${lead.name || 'contact'}`}
                    />
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onCompanyClick?.(lead.companyId)}
                        className="truncate font-medium text-neutral-800 hover:text-brand transition text-left"
                      >
                        {lead.companyName || '—'}
                      </button>
                    </td>
                    <VendorEmailColumns lead={lead} />
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleLinkedinField(lead, 'connSent')}
                          className={`crm-toggle-btn ${lead.linkedinOutreach?.connSent ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          title="Connection Request Sent"
                        >
                          <Linkedin className="h-3 w-3" />
                          <span>Sent</span>
                        </button>
                        <button
                          onClick={() => toggleLinkedinField(lead, 'accepted')}
                          className={`crm-toggle-btn ${lead.linkedinOutreach?.accepted ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          title="Connection Request Accepted"
                        >
                          <span>Accepted</span>
                        </button>
                        <button
                          onClick={() => toggleLinkedinField(lead, 'inmailSent')}
                          className={`crm-toggle-btn ${lead.linkedinOutreach?.inmailSent ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          title="InMail Outbound Sent"
                        >
                          <span>InMail</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold border ${hasCc ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}
                      >
                        <PhoneCall className="h-3 w-3" />
                        {hasCc ? (lead.coldCall?.response || 'Called') : 'Log Call'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => launchWhatsapp(lead)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          title="Launch UAE WhatsApp Direct Chat"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleWhatsappSent(lead)}
                          className={`crm-toggle-btn ${hasWa ? 'crm-toggle-btn-active' : 'crm-toggle-btn-inactive'}`}
                          title="Flag WhatsApp Sent"
                        >
                          <span>Sent</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryStatusBadge status={lead.deliveryStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${lead.outcome === 'Won' ? 'bg-emerald-100 text-emerald-800' : lead.outcome === 'Opted Out' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>
                        {lead.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={stopRowClick}>
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
            total={filteredLeads.length}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            noun="leads"
            className="is-bottom"
          />
        </>
      )}

      <OutreachDrawer
        lead={selectedLead}
        onClose={closeDrawer}
        onLeadUpdated={onLeadUpdated}
        onDelete={deleteLeadItem}
      />
    </div>
  );
}
