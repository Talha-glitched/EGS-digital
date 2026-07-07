import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchGlobalCompanies, crmApiFetch, deleteCompanyWithUndo, deleteLeadWithUndo, deleteCompanies, deleteLeads } from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
import { BulkSelectHeaderCell, BulkSelectRowCell, BulkSelectionBar } from '../components/ui/BulkSelectTable.jsx';
import { useRowSelection } from '../hooks/useRowSelection.js';
import { useBulkDelete } from '../hooks/useBulkDelete.js';
import { useTableSort } from '../hooks/useTableSort.js';
import { companySortAccessors } from '../hooks/tableSortAccessors.js';
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
  Building2, 
  ExternalLink,
  Plus,
} from 'lucide-react';
import CompanyDetailsDrawer from '../components/leads/CompanyDetailsDrawer.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import AddCompanyModal from '../components/leads/AddCompanyModal.jsx';
import TablePagination from '../components/ui/TablePagination.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import { DeliveryStatusBadge } from '../components/leads/LeadTableComponents.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  COMPANY_FILTER_SCHEMA,
  withFieldOptions,
  buildDistinctFieldOptions,
  buildDistinctFieldOptionsFromArrays,
} from '../components/ui/advancedFilter/index.js';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// Custom inline SVG for Linkedin icon
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Selected company drawer state
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Selected lead drawer state (stacked)
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const companyFilterSchema = useMemo(
    () => withFieldOptions(COMPANY_FILTER_SCHEMA, {
      companyName: buildDistinctFieldOptions(companies, (r) => r.companyName),
      domain: buildDistinctFieldOptions(companies, (r) => r.domain),
      industry: buildDistinctFieldOptions(companies, (r) => r.industry),
      city: buildDistinctFieldOptions(companies, (r) => r.city),
      country: buildDistinctFieldOptions(companies, (r) => r.country),
      genericEmails: buildDistinctFieldOptionsFromArrays(companies, (r) => r.genericEmails),
      genericEmailContains: buildDistinctFieldOptionsFromArrays(companies, (r) => r.genericEmails),
    }),
    [companies],
  );

  const {
    filtered: advancedFilteredCompanies,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
    activeCount: advancedActiveCount,
  } = useTableFilters(companies, companyFilterSchema);

  const loadData = async () => {
    setLoading(true);
    try {
      const useWideFetch = advancedActiveCount > 0;
      const data = await fetchGlobalCompanies({
        page: useWideFetch ? 1 : page,
        limit: useWideFetch ? 500 : limit,
      });
      setCompanies(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [advancedActiveCount]);

  useEffect(() => {
    loadData();
  }, [page, limit, advancedActiveCount]);

  const tableTotal = advancedActiveCount ? advancedFilteredCompanies.length : total;

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort, sortItems } = useTableSort({
    defaultKey: 'companyName',
    defaultDir: 'asc',
    accessors: companySortAccessors,
  });

  const sortedCompanies = useMemo(() => {
    const base = advancedActiveCount ? advancedFilteredCompanies : companies;
    return sortItems(base);
  }, [advancedActiveCount, advancedFilteredCompanies, companies, sortItems]);

  const tableCompanies = useMemo(() => {
    if (!advancedActiveCount) return sortedCompanies;
    const start = (page - 1) * limit;
    return sortedCompanies.slice(start, start + limit);
  }, [advancedActiveCount, sortedCompanies, page, limit]);

  const selection = useRowSelection(tableCompanies);

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleCompanyUpdated = () => {
    loadData();
  };

  useSpotlightDeepLink({
    recordType: 'company',
    onOpen: (company) => setSelectedCompanyId(company._id),
    findRecord: useCallback((id) => companies.find((company) => String(company._id) === String(id)), [companies]),
    resolveRecord: useCallback(async (id) => ({ _id: id }), []),
    ready: !loading,
  });

  const confirmDeleteCompany = useConfirmDelete({
    resourceType: 'company',
    deleteFn: deleteCompanyWithUndo,
    onRemoved: (id) => {
      setCompanies((prev) => prev.filter((c) => c._id !== id));
      if (selectedCompanyId === id) setSelectedCompanyId(null);
    },
    onRestored: () => loadData(),
    defaultConfirm: 'Delete this company? You can undo within 30 seconds.',
  });

  const confirmDeleteLead = useConfirmDelete({
    resourceType: 'lead',
    deleteFn: deleteLeadWithUndo,
    onRemoved: (id) => {
      if (selectedLead?._id === id) setSelectedLead(null);
    },
    onRestored: () => handleCompanyUpdated(),
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
      setCompanies((prev) => prev.filter((c) => !ids.includes(c._id)));
      if (selectedCompanyId && ids.includes(selectedCompanyId)) setSelectedCompanyId(null);
      selection.clearSelection();
    },
    onRestored: () => loadData(),
  });

  async function handleBulkDelete() {
    setBulkDeleting(true);
    setError('');
    try {
      await runBulkDeleteCompanies(selection.selectedArray, { noun: 'company' });
    } catch (err) {
      setError(err.message || 'Failed to delete companies.');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function deleteCompanyItem(company) {
    setError('');
    try {
      await confirmDeleteCompany(
        company._id,
        `Deleted company: ${company.companyName || 'Company'}`,
      );
    } catch (err) {
      setError(err.message || 'Failed to delete company.');
    }
  }

  async function deleteLeadItem(lead) {
    setError('');
    try {
      await confirmDeleteLead(
        lead._id,
        `Deleted contact: ${lead.name || lead.email || 'Contact'}`,
      );
    } catch (err) {
      setError(err.message || 'Failed to delete contact.');
    }
  }

  const openLeadDrawer = (lead) => setSelectedLead(lead);
  const closeLeadDrawer = () => setSelectedLead(null);

  return (
    <PageShell>
      <PageSection>
        <PageToolbar
          start={(
            <AdvancedFilterPopover
              schema={companyFilterSchema}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
          )}
          meta={<ToolbarCount>{tableTotal} total companies</ToolbarCount>}
          actions={(
            <button type="button" onClick={() => setShowAddCompany(true)} className="crm-btn-primary shrink-0">
              <Plus className="h-3.5 w-3.5" />
              Add company
            </button>
          )}
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        <AdvancedFilterChips
          schema={companyFilterSchema}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          className="mb-3"
        />

        <Card className="overflow-hidden">
        {loading ? (
          <LoadingState label="Fetching companies list..." />
        ) : tableCompanies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Adjust your search filters or add a new company manually."
            action={
              <button type="button" onClick={() => setShowAddCompany(true)} className="crm-btn-primary">
                <Plus className="h-4 w-4" />
                Add company
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
              noun="companies"
            />
            <BulkSelectionBar
              count={selection.selectionCount}
              noun="company"
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
            <DataTableShell minWidth={700}>
            <table className="crm-table min-w-[700px]">
              <thead>
                <tr className="crm-table-head">
                  <BulkSelectHeaderCell selection={selection} ariaLabel="Select all companies" />
                  <SortableTableHeader label="Company Name" sortKey="companyName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Domain" sortKey="domain" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Location" sortKey="location" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Known Contacts" sortKey="pocCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Associated Projects" sortKey="campaigns" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableTableHeader label="Status" sortKey="globalStatus" activeKey={sortKey} direction={sortDir} onSort={toggleSort} align="center" />
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableCompanies.map((comp) => (
                  <ClickableTableRow key={comp._id} onClick={() => setSelectedCompanyId(comp._id)}>
                    <BulkSelectRowCell
                      id={comp._id}
                      selection={selection}
                      ariaLabel={`Select ${comp.companyName}`}
                    />
                    <td>
                      <div className="crm-cell-primary">
                        {comp.companyName}
                      </div>
                      {comp.boothNumber && (
                        <div className="text-[10px] text-neutral-400 font-mono">Stand: {comp.boothNumber}</div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 font-mono text-xs text-neutral-500">
                        <span>{comp.domain}</span>
                        <a href={`https://${comp.domain}`} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-brand">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                    <td className=" text-xs text-neutral-600">
                      {comp.city || comp.country ? `${comp.city || '—'}, ${comp.country || '—'}` : '—'}
                    </td>
                    <td className=" font-semibold text-neutral-800">
                      {comp.pocCount} person(s)
                    </td>
                    <td className=" text-xs text-neutral-600 max-w-[200px] truncate" title={comp.campaignNames?.join(', ')}>
                      {comp.campaignNames?.length ? comp.campaignNames.join(', ') : '—'}
                    </td>
                    <td className=" text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${comp.globalStatus === 'Client Partner' ? 'bg-emerald-100 text-emerald-800' : comp.globalStatus === 'Blacklisted' ? 'bg-red-100 text-red-800' : comp.globalStatus === 'Active Prospect' ? 'bg-blue-50 text-blue-700' : 'bg-neutral-100 text-neutral-600'}`}>
                        {comp.globalStatus || 'Lead'}
                      </span>
                    </td>
                    <td className="text-center" onClick={stopRowClick}>
                      <DeleteIconButton
                        label={`Delete ${comp.companyName}`}
                        onClick={() => deleteCompanyItem(comp)}
                      />
                    </td>
                  </ClickableTableRow>
                ))}
              </tbody>
            </table>
            </DataTableShell>
            <TablePagination
              page={page}
              limit={limit}
              total={tableTotal}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              noun="companies"
              className="is-bottom"
            />
          </>
        )}
      </Card>
      </PageSection>

      {/* ── COMPANY DETAILS DRAWER ── */}
      <CompanyDetailsDrawer
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
        onPersonSelected={(lead) => openLeadDrawer(lead)}
        onUpdated={handleCompanyUpdated}
        onDelete={deleteCompanyItem}
      />

      <OutreachDrawer
        lead={selectedLead}
        onClose={closeLeadDrawer}
        onDelete={deleteLeadItem}
        onLeadUpdated={() => handleCompanyUpdated()}
        stackLevel={selectedCompanyId ? 1 : 0}
      />

      <AddCompanyModal
        open={showAddCompany}
        onClose={() => setShowAddCompany(false)}
        onCreated={(company) => {
          handleCompanyUpdated();
          setSelectedCompanyId(company._id);
        }}
      />
    </PageShell>
  );
}
