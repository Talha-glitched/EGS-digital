import { useState, useMemo } from 'react';
import { formatCurrency } from '../../crmApi.js';
import { Card, CardHeader, EmptyState, Badge } from '../ui/primitives.jsx';
import { Layers, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const SOURCE_DOT = {
  Apollo: 'bg-violet-500',
  Hunter: 'bg-orange-500',
  Lusha: 'bg-cyan-500',
  Personal: 'bg-emerald-500',
  Manual: 'bg-neutral-400',
};

export default function CampaignVendorPerformanceGrid({ campaignVendorPerformance = [], onRefresh, isRefreshing = false }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('ALL');
  const [collapsedCampaigns, setCollapsedCampaigns] = useState({});

  const filteredCampaigns = useMemo(() => {
    if (selectedCampaignId === 'ALL') return campaignVendorPerformance;
    return campaignVendorPerformance.filter((c) => c.campaignId === selectedCampaignId);
  }, [campaignVendorPerformance, selectedCampaignId]);

  const toggleCollapse = (id) => {
    setCollapsedCampaigns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!campaignVendorPerformance.length) {
    return (
      <Card>
        <EmptyState
          icon={Layers}
          title="No campaign source analytics yet"
          description="Source performance by campaign will appear once campaign data is loaded."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Source performance by campaign"
        subtitle="Discovery tool leads, engagement, bounces, and reply rates per outreach campaign"
        action={
          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
                title="Recalculate source performance by campaign"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-500">Filter campaign:</span>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="crm-select text-xs py-1 px-2.5 rounded-lg border-neutral-200"
              >
                <option value="ALL">All Campaigns ({campaignVendorPerformance.length})</option>
                {campaignVendorPerformance.map((c) => (
                  <option key={c.campaignId} value={c.campaignId}>
                    {c.projectName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      <div className="space-y-6 p-5">
        {filteredCampaigns.map((camp) => {
          const isCollapsed = Boolean(collapsedCampaigns[camp.campaignId]);
          const matrix = camp.matrix || [];
          const totalLeads = matrix.reduce((sum, row) => sum + (row.leadsCount || 0), 0);
          const totalReplies = matrix.reduce((sum, row) => sum + (row.replies || 0), 0);
          const totalBounces = matrix.reduce((sum, row) => sum + (row.bounces || 0), 0);
          const totalRevenue = matrix.reduce((sum, row) => sum + (row.revenue || 0), 0);
          const overallReplyRate = totalLeads > 0 ? ((totalReplies / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

          return (
            <div
              key={camp.campaignId}
              className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-all"
            >
              {/* Campaign Header Row */}
              <div
                onClick={() => toggleCollapse(camp.campaignId)}
                className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-neutral-50/80 px-4 py-3.5 hover:bg-neutral-100/70"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 font-bold text-xs">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-ink)]">{camp.projectName}</h4>
                    {camp.milestone && (
                      <p className="text-[11px] font-medium text-neutral-500">{camp.milestone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-neutral-600">{totalLeads} Leads</span>
                    <span className="text-neutral-300">•</span>
                    <span className="font-semibold text-red-600">{totalBounces} Bounces</span>
                    <span className="text-neutral-300">•</span>
                    <span className="font-semibold text-emerald-600">{totalReplies} Replies ({overallReplyRate})</span>
                  </div>
                  <button type="button" className="text-neutral-400 hover:text-neutral-600">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              {!isCollapsed && (
                <div className="crm-scroll overflow-x-auto border-t border-neutral-100">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead>
                      <tr className="bg-neutral-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-200/60">
                        <th className="px-4 py-2.5 text-left">Source</th>
                        <th className="px-4 py-2.5 text-right">Leads</th>
                        <th className="px-4 py-2.5 text-right">Opens</th>
                        <th className="px-4 py-2.5 text-right">Bounces</th>
                        <th className="px-4 py-2.5 text-right">Replies</th>
                        <th className="px-4 py-2.5 text-right">Reply Rate</th>
                        <th className="px-4 py-2.5 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {matrix.map((row) => (
                        <tr key={row.source} className="hover:bg-neutral-50/60">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center gap-2 font-medium text-[var(--color-ink)]">
                              <span className={`h-2 w-2 rounded-full ${SOURCE_DOT[row.source] || 'bg-neutral-400'}`} />
                              {row.source}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{row.leadsCount}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-neutral-700">{row.opens}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-red-600 font-medium">{row.bounces}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-medium">{row.replies}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{row.replyRate}</td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                            {formatCurrency(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-neutral-50/80 font-bold border-t border-neutral-200/80 text-[11px] text-[var(--color-ink)]">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{totalLeads}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">0</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-600">{totalBounces}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{totalReplies}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{overallReplyRate}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
