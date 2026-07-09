import { useMemo, useState, useEffect, useCallback } from 'react';
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
import { useConfirmDeleteDialog } from '../../context/ConfirmDeleteContext.jsx';
import { useTableSort } from '../../hooks/useTableSort.js';
import { campaignCompanySortAccessors, leadSortAccessors } from '../../hooks/tableSortAccessors.js';
import { SortableTableHeader, TableSortIndicator } from '../ui/SortableTableHeader.jsx';
import { deleteCompanyWithUndo, deleteLeadWithUndo, deleteCompanies, deleteLeads, fetchSentEmails, crmApiFetch, removeQueueJob, removeQueueJobs, sendCampaignQueue } from '../../crmApi.js';
import { RESEND_MAX_SENDS_PER_REQUEST } from '../../constants/resendLimits.js';
import { runBatchedSendLoop } from '../../utils/batchedSend.js';
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
import { Building2, Users, Mail, Search, Send, Play, Trash2 } from 'lucide-react';

const SEND_JOB_STATUS_CONFIG = {
  pending: { className: 'bg-amber-50 text-amber-800 ring-amber-200/70', label: 'Pending' },
  processing: { className: 'bg-blue-50 text-blue-800 ring-blue-200/70', label: 'Sending...' },
  sent: { className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/70', label: 'Sent' },
  failed: { className: 'bg-red-50 text-red-800 ring-red-200/70', label: 'Failed' },
  cancelled: { className: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70', label: 'Cancelled' },
};

function SendJobStatusBadge({ status }) {
  const config = SEND_JOB_STATUS_CONFIG[status] || {
    className: 'bg-neutral-100 text-neutral-600 ring-neutral-200/70',
    label: status,
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset', config.className)}>
      {config.label}
    </span>
  );
}

export default function ProjectDatabaseTable({
  companies = [],
  leads = [],
  onCompanyClick,
  onLeadClick,
  onCompanyRemoved,
  onLeadRemoved,
  onRestored,
  projectId,
  onEmailClick,
  view: controlledView,
  onViewChange,
}) {
  const [localView, setLocalView] = useState('companies');
  const view = controlledView || localView;
  const setView = onViewChange || setLocalView;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Email state
  const [emails, setEmails] = useState([]);
  const [emailTotal, setEmailTotal] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailPage, setEmailPage] = useState(1);
  const [emailLimit, setEmailLimit] = useState(50);
  const [emailSearch, setEmailSearch] = useState('');
  const [debouncedEmailSearch, setDebouncedEmailSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedEmailSearch(emailSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [emailSearch]);

  // Queue state
  const [queueJobs, setQueueJobs] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueLoading, setQueueLoading] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [queueDeleting, setQueueDeleting] = useState(false);
  const [queueSendNotice, setQueueSendNotice] = useState('');

  const queueSelection = useRowSelection(queueJobs);
  const { confirmDelete: confirmQueueDelete } = useConfirmDeleteDialog();

  const fetchQueueJobs = useCallback(async () => {
    if (!projectId) return;
    setQueueLoading(true);
    try {
      const data = await crmApiFetch(`/api/admin/projects/${projectId}/queue`);
      const items = data.items || [];
      setQueueJobs(items);
      setQueueTotal(data.total ?? items.length);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
      setQueueJobs([]);
      setQueueTotal(0);
    } finally {
      setQueueLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchQueueJobs();
  }, [fetchQueueJobs]);

  async function triggerQueueSend() {
    if (queueJobs.length === 0 || sendingAll || !projectId) return;
    setSendingAll(true);
    setQueueSendNotice('');
    const pendingCount = queueJobs.filter((job) => ['pending', 'failed'].includes(job.status)).length;
    setSendingProgress({ current: 0, total: pendingCount });

    try {
      const result = await runBatchedSendLoop(
        (opts) => sendCampaignQueue(projectId, opts),
        {
          onProgress: ({ totalSent, remaining, queuedBefore }) => {
            const total = queuedBefore || pendingCount;
            setSendingProgress({ current: totalSent, total });
            setQueueSendNotice(`Sending… ${totalSent} of ${total} (${remaining} remaining)`);
          },
        },
      );

      if (result.remaining <= 0 && result.totalSent > 0) {
        setQueueSendNotice(`Done — sent ${result.totalSent} email${result.totalSent === 1 ? '' : 's'}.`);
      } else if (result.totalSent > 0) {
        setQueueSendNotice(
          `Sent ${result.totalSent}. ${result.remaining} still in queue${result.totalFailed ? ` (${result.totalFailed} failed)` : ''}.`,
        );
      }
      await fetchQueueJobs();
    } catch (err) {
      console.error('Campaign queue send failed:', err);
      setQueueSendNotice(err.message || 'Send failed.');
      fetchQueueJobs();
    } finally {
      setSendingAll(false);
    }
  }

  async function deleteQueueItem(job) {
    const recipient = job.leadId?.name || job.recipientEmail || 'this contact';
    const ok = await confirmQueueDelete({
      title: 'Remove from queue?',
      message: `Remove the queued email to ${recipient}? This cannot be undone.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;

    setQueueDeleting(true);
    try {
      await removeQueueJob(job._id);
      setQueueJobs((prev) => prev.filter((row) => row._id !== job._id));
      setQueueTotal((prev) => Math.max(0, prev - 1));
      queueSelection.clearSelection();
    } catch (err) {
      console.error('Failed to remove queue job:', err);
      fetchQueueJobs();
    } finally {
      setQueueDeleting(false);
    }
  }

  async function deleteSelectedQueueItems() {
    const ids = queueSelection.selectedArray;
    if (!ids.length) return;

    const count = ids.length;
    const ok = await confirmQueueDelete({
      title: count === 1 ? 'Remove 1 queued email?' : `Remove ${count} queued emails?`,
      message: 'Selected items will be removed from the outbox queue. This cannot be undone.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;

    setQueueDeleting(true);
    try {
      const result = await removeQueueJobs(projectId, { jobIds: ids });
      const removed = new Set((result.jobIds || ids).map(String));
      setQueueJobs((prev) => prev.filter((row) => !removed.has(String(row._id))));
      setQueueTotal((prev) => Math.max(0, prev - (result.removed || 0)));
      queueSelection.clearSelection();
    } catch (err) {
      console.error('Failed to remove selected queue jobs:', err);
      fetchQueueJobs();
    } finally {
      setQueueDeleting(false);
    }
  }

  async function deleteAllQueueItems() {
    if (!queueJobs.length) return;

    const ok = await confirmQueueDelete({
      title: `Remove all ${queueJobs.length} queued emails?`,
      message: 'The entire outbox queue for this campaign will be cleared. This cannot be undone.',
      confirmLabel: 'Remove all',
    });
    if (!ok) return;

    setQueueDeleting(true);
    try {
      const result = await removeQueueJobs(projectId, { all: true });
      setQueueJobs([]);
      setQueueTotal(0);
      queueSelection.clearSelection();
    } catch (err) {
      console.error('Failed to clear queue:', err);
      fetchQueueJobs();
    } finally {
      setQueueDeleting(false);
    }
  }

  const fetchEmails = useCallback(async () => {
    if (!projectId || view !== 'emails') return;
    setEmailLoading(true);
    try {
      const data = await fetchSentEmails({
        page: emailPage,
        limit: emailLimit,
        campaignId: projectId,
        q: debouncedEmailSearch || undefined,
        includeAllStatuses: true,
      });
      setEmails(data.items || []);
      setEmailTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setEmailLoading(false);
    }
  }, [projectId, view, emailPage, emailLimit, debouncedEmailSearch]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    if (!projectId) return;
    fetchSentEmails({
      page: 1,
      limit: 1,
      campaignId: projectId,
      includeAllStatuses: true,
    })
      .then((data) => setEmailTotal(data.total || 0))
      .catch((err) => console.error(err));
  }, [projectId]);

  const refreshEmails = useCallback(() => {
    fetchEmails();
  }, [fetchEmails]);


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
            <ToggleBtn active={view === 'emails'} onClick={() => setView('emails')} icon={Mail} label={`Emails (${emailTotal})`} />
            <ToggleBtn active={view === 'queue'} onClick={() => setView('queue')} icon={Send} label={`Queue (${queueTotal})`} />
          </div>
          {view === 'emails' ? (
            <label className="relative block min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="Search subject, recipient, company..."
                className="crm-input w-full py-1.5 pl-9 text-xs"
              />
            </label>
          ) : (
            <AdvancedFilterPopover
              schema={activeSchema}
              filters={activeFilters.filters}
              matchMode={activeFilters.matchMode}
              onChange={activeFilters.setFilters}
            />
          )}
        </div>
        {view !== 'emails' && (
          <AdvancedFilterChips
            schema={activeSchema}
            filters={activeFilters.filters}
            onChange={activeFilters.setFilters}
          />
        )}
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
      ) : view === 'people' ? (
        filteredLeads.length === 0 ? (
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
        )
      ) : view === 'emails' ? (
        <>
          <TablePagination
            page={emailPage}
            limit={emailLimit}
            total={emailTotal}
            onPageChange={setEmailPage}
            onLimitChange={(l) => {
              setEmailLimit(l);
              setEmailPage(1);
            }}
            noun="emails"
          />
          {emailLoading && emails.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">Loading emails…</div>
          ) : emails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No emails found"
              description="Emails sent, sending, or failed for this sequence campaign will appear here."
            />
          ) : (
            <DataTableShell minWidth={1000}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="crm-table-head bg-slate-100/50">
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Recipient</th>
                    <th className="px-4 py-2.5">Company</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                    <th className="px-4 py-2.5 text-center">Replied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {emails.map((email) => {
                    const recipientName = email.lead?.name || '—';
                    const companyName = email.company?.companyName || '—';
                    const dateVal = email.status === 'pending' ? email.scheduledFor : email.sentAt;
                    const dateText = dateVal ? new Date(dateVal).toLocaleString('en-AE', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : '—';
                    const replied = email.lead?.deliveryStatus === 'Replied' || email.lead?.hasResponded;

                    return (
                      <ClickableTableRow key={email._id} onClick={() => onEmailClick?.(email)}>
                        <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)] truncate max-w-[280px]" title={email.renderedSubject}>
                          {email.renderedSubject || '(No subject)'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-[var(--color-ink)]">{recipientName}</div>
                          <div className="text-neutral-500 text-[10px] font-mono mt-0.5">{email.recipientEmail}</div>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-600 truncate max-w-[180px]" title={companyName}>{companyName}</td>
                        <td className="px-4 py-2.5 text-neutral-500 font-medium">{dateText}</td>
                        <td className="px-4 py-2.5 text-center">
                          <SendJobStatusBadge status={email.status} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                            replied ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/50' : 'bg-neutral-100 text-neutral-500 ring-neutral-200/50'
                          )}>
                            {replied ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </ClickableTableRow>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>
          )}
          <TablePagination
            page={emailPage}
            limit={emailLimit}
            total={emailTotal}
            onPageChange={setEmailPage}
            onLimitChange={(l) => {
              setEmailLimit(l);
              setEmailPage(1);
            }}
            noun="emails"
            className="is-bottom"
          />
        </>
      ) : view === 'queue' ? (
        <>
          {queueJobs.length === 0 ? (
            <EmptyState
              icon={Send}
              title={emailTotal > 0 ? 'Queue is clear' : 'Outbox queue is empty'}
              description={
                emailTotal > 0
                  ? `${emailTotal} email${emailTotal === 1 ? '' : 's'} already sent for this campaign. Launch a sequence in Email Sequences to queue the next batch, then use Send Campaign here.`
                  : 'No contacts are queued for outreach yet. Enroll your audience in Email Sequences first, then return here to send.'
              }
            />
          ) : (
            <div className="p-4 space-y-4">
              <BulkSelectionBar
                count={queueSelection.selectionCount}
                noun="queued email"
                onDelete={deleteSelectedQueueItems}
                onClear={queueSelection.clearSelection}
                deleting={queueDeleting}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-brand-soft/20 border border-brand-soft/50 rounded-xl p-4">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-brand uppercase tracking-wider">Manual Campaign Send Execution</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Review the queue below and send manually. Automatically continues in batches of {RESEND_MAX_SENDS_PER_REQUEST} until complete.
                  </p>
                  {queueSendNotice ? (
                    <p className="mt-2 text-xs font-medium text-brand">{queueSendNotice}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={deleteAllQueueItems}
                    disabled={queueDeleting || sendingAll || queueJobs.length === 0}
                    className="crm-btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete all
                  </button>
                  <button
                    type="button"
                    onClick={triggerQueueSend}
                    disabled={sendingAll || queueJobs.length === 0 || queueDeleting}
                    className="crm-btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {sendingAll ? 'Sending Outreach...' : 'Send Campaign'}
                  </button>
                </div>
              </div>

              {sendingAll && (
                <div className="bg-neutral-50 border border-[var(--color-line)] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-neutral-600">
                    <span>Sending progress</span>
                    <span className="tabular-nums">{sendingProgress.current} / {sendingProgress.total}</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-brand h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <DataTableShell minWidth={800}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="crm-table-head bg-slate-100/50">
                      <BulkSelectHeaderCell selection={queueSelection} ariaLabel="Select all queued emails" />
                      <th className="px-4 py-2.5">To Recipient</th>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Sequence Step</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right w-12" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {queueJobs.map((job) => {
                      const recipientName = job.leadId?.name || 'Contact';
                      const isActivelySending = sendingAll && job.status === 'processing';
                      return (
                        <tr key={job._id} className="hover:bg-neutral-50/50">
                          <BulkSelectRowCell
                            id={job._id}
                            selection={queueSelection}
                            ariaLabel={`Select queued email to ${recipientName}`}
                          />
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-[var(--color-ink)]">{recipientName}</div>
                            <div className="text-neutral-500 text-[10px] font-mono mt-0.5">{job.recipientEmail}</div>
                          </td>
                          <td className="px-4 py-2.5 text-neutral-600 truncate max-w-[280px]" title={job.renderedSubject}>
                            {job.renderedSubject || '(No subject)'}
                          </td>
                          <td className="px-4 py-2.5 text-neutral-500 font-medium">
                            Step {job.stepIndex + 1}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <SendJobStatusBadge status={job.status} />
                            {job.status === 'failed' && job.errorMessage && (
                              <p className="mt-1 text-[10px] font-semibold text-red-500 max-w-[220px] mx-auto truncate" title={job.errorMessage}>
                                {job.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <DeleteIconButton
                              label={`Remove ${recipientName} from queue`}
                              onClick={() => deleteQueueItem(job)}
                              disabled={queueDeleting || isActivelySending}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTableShell>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Mail}
          title="No view selected"
          description="Please choose companies, people, emails, or queue from the navigation bar."
        />
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
