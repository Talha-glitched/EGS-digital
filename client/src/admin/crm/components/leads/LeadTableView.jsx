import { useMemo, useState } from 'react';
import LeadFilterToolbar from './LeadFilterToolbar.jsx';
import { DeliveryStatusBadge, SourceAttributionChips } from './LeadTableComponents.jsx';
import { EmptyState } from '../ui/primitives.jsx';
import { Users } from 'lucide-react';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function LeadTableView({ leadsData = [], campaignsList = [], projectId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [campaignFilter, setCampaignFilter] = useState(projectId || 'All');

  const filteredLeads = useMemo(
    () =>
      leadsData.filter((lead) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          (lead.name || '').toLowerCase().includes(q) ||
          (lead.companyName || '').toLowerCase().includes(q) ||
          (lead.email || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || lead.deliveryStatus === statusFilter;
        const matchesSource = sourceFilter === 'All' || (lead.sources || []).includes(sourceFilter);
        const matchesCampaign = campaignFilter === 'All' || String(lead.campaignId) === String(campaignFilter);
        return matchesSearch && matchesStatus && matchesSource && matchesCampaign;
      }),
    [leadsData, searchTerm, statusFilter, sourceFilter, campaignFilter]
  );

  return (
    <div className="crm-card overflow-hidden">
      <LeadFilterToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        campaignFilter={campaignFilter}
        onCampaignChange={setCampaignFilter}
        campaignsList={campaignsList}
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
        <div className="crm-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="crm-table-head">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Sources</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">AI cost</th>
                <th className="px-4 py-3 text-center">Opens</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead._id} className="crm-table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-600">
                        {initials(lead.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[var(--color-ink)]">{lead.name || '—'}</div>
                        <div className="truncate text-xs text-neutral-500">{lead.designation || 'Decision maker'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate font-medium text-neutral-800">{lead.companyName || '—'}</div>
                    <div className="truncate font-mono text-xs text-neutral-400">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <SourceAttributionChips sources={lead.sources} primarySource={lead.primarySource} />
                  </td>
                  <td className="px-4 py-3">
                    <DeliveryStatusBadge status={lead.deliveryStatus} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-neutral-600">
                    ${(lead.financialMetrics?.calculatedAiCostUSD || 0).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {lead.trackingMetrics?.isOpened ? (
                      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200/60">
                        {lead.trackingMetrics.totalOpenCount}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredLeads.length > 0 && (
        <div className="border-t border-[var(--color-line)] px-4 py-2.5 text-xs text-neutral-500">
          Showing {filteredLeads.length} of {leadsData.length} leads
        </div>
      )}
    </div>
  );
}
