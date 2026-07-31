import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCompaniesData, updateCompanyInState, removeCompanyFromState } from '../store/slices/companiesSlice.js';
import { fetchGlobalCompanies, deleteCompanyWithUndo, deleteLeadWithUndo, deleteCompanies } from '../crmApi.js';
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
  Loader2,
  Search,
  X,
} from 'lucide-react';
import CompanyDetailsDrawer from '../components/leads/CompanyDetailsDrawer.jsx';
import OutreachDrawer from '../components/leads/OutreachDrawer.jsx';
import AddCompanyModal from '../components/leads/AddCompanyModal.jsx';
import DataTableShell from '../components/ui/DataTableShell.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  COMPANY_FILTER_SCHEMA,
  withFieldOptions,
  buildDistinctFieldOptions,
  buildDistinctFieldOptionsFromArrays,
} from '../components/ui/advancedFilter/index.js';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 50;

  // Refs to prevent duplicate concurrent page fetches and scroll flicker
  const isFetchingRef = useRef(false);
  const observerTarget = useRef(null);

  // Selected company drawer state
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  // Selected lead drawer state (stacked)
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [error, setError] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { sortKey, sortDir, sortLabel, toggleSort, clearSort } = useTableSort({
    defaultKey: 'companyName',
    defaultDir: 'asc',
    accessors: companySortAccessors,
  });

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
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
    activeCount: advancedActiveCount,
  } = useTableFilters([], companyFilterSchema);

  // Helper to extract clean query params from advanced filters for server database query
  const filterParams = useMemo(() => {
    const params = {};
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (!advancedFilters) return params;
    Object.keys(advancedFilters).forEach((key) => {
      const val = advancedFilters[key];
      if (val === undefined || val === null || val === '') return;
      if (Array.isArray(val)) {
        if (val.length) params[key] = val.join(',');
      } else if (typeof val === 'object') {
        if (val.value !== undefined && val.value !== null && val.value !== '') {
          params[key] = val.value;
        } else if (Array.isArray(val.values) && val.values.length) {
          params[key] = val.values.join(',');
        }
      } else if (typeof val === 'string' && val.trim()) {
        params[key] = val.trim();
      }
    });
    params.filters = JSON.stringify(advancedFilters);
    return params;
  }, [searchTerm, advancedFilters]);

  const dispatch = useDispatch();

  // Load initial page (page 1) whenever sort, search, or filters change
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    isFetchingRef.current = true;
    try {
      const data = await fetchGlobalCompanies({
        page: 1,
        limit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      dispatch(setCompaniesData({ items: data.items || [], total: data.total || 0 }));
      setCompanies(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError('Failed to load companies.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [sortKey, sortDir, filterParams, limit, dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInitialData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadInitialData]);

  const hasMore = companies.length < total;

  // Load next chunk of 50 companies for infinite scroll with strict ref lock
  const loadNextPage = useCallback(async () => {
    if (isFetchingRef.current || companies.length >= total || loading) return;
    
    isFetchingRef.current = true;
    setLoadingMore(true);
    
    const nextPage = Math.floor(companies.length / limit) + 1;
    try {
      const data = await fetchGlobalCompanies({
        page: nextPage,
        limit,
        sortKey,
        sortDir,
        ...filterParams,
      });
      const newItems = data.items || [];
      if (newItems.length > 0) {
        setCompanies((prev) => {
          const existingIds = new Set(prev.map((c) => String(c._id)));
          const filteredNew = newItems.filter((c) => !existingIds.has(String(c._id)));
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
  }, [loading, companies.length, total, limit, sortKey, sortDir, filterParams]);

  // Load all remaining items in one fetch
  const loadAllData = useCallback(async () => {
    if (isFetchingRef.current || loading) return;

    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchGlobalCompanies({
        page: 1,
        limit: Math.max(total, 50000),
        sortKey,
        sortDir,
        ...filterParams,
      });
      setCompanies(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 150);
    }
  }, [loading, total, sortKey, sortDir, filterParams]);



  const selection = useRowSelection(companies);

  const handleCompanyUpdated = () => {
    loadInitialData();
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
      setTotal((t) => Math.max(0, t - 1));
    },
    onRestored: () => loadInitialData(),
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
      setTotal((t) => Math.max(0, t - ids.length));
    },
    onRestored: () => loadInitialData(),
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
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <AdvancedFilterPopover
                schema={companyFilterSchema}
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
                  placeholder="Search database by name, domain, location…"
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
            </div>
          )}
          meta={
            <ToolbarCount>
              Showing {companies.length} of {total} companies
            </ToolbarCount>
          }
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
          <LoadingState label="Fetching companies database…" />
        ) : companies.length === 0 ? (
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
            <table className="crm-table min-w-175">
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
                {companies.map((comp) => (
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
                    <td className=" text-xs text-neutral-600 max-w-50 truncate" title={comp.campaignNames?.join(', ')}>
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

            {/* Stable Bottom Infinite Scroll Footer with Load Next 50 & Show All buttons */}
            <div className="flex flex-col items-center justify-center p-4 border-t border-neutral-100 min-h-16">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  <span>Loading companies…</span>
                </div>
              ) : hasMore ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadNextPage}
                    className="crm-btn-secondary text-xs px-4 py-2 hover:bg-neutral-100 transition"
                  >
                    Load next 50 companies ({total - companies.length} remaining)
                  </button>
                  <button
                    type="button"
                    onClick={loadAllData}
                    className="crm-btn-secondary text-xs px-4 py-2 bg-brand/10 text-brand border-brand/30 hover:bg-brand/20 transition font-semibold"
                  >
                    Show all ({total} total)
                  </button>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 font-mono">
                  All {total} companies loaded
                </div>
              )}
            </div>
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
