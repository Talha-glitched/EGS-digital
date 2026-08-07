import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GitBranch, Plus, Mail } from 'lucide-react';
import {
  crmApiFetch,
  fetchMailboxUsage,
  previewSequenceAudience,
  deleteSequenceWithUndo,
  deleteSequences,
  fetchGlobalLeads,
  fetchGlobalCompanies,
  resetSequenceEnrollments,
  fetchSequenceDeliverySummary,
  launchSequence,
} from '../../crmApi.js';
import { useConfirmDelete } from '../../hooks/useConfirmDelete.js';
import { useUndoToast } from '../../context/UndoToastContext.jsx';
import {
  GRADUATION_STEPS,
  isGraduationCampaign,
} from '../../constants/sequenceDefaults.js';
import {
  EMPTY_AUDIENCE,
  audienceToApiParams,
  audienceWithImportedCampaign,
  normalizeCampaignId,
} from './audienceBuilder.js';
import SequenceSidebar from './SequenceSidebar.jsx';
import SequenceInspector from './SequenceInspector.jsx';
import SequenceWhiteboard from './SequenceWhiteboard.jsx';
import SequenceStudioToast from './SequenceStudioToast.jsx';
import { useStudioToast } from './useStudioToast.js';
import { LoadingState } from '../ui/primitives.jsx';
import SequenceNodeEditorModal from './SequenceNodeEditorModal.jsx';
import { SequenceDeliveryAlert } from '../sent/SendDeliveryIssuesWorkspace.jsx';
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
  const navigate = useNavigate();
  const campaignParam = searchParams.get('campaign');

  const [activeSequenceId, setActiveSequenceId] = useState(null);
  const [sequenceName, setSequenceName] = useState('Untitled sequence');
  const [campaignId, setCampaignId] = useState(
    () => normalizeCampaignId(campaignParam || ''),
  );
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

  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [mailboxUsage, setMailboxUsage] = useState(null);
  const [deliverySummary, setDeliverySummary] = useState(null);

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
  }), [sequenceName, nodes, edges]);

  const persistDraft = useCallback(async ({ silent = false } = {}) => {
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
      let seqId = activeSequenceId;
      if (!seqId) {
        const created = await crmApiFetch('/api/admin/sequences', {
          method: 'POST',
          body: JSON.stringify({ name: sequenceName, steps, flowGraph, audience, campaignId }),
        });
        seqId = created._id;
        setActiveSequenceId(seqId);
        setSearchParams({ edit: seqId }, { replace: true });
      } else {
        await crmApiFetch(`/api/admin/sequences/${seqId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: sequenceName, steps, flowGraph, audience, campaignId }),
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
    audience,
    buildDraftSnapshot,
    campaignId,
    dismissToast,
    nodes,
    edges,
    onRefresh,
    sequenceName,
    setSearchParams,
    showToast,
  ]);

  const loadDeliverySummary = useCallback(async (sequenceId) => {
    if (!sequenceId) {
      setDeliverySummary(null);
      return;
    }
    try {
      const summary = await fetchSequenceDeliverySummary(sequenceId);
      setDeliverySummary(summary);
    } catch {
      setDeliverySummary(null);
    }
  }, []);

  const loadSequence = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    dismissToast();
    try {
      const seq = await crmApiFetch(`/api/admin/sequences/${id}`);
      const flow = flowFromSequence(seq);
      const linkedCampaignId = normalizeCampaignId(seq.campaignId);
      const loadedAudience = (seq.audience && (seq.audience.importedCampaignIds?.length || seq.audience.includeContactIds?.length))
        ? {
            importedCampaignIds: seq.audience.importedCampaignIds || [],
            campaignSelections: seq.audience.campaignSelections || {},
            includeCompanyIds: seq.audience.includeCompanyIds || [],
            includeContactIds: seq.audience.includeContactIds || [],
            excludeCompanyIds: seq.audience.excludeCompanyIds || [],
            excludeContactIds: seq.audience.excludeContactIds || [],
          }
        : (linkedCampaignId ? audienceWithImportedCampaign(linkedCampaignId) : { ...EMPTY_AUDIENCE });

      setActiveSequenceId(seq._id);
      setSequenceName(seq.name || 'Untitled sequence');
      setCampaignId(linkedCampaignId || loadedAudience.importedCampaignIds?.[0] || '');
      setAudience(loadedAudience);
      setAudiencePreview({ eligible: 0, netNew: 0, sample: [] });
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setSelectedNodeId(null);
      setEditingNodeId(null);
      setLinkingFrom(null);
      setIsActive(Boolean(seq.isActive));
      setLaunchMode('draft');
      setLaunchArmed(false);
      await loadDeliverySummary(seq._id);
    } catch {
      showToast('Failed to load sequence.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, dismissToast, loadDeliverySummary]);

  const resetNewSequence = useCallback((preferredCampaignId = '') => {
    const cid = normalizeCampaignId(preferredCampaignId || campaignParam || '');
    const campaign = cid ? campaigns.find((c) => c._id === cid) : null;
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
    setDeliverySummary(null);
    setLaunchMode('draft');
    setLaunchArmed(false);
    // Start with 100% empty audience — NO campaign list preloaded!
    setAudience({ ...EMPTY_AUDIENCE });
    setAudiencePreview({ eligible: 0, netNew: 0, sample: [] });
    dismissToast();
  }, [campaignParam, campaigns, dismissToast]);

  useEffect(() => {
    fetchMailboxUsage().then(setMailboxUsage).catch(() => {});
  }, []);

  useEffect(() => {
    loadAudienceOptions();
  }, [loadAudienceOptions, campaignId]);

  useEffect(() => {
    const safeCampaignId = normalizeCampaignId(campaignId);
    const hasAudience = Boolean(
      audience.importedCampaignIds?.length
      || audience.includeContactIds?.length
      || audience.includeCompanyIds?.length,
    );
    // Standalone sequences must import a list; never preview with a bare/invalid campaignId.
    if (!hasAudience) {
      setAudiencePreview({ eligible: 0, netNew: 0, sample: [] });
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const preview = await previewSequenceAudience(safeCampaignId || null, {
          sequenceId: activeSequenceId,
          ...buildAudienceParams(audience),
        });
        setAudiencePreview(preview);
      } catch {
        setAudiencePreview({ eligible: 0, netNew: 0, sample: [] });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [campaignId, activeSequenceId, audience]);

  useEffect(() => {
    if (!activeSequenceId || !isActive) return undefined;
    const timer = window.setInterval(() => {
      loadDeliverySummary(activeSequenceId).catch(() => {});
    }, 8000);
    return () => window.clearInterval(timer);
  }, [activeSequenceId, isActive, loadDeliverySummary]);

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
    // No sequence or new parameter -> clear active sequence
    setActiveSequenceId(null);
  }, [searchParams, campaignParam, loadSequence, resetNewSequence]);

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
    if (!id || id === activeSequenceId) {
      setSearchParams({});
      setActiveSequenceId(null);
    } else {
      setSearchParams({ edit: id });
    }
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
      const preview = await previewSequenceAudience(normalizeCampaignId(campaignId) || null, {
        sequenceId: activeSequenceId,
        ...buildAudienceParams(audience),
      });
      setAudiencePreview(preview);
      setLaunchArmed(false);
    } catch (err) {
      showToast(err.message || 'Reset failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save({ launch = false } = {}) {
    const steps = flowToSteps(nodes, edges);
    const flowGraph = flowGraphFromState(nodes, edges);
    if (!steps.length) {
      showToast('Add at least one email step.', 'error');
      return;
    }

    if (launch && !launchArmed) {
      setLaunchArmed(true);
      showToast('Confirm to launch this sequence.', 'warning');
      return;
    }

    if (launch && !mailStatus?.emailDeliveryReady) {
      showToast('Email delivery is not configured.', 'error');
      return;
    }

    if (launch && !(audiencePreview?.netNew > 0)) {
      showToast('Import an audience list before launching.', 'error');
      return;
    }

    const hasAudience = Boolean(
      audience.importedCampaignIds?.length
      || audience.includeContactIds?.length
      || audience.includeCompanyIds?.length,
    );
    if (launch && !hasAudience) {
      showToast('Import a campaign list or add companies/contacts before launching.', 'error');
      return;
    }

    setBusy(true);
    dismissToast();

    try {
      const seqId = await persistDraft({ silent: true });
      if (!seqId) {
        showToast('Could not save the sequence before launch.', 'error');
        return;
      }

      if (launch) {
        const body = {
          confirmEnrollment: true,
          ...buildAudienceParams(audience),
        };
        const result = await launchSequence(seqId, body);
        setIsActive(true);
        setLaunchArmed(false);

        let launchMessage = 'No new contacts were enrolled.';
        if (result.enrolled > 0) {
          launchMessage = `Launched — ${result.enrolled} new contact${result.enrolled === 1 ? '' : 's'} queued`
            + `${result.skippedAlreadySent ? ` (${result.skippedAlreadySent} already sent — skipped)` : ''}.`
            + ' Open Email → Outbox and click Send remaining.';
        } else if ((result.skippedInQueue || 0) > 0) {
          launchMessage = `${result.skippedAlreadySent || 0} already sent, ${result.skippedInQueue} still in queue. Open Email → Outbox to send remaining — no duplicates.`;
        } else if ((result.skippedAlreadySent || 0) > 0) {
          launchMessage = `All ${result.skippedAlreadySent} contacts in this audience already received this sequence. Use Reset enrollments in settings if you need to resend.`;
        }

        showToast(launchMessage, result.enrolled > 0 ? 'success' : 'warning');
        fetchMailboxUsage().then(setMailboxUsage).catch(() => {});
        const targetBatch = result.launchBatchId || result.launchId;
        if (targetBatch) {
          window.open(`/admin/crm/sequence-live/${targetBatch}`, '_blank');
          return;
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

  const isStudioActive = Boolean(
    activeSequenceId || searchParams.get('new') === '1' || searchParams.get('campaign'),
  );

  if (loading && !nodes.length) {
    return <LoadingState label="Loading studio…" />;
  }

  if (!isStudioActive) {
    return (
      <div className="crm-seq-studio">
        <div className="crm-seq-canvas-layer flex flex-col items-center justify-center p-8 bg-neutral-50/40 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-xs mb-4">
            <GitBranch className="h-8 w-8 text-brand" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-ink)]">No sequence selected</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm leading-relaxed">
            Select an existing sequence from the left list to view or edit its drip steps, or click <strong className="text-neutral-800">+ New sequence</strong> to build a new drip flow.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand/90 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New sequence
          </button>
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
      </div>
    );
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
        deliverySummary={deliverySummary}
      />
    </div>
  );
}
