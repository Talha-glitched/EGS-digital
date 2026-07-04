import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  crmApiFetch,
  updateCampaign,
  fetchMailboxUsage,
  previewSequenceAudience,
  deleteSequenceWithUndo,
  deleteSequences,
  fetchGlobalLeads,
  fetchGlobalCompanies,
  resetSequenceEnrollments,
} from '../../crmApi.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useUndoToast } from '../../context/UndoToastContext.jsx';
import {
  GRADUATION_STEPS,
  isGraduationCampaign,
} from '../../constants/sequenceDefaults.js';
import { EMPTY_AUDIENCE, audienceToApiParams } from './audienceBuilder.js';
import SequenceSidebar from './SequenceSidebar.jsx';
import SequenceInspector from './SequenceInspector.jsx';
import SequenceWhiteboard from './SequenceWhiteboard.jsx';
import SequenceStudioToast from './SequenceStudioToast.jsx';
import { useStudioToast } from './useStudioToast.js';
import { LoadingState } from '../ui/primitives.jsx';
import SequenceNodeEditorModal from './SequenceNodeEditorModal.jsx';
import {
  appendNode,
  appendConditionWithBranches,
  connectNodes,
  disconnectEdge,
  createEmailNode,
  createWaitNode,
  defaultFlow,
  deleteNodeFromGraph,
  flowFromSequence,
  flowGraphFromState,
  flowToSteps,
} from './sequenceFlow.js';

function buildAudienceParams(audience) {
  return audienceToApiParams(audience);
}

export default function SequenceStudio({
  sequences,
  campaigns,
  mailStatus,
  onRefresh,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignParam = searchParams.get('campaign');

  const [activeSequenceId, setActiveSequenceId] = useState(null);
  const [sequenceName, setSequenceName] = useState('Untitled sequence');
  const [campaignId, setCampaignId] = useState(campaignParam || campaigns[0]?._id || '');
  const [nodes, setNodes] = useState(defaultFlow().nodes);
  const [edges, setEdges] = useState(defaultFlow().edges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [linkingFrom, setLinkingFrom] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [audience, setAudience] = useState({ ...EMPTY_AUDIENCE });
  const [audiencePreview, setAudiencePreview] = useState({ eligible: 0, netNew: 0, sample: [] });
  const [launchMode, setLaunchMode] = useState('draft');
  const [enrollLimit, setEnrollLimit] = useState(1);

  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Exhibit Graphic Sign');
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [mailboxUsage, setMailboxUsage] = useState(null);

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [launchArmed, setLaunchArmed] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('idle');
  const { toast, showToast, dismissToast } = useStudioToast();
  const { pushDeleteUndo } = useUndoToast();
  const draftSnapshotRef = useRef('');
  const skipAutosaveRef = useRef(true);

  const editingNode = nodes.find((n) => n.id === editingNodeId) || null;

  const campaignOptions = useMemo(
    () => campaigns.map((c) => ({
      value: c._id,
      label: c.projectName || 'Campaign',
      hint: c.status,
    })),
    [campaigns],
  );

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c._id, label: c.companyName || 'Company' })),
    [companies],
  );

  const contactOptions = useMemo(
    () => contacts.map((l) => ({
      value: l._id,
      label: l.name || l.email || 'Contact',
      hint: [l.email, l.companyName, l.designation].filter(Boolean).join(' · '),
    })),
    [contacts],
  );

  const loadAudienceOptions = useCallback(async (contactSearch = '') => {
    try {
      if (contactSearch) {
        const contactData = await fetchGlobalLeads({ search: contactSearch, limit: 100 });
        setContacts(contactData.items || []);
        return;
      }
      const [companyData, contactData] = await Promise.all([
        fetchGlobalCompanies({ limit: 500 }),
        fetchGlobalLeads({ limit: 500 }),
      ]);
      setCompanies(companyData.items || []);
      setContacts(contactData.items || []);
    } catch {
      if (!contactSearch) {
        setCompanies([]);
      }
      setContacts([]);
    }
  }, []);

  const buildDraftSnapshot = useCallback(() => JSON.stringify({
    name: sequenceName,
    steps: flowToSteps(nodes, edges),
    flowGraph: flowGraphFromState(nodes, edges),
    fromName,
    fromEmail,
  }), [sequenceName, nodes, edges, fromName, fromEmail]);

  const persistSender = useCallback(async () => {
    if (!campaignId) return;
    await updateCampaign(campaignId, { fromEmail, fromName });
  }, [campaignId, fromEmail, fromName]);

  const persistDraft = useCallback(async ({ silent = false } = {}) => {
    if (!campaignId) {
      if (!silent) showToast('Import a campaign list first.', 'error');
      return null;
    }

    const steps = flowToSteps(nodes, edges);
    const flowGraph = flowGraphFromState(nodes, edges);
    if (!steps.length) {
      if (!silent) showToast('Add at least one email step.', 'error');
      return null;
    }

    if (!silent) {
      setBusy(true);
      dismissToast();
    } else {
      setAutosaveStatus('saving');
    }

    try {
      await persistSender();
      let seqId = activeSequenceId;
      if (!seqId) {
        const created = await crmApiFetch(`/api/admin/projects/${campaignId}/sequences`, {
          method: 'POST',
          body: JSON.stringify({ name: sequenceName, steps, flowGraph }),
        });
        seqId = created._id;
        setActiveSequenceId(seqId);
        setSearchParams({ edit: seqId }, { replace: true });
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: sequenceName, steps, flowGraph }),
        });
      }

      draftSnapshotRef.current = buildDraftSnapshot();
      if (silent) {
        setAutosaveStatus('saved');
      } else {
        showToast('Draft saved.', 'success');
      }
      onRefresh?.();
      return seqId;
    } catch (err) {
      if (silent) setAutosaveStatus('error');
      else showToast(err.message || 'Save failed.', 'error');
      return null;
    } finally {
      if (!silent) setBusy(false);
    }
  }, [
    activeSequenceId,
    buildDraftSnapshot,
    campaignId,
    dismissToast,
    nodes,
    edges,
    onRefresh,
    persistSender,
    sequenceName,
    setSearchParams,
    showToast,
  ]);

  const loadSequence = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    dismissToast();
    try {
      const seq = await crmApiFetch(`/api/admin/sequences/${id}`);
      const flow = flowFromSequence(seq);
      setActiveSequenceId(seq._id);
      setSequenceName(seq.name || 'Untitled sequence');
      setCampaignId(String(seq.campaignId));
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setSelectedNodeId(null);
      setEditingNodeId(null);
      setLinkingFrom(null);
      setIsActive(Boolean(seq.isActive));
      setFromEmail(seq.campaign?.fromEmail || '');
      setFromName(seq.campaign?.fromName || 'Exhibit Graphic Sign');
    } catch {
      showToast('Failed to load sequence.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, dismissToast]);

  const resetNewSequence = useCallback((preferredCampaignId = '') => {
    const cid = preferredCampaignId || campaignParam || campaigns[0]?._id || '';
    const campaign = campaigns.find((c) => c._id === cid);
    const flow = defaultFlow();
    if (campaign && isGraduationCampaign(campaign.projectName, campaign.milestone)) {
      flow.nodes[0].data = { ...GRADUATION_STEPS[0] };
    }
    setActiveSequenceId(null);
    setSequenceName('Untitled sequence');
    setCampaignId(cid);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setSelectedNodeId(null);
    setIsActive(false);
    setLaunchMode('draft');
    setLaunchArmed(false);
    setAudience({ ...EMPTY_AUDIENCE });
    dismissToast();
    if (campaign) {
      setFromEmail(campaign.fromEmail || '');
      setFromName(campaign.fromName || 'Exhibit Graphic Sign');
    }
  }, [campaignParam, campaigns, dismissToast]);

  useEffect(() => {
    fetchMailboxUsage().then(setMailboxUsage).catch(() => {});
  }, []);

  useEffect(() => {
    loadAudienceOptions();
  }, [loadAudienceOptions, campaignId]);

  useEffect(() => {
    if (!campaignId) return undefined;
    const timer = setTimeout(async () => {
      try {
        const preview = await previewSequenceAudience(campaignId, {
          sequenceId: activeSequenceId,
          ...buildAudienceParams(audience),
        });
        setAudiencePreview(preview);
        setEnrollLimit((prev) => {
          const max = preview.netNew || 1;
          if (!prev || prev > max) return max || 1;
          return prev;
        });
      } catch {
        setAudiencePreview({ eligible: 0, netNew: 0, sample: [] });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [campaignId, activeSequenceId, audience]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    const isNew = searchParams.get('new') === '1';
    if (editId) {
      loadSequence(editId);
      return;
    }
    if (isNew || campaignParam) {
      resetNewSequence(campaignParam || '');
      return;
    }
    if (!searchParams.toString() && sequences[0]?._id) {
      setSearchParams({ edit: sequences[0]._id }, { replace: true });
    }
  }, [searchParams, campaignParam, sequences, loadSequence, resetNewSequence, setSearchParams]);

  useEffect(() => {
    if (loading) return undefined;
    skipAutosaveRef.current = true;
    draftSnapshotRef.current = buildDraftSnapshot();
    setAutosaveStatus('idle');
    const timer = window.setTimeout(() => {
      skipAutosaveRef.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [activeSequenceId, loading, buildDraftSnapshot]);

  useEffect(() => {
    if (skipAutosaveRef.current || loading || busy || launchArmed) return undefined;
    const snapshot = buildDraftSnapshot();
    if (snapshot === draftSnapshotRef.current) return undefined;

    const timer = window.setTimeout(() => {
      persistDraft({ silent: true });
    }, 1600);
    return () => clearTimeout(timer);
  }, [
    buildDraftSnapshot,
    busy,
    launchArmed,
    loading,
    persistDraft,
    sequenceName,
    nodes,
    edges,
    fromName,
    fromEmail,
    campaignId,
    activeSequenceId,
  ]);

  useEffect(() => {
    if (autosaveStatus !== 'saved') return undefined;
    const timer = window.setTimeout(() => setAutosaveStatus('idle'), 2500);
    return () => clearTimeout(timer);
  }, [autosaveStatus]);

  const confirmDeleteSequence = useConfirmDelete({
    resourceType: 'sequence',
    deleteFn: deleteSequenceWithUndo,
    onRemoved: (id) => {
      if (activeSequenceId === id) {
        setSearchParams(campaignParam ? { new: '1', campaign: campaignParam } : { new: '1' });
      }
      onRefresh?.();
    },
    onRestored: () => onRefresh?.(),
    defaultConfirm: 'Delete this sequence? Enrollments and pending sends will be removed.',
  });

  async function handleDeleteSequence(id) {
    const seq = sequences.find((s) => String(s._id) === String(id));
    setDeleting(true);
    try {
      await confirmDeleteSequence(
        id,
        `Deleted sequence: ${seq?.name || 'Untitled'}`,
        'Delete this sequence? Enrollments and pending sends will be removed.',
      );
    } catch (err) {
      showToast(err.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDeleteSequences(ids) {
    setDeleting(true);
    try {
      const nameById = new Map(sequences.map((s) => [String(s._id), s.name || 'Untitled']));
      const result = await deleteSequences(ids);
      if (activeSequenceId && ids.includes(activeSequenceId)) {
        setSearchParams(campaignParam ? { new: '1', campaign: campaignParam } : { new: '1' });
      }
      (result.results || []).filter((row) => row.ok).forEach((row) => {
        pushDeleteUndo({
          id: row.id,
          resourceType: 'sequence',
          label: `Deleted sequence: ${nameById.get(String(row.id)) || 'Untitled'}`,
          onRestored: () => onRefresh?.(),
        });
      });
      if (result.failed) {
        showToast(`Deleted ${result.deleted}, ${result.failed} failed.`, 'warning');
      }
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Bulk delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function handleSelectSequence(id) {
    setSearchParams({ edit: id });
  }

  function handleCreate() {
    setSearchParams(campaignParam ? { new: '1', campaign: campaignParam } : { new: '1' });
  }

  function updateNodeData(id, data) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data } : n)));
    setLaunchArmed(false);
  }

  function moveNode(id, x, y) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }

  function deleteNode(id) {
    const result = deleteNodeFromGraph(nodes, edges, id);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setLaunchArmed(false);
  }

  function addNode(factory, options) {
    const node = factory();
    const result = appendNode(nodes, edges, node, options);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeId(result.selectedNodeId);
    setEditingNodeId(result.selectedNodeId);
    setLaunchArmed(false);
  }

  function addConditionBranch() {
    const result = appendConditionWithBranches(nodes, edges);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeId(result.selectedNodeId);
    setEditingNodeId(result.selectedNodeId);
    setLaunchArmed(false);
  }

  function startLink(nodeId, branch) {
    setLinkingFrom({ nodeId, branch });
    setSelectedNodeId(nodeId);
  }

  function completeLink(fromId, toId, branch) {
    setEdges((prev) => connectNodes(nodes, prev, fromId, toId, branch));
    setLinkingFrom(null);
    setLaunchArmed(false);
    showToast('Connected steps.', 'success');
  }

  function cancelLink() {
    setLinkingFrom(null);
  }

  function handleDisconnectEdge(edgeId) {
    setEdges((prev) => disconnectEdge(prev, edgeId));
    setLaunchArmed(false);
  }

  async function handleResetEnrollments() {
    if (!activeSequenceId) {
      showToast('Save the sequence first.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const leadIds = audience.includeContactIds?.length ? audience.includeContactIds : [];
      const result = await resetSequenceEnrollments(activeSequenceId, leadIds);
      showToast(
        result.reset > 0
          ? `Reset ${result.reset} enrollment(s). You can launch again.`
          : 'No enrollments to reset for this audience.',
        result.reset > 0 ? 'success' : 'warning',
      );
      const preview = await previewSequenceAudience(campaignId, {
        sequenceId: activeSequenceId,
        ...buildAudienceParams(audience),
      });
      setAudiencePreview(preview);
      setEnrollLimit(Math.max(1, preview.netNew || 0));
      setLaunchArmed(false);
    } catch (err) {
      showToast(err.message || 'Reset failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save({ launch = false } = {}) {
    if (!campaignId) {
      showToast('Import a campaign list first.', 'error');
      return;
    }

    const steps = flowToSteps(nodes, edges);
    const flowGraph = flowGraphFromState(nodes, edges);
    if (!steps.length) {
      showToast('Add at least one email step.', 'error');
      return;
    }

    if (launch && !launchArmed) {
      setLaunchArmed(true);
      showToast(`Confirm to enroll ${enrollLimit} contact(s).`, 'warning');
      return;
    }

    if (launch && !mailStatus?.smtpReady) {
      showToast('SMTP is not configured.', 'error');
      return;
    }

    setBusy(true);
    dismissToast();

    try {
      const seqId = await persistDraft({ silent: true });
      if (!seqId) return;

      if (launch) {
        const body = {
          sequenceId: seqId,
          confirmEnrollment: true,
          enrollLimit,
          ...buildAudienceParams(audience),
        };
        const result = await crmApiFetch(`/api/admin/projects/${campaignId}/enroll`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setIsActive(true);
        setLaunchArmed(false);
        showToast(
          result.enrolled > 0
            ? `Launched — ${result.enrolled} enrolled${result.restarted ? ` (${result.restarted} restarted)` : ''}. Sending via SMTP now.`
            : result.skippedActive
              ? 'No new contacts enrolled — selected contact(s) are still active in this sequence. Use “Reset enrollment to re-test” first.'
              : 'No new contacts were enrolled.',
          result.enrolled > 0 ? 'success' : 'warning',
        );
        fetchMailboxUsage().then(setMailboxUsage).catch(() => {});
        if (result.enrolled > 0) {
          previewSequenceAudience(campaignId, {
            sequenceId: seqId,
            ...buildAudienceParams(audience),
          })
            .then((preview) => {
              setAudiencePreview(preview);
              setEnrollLimit(Math.max(1, preview.netNew || 0));
            })
            .catch(() => {});
        }
      } else if (!launch) {
        setLaunchArmed(false);
        showToast('Draft saved.', 'success');
      }
      onRefresh?.();
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
      setLaunchArmed(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !nodes.length) {
    return <LoadingState label="Loading studio…" />;
  }

  return (
    <div className="crm-seq-studio">
      <div className="crm-seq-canvas-layer">
        <SequenceWhiteboard
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          linkingFrom={linkingFrom}
          onSelectNode={setSelectedNodeId}
          onMoveNode={moveNode}
          onAddEmail={() => addNode(() => createEmailNode())}
          onAddCondition={addConditionBranch}
          onAddWait={() => addNode(() => createWaitNode(5, 'minutes'))}
          onCanvasClick={() => {
            setSelectedNodeId(null);
            setLinkingFrom(null);
          }}
          onStartLink={startLink}
          onCompleteLink={completeLink}
          onCancelLink={cancelLink}
          onEditNode={setEditingNodeId}
          onDisconnectEdge={handleDisconnectEdge}
          focusKey={activeSequenceId || 'new'}
        />
        <SequenceNodeEditorModal
          node={editingNode}
          open={Boolean(editingNode)}
          onClose={() => setEditingNodeId(null)}
          onSave={updateNodeData}
          onDelete={deleteNode}
          canDelete={nodes.length > 1 || editingNode?.type !== 'email'}
        />
        <SequenceStudioToast
          message={toast.message}
          tone={toast.tone}
          onDismiss={dismissToast}
        />
      </div>

      <SequenceSidebar
        sequences={sequences}
        activeId={activeSequenceId}
        onSelect={handleSelectSequence}
        onCreate={handleCreate}
        onDelete={handleDeleteSequence}
        onBulkDelete={handleBulkDeleteSequences}
        deleting={deleting}
      />

      <SequenceInspector
        selectedNode={null}
        nodes={nodes}
        onUpdateNode={updateNodeData}
        onDeleteNode={deleteNode}
        sequenceName={sequenceName}
        onSequenceNameChange={setSequenceName}
        campaignId={campaignId}
        onCampaignChange={setCampaignId}
        campaignOptions={campaignOptions}
        allCampaignOptions={campaignOptions}
        campaignName={campaigns.find((c) => c._id === campaignId)?.projectName}
        audience={audience}
        onAudienceChange={setAudience}
        companyOptions={companyOptions}
        contactOptions={contactOptions}
        onContactSearch={loadAudienceOptions}
        audiencePreview={audiencePreview}
        onResetEnrollments={handleResetEnrollments}
        launchMode={launchMode}
        onLaunchModeChange={setLaunchMode}
        enrollLimit={enrollLimit}
        onEnrollLimitChange={setEnrollLimit}
        fromName={fromName}
        onFromNameChange={setFromName}
        fromEmail={fromEmail}
        onFromEmailChange={setFromEmail}
        mailboxUsage={mailboxUsage}
        mailStatus={mailStatus}
        sequenceId={activeSequenceId}
        onSaveDraft={() => save({ launch: false })}
        onLaunch={() => save({ launch: true })}
        busy={busy}
        launchArmed={launchArmed}
        isActive={isActive}
        contentKey={activeSequenceId || 'new'}
        autosaveStatus={autosaveStatus}
      />
    </div>
  );
}
