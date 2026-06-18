import { useState } from 'react';
import ConversationThreadView from './ConversationThreadView.jsx';
import { Mail, MessageSquare, Search } from 'lucide-react';
import { cn, EmptyState } from '../ui/primitives.jsx';

export default function UnifiedInboxWorkspace({ initialReplies = [], onAction }) {
  const [activeThread, setActiveThread] = useState(initialReplies[0] || null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = initialReplies.filter(
    (reply) =>
      (reply.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reply.pocName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="crm-card flex h-[calc(100vh-150px)] min-h-[520px] overflow-hidden">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-[var(--color-line)] bg-neutral-50/40">
        <div className="border-b border-[var(--color-line)] bg-white p-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <Mail className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Replies
          </h2>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter by company or contact…"
              className="crm-input py-2 pl-9 text-[13px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                    'block w-full border-b border-[var(--color-line)] px-3.5 py-3 text-left transition',
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

      <section className="flex min-w-0 flex-1 flex-col bg-white">
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
  const interested = intent === 'Interested';
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        interested ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
      )}
    >
      {intent}
    </span>
  );
}
