import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Info, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import { Card, cn } from '../ui/primitives.jsx';

export default function DailyReviewConsistency() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredDay, setHoveredDay] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  const [navDate, setNavDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const loadMonthData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await crmApiFetch(`/api/admin/daily-reviews/month?year=${navDate.year}&month=${navDate.month}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load daily review consistency data.');
    } finally {
      setLoading(false);
    }
  }, [navDate.year, navDate.month]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const handlePrevMonth = () => {
    setNavDate((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    if (data?.isCurrentMonth) return;
    setNavDate((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const rows = [
    { key: 'ongoing_jobs', label: 'Ongoing Jobs', subtitle: 'Commercial project reviews' },
    { key: 'key_relationships', label: 'Key Relationships', subtitle: 'Confirmed POC follow-ups' },
    { key: 'leads', label: 'Leads', subtitle: 'Replied lead task reviews' },
    { key: 'all_three', label: 'All three reviews', subtitle: 'Combined daily review completion', isSummary: true },
  ];

  const handleBarMouseEnter = (e, dayObj, rowKey, rowLabel) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({
      x: Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130),
      y: rect.top - 10,
    });
    setHoveredDay({ dayObj, rowKey, rowLabel });
  };

  const handleBarMouseLeave = () => {
    setHoveredDay(null);
  };

  const formatReviewDetail = (secData) => {
    if (!secData?.completed) return { text: 'Not reviewed', isDone: false };
    const timeStr = secData.completedAt
      ? new Date(secData.completedAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })
      : '';
    return {
      text: `Reviewed by ${secData.completedByName || 'Team'}${timeStr ? ` at ${timeStr}` : ''}`,
      isDone: true,
    };
  };

  return (
    <Card className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs relative">
      {/* Top Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
          <div>
            <h3 className="text-xs font-bold text-neutral-900 tracking-tight uppercase">Daily Review Consistency</h3>
          </div>
        </div>

        {/* Month Selector Pill */}
        <div className="flex items-center gap-1 rounded-full border border-neutral-200/90 bg-neutral-50/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-2xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-full p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2 min-w-[90px] text-center font-bold text-neutral-800 tabular-nums">
            {data?.monthLabel || 'Loading…'}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={data?.isCurrentMonth}
            className={cn(
              'rounded-full p-0.5 text-neutral-500 transition',
              data?.isCurrentMonth ? 'opacity-25 cursor-not-allowed' : 'hover:bg-neutral-200 hover:text-neutral-900'
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 font-medium mb-4">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="py-8 text-center text-xs text-neutral-400 font-medium">Loading consistency history…</div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const pct = data?.percentages?.[row.key] ?? 0;
            return (
              <div key={row.key} className="space-y-1.5">
                {/* Line 1: Header (Title Left, Percentage Right) */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('font-semibold text-neutral-800 text-[12px]', row.isSummary && 'font-bold text-neutral-900')}>
                      {row.label}
                    </span>
                    <Info className="h-3 w-3 text-neutral-300 hover:text-neutral-500 transition" title={row.subtitle} />
                  </div>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-neutral-500">
                    {pct}% completion
                  </span>
                </div>

                {/* Line 2: Full Width Day Blocks Bar */}
                <div className="flex items-center gap-[3px] w-full pt-0.5">
                  {data?.days?.map((dayObj) => {
                    let barStyle = 'bg-neutral-200 hover:bg-neutral-300';

                    if (dayObj.isFuture) {
                      barStyle = 'bg-neutral-100/60';
                    } else if (row.isSummary) {
                      const count = dayObj.all_three.count;
                      if (count === 3) barStyle = 'bg-emerald-500 hover:bg-emerald-600';
                      else if (count > 0) barStyle = 'bg-amber-400 hover:bg-amber-500';
                      else barStyle = 'bg-neutral-300 hover:bg-neutral-400';
                    } else {
                      const isDone = dayObj[row.key]?.completed;
                      barStyle = isDone ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-neutral-300 hover:bg-neutral-400';
                    }

                    return (
                      <div
                        key={dayObj.day}
                        onMouseEnter={(e) => handleBarMouseEnter(e, dayObj, row.key, row.label)}
                        onMouseLeave={handleBarMouseLeave}
                        className={cn(
                          'h-6 min-w-[5px] flex-1 rounded-full transition-colors duration-150 cursor-pointer relative',
                          barStyle,
                          dayObj.isToday && 'ring-2 ring-brand ring-offset-1 z-10'
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Rich Popover Hover Card */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: `${popoverPos.x}px`,
            top: `${popoverPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 pointer-events-none mb-2 min-w-[220px] max-w-[260px] rounded-xl border border-neutral-800 bg-neutral-900/95 p-3 text-white shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-700/80 pb-1.5 mb-2">
            <span className="text-[11px] font-semibold text-neutral-300">
              {new Date(hoveredDay.dayObj.date).toLocaleDateString('en-AE', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>

            {/* Individual Row vs All Three Status Badge */}
            {hoveredDay.rowKey === 'all_three' ? (
              hoveredDay.dayObj.isFuture ? (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[9px] font-medium text-neutral-400">Future</span>
              ) : hoveredDay.dayObj.all_three.count === 3 ? (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold">All 3 Done</span>
              ) : hoveredDay.dayObj.all_three.count > 0 ? (
                <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold">Partial ({hoveredDay.dayObj.all_three.count}/3)</span>
              ) : (
                <span className="rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 text-[9px] font-medium">Not Reviewed</span>
              )
            ) : (
              hoveredDay.dayObj.isFuture ? (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[9px] font-medium text-neutral-400">Future</span>
              ) : hoveredDay.dayObj[hoveredDay.rowKey]?.completed ? (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold">Reviewed</span>
              ) : (
                <span className="rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 text-[9px] font-medium">Not Reviewed</span>
              )
            )}
          </div>

          {/* Body Content */}
          {hoveredDay.rowKey === 'all_three' ? (
            /* Summary row: Show breakdown of all 3 */
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Ongoing Jobs:</span>
                <span className={cn('font-medium truncate max-w-[150px]', hoveredDay.dayObj.ongoing_jobs?.completed ? 'text-emerald-400' : 'text-neutral-400')}>
                  {formatReviewDetail(hoveredDay.dayObj.ongoing_jobs).text}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Key Relationships:</span>
                <span className={cn('font-medium truncate max-w-[150px]', hoveredDay.dayObj.key_relationships?.completed ? 'text-emerald-400' : 'text-neutral-400')}>
                  {formatReviewDetail(hoveredDay.dayObj.key_relationships).text}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">Leads:</span>
                <span className={cn('font-medium truncate max-w-[150px]', hoveredDay.dayObj.leads?.completed ? 'text-emerald-400' : 'text-neutral-400')}>
                  {formatReviewDetail(hoveredDay.dayObj.leads).text}
                </span>
              </div>
            </div>
          ) : (
            /* Individual row: Show ONLY this row's details (Who, What time, Status) */
            <div className="text-[11px] space-y-1">
              <p className="font-semibold text-neutral-200">{hoveredDay.rowLabel}</p>
              {hoveredDay.dayObj.isFuture ? (
                <p className="text-neutral-400 italic">Future date</p>
              ) : hoveredDay.dayObj[hoveredDay.rowKey]?.completed ? (
                <div className="space-y-0.5 text-neutral-300">
                  <p><span className="text-neutral-400">By:</span> <strong className="text-emerald-400 font-bold">{hoveredDay.dayObj[hoveredDay.rowKey].completedByName || 'Team'}</strong></p>
                  {hoveredDay.dayObj[hoveredDay.rowKey].completedAt && (
                    <p><span className="text-neutral-400">Time:</span> {new Date(hoveredDay.dayObj[hoveredDay.rowKey].completedAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
              ) : (
                <p className="text-neutral-400 italic">Not reviewed on this date.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
