import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  Search,
  Filter,
  Eye,
  CheckSquare,
  Square,
  Loader2,
  Clock,
  Building2,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { useOverlayTransition } from '../ui/useOverlayTransition.js';
import { useBodyScrollLock } from '../ui/useBodyScrollLock.js';
import { cn } from '../ui/primitives.jsx';
import { DeliveryStatusBadge } from '../leads/LeadTableComponents.jsx';
import OutreachDrawer from '../leads/OutreachDrawer.jsx';

const STATUS_FILTERS = [
  { id: 'All', label: 'All contacts' },
  { id: 'Out of Office', label: 'Out of Office', isHighlight: true, icon: Clock },
  { id: 'Replied', label: 'Replied' },
  { id: 'Pending Inqueue', label: 'Pending Inqueue' },
  { id: 'Emailed Outbound', label: 'Emailed Outbound' },
  { id: 'Bounced / Invalid', label: 'Bounced' },
  { id: 'Opted Out', label: 'Opted Out' },
];

export default function CampaignListImportModal({
  open,
  onClose,
  campaignId,
  campaignName = 'Campaign List',
  initialSelectedLeadIds = null,
  onConfirm,
}) {
  const { mounted, visible, exiting } = useOverlayTransition(open);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [inspectingLead, setInspectingLead] = useState(null);

  useBodyScrollLock(mounted);

  const fetchLeads = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const data = await crmApiFetch(`/api/admin/projects/${campaignId}/leads?limit=50000`);
      const items = data.items || [];
      setLeads(items);

      // Set initial selected leads
      if (initialSelectedLeadIds && Array.isArray(initialSelectedLeadIds) && initialSelectedLeadIds.length > 0) {
        setSelectedLeadIds(new Set(initialSelectedLeadIds.map(String)));
      } else {
        // Default to all selected
        setSelectedLeadIds(new Set(items.map((l) => String(l._id))));
      }
    } catch {
      setLeads([]);
      setSelectedLeadIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [campaignId, initialSelectedLeadIds]);

  useEffect(() => {
    if (open && campaignId) {
      fetchLeads();
      setSearchTerm('');
      setStatusFilter('All');
    }
  }, [open, campaignId, fetchLeads]);

  // Update lead in local state when OutreachDrawer edits a contact
  const handleLeadUpdated = useCallback((updatedLead) => {
    if (!updatedLead?._id) return;
    setLeads((prev) => prev.map((item) => (String(item._id) === String(updatedLead._id) ? { ...item, ...updatedLead } : item)));
    if (inspectingLead && String(inspectingLead._id) === String(updatedLead._id)) {
      setInspectingLead((prev) => ({ ...prev, ...updatedLead }));
    }
  }, [inspectingLead]);

  // Count leads by status for filter pills
  const statusCounts = useMemo(() => {
    const counts = { All: leads.length };
    leads.forEach((lead) => {
      const st = lead.deliveryStatus || 'Pending Inqueue';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // Filter leads based on search & status filter
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'All' && (lead.deliveryStatus || 'Pending Inqueue') !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(q);
        const emailMatch = lead.email?.toLowerCase().includes(q);
        const desigMatch = lead.designation?.toLowerCase().includes(q);
        const companyMatch = lead.companyName?.toLowerCase().includes(q);
        return nameMatch || emailMatch || desigMatch || companyMatch;
      }
      return true;
    });
  }, [leads, statusFilter, searchTerm]);

  // Visible selection check
  const visibleLeadIds = useMemo(() => filteredLeads.map((l) => String(l._id)), [filteredLeads]);
  const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every((id) => selectedLeadIds.has(id));
  const someVisibleSelected = visibleLeadIds.some((id) => selectedLeadIds.has(id));

  const toggleSelectAllVisible = () => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleLeadIds.forEach((id) => next.delete(id));
      } else {
        visibleLeadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleLead = (id) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedArray = Array.from(selectedLeadIds);
    const allIds = leads.map((l) => String(l._id));
    const unselectedArray = allIds.filter((id) => !selectedLeadIds.has(id));

    onConfirm?.({
      campaignId,
      selectedLeadIds: selectedArray,
      unselectedLeadIds: unselectedArray,
      allLeadIds: allIds,
      totalCampaignLeadsCount: leads.length,
    });
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn('crm-seq-preview-overlay', visible && !exiting && 'is-visible', exiting && 'is-exiting')}
        onClick={onClose}
        role="presentation"
      >
        <div
          className={cn(
            'crm-seq-preview-modal !max-w-4xl !w-[92vw] !h-[88vh] flex flex-col overflow-hidden',
            visible && !exiting && 'is-visible',
            exiting && 'is-exiting',
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Import Campaign List Contacts"
        >
          {/* Header */}
          <div className="crm-seq-preview-head shrink-0 border-b border-[var(--color-line)] px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand font-semibold">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--color-ink)] truncate flex items-center gap-2">
                  <span>Import: {campaignName}</span>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                    {selectedLeadIds.size} of {leads.length} selected
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  Filter and select specific contacts to include in your sequence email drip.
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="crm-seq-icon-btn shrink-0" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Controls Bar: Search + Status Pills */}
          <div className="shrink-0 space-y-3 bg-neutral-50/70 p-4 border-b border-[var(--color-line)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, email, company, title…"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white py-1.5 pl-9 pr-8 text-xs placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 active:bg-neutral-100"
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-brand" />
                  ) : someVisibleSelected ? (
                    <Square className="h-3.5 w-3.5 text-neutral-400 fill-brand-soft" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                  {allVisibleSelected ? 'Deselect visible' : 'Select all visible'}
                </button>
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {STATUS_FILTERS.map((f) => {
                const count = statusCounts[f.id] || 0;
                const active = statusFilter === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      active
                        ? 'bg-brand text-white shadow-xs font-semibold'
                        : f.isHighlight && count > 0
                        ? 'bg-amber-100/80 text-amber-900 hover:bg-amber-200/90 font-semibold ring-1 ring-amber-300'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900',
                    )}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-2xs font-bold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Container */}
          <div className="crm-seq-preview-body crm-scroll flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                Loading campaign contacts…
              </div>
            ) : !filteredLeads.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-neutral-400">
                <Users className="h-10 w-10 stroke-[1.25] text-neutral-300 mb-2" />
                <p className="text-sm font-medium text-neutral-600">No contacts match the current filters</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                  Try clearing your search term or switching the status filter tab above.
                </p>
                {(searchTerm || statusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                    }}
                    className="mt-3 text-xs font-semibold text-brand hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="crm-seq-preview-table w-full">
                  <thead className="sticky top-0 bg-white shadow-xs z-10">
                    <tr>
                      <th className="w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          className="crm-checkbox cursor-pointer rounded border-neutral-300 text-brand focus:ring-brand"
                          aria-label="Select all visible"
                        />
                      </th>
                      <th>Contact name</th>
                      <th>Company</th>
                      <th>Delivery status</th>
                      <th>Primary Email</th>
                      <th className="text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const id = String(lead._id);
                      const selected = selectedLeadIds.has(id);
                      return (
                        <tr
                          key={id}
                          className={cn(
                            'transition-colors cursor-pointer hover:bg-neutral-50/80',
                            selected && 'bg-brand-soft/20',
                          )}
                          onClick={() => toggleLead(id)}
                        >
                          <td className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleLead(id)}
                              className="crm-checkbox cursor-pointer rounded border-neutral-300 text-brand focus:ring-brand"
                              aria-label={`Select ${lead.name || lead.email}`}
                            />
                          </td>
                          <td className="font-medium text-neutral-900">
                            <div className="flex flex-col">
                              <span className="font-semibold text-neutral-800">{lead.name || '—'}</span>
                              {lead.designation && (
                                <span className="text-xs text-neutral-500">{lead.designation}</span>
                              )}
                            </div>
                          </td>
                          <td className="text-neutral-600">
                            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700">
                              <Building2 className="h-3 w-3 text-neutral-400 shrink-0" />
                              {lead.companyName || '—'}
                            </span>
                          </td>
                          <td>
                            <DeliveryStatusBadge status={lead.deliveryStatus || 'Pending Inqueue'} />
                          </td>
                          <td className="font-mono text-xs text-neutral-600">
                            <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                              <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                              {lead.email || '—'}
                            </span>
                          </td>
                          <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setInspectingLead(lead)}
                              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 hover:text-brand hover:border-brand/40 transition-all"
                              title="Inspect contact profile & interaction timeline"
                            >
                              <Eye className="h-3.5 w-3.5 text-brand" />
                              <span>Timeline & Profile</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="shrink-0 border-t border-[var(--color-line)] bg-neutral-50/90 px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="text-xs text-neutral-600 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{selectedLeadIds.size}</strong> contact{selectedLeadIds.size === 1 ? '' : 's'} selected out of{' '}
                <strong>{leads.length}</strong> total in {campaignName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="crm-btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={selectedLeadIds.size === 0}
                className="crm-btn-primary text-xs px-5 py-2 !font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Selected ({selectedLeadIds.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Contact Profile Drawer when inspecting a lead */}
      {inspectingLead && (
        <OutreachDrawer
          lead={inspectingLead}
          onClose={() => setInspectingLead(null)}
          onLeadUpdated={handleLeadUpdated}
          stackLevel={2}
          initialTab="timeline"
        />
      )}
    </>,
    document.body,
  );
}
