import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { crmApiFetch, fetchSentEmails, fetchProjectSequences, fetchSendDeliveryIssues } from '../crmApi.js';
import SentEmailsWorkspace from '../components/sent/SentEmailsWorkspace.jsx';
import SendDeliveryIssuesWorkspace from '../components/sent/SendDeliveryIssuesWorkspace.jsx';
import EmailOutboxWorkspace from '../components/sent/EmailOutboxWorkspace.jsx';
import { Alert, LoadingState, PageSection, PageShell } from '../components/ui/primitives.jsx';
import { cn } from '../components/ui/primitives.jsx';

const VIEWS = [
  { id: 'outbox', label: 'Outbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'failed', label: 'Failed' },
];

export default function EmailHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('tab') || searchParams.get('view') || 'outbox';
  const view = ['sent', 'failed'].includes(viewParam) ? viewParam : 'outbox';
  const focusBatchId = searchParams.get('batch') || '';

  const [emails, setEmails] = useState([]);
  const [issues, setIssues] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [total, setTotal] = useState(0);
  const [sentToday, setSentToday] = useState(0);
  const [issueSummary, setIssueSummary] = useState({});
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [campaignId, setCampaignId] = useState('');
  const [sequenceId, setSequenceId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [repliedOnly, setRepliedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    crmApiFetch('/api/admin/projects')
      .then((rows) => setCampaigns(Array.isArray(rows) ? rows : []))
      .catch(() => setCampaigns([]));
    crmApiFetch('/api/admin/sequences')
      .then((rows) => setSequences(Array.isArray(rows) ? rows : []))
      .catch(() => setSequences([]));
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    fetchProjectSequences(campaignId)
      .then((rows) => setSequences(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [campaignId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [campaignId, sequenceId, debouncedSearch, repliedOnly, view]);

  const setView = useCallback((nextView) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextView === 'outbox') {
        params.delete('tab');
        params.delete('view');
      } else {
        params.set('tab', nextView);
        params.delete('view');
      }
      if (nextView !== 'outbox') params.delete('batch');
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFocusBatch = useCallback(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('batch');
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const load = useCallback(async () => {
    if (view === 'outbox') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (view === 'sent') {
        const data = await fetchSentEmails({
          page,
          limit: 50,
          campaignId: campaignId || undefined,
          sequenceId: sequenceId || undefined,
          q: debouncedSearch || undefined,
          repliedOnly: repliedOnly ? true : undefined,
        });
        setEmails(data.items || []);
        setTotal(data.total || 0);
        setPages(data.pages || 0);
        setSentToday(data.summary?.sentToday || 0);
      } else {
        const data = await fetchSendDeliveryIssues({
          page,
          limit: 50,
          campaignId: campaignId || undefined,
          sequenceId: sequenceId || undefined,
          q: debouncedSearch || undefined,
          status: view,
        });
        setIssues(data.items || []);
        setTotal(data.total || 0);
        setPages(data.pages || 0);
        setIssueSummary(data.summary || {});
      }
    } catch (err) {
      setError(err.message || 'Failed to load email delivery data.');
      setEmails([]);
      setIssues([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, campaignId, sequenceId, debouncedSearch, repliedOnly, view]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const showInitialLoader = loading && view !== 'outbox' && emails.length === 0 && issues.length === 0 && !debouncedSearch && !campaignId;

  if (showInitialLoader) {
    return (
      <PageShell>
        <LoadingState label="Loading email hub…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageSection>
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">Email</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Launch batches, queued sends, delivered messages, and failures in one place.
          </p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {VIEWS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                view === tab.id
                  ? 'border-brand/30 bg-brand-soft text-brand'
                  : 'border-[var(--color-line)] bg-white text-neutral-600 hover:border-neutral-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </PageSection>

      {error && (
        <PageSection>
          <Alert>{error}</Alert>
        </PageSection>
      )}

      <PageSection>
        {view === 'outbox' ? (
          <EmailOutboxWorkspace focusBatchId={focusBatchId} onFocusBatchHandled={clearFocusBatch} />
        ) : view === 'sent' ? (
          <SentEmailsWorkspace
            emails={emails}
            total={total}
            sentToday={sentToday}
            campaigns={campaigns}
            campaignId={campaignId}
            onCampaignChange={setCampaignId}
            sequences={sequences}
            sequenceId={sequenceId}
            onSequenceChange={setSequenceId}
            search={search}
            onSearchChange={setSearch}
            page={page}
            pages={pages}
            onPageChange={setPage}
            loading={loading}
            repliedOnly={repliedOnly}
            onRepliedOnlyChange={setRepliedOnly}
          />
        ) : (
          <SendDeliveryIssuesWorkspace
            issues={issues}
            total={total}
            summary={issueSummary}
            campaigns={campaigns}
            campaignId={campaignId}
            onCampaignChange={setCampaignId}
            sequences={sequences}
            sequenceId={sequenceId}
            onSequenceChange={setSequenceId}
            search={search}
            onSearchChange={setSearch}
            page={page}
            pages={pages}
            onPageChange={setPage}
            loading={loading}
            view={view}
          />
        )}
      </PageSection>
    </PageShell>
  );
}
