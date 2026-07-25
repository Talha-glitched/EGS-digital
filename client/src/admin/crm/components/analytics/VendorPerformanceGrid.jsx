import { formatCurrency } from '../../crmApi.js';
import { Card, CardHeader, EmptyState } from '../ui/primitives.jsx';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  VENDOR_FILTER_SCHEMA,
} from '../ui/advancedFilter/index.js';

const SOURCE_DOT = {
  Apollo: 'bg-violet-500',
  Hunter: 'bg-orange-500',
  Lusha: 'bg-cyan-500',
  Personal: 'bg-emerald-500',
  Manual: 'bg-neutral-400',
};

export default function VendorPerformanceGrid({ vendorMatrix = [], onRefresh, isRefreshing = false }) {
  const {
    filtered: visibleRows,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(vendorMatrix, VENDOR_FILTER_SCHEMA);

  if (!vendorMatrix.length) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No vendor analytics yet"
          description="Apollo, Hunter, Lusha, and Manual rows appear as soon as the campaign is created. Metrics update when contacts are imported or outreach runs."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Source performance"
        subtitle="Leads, engagement, and revenue by discovery tool"
        action={
          onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="crm-btn-ghost text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200"
              title="Recalculate source performance"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>Refresh</span>
            </button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] px-5 py-3">
        <AdvancedFilterPopover
          schema={VENDOR_FILTER_SCHEMA}
          filters={advancedFilters}
          matchMode={advancedMatchMode}
          onChange={setAdvancedFilters}
        />
      </div>
      <AdvancedFilterChips
        schema={VENDOR_FILTER_SCHEMA}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        className="px-5 pb-3"
      />
      <div className="crm-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="crm-table-head">
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-right">Leads</th>
              <th className="px-5 py-3 text-right">Opens</th>
              <th className="px-5 py-3 text-right">Bounces</th>
              <th className="px-5 py-3 text-right">Replies</th>
              <th className="px-5 py-3 text-right">Reply Rate</th>
              <th className="px-5 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.source} className="crm-table-row">
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                    <span className={`h-2 w-2 rounded-full ${SOURCE_DOT[row.source] || 'bg-neutral-400'}`} />
                    {row.source}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700">{row.leadsCount}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700">{row.opens}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-red-600">{row.bounces}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-emerald-600">{row.replies}</td>
                <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-emerald-700">{row.replyRate || (row.leadsCount > 0 ? ((row.replies / row.leadsCount) * 100).toFixed(1) + '%' : '0.0%')}</td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[var(--color-ink)]">
                  {formatCurrency(row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
