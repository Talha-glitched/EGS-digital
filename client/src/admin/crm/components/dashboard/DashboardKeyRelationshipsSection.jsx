import { Users, ChevronRight } from 'lucide-react';
import { Card, cn } from '../ui/primitives.jsx';

export default function DashboardKeyRelationshipsSection({
  relationships = [],
  reviewStatus,
  onCompleteReview,
  onOpenPerson,
  busy,
  isExpanded = false,
  onToggleExpand,
}) {
  const isReviewedToday = reviewStatus?.isCompleted;

  return (
    <Card className="p-0 border border-neutral-200/90 shadow-2xs bg-white">
      {/* Clickable Card Header */}
      <div
        onClick={() => onToggleExpand?.()}
        className="flex items-center justify-between p-3.5 bg-neutral-50/80 cursor-pointer hover:bg-neutral-100/70 transition border-b border-neutral-200/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-800 font-bold shrink-0">
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-ink">Key Relationships ({relationships.length})</h3>
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
            'flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer',
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
              if (!isReviewedToday) onCompleteReview?.('key_relationships');
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
          {relationships.length === 0 ? (
            <div className="p-6 text-center text-[11px] text-neutral-400">No confirmed key relationships found.</div>
          ) : (
            <div className="max-h-[460px] overflow-y-auto divide-y divide-neutral-100 bg-white scrollbar-thin">
              {relationships.map((person) => {
                const isOverdue = person.dueCategory === 1;
                const isDueToday = person.dueCategory === 2;
                const isNoFollowUp = person.dueCategory === 3;

                return (
                  <div
                    key={person._id}
                    onClick={() => onOpenPerson?.(person._id, 'follow_ups')}
                    className="group flex items-center justify-between py-2 px-3 hover:bg-sky-50/50 transition cursor-pointer text-[11px]"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {isOverdue && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 border border-red-200 shrink-0">
                            Overdue
                          </span>
                        )}
                        {isDueToday && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200 shrink-0">
                            Due Today
                          </span>
                        )}
                        {isNoFollowUp && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500 shrink-0">
                            No Follow-up
                          </span>
                        )}
                        <p className="font-bold text-neutral-900 group-hover:text-brand transition truncate">{person.name}</p>
                      </div>

                      <p className="text-[10px] text-neutral-500 truncate">
                        {person.companyName} · Owner: <span className="font-medium text-neutral-700">{person.owner}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[9px] text-neutral-500">
                        <span>
                          Last interaction: {person.lastInteractionAt ? new Date(person.lastInteractionAt).toLocaleDateString('en-AE') : 'None logged'}
                        </span>
                        {person.nextTask && (
                          <span className="font-semibold text-neutral-700 truncate max-w-[180px]">
                            Next: {person.nextTask.title} ({new Date(person.nextTask.dueAt).toLocaleDateString('en-AE')})
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-brand transition shrink-0 ml-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
