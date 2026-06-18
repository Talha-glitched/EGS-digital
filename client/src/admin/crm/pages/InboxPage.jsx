import { useCallback, useEffect, useState } from 'react';
import { crmApiFetch } from '../crmApi.js';
import UnifiedInboxWorkspace from '../components/inbox/UnifiedInboxWorkspace.jsx';
import { PageShell, PageHeader, LoadingState } from '../components/ui/primitives.jsx';

export default function InboxPage() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await crmApiFetch('/api/admin/inbox?limit=100');
    setReplies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(console.error);
    crmApiFetch('/api/admin/inbox/sync', { method: 'POST' }).then(load).catch(() => {});
  }, [load]);

  async function handleAction(action, thread) {
    if (action === 'blacklist') {
      await crmApiFetch(`/api/admin/inbox/${thread._id}/blacklist`, { method: 'POST' });
      load();
    }
    if (action === 'won') {
      const amount = window.prompt('Closed deal amount (AED):', '65000');
      if (amount) {
        await crmApiFetch(`/api/admin/inbox/${thread._id}/won`, {
          method: 'POST',
          body: JSON.stringify({ amount: Number(amount), description: 'Closed from inbox' }),
        });
        load();
      }
    }
  }

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Syncing inbox…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Inbox"
        subtitle={`${replies.length} reply conversation${replies.length === 1 ? '' : 's'} — respond, blacklist, or close deals.`}
      />
      <UnifiedInboxWorkspace initialReplies={replies} onAction={handleAction} />
    </PageShell>
  );
}
