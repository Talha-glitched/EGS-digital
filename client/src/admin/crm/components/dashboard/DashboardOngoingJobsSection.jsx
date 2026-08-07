import { useState } from 'react';
import { BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { Card, Badge, cn } from '../ui/primitives.jsx';
import { formatCurrency } from '../../crmApi.js';

export default function DashboardOngoingJobsSection({
  jobs = [],
  reviewStatus,
  onCompleteReview,
  onOpenJob,
  busy,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReviewedToday = reviewStatus?.isCompleted;

  return (
    <Card className="p-0 border border-neutral-200/90 shadow-2xs bg-white">
      {/* Clickable Card Header */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between p-3.5 bg-neutral-50/80 cursor-pointer hover:bg-neutral-100/70 transition border-b border-neutral-200/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 font-bold shrink-0">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-ink">Ongoing Jobs ({jobs.length})</h3>
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 text-neutral-400 transition-transform duration-300 ease-in-out',
                isExpanded && 'rotate-90 text-brand'
              )}
            />
          </div>
        </div>

        {/* Reviewed Today Checkbox */}
        <label
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer',
            isReviewedToday
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
              : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
          )}
        >
          <input
            type="checkbox"
            checked={isReviewedToday}
            disabled={isReviewedToday || busy}
            onChange={(e) => {
              e.stopPropagation();
              if (!isReviewedToday) onCompleteReview?.('ongoing_jobs');
            }}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
          />
          <span>
            {isReviewedToday
              ? `Reviewed today by ${reviewStatus?.completedByName || 'Team'}`
              : 'Reviewed today'}
          </span>
        </label>
      </div>

      {/* Smooth CSS Grid Accordion Container */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        )}
      >
        <div className="overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">No active ongoing jobs.</div>
          ) : (
            <div className="overflow-x-auto max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                {/* Sticky Table Header */}
                <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur-md border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="py-2 px-3">Job & Company</th>
                    <th className="py-2 px-2">Stage</th>
                    <th className="py-2 px-2">Owner</th>
                    <th className="py-2 px-2">Target Deadline</th>
                    <th className="py-2 px-2">Next Open Task</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="w-6" aria-label="Open" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {jobs.map((job) => (
                    <tr
                      key={job._id}
                      onClick={() => onOpenJob?.(job._id)}
                      className="group hover:bg-sky-50/50 transition cursor-pointer"
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {job.isOverdue && (
                            <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-2xs font-bold text-red-700 border border-red-200">
                              Overdue
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 group-hover:text-brand transition truncate">{job.name}</p>
                            <p className="text-2xs text-neutral-500 truncate">{job.companyName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <Badge tone="info" className="py-0 px-1.5 text-2xs">{job.stage}</Badge>
                      </td>
                      <td className="py-2 px-2 font-medium text-neutral-700 whitespace-nowrap">
                        {job.owner}
                      </td>
                      <td className="py-2 px-2 text-neutral-600 whitespace-nowrap">
                        {job.targetDate ? new Date(job.targetDate).toLocaleDateString('en-AE') : '—'}
                      </td>
                      <td className="py-2 px-2">
                        {job.nextTask ? (
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-800 leading-snug truncate">{job.nextTask.title}</p>
                            <p className="text-2xs text-neutral-500 truncate">
                              {job.nextTask.owner ? `${job.nextTask.owner} · ` : ''}
                              {job.nextTask.dueAt ? `Due ${new Date(job.nextTask.dueAt).toLocaleDateString('en-AE')}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">No open task</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-neutral-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(job.valueAed)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <ChevronRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-brand transition" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
