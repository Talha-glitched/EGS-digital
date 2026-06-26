import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGlobalLeads, deleteLeadWithUndo } from '../crmApi.js';
import DeleteIconButton from '../components/ui/DeleteIconButton.jsx';
import ClickableTableRow, { stopRowClick } from '../components/ui/ClickableTableRow.jsx';
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

  const tableLeads = useMemo(() => {
    if (!advancedActiveCount) return leads;
    const start = (page - 1) * limit;
    return advancedFilteredLeads.slice(start, start + limit);
  }, [advancedActiveCount, advancedFilteredLeads, leads, page, limit]);

  const tableTotal = advancedActiveCount ? advancedFilteredLeads.length : total;

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
              description="Mark contacts as Right POC in the contact manager, then use the Relationship tab to set service fit, owner, and follow-up timing."
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
              <DataTableShell minWidth={1100}>
              <table className="crm-table min-w-[1100px]">
                <thead>
                  <tr className="crm-table-head">
                    <th>Contact</th>
                    <th>Company</th>
                    <th>Service fit</th>
                    <th>Relationship</th>
                    <th>Owner</th>
                    <th>Next follow-up</th>
                    <th>Notes</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLeads.map((lead) => {
                    const profile = lead.relationshipProfile || {};
                    const categories = profile.serviceCategories || [];
                    const dueTone = followUpTone(profile.nextFollowUpAt);
                    return (
                      <ClickableTableRow key={lead._id} onClick={() => openDrawer(lead)}>
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
                          {categories.length ? (
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {categories.slice(0, 2).map((category) => (
                                <span key={category} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                  {category}
                                </span>
                              ))}
                              {categories.length > 2 && (
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                                  +{categories.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">Not tagged</span>
                          )}
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
