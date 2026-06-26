import { useMemo, useState } from 'react';
import ConversationThreadView from './ConversationThreadView.jsx';
import { Mail, MessageSquare } from 'lucide-react';
import { cn, EmptyState } from '../ui/primitives.jsx';
import {
  AdvancedFilterPopover,
  AdvancedFilterChips,
  useTableFilters,
  INBOX_FILTER_SCHEMA,
} from '../ui/advancedFilter/index.js';

export default function UnifiedInboxWorkspace({ initialReplies = [], onAction, replyCount }) {
  const [activeThread, setActiveThread] = useState(initialReplies[0] || null);
  const {
    filtered,
    filters: advancedFilters,
    setFilters: setAdvancedFilters,
    matchMode: advancedMatchMode,
  } = useTableFilters(initialReplies, INBOX_FILTER_SCHEMA);

  return (
    <div className="crm-card flex min-h-[560px] flex-col overflow-hidden md:h-[calc(100vh-168px)] md:flex-row">
      <aside className="flex h-72 w-full shrink-0 flex-col border-b border-[var(--color-line)] bg-neutral-50/40 md:h-auto md:w-[360px] md:border-b-0 md:border-r">
        <div className="border-b border-[var(--color-line)] bg-white px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Mail className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Replies
            {typeof replyCount === 'number' && (
              <span className="text-xs font-medium text-neutral-400">({replyCount})</span>
            )}
          </h2>
          <div className="mt-3 space-y-2">
            <AdvancedFilterPopover
              schema={INBOX_FILTER_SCHEMA}
              filters={advancedFilters}
              matchMode={advancedMatchMode}
              onChange={setAdvancedFilters}
            />
            <AdvancedFilterChips
              schema={INBOX_FILTER_SCHEMA}
              filters={advancedFilters}
              onChange={setAdvancedFilters}
            />
          </div>
        </div>

        <div className="crm-scroll flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">No matching threads</div>
          ) : (
            filtered.map((reply) => {
              const selected = activeThread?._id === reply._id;
              return (
                <button
                  key={reply._id}
                  type="button"
                  onClick={() => setActiveThread(reply)}
                  className={cn(
                    'block w-full border-b border-[var(--color-line)] px-5 py-4 text-left transition',
                    selected ? 'bg-white shadow-[inset_3px_0_0_0_var(--color-brand)]' : 'hover:bg-white/70'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      {reply.campaignName}
                    </span>
                    <IntentPill intent={reply.intent} />
                  </div>
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{reply.pocName}</p>
                  <p className="truncate text-xs text-neutral-500">{reply.companyName}</p>
                  <p className="mt-1 line-clamp-2 text-xs italic text-neutral-400">&ldquo;{reply.latestMessageBody}&rdquo;</p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-[480px] min-w-0 flex-1 flex-col bg-white md:min-h-0">
        {activeThread ? (
          <ConversationThreadView activeThread={activeThread} onAction={onAction} />
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Select a conversation"
            description="Choose a reply from the list to view the thread and take action."
          />
        )}
      </section>
    </div>
  );
}

function IntentPill({ intent }) {
  const tone = intent === 'Interested' ? 'bg-emerald-50 text-emerald-700' : intent === 'Opt Out' ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-600';
  return (
    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', tone)}>
      {intent || 'Neutral'}
    </span>
  );
}
