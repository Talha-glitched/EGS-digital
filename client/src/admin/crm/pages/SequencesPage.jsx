import { useCallback, useEffect, useState } from 'react';
import { crmApiFetch, fetchConfiguredEmailAccounts } from '../crmApi.js';
import SequenceStudio from '../components/sequences/SequenceStudio.jsx';
import { LoadingState } from '../components/ui/primitives.jsx';

export default function SequencesPage() {
  const [sequences, setSequences] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [mailStatus, setMailStatus] = useState(null);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [seqList, campaignList, status, accounts] = await Promise.all([
      crmApiFetch('/api/admin/sequences').catch(() => []),
      crmApiFetch('/api/admin/projects').catch(() => []),
      crmApiFetch('/api/admin/status').catch(() => null),
      fetchConfiguredEmailAccounts().catch(() => []),
    ]);
    setSequences(seqList);
    setCampaigns(campaignList);
    setMailStatus(status);
    setEmailAccounts(Array.isArray(accounts) ? accounts : []);
  }, []);

  useEffect(() => {
    refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="crm-seq-page">
        <LoadingState label="Opening sequence studio…" />
      </div>
    );
  }

  return (
    <div className="crm-seq-page">
      <SequenceStudio
        sequences={sequences}
        campaigns={campaigns}
        mailStatus={mailStatus}
        emailAccounts={emailAccounts}
        onRefresh={refresh}
      />
    </div>
  );
}
