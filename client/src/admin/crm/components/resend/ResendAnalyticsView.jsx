import { useMemo, useState } from 'react';
import {
  Mail,
  CheckCircle2,
  BarChart3,
  Link2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  ThumbsUp,
  HelpCircle
} from 'lucide-react';
import {
  Card,
  CardHeader,
  MetricGrid,
  StatCard,
  ProgressBar,
  Badge,
  cn
} from '../ui/primitives.jsx';

export default function ResendAnalyticsView({ metrics }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  // 1. Calculate general stats and numbers
  const total = metrics?.total || 0;
  const delivered = metrics?.delivered || 0;
  const opened = metrics?.opened || 0;
  const clicked = metrics?.clicked || 0;
  const bounced = metrics?.bounced || 0;
  const failed = metrics?.failed || 0;
  const complained = metrics?.complained || 0;

  // 2. Parse rate values as float for SVG calculations
  const deliverabilityRate = parseFloat(metrics?.rates?.deliverability || 0);
  const openRate = parseFloat(metrics?.rates?.open || 0);
  const clickRate = parseFloat(metrics?.rates?.click || 0);
  const bounceRate = parseFloat(metrics?.rates?.bounce || 0);

  // 3. Process Day-of-Week Stacked Stats
  const dayOfWeekStats = useMemo(() => {
    const emails = metrics?.emails || [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.reduce((acc, d) => ({
      ...acc,
      [d]: { total: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }
    }), {});

    emails.forEach(email => {
      const date = new Date(email.createdAt);
      if (!Number.isNaN(date.getTime())) {
        const dayName = days[date.getDay()];
        const status = String(email.status || '').toLowerCase();
        counts[dayName].total++;
        if (['delivered', 'opened', 'clicked', 'sent'].includes(status)) counts[dayName].delivered++;
        if (['opened', 'clicked'].includes(status)) counts[dayName].opened++;
        if (status === 'clicked') counts[dayName].clicked++;
        if (status === 'bounced') counts[dayName].bounced++;
      }
    });

    // Find the max total to scale the chart bars
    const list = days.map(d => ({ day: d, ...counts[d] }));
    const maxTotal = Math.max(...list.map(d => d.total), 1);

    return list.map(item => ({
      ...item,
      percentage: (item.total / maxTotal) * 100
    }));
  }, [metrics?.emails]);

  // 4. Process Hour-of-Day Send Time Stats
  const hourlyStats = useMemo(() => {
    const emails = metrics?.emails || [];
    // 4 buckets: Morning (6-12), Afternoon (12-18), Evening (18-24), Night (0-6)
    const buckets = [
      { id: 'morning', label: 'Morning', hours: '6 AM - 12 PM', count: 0, opened: 0, icon: Clock },
      { id: 'afternoon', label: 'Afternoon', hours: '12 PM - 6 PM', count: 0, opened: 0, icon: Clock },
      { id: 'evening', label: 'Evening', hours: '6 PM - 12 AM', count: 0, opened: 0, icon: Clock },
      { id: 'night', label: 'Night', hours: '12 AM - 6 AM', count: 0, opened: 0, icon: Clock }
    ];

    emails.forEach(email => {
      const date = new Date(email.createdAt);
      if (!Number.isNaN(date.getTime())) {
        const hour = date.getHours();
        const status = String(email.status || '').toLowerCase();
        let bucketIdx = 3; // default Night

        if (hour >= 6 && hour < 12) bucketIdx = 0;
        else if (hour >= 12 && hour < 18) bucketIdx = 1;
        else if (hour >= 18 && hour < 24) bucketIdx = 2;

        buckets[bucketIdx].count++;
        if (['opened', 'clicked'].includes(status)) {
          buckets[bucketIdx].opened++;
        }
      }
    });

    return buckets.map(b => {
      const rate = b.count > 0 ? ((b.opened / b.count) * 100).toFixed(1) : '0.0';
      return { ...b, rate: parseFloat(rate) };
    });
  }, [metrics?.emails]);

  // SVG Radial Circle Helper
  const renderRadialCircle = (rate, strokeColor, label, Icon, tone) => {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (rate / 100) * circumference;

    return (
      <div className="flex flex-col items-center justify-center p-4 text-center bg-white rounded-2xl border border-[var(--color-line)] shadow-sm hover:shadow-md transition duration-300">
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Radial Track */}
          <svg className="w-full h-full -rotate-90">
            <circle
              className="text-neutral-100"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="48"
              cy="48"
            />
            {/* Radial Value */}
            <circle
              className={cn("transition-all duration-1000 ease-out", strokeColor)}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="48"
              cy="48"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <Icon className={cn("h-4 w-4 mb-0.5", tone === 'success' ? 'text-emerald-500' : tone === 'info' ? 'text-sky-500' : tone === 'brand' ? 'text-brand' : 'text-neutral-500')} />
            <span className="text-sm font-black text-[var(--color-ink)] tabular-nums">{rate}%</span>
          </div>
        </div>
        <p className="mt-2 text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Radial Rate Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {renderRadialCircle(deliverabilityRate, "stroke-emerald-500", "Deliverability", CheckCircle2, "success")}
        {renderRadialCircle(openRate, "stroke-sky-500", "Open Rate", BarChart3, "info")}
        {renderRadialCircle(clickRate, "stroke-indigo-500", "Click-Through", Link2, "brand")}
        {renderRadialCircle(parseFloat(metrics?.rates?.received || 0), "stroke-teal-500", "Received", Mail, "success")}
        {renderRadialCircle(bounceRate, bounceRate > 5 ? "stroke-red-500" : "stroke-amber-500", "Bounce Rate", AlertTriangle, "warning")}
      </div>

      {/* 2. Conversion Funnel & Volume Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Outreach Conversion Funnel"
            subtitle="The progression of prospects through the email outreach sequence."
          />
          <div className="p-6 space-y-6">
            {/* Step 1: Sent */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">1. Emails Sent</span>
                <span className="font-bold text-[var(--color-ink)] tabular-nums">{total} <span className="text-neutral-400 font-normal">(100%)</span></span>
              </div>
              <ProgressBar value={100} tone="brand" />
            </div>

            {/* Step 2: Delivered */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">2. Delivered</span>
                <span className="font-bold text-[var(--color-ink)] tabular-nums">{delivered} <span className="text-neutral-400 font-normal">({deliverabilityRate}%)</span></span>
              </div>
              <ProgressBar value={deliverabilityRate} tone="success" />
              {total > 0 && (
                <p className="text-[10px] text-neutral-400 text-right">
                  Drop-off: {(100 - deliverabilityRate).toFixed(1)}% ({total - delivered} failed/bounced)
                </p>
              )}
            </div>

            {/* Step 3: Opened */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">3. Opened</span>
                <span className="font-bold text-[var(--color-ink)] tabular-nums">{opened} <span className="text-neutral-400 font-normal">({openRate}% of delivered)</span></span>
              </div>
              <ProgressBar value={openRate} tone="info" />
              {delivered > 0 && (
                <p className="text-[10px] text-neutral-400 text-right">
                  Drop-off: {(100 - openRate).toFixed(1)}% ({delivered - opened} ignored)
                </p>
              )}
            </div>

            {/* Step 4: Clicked */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">4. Clicked</span>
                <span className="font-bold text-[var(--color-ink)] tabular-nums">{clicked} <span className="text-neutral-400 font-normal">({clickRate}% of opened)</span></span>
              </div>
              <ProgressBar value={clickRate} tone="success" />
              {opened > 0 && (
                <p className="text-[10px] text-neutral-400 text-right">
                  Drop-off: {(100 - clickRate).toFixed(1)}% ({opened - clicked} read without action)
                </p>
              )}
            </div>

            {/* Step 5: Received */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider">5. Received (Replies)</span>
                <span className="font-bold text-[var(--color-ink)] tabular-nums">{received} <span className="text-neutral-400 font-normal">({metrics?.rates?.received || 0}% of sent)</span></span>
              </div>
              <ProgressBar value={parseFloat(metrics?.rates?.received || 0)} tone="success" />
              {total > 0 && (
                <p className="text-[10px] text-neutral-400 text-right">
                  Unreplied: {(100 - parseFloat(metrics?.rates?.received || 0)).toFixed(1)}% ({total - received} emails)
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Deliverability Warnings and Diagnostics */}
        <Card>
          <CardHeader
            title="System Diagnostics"
            subtitle="Real-time deliverability checks and warning triggers."
          />
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Metrics Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-[var(--color-line)]">
                  <span className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Bounced</span>
                  <span className="text-base font-bold tabular-nums text-red-500">{bounced}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-[var(--color-line)]">
                  <span className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Complaints</span>
                  <span className="text-base font-bold tabular-nums text-orange-500">{complained}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-[var(--color-line)]">
                  <span className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Failed</span>
                  <span className="text-base font-bold tabular-nums text-neutral-600">{failed}</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-[var(--color-line)]">
                  <span className="block text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Total</span>
                  <span className="text-base font-bold tabular-nums text-[var(--color-ink)]">{total}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] pt-3 space-y-2">
              <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Health Status</h4>
              {bounceRate > 5 ? (
                <div className="flex gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] leading-relaxed">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <span className="font-bold block">Action required: High Bounce Rate</span>
                    Your bounce rate ({bounceRate}%) exceeds the recommended 5%. Check your leads collection and suppression lists.
                  </div>
                </div>
              ) : bounceRate > 2 ? (
                <div className="flex gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-bold block">Warning: Elevated Bounces</span>
                    Your bounce rate is {bounceRate}%. Keep an eye on leads hygiene to protect your domain reputation.
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                  <ThumbsUp className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <span className="font-bold block">Excellent Health</span>
                    Your domain reputation is safe. The bounce rate is healthy ({bounceRate}%).
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Send Volume Chart by Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weekly Send Distribution"
            subtitle="The volume and tracking distribution of outreach campaigns across weekdays."
          />
          <div className="p-6">
            {/* Custom SVG Bar Chart */}
            <div className="relative h-48 w-full flex items-end justify-between border-b border-neutral-200 pb-2">
              {dayOfWeekStats.map((item, index) => {
                // Stacked percentages inside the bar
                const totalVal = item.total || 1;
                const clickedPct = (item.clicked / totalVal) * 100;
                const openedPct = ((item.opened - item.clicked) / totalVal) * 100;
                const deliveredPct = ((item.delivered - item.opened) / totalVal) * 100;
                const otherPct = ((item.total - item.delivered) / totalVal) * 100;

                return (
                  <div
                    key={item.day}
                    className="flex flex-col items-center flex-1 group"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Floating Tooltip */}
                    {hoveredBar === index && item.total > 0 && (
                      <div className="absolute bottom-52 bg-neutral-900 text-white rounded-lg p-2.5 shadow-xl text-[10px] z-10 w-36 pointer-events-none transition duration-200 leading-relaxed border border-neutral-800">
                        <p className="font-bold border-b border-neutral-700 pb-1 mb-1 text-center">{item.day} Sends: {item.total}</p>
                        <div className="space-y-0.5">
                          <p className="flex justify-between"><span className="text-indigo-400 font-semibold">Clicked:</span> <span className="font-bold tabular-nums">{item.clicked}</span></p>
                          <p className="flex justify-between"><span className="text-sky-400 font-semibold">Opened:</span> <span className="font-bold tabular-nums">{item.opened}</span></p>
                          <p className="flex justify-between"><span className="text-emerald-400 font-semibold">Delivered:</span> <span className="font-bold tabular-nums">{item.delivered}</span></p>
                          <p className="flex justify-between"><span className="text-red-400 font-semibold">Bounced:</span> <span className="font-bold tabular-nums">{item.bounced}</span></p>
                        </div>
                      </div>
                    )}

                    {/* Bar Pillar */}
                    <div className="relative w-8 md:w-10 rounded-t-md overflow-hidden bg-neutral-100 flex flex-col justify-end transition duration-300 group-hover:scale-105 group-hover:shadow-sm" style={{ height: `${Math.max(item.percentage, 4)}%`, minHeight: '6px' }}>
                      {item.total > 0 && (
                        <>
                          {/* Segment 4: Other / Pending / Bounced */}
                          <div style={{ height: `${otherPct}%` }} className="bg-red-300 w-full" />
                          {/* Segment 3: Delivered (but not read) */}
                          <div style={{ height: `${deliveredPct}%` }} className="bg-emerald-400 w-full" />
                          {/* Segment 2: Opened (but not clicked) */}
                          <div style={{ height: `${openedPct}%` }} className="bg-sky-400 w-full" />
                          {/* Segment 1: Clicked */}
                          <div style={{ height: `${clickedPct}%` }} className="bg-indigo-500 w-full" />
                        </>
                      )}
                    </div>

                    <span className="mt-2 text-xs font-semibold text-neutral-500">{item.day}</span>
                  </div>
                );
              })}
            </div>
            {/* Chart Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-indigo-500" /> Clicked</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-sky-400" /> Opened</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> Delivered</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-300" /> Bounced / Failed</span>
            </div>
          </div>
        </Card>

        {/* 5. Hourly Distribution Card */}
        <Card>
          <CardHeader
            title="Time Optimization"
            subtitle="Determine the best sending window based on open rates."
          />
          <div className="p-4 space-y-3">
            {hourlyStats.map(bucket => {
              const bestTime = bucket.rate > 40;
              return (
                <div key={bucket.id} className={cn("p-3 rounded-xl border transition duration-200 flex items-center justify-between gap-4", bestTime ? "bg-sky-50/50 border-sky-100" : "bg-neutral-50/50 border-[var(--color-line)]")}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--color-ink)]">{bucket.label}</span>
                      {bestTime && <Badge tone="info">Best Time</Badge>}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">{bucket.hours}</span>
                    <span className="text-[10px] text-neutral-500 font-semibold block mt-1.5">{bucket.count} emails sent</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Open Rate</span>
                    <span className="text-lg font-black text-[var(--color-ink)] tabular-nums">{bucket.rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
