import { useEffect, useMemo, useState } from 'react';
import { Link2, Mail } from 'lucide-react';
import { crmApiFetch } from '../../crmApi.js';
import FormattedEmailViewer from '../common/FormattedEmailViewer.jsx';
import Drawer from '../ui/Drawer.jsx';
import { Alert, Badge, LoadingState, cn } from '../ui/primitives.jsx';

function when(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function CommunicationSourceDrawer({ source, onClose, stackLevel = 2 }) {
  const conversationId = source?.conversationId;
  const sourceMessageId = source?.messageId || '';
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!conversationId) {
      setThread(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    crmApiFetch(`/api/admin/inbox/${encodeURIComponent(conversationId)}`)
      .then((result) => { if (!cancelled) setThread(result); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load the source conversation.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversationId]);

  const sourceFound = useMemo(
    () => !sourceMessageId || thread?.history?.some((message) => message.messageId === sourceMessageId),
    [sourceMessageId, thread],
  );

  return (
    <Drawer
      open={Boolean(conversationId)}
      onClose={onClose}
      title={thread?.history?.[0]?.subject || 'Source email conversation'}
      subtitle={[thread?.pocName, thread?.companyName, thread?.campaignName].filter(Boolean).join(' · ')}
      size="lg"
      stackLevel={stackLevel}
    >
      {loading ? <LoadingState label="Loading source conversation…" /> : error ? <Alert>{error}</Alert> : thread ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[11px] text-sky-800">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{sourceMessageId ? 'The highlighted email is the exact evidence used for this Job record.' : 'This whole conversation is linked as the source evidence for this Job.'}</p>
          </div>
          {!sourceFound && <Alert tone="warning">The original conversation is available, but its exact source message is no longer present.</Alert>}
          {(thread.history || []).map((message) => {
            const selected = Boolean(sourceMessageId) && message.messageId === sourceMessageId;
            const inbound = message.type === 'inbound';
            return (
              <article key={message.messageId || `${message.timestamp}-${message.type}`} className={cn('rounded-xl border p-4', selected ? 'border-brand bg-brand-soft/25 ring-2 ring-brand/15' : 'border-neutral-200 bg-white')}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-brand" />
                    <Badge tone={inbound ? 'success' : 'info'}>{inbound ? 'Received' : 'Sent'}</Badge>
                    {selected && <Badge tone="warning">Exact source</Badge>}
                  </div>
                  <span className="text-[10px] text-neutral-500">{when(message.timestamp)}</span>
                </div>
                {message.subject && <p className="mb-2 text-xs font-semibold text-neutral-800">Subject: {message.subject}</p>}
                <FormattedEmailViewer text={message.body || ''} maxHeight={520} />
              </article>
            );
          })}
        </div>
      ) : null}
    </Drawer>
  );
}
