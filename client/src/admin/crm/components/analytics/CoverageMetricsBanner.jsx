import { formatPercent } from '../../crmApi.js';
import { ProgressBar } from '../ui/primitives.jsx';

export default function CoverageMetricsBanner({ analytics, project }) {
  const pocPercent = analytics?.pocDiscoveryPercent ?? 0;
  const replyPercent = analytics?.interactionProgressPercent ?? 0;
  const targetCount = project?.targetCompaniesCount ?? 0;
  const withPoc = project?.companiesWithPocsFound ?? 0;
  const responded = project?.companiesRespondedCount ?? 0;

  return (
    <div className="crm-metric-grid cols-2">
      <MetricCard
        title="POC discovery"
        subtitle="Target companies with at least one valid contact found"
        percent={pocPercent}
        detail={`${withPoc} of ${targetCount} companies have a point of contact`}
        tone="brand"
      />
      <MetricCard
        title="Companies that replied"
        subtitle="Unique target companies where someone responded to outreach"
        percent={replyPercent}
        detail={`${responded} of ${targetCount} companies have replied`}
        tone="success"
      />
    </div>
  );
}

function MetricCard({ title, subtitle, percent, detail, tone }) {
  return (
    <div className="crm-card p-5 lg:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-500">{subtitle}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
          {formatPercent(percent)}
        </p>
      </div>
      <div className="mt-4">
        <ProgressBar value={percent} tone={tone === 'success' ? 'success' : 'brand'} />
      </div>
      <p className="mt-2.5 text-[12.5px] text-neutral-500">{detail}</p>
    </div>
  );
}
