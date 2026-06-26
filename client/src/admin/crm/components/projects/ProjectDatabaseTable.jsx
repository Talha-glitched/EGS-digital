import { useMemo, useState, useEffect } from 'react';
import { DeliveryStatusBadge, ResponseStatusBadge } from '../leads/LeadTableComponents.jsx';
import PocQualificationBadge from '../leads/PocQualificationBadge.jsx';
import { EmptyState } from '../ui/primitives.jsx';
import TablePagination from '../ui/TablePagination.jsx';
import DataTableShell from '../ui/DataTableShell.jsx';
import { TableHeaderLabel } from '../ui/InfoTip.jsx';
import { CAMPAIGN_AUTOMATION } from '../../constants/automationHints.js';
import ClickableTableRow from '../ui/ClickableTableRow.jsx';
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
}) {
  const [view, setView] = useState('companies');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const companySchema = useMemo(
    () => withFieldOptions(CAMPAIGN_COMPANY_FILTER_SCHEMA, {
      companyName: buildDistinctFieldOptions(companies, (r) => r.companyName),
      domain: buildDistinctFieldOptions(companies, (r) => r.domain),
      genericEmails: buildDistinctFieldOptionsFromArrays(companies, (r) => r.genericEmails),
      genericEmailContains: buildDistinctFieldOptionsFromArrays(companies, (r) => r.genericEmails),
    }),
    [companies],
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

  const companyFilterState = useTableFilters(companies, companySchema);
  const leadFilterState = useTableFilters(leads, leadSchema);
  const activeFilters = view === 'companies' ? companyFilterState : leadFilterState;
  const activeSchema = view === 'companies' ? companySchema : leadSchema;

  const filteredCompanies = companyFilterState.filtered;
  const filteredLeads = leadFilterState.filtered;

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredCompanies.slice(start, start + limit);
  }, [filteredCompanies, page, limit]);

  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLeads.slice(start, start + limit);
  }, [filteredLeads, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [view, companies.length, leads.length, activeFilters.activeCount, activeFilters.matchMode]);

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

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
            <DataTableShell minWidth={800}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="crm-table-head bg-slate-100/50">
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Domain</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Industry</th>
                  <th className="px-4 py-2.5">Booth</th>
                  <th className="px-4 py-2.5"><TableHeaderLabel label="Response" hint={CAMPAIGN_AUTOMATION.responseStatus} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {paginatedCompanies.map((c) => (
                  <ClickableTableRow key={c._id} onClick={() => onCompanyClick?.(c._id)}>
                    <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">{c.companyName}</td>
                    <td className="px-4 py-2.5 font-mono text-neutral-500">{c.domain}</td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {c.city && c.country ? `${c.city}, ${c.country}` : c.city || c.country || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{c.industry || '—'}</td>
                    <td className="px-4 py-2.5 text-neutral-500">{c.boothNumber || '—'}</td>
                    <td className="px-4 py-2.5">
                      <ResponseStatusBadge
                        hasResponded={c.hasResponded}
                        respondedAt={c.respondedAt}
                        responseChannels={c.responseChannels}
                        compact
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
          <DataTableShell minWidth={920}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="crm-table-head bg-slate-100/50">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Company</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5"><TableHeaderLabel label="POC fit" hint={CAMPAIGN_AUTOMATION.pocFit} /></th>
                <th className="px-4 py-2.5"><TableHeaderLabel label="Email status" hint={CAMPAIGN_AUTOMATION.emailStatus} /></th>
                <th className="px-4 py-2.5"><TableHeaderLabel label="Response" hint={CAMPAIGN_AUTOMATION.responseStatus} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {paginatedLeads.map((lead) => (
                <ClickableTableRow key={lead._id} onClick={() => onLeadClick?.(lead)}>
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">{lead.name || '—'}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{lead.companyName || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-neutral-500">{lead.email || '—'}</td>
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
