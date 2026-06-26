import { MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';

export default function ConversationThreadView({ activeThread, onAction }) {
  const openWhatsAppChat = (phone, name) => {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone) return;
    const message = encodeURIComponent(
      `Hi ${name}, thanks for replying regarding your exhibition footprint. Let's connect here.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-[var(--color-ink)]">{activeThread.pocName}</h3>
          <p className="mt-0.5 truncate text-[13px] text-neutral-500">
            {activeThread.designation}
            {activeThread.designation && activeThread.companyName ? ' · ' : ''}
            <span className="font-medium text-neutral-700">{activeThread.companyName}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
          {activeThread.campaignName}
        </span>
      </header>

      <div className="crm-scroll flex-1 space-y-4 overflow-y-auto bg-neutral-50/50 p-5">
        {(activeThread.history || []).map((msg, index) => {
          const outbound = msg.type === 'outbound';
          return (
            <div key={index} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-xl rounded-2xl px-4 py-3 shadow-sm',
                  outbound ? 'border border-[var(--color-line)] bg-white text-neutral-700' : 'bg-[var(--color-ink)] text-white'
                )}
              >
                <div
                  className={cn(
                    'mb-2 flex items-center justify-between gap-4 border-b pb-1.5 text-[10px] font-semibold uppercase tracking-wider',
                    outbound ? 'border-[var(--color-line)] text-neutral-400' : 'border-white/15 text-white/60'
                  )}
                >
                  <span>{outbound ? `Step ${msg.step || '?'}` : 'Reply'}</span>
                  <span>{new Date(msg.timestamp).toLocaleDateString('en-AE')}</span>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed">{msg.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-white px-5 py-3.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openWhatsAppChat(activeThread.phoneNumber, activeThread.pocName)}
            disabled={!activeThread.phoneNumber}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onAction?.('blacklist', activeThread)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <ShieldAlert className="h-4 w-4" />
            Blacklist
          </button>
          <button
            type="button"
            onClick={() => onAction?.('won', activeThread)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark won
          </button>
        </div>
      </footer>
    </div>
  );
}
