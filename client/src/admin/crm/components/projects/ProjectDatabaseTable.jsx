import { useMemo, useState, useEffect } from 'react';
import { DeliveryStatusBadge, ResponseStatusBadge } from '../leads/LeadTableComponents.jsx';
import { VendorEmailColumns, VendorEmailHeaders } from '../leads/VendorEmailCells.jsx';
import PocQualificationBadge from '../leads/PocQualificationBadge.jsx';
import { EmptyState, cn } from '../ui/primitives.jsx';
import TablePagination from '../ui/TablePagination.jsx';
import DataTableShell from '../ui/DataTableShell.jsx';
import { CAMPAIGN_AUTOMATION } from '../../constants/automationHints.js';
import ClickableTableRow, { stopRowClick } from '../ui/ClickableTableRow.jsx';
import DeleteIconButton from '../ui/DeleteIconButton.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../ui/BulkSelectTable.jsx';
import { useRowSelection } from '../../hooks/useRowSelection.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useBulkDelete } from '../../hooks/useBulkDelete.js';
import { useTableSort } from '../../hooks/useTableSort.js';
import { campaignCompanySortAccessors, leadSortAccessors } from '../../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../ui/SortableTableHeader.jsx';
import { deleteCompanyWithUndo, deleteLeadWithUndo, deleteCompanies, deleteLeads } from '../../crmApi.js';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  CAMPAIGN_COMPANY_FILTER_SCHEMA,
  buildLeadFilterSchema,
  withFieldOptions,
  buildDistinctFieldOptions,
  buildDistinctFieldOptionsFromArrays,
} from '../ui/advancedFilter/index.js';
import { Building2, Users } from 'lucide-react';

export default function ProjectDatabaseTable({
  companies = [],
  leads = [],
  onCompanyClick,
  onLeadClick,
  onCompanyRemoved,
  onLeadRemoved,
  onRestored,
}) {
  const [view, setView] = useState('companies');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const companiesWithCounts = useMemo(() => {
    const countByCompany = new Map();
    for (const lead of leads) {
      const key = String(lead.companyId);
      countByCompany.set(key, (countByCompany.get(key) || 0) + 1);
    }
    return companies.map((company) => ({
      ...company,
      pocCount: countByCompany.get(String(company._id)) ?? company.pocCount ?? 0,
    }));
  }, [companies, leads]);

  const companySchema = useMemo(
    () => withFieldOptions(CAMPAIGN_COMPANY_FILTER_SCHEMA, {
      companyName: buildDistinctFieldOptions(companiesWithCounts, (r) => r.companyName),
      domain: buildDistinctFieldOptions(companiesWithCounts, (r) => r.domain),
      genericEmails: buildDistinctFieldOptionsFromArrays(companiesWithCounts, (r) => r.genericEmails),
      genericEmailContains: buildDistinctFieldOptionsFromArrays(companiesWithCounts, (r) => r.genericEmails),
    }),
    [companiesWithCounts],
  );
  const leadSchema = useMemo(
    () => buildLeadFilterSchema({
      fieldOptions: {
        name: buildDistinctFieldOptions(leads, (r) => r.name),
        email: buildDistinctFieldOptions(leads, (r) => r.email),
        companyName: buildDistinctFieldOptions(leads, (r) => r.companyName),
      },
    }),
    [leads],
  );

  const companyFilterState = useTableFilters(companiesWithCounts, companySchema);
  const leadFilterState = useTableFilters(leads, leadSchema);
  const activeFilters = view === 'companies' ? companyFilterState : leadFilterState;
  const activeSchema = view === 'companies' ? companySchema : leadSchema;

  const filteredCompanies = companyFilterState.filtered;
  const filteredLeads = leadFilterState.filtered;

  const companySort = useTableSort({
    defaultKey: 'companyName',
    defaultDir: 'asc',
    accessors: campaignCompanySortAccessors,
  });
  const leadSort = useTableSort({
    defaultKey: 'name',
    defaultDir: 'asc',
    accessors: leadSortAccessors,
  });
  const { sortKey, sortDir, sortLabel, toggleSort, clearSort } = view === 'companies' ? companySort : leadSort;

  const sortedCompanies = useMemo(
    () => companySort.sortItems(filteredCompanies),
    [filteredCompanies, companySort.sortItems],
  );
  const sortedLeads = useMemo(
    () => leadSort.sortItems(filteredLeads),
    [filteredLeads, leadSort.sortItems],
  );

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedCompanies.slice(start, start + limit);
  }, [sortedCompanies, page, limit]);

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * limit;
    return sortedLeads.slice(start, start + limit);
  }, [sortedLeads, page, limit]);

  const pageItems = view === 'companies' ? paginatedCompanies : paginatedLeads;
  const selection = useRowSelection(pageItems);

  useEffect(() => {
    setPage(1);
    selection.clearSelection();
  }, [view, companies.length, leads.length, activeFilters.activeCount, activeFilters.matchMode]);

  const confirmDeleteCompany = useConfirmDelete({
    resourceType: 'company',
    deleteFn: deleteCompanyWithUndo,
    onRemoved: (id) => {
      onCompanyRemoved?.(id);
      selection.clearSelection();
    },
    onRestored,
    defaultConfirm: 'Delete this company? You can undo within 30 seconds.',
  });

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: (id) => {
      onLeadRemoved?.(id);
      selection.clearSelection();
    },
    onRestored,
    defaultConfirm: 'Delete this contact? You can undo within 30 seconds.',
  });

  const runBulkDeleteCompanies = useBulkDelete({
    resourceType: 'company',
    bulkDeleteFn: deleteCompanies,
    getLabelForId: (id) => {
      const company = companies.find((c) => c._id === id);
      return `Deleted company: ${company?.companyName || 'Company'}`;
    },
    defaultConfirm: 'Delete these companies? You can undo each within 30 seconds.',
    onRemoved: (ids) => {
      ids.forEach((id) => onCompanyRemoved?.(id));
      selection.clearSelection();
    },
    onRestored,
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
      ids.forEach((id) => onLeadRemoved?.(id));
      selection.clearSelection();
    },
    onRestored,
  });

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      if (view === 'companies') {
        await runBulkDeleteCompanies(selection.selectedArray, { noun: 'company' });
      } else {
        await runBulkDeleteLeads(selection.selectedArray, { noun: 'contact' });
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteCompanyItem(company) {
    const linkedLeadCount = leads.filter((lead) => String(lead.companyId) === String(company._id)).length;
    await confirmDeleteCompany(
      company._id,
      `Deleted company: ${company.companyName || 'Company'}`,
      `Delete this company? It currently has ${linkedLeadCount} linked contact${linkedLeadCount === 1 ? '' : 's'} in this campaign. You can undo within 30 seconds.`,
    );
  }

  async function deleteLeadItem(lead) {
    await confirmDeleteLead(
      lead._id,
      `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
      `Delete this contact? Their linked activity history stays recoverable and you can undo within 30 seconds.`,
    );
  }

  return (
    <div className="crm-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-neutral-50/50 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-[var(--color-line)] bg-white p-1">
            <ToggleBtn active={view === 'companies'} onClick={() => setView('companies')} icon={Building2} label={`Companies (${filteredCompanies.length})`} />
            <ToggleBtn active={view === 'people'} onClick={() => setView('people')} icon={Users} label={`People (${filteredLeads.length})`} />
          </div>
          <AdvancedFilterPopover
            schema={activeSchema}
            filters={activeFilters.filters}
            matchMode={activeFilters.matchMode}
            onChange={activeFilters.setFilters}
          />
        </div>
        <AdvancedFilterChips
          schema={activeSchema}
          filters={activeFilters.filters}
          onChange={activeFilters.setFilters}
        />
      </div>

      {view === 'companies' ? (
        filteredCompanies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No target companies yet"
            description="Use Add exhibitors to upload your scraped list or add companies one at a time."
          />
        ) : (
          <>
            <TablePagination
              page={page}
              limit={limit}
              total={filteredCompanies.length}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              noun="companies"
            />
            <TableSortIndicator
              sortKey={sortKey}
              sortDir={sortDir}
              sortLabel={sortLabel}
              onToggle={() => toggleSort(sortKey)}
              onClear={clearSort}
            />
            <BulkSelectionBar
              count={selection.selectionCount}
              noun="company"
              onDelete={handleBulkDelete}
              onClear={selection.clearSelection}
              deleting={bulkDeleting}
            />
            <DataTableShell minWidth={800}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="crm-table-head bg-slate-100/50">
                  <BulkSelectHeaderCell selection={selection} ariaLabel="Select all companies" />
                  <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Domain" sortKey="domain" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Location" sortKey="location" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Contacts" sortKey="pocCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint="People discovered at this company in this campaign (imports and manual adds)." align="center" />
                  <SortableTableHeader label="Response" sortKey="hasResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.responseStatus} />
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {paginatedCompanies.map((c) => (
                  <ClickableTableRow key={c._id} onClick={() => onCompanyClick?.(c._id)}>
                    <BulkSelectRowCell id={c._id} selection={selection} ariaLabel={`Select ${c.companyName}`} />
                    <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">{c.companyName}</td>
                    <td className="px-4 py-2.5 font-mono text-neutral-500">{c.domain}</td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {c.city && c.country ? `${c.city}, ${c.country}` : c.city || c.country || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      <span className={cn('font-semibold', c.pocCount ? 'text-[var(--color-ink)]' : 'text-neutral-400')}>
                        {c.pocCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <ResponseStatusBadge
                        hasResponded={c.hasResponded}
                        respondedAt={c.respondedAt}
                        responseChannels={c.responseChannels}
                        compact
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center" onClick={stopRowClick}>
                      <DeleteIconButton label={`Delete ${c.companyName}`} onClick={() => deleteCompanyItem(c)} />
                    </td>
                  </ClickableTableRow>
                ))}
              </tbody>
            </table>
            </DataTableShell>
            <TablePagination
              page={page}
              limit={limit}
              total={filteredCompanies.length}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              noun="companies"
              className="is-bottom"
            />
          </>
        )
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Run the contact blender to import Apollo, Hunter, or Lusha exports."
        />
      ) : (
        <>
          <TablePagination
            page={page}
            limit={limit}
            total={filteredLeads.length}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            noun="contacts"
          />
          <TableSortIndicator
            sortKey={sortKey}
            sortDir={sortDir}
            sortLabel={sortLabel}
            onToggle={() => toggleSort(sortKey)}
            onClear={clearSort}
          />
          <BulkSelectionBar
            count={selection.selectionCount}
            noun="contact"
            onDelete={handleBulkDelete}
            onClear={selection.clearSelection}
            deleting={bulkDeleting}
          />
          <DataTableShell minWidth={1200}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="crm-table-head bg-slate-100/50">
                <BulkSelectHeaderCell selection={selection} ariaLabel="Select all contacts" />
                <SortableTableHeader label="Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortableTableHeader label="Company" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <VendorEmailHeaders sortKey={sortKey} sortDir={sortDir} toggleSort={toggleSort} SortableTableHeader={SortableTableHeader} />
                <SortableTableHeader label="Role" sortKey="designation" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortableTableHeader label="POC fit" sortKey="pocStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.pocFit} />
                <SortableTableHeader label="Email status" sortKey="deliveryStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.emailStatus} />
                <SortableTableHeader label="Response" sortKey="hasResponded" activeKey={sortKey} direction={sortDir} onSort={toggleSort} hint={CAMPAIGN_AUTOMATION.responseStatus} />
                <th className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {paginatedLeads.map((lead) => (
                <ClickableTableRow key={lead._id} onClick={() => onLeadClick?.(lead)}>
                  <BulkSelectRowCell id={lead._id} selection={selection} ariaLabel={`Select ${lead.name || 'contact'}`} />
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">{lead.name || '—'}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{lead.companyName || '—'}</td>
                  <VendorEmailColumns lead={lead} />
                  <td className="px-4 py-2.5 text-neutral-600">{lead.designation || '—'}</td>
                  <td className="px-4 py-2.5">
                    <PocQualificationBadge status={lead.pocQualification?.status} compact />
                  </td>
                  <td className="px-4 py-2.5">
                    <DeliveryStatusBadge status={lead.deliveryStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    <ResponseStatusBadge
                      hasResponded={lead.hasResponded}
                      respondedAt={lead.respondedAt}
                      responseChannels={lead.responseChannels}
                      compact
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={stopRowClick}>
                    <DeleteIconButton label={`Delete ${lead.name || 'contact'}`} onClick={() => deleteLeadItem(lead)} />
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
          </DataTableShell>
          <TablePagination
            page={page}
            limit={limit}
            total={filteredLeads.length}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            noun="contacts"
            className="is-bottom"
          />
        </>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-brand-soft text-brand' : 'text-neutral-500 hover:text-neutral-700'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
