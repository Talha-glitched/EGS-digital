import { delayToMs, normalizeDelayUnit } from './sequenceDelay.js';

export function normalizeFlowGraph(flowGraph) {
  if (!flowGraph || !Array.isArray(flowGraph.nodes) || !flowGraph.nodes.length) return null;
  return {
    nodes: flowGraph.nodes.map((node) => ({
      id: String(node.id),
      type: node.type,
      x: Number(node.x) || 0,
      y: Number(node.y) || 0,
      data: node.data || {},
    })),
    edges: (flowGraph.edges || []).map((edge) => ({
      id: String(edge.id || `${edge.from}-${edge.branch || 'default'}-${edge.to}`),
      from: String(edge.from),
      to: String(edge.to),
      branch: ['true', 'false'].includes(edge.branch) ? edge.branch : 'default',
    })),
  };
}

export function findFlowNode(flowGraph, nodeId) {
  if (!nodeId || !flowGraph?.nodes) return null;
  return flowGraph.nodes.find((node) => node.id === String(nodeId)) || null;
}

export function getOutgoingEdge(flowGraph, fromId, branch = 'default') {
  const from = String(fromId);
  const preferred = flowGraph.edges.find((edge) => edge.from === from && edge.branch === branch);
  if (preferred) return preferred;
  if (branch !== 'default') {
    return flowGraph.edges.find((edge) => edge.from === from && edge.branch === 'default') || null;
  }
  return null;
}

export function getNextNodeId(flowGraph, fromId, branch = 'default') {
  return getOutgoingEdge(flowGraph, fromId, branch)?.to || null;
}

export function resolveEntryNodeId(flowGraph) {
  const start = flowGraph.nodes.find((node) => node.type === 'start');
  if (start) {
    return getNextNodeId(flowGraph, start.id, 'default');
  }
  const roots = flowGraph.nodes.filter(
    (node) => !flowGraph.edges.some((edge) => edge.to === node.id),
  );
  return roots.sort((a, b) => a.y - b.y)[0]?.id || null;
}

function readWaitDelayMs(data = {}) {
  const amount = Number(data.amount ?? data.days) || 0;
  const unit = normalizeDelayUnit(data.unit || 'days');
  return delayToMs(amount, unit);
}

export function evaluateCondition(lead, data = {}) {
  const type = data.conditionType || 'replied';
  const replied = lead.deliveryStatus === 'Replied' || Boolean(lead.repliedAt);
  const opened = Boolean(lead.trackingMetrics?.isOpened);

  if (type === 'replied') return replied;
  if (type === 'opened') return opened;
  if (type === 'no_reply') return !replied;
  return false;
}

function resolveConditionBranch(node, lead) {
  const pass = evaluateCondition(lead, node.data);
  const branch = pass ? 'true' : 'false';
  const action = pass ? node.data?.trueAction : node.data?.falseAction;
  return { branch, action: action || 'continue', pass };
}

export function nodeToEmailStep(node) {
  return {
    stepOrder: 1,
    dayDelay: 0,
    delayUnit: 'days',
    subjectTemplate: node.data?.subjectTemplate || '',
    bodyTemplate: node.data?.bodyTemplate || '',
    useAiPersonalization: node.data?.useAiPersonalization !== false,
    aiPrompt: node.data?.aiPrompt || '',
  };
}

/**
 * Walk from nodeId through waits/conditions until the next email node or end.
 * Returns { nodeId, delayMs, completed, stopReason }.
 */
export function resolveNextEmailTarget(flowGraph, startNodeId, lead) {
  let nodeId = startNodeId ? String(startNodeId) : null;
  let delayMs = 0;
  const visited = new Set();

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = findFlowNode(flowGraph, nodeId);
    if (!node) {
      return { nodeId: null, delayMs, completed: true };
    }

    if (node.type === 'start') {
      nodeId = getNextNodeId(flowGraph, nodeId, 'default');
      continue;
    }

    if (node.type === 'wait') {
      delayMs += readWaitDelayMs(node.data);
      nodeId = getNextNodeId(flowGraph, nodeId, 'default');
      continue;
    }

    if (node.type === 'condition') {
      const { branch, action } = resolveConditionBranch(node, lead);
      if (action === 'stop') {
        return { nodeId: null, delayMs, completed: true, stopReason: 'condition_stop' };
      }
      nodeId = getNextNodeId(flowGraph, nodeId, branch);
      continue;
    }

    if (node.type === 'email') {
      return { nodeId, delayMs, completed: false };
    }

    nodeId = getNextNodeId(flowGraph, nodeId, 'default');
  }

  return { nodeId: null, delayMs, completed: true };
}

export function isShortFlowDelay(delayMs) {
  return delayMs < 24 * 60 * 60 * 1000;
}
