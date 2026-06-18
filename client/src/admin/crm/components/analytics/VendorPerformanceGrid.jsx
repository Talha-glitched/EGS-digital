import { formatCurrency } from '../../crmApi.js';
import { Card, CardHeader, EmptyState } from '../ui/primitives.jsx';
import { BarChart3 } from 'lucide-react';

const SOURCE_DOT = {
  Apollo: 'bg-violet-500',
  Hunter: 'bg-orange-500',
  Lusha: 'bg-cyan-500',
  Manual: 'bg-neutral-400',
};

export default function VendorPerformanceGrid({ vendorMatrix = [] }) {
  if (!vendorMatrix.length) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No vendor analytics yet"
          description="Performance by Apollo, Hunter, and Lusha appears after the analytics job runs (every 4 hours)."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Source performance" subtitle="Leads, engagement, and revenue by discovery tool" />
      <div className="crm-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="crm-table-head">
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-right">Leads</th>
              <th className="px-5 py-3 text-right">Opens</th>
              <th className="px-5 py-3 text-right">Bounces</th>
              <th className="px-5 py-3 text-right">Replies</th>
              <th className="px-5 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {vendorMatrix.map((row) => (
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
