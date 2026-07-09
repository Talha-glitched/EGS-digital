import { useCallback, useEffect, useState } from 'react';
import { crmApiFetch, fetchSentEmails, fetchProjectSequences } from '../crmApi.js';
import SentEmailsWorkspace from '../components/sent/SentEmailsWorkspace.jsx';
import { Alert, LoadingState, PageSection, PageShell } from '../components/ui/primitives.jsx';

export default function SentEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [total, setTotal] = useState(0);
  const [sentToday, setSentToday] = useState(0);
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
  }, []);

  useEffect(() => {
    setSequenceId('');
    if (!campaignId) {
      setSequences([]);
      return;
    }
    fetchProjectSequences(campaignId)
      .then((rows) => setSequences(Array.isArray(rows) ? rows : []))
      .catch(() => setSequences([]));
  }, [campaignId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [campaignId, sequenceId, debouncedSearch, repliedOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
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
    } catch (err) {
      setError(err.message || 'Failed to load sent emails.');
      setEmails([]);
      setTotal(0);
      setPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, campaignId, sequenceId, debouncedSearch, repliedOnly]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  if (loading && emails.length === 0 && !debouncedSearch && !campaignId) {
    return (
      <PageShell>
        <LoadingState label="Loading sent emails…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {error && (
        <PageSection>
          <Alert>{error}</Alert>
        </PageSection>
      )}
      <PageSection>
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
      </PageSection>
    </PageShell>
  );
}
