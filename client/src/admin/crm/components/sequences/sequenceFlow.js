import { emptySequenceStep } from '../../constants/sequenceDefaults.js';
import { delayToMs, normalizeDelayUnit } from '../../utils/sequenceDelay.js';

let nodeCounter = 0;
let edgeCounter = 0;

export function nextNodeId(prefix = 'node') {
  nodeCounter += 1;
  return `${prefix}-${Date.now()}-${nodeCounter}`;
}

export function nextEdgeId(from, to, branch = 'default') {
  edgeCounter += 1;
  return `edge-${from}-${branch}-${to}-${edgeCounter}`;
}

export const BRANCH_TYPES = {
  DEFAULT: 'default',
  TRUE: 'true',
  FALSE: 'false',
};

export function createStartNode(position = { x: 480, y: 48 }) {
  return {
    id: nextNodeId('start'),
    type: 'start',
    x: position.x,
    y: position.y,
    data: { label: 'Start' },
  };
}

export function createEmailNode(stepData = {}, position = { x: 480, y: 160 }) {
  return {
    id: nextNodeId('email'),
    type: 'email',
    x: position.x,
    y: position.y,
    data: { ...emptySequenceStep(1), ...stepData },
  };
}

export function createConditionNode(position = { x: 480, y: 160 }) {
  return {
    id: nextNodeId('condition'),
    type: 'condition',
    x: position.x,
    y: position.y,
    data: {
      conditionType: 'replied',
      label: 'If replied',
      trueAction: 'continue',
      falseAction: 'continue',
    },
  };
}

export function createWaitNode(amount = 1, unit = 'days', position = { x: 480, y: 160 }) {
  return {
    id: nextNodeId('wait'),
    type: 'wait',
    x: position.x,
    y: position.y,
    data: { amount, unit: normalizeDelayUnit(unit) },
  };
}

export function createEdge(from, to, branch = BRANCH_TYPES.DEFAULT) {
  return {
    id: nextEdgeId(from, to, branch),
    from,
    to,
    branch,
  };
}

function readWaitDelay(data = {}) {
  const amount = Number(data.amount ?? data.days) || 0;
  const unit = normalizeDelayUnit(data.unit || 'days');
  return { amount, unit, ms: delayToMs(amount, unit) };
}

function msToStepDelay(ms) {
  if (!ms) return { dayDelay: 0, delayUnit: 'days' };
  if (ms < 60 * 60 * 1000) {
    return { dayDelay: Math.max(1, Math.round(ms / 60000)), delayUnit: 'minutes' };
  }
  if (ms < 24 * 60 * 60 * 1000) {
    return { dayDelay: Math.max(1, Math.round(ms / 3600000)), delayUnit: 'hours' };
  }
  return { dayDelay: Math.max(1, Math.round(ms / 86400000)), delayUnit: 'days' };
}

export function defaultFlow() {
  const start = createStartNode({ x: 480, y: 48 });
  const email = createEmailNode({}, { x: 480, y: 180 });
  return {
    nodes: [start, email],
    edges: [createEdge(start.id, email.id)],
    selectedNodeId: email.id,
  };
}

export function ensureStartNode(nodes = [], edges = []) {
  if (nodes.some((node) => node.type === 'start')) {
    return { nodes, edges };
  }
  const roots = nodes.filter((node) => !getIncomingEdges(node.id, edges).length);
  const first = roots.sort((a, b) => a.y - b.y)[0];
  const start = createStartNode({ x: first?.x ?? 480, y: Math.max(24, (first?.y ?? 180) - 72) });
  const nextNodes = [start, ...nodes];
  const nextEdges = first ? [createEdge(start.id, first.id), ...edges] : edges;
  return { nodes: nextNodes, edges: nextEdges };
}

export function normalizeFlowGraph(flowGraph) {
  if (!flowGraph?.nodes?.length) return defaultFlow();
  const nodes = flowGraph.nodes.map((node) => ({
    id: String(node.id),
    type: node.type,
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    data: { ...(node.data || {}) },
  }));
  const edges = (flowGraph.edges || []).map((edge) => ({
    id: String(edge.id || nextEdgeId(edge.from, edge.to, edge.branch)),
    from: String(edge.from),
    to: String(edge.to),
    branch: edge.branch === 'true' || edge.branch === 'false' ? edge.branch : 'default',
  }));
  return ensureStartNode(nodes, edges);
}

export function flowGraphFromState(nodes = [], edges = []) {
  return {
    nodes: nodes.map(({ id, type, x, y, data }) => ({ id, type, x, y, data })),
    edges: edges.map(({ id, from, to, branch }) => ({ id, from, to, branch: branch || 'default' })),
  };
}

export function getOutgoingEdges(nodeId, edges = []) {
  return edges.filter((edge) => edge.from === nodeId);
}

export function getIncomingEdges(nodeId, edges = []) {
  return edges.filter((edge) => edge.to === nodeId);
}

export function getBranchEdge(nodeId, branch, edges = []) {
  return edges.find((edge) => edge.from === nodeId && edge.branch === branch) || null;
}

export function removeEdgesForNode(nodeId, edges = []) {
  return edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
}

export function upsertEdge(edges, from, to, branch = BRANCH_TYPES.DEFAULT) {
  const withoutDuplicate = edges.filter(
    (edge) => !(edge.from === from && edge.branch === branch),
  );
  return [...withoutDuplicate, createEdge(from, to, branch)];
}

export function connectNodes(nodes, edges, fromId, toId, branch = BRANCH_TYPES.DEFAULT) {
  if (!fromId || !toId || fromId === toId) return edges;
  const fromNode = nodes.find((n) => n.id === fromId);
  const toNode = nodes.find((n) => n.id === toId);
  if (!fromNode || toNode?.type === 'start') return edges;
  if (fromNode.type === 'start' && branch !== BRANCH_TYPES.DEFAULT) {
    return upsertEdge(edges, fromId, toId, BRANCH_TYPES.DEFAULT);
  }
  if (fromNode.type === 'condition' && branch === BRANCH_TYPES.DEFAULT) {
    return edges;
  }
  if (fromNode.type !== 'condition' && branch !== BRANCH_TYPES.DEFAULT) {
    return upsertEdge(edges, fromId, toId, BRANCH_TYPES.DEFAULT);
  }
  return upsertEdge(edges, fromId, toId, branch);
}

export function disconnectEdge(edges, edgeId) {
  return edges.filter((edge) => edge.id !== edgeId);
}

export function stepsToFlow(steps = []) {
  if (!steps.length) return defaultFlow();

  const nodes = [];
  const edges = [];
  let y = 180;
  const x = 480;
  let prevId = null;
  let firstStepId = null;

  steps.forEach((step, index) => {
    if (index > 0 && Number(step.dayDelay) > 0) {
      const waitNode = createWaitNode(step.dayDelay, step.delayUnit || 'days', { x, y });
      nodes.push(waitNode);
      if (prevId) edges.push(createEdge(prevId, waitNode.id));
      prevId = waitNode.id;
      y += 110;
    }

    const emailNode = createEmailNode(
      {
        stepOrder: index + 1,
        dayDelay: index === 0 ? step.dayDelay : 0,
        subjectTemplate: step.subjectTemplate,
        bodyTemplate: step.bodyTemplate,
        useAiPersonalization: step.useAiPersonalization,
        aiPrompt: step.aiPrompt,
      },
      { x, y },
    );
    nodes.push(emailNode);
    if (!firstStepId) firstStepId = emailNode.id;
    if (prevId) edges.push(createEdge(prevId, emailNode.id));
    prevId = emailNode.id;
    y += 130;
  });

  const start = createStartNode({ x, y: 48 });
  const nextNodes = [start, ...nodes];
  const nextEdges = firstStepId
    ? [createEdge(start.id, firstStepId), ...edges]
    : edges;

  return {
    nodes: nextNodes,
    edges: nextEdges,
    selectedNodeId: firstStepId,
  };
}

export function flowFromSequence(seq = {}) {
  if (seq.flowGraph?.nodes?.length) {
    const flow = normalizeFlowGraph(seq.flowGraph);
    return { nodes: flow.nodes, edges: flow.edges, selectedNodeId: null };
  }
  return stepsToFlow(seq.steps || []);
}

function walkBranch(startId, nodes, edges, steps, pendingDelayMs, orderStart) {
  let order = orderStart;
  let pending = pendingDelayMs;
  let currentId = startId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodes.find((n) => n.id === currentId);
    if (!node) break;

    if (node.type === 'wait') {
      pending += readWaitDelay(node.data).ms;
      const next = getOutgoingEdges(node.id, edges)[0];
      currentId = next?.to || null;
      continue;
    }

    if (node.type === 'start') {
      const next = getOutgoingEdges(node.id, edges)[0];
      currentId = next?.to || null;
      continue;
    }

    if (node.type === 'condition') {
      break;
    }

    if (node.type === 'email') {
      const delay = order === 1
        ? msToStepDelay(pending)
        : (pending ? msToStepDelay(pending) : { dayDelay: 0, delayUnit: 'days' });
      steps.push({
        stepOrder: order,
        dayDelay: delay.dayDelay,
        delayUnit: delay.delayUnit,
        subjectTemplate: node.data?.subjectTemplate || '',
        bodyTemplate: node.data?.bodyTemplate || '',
        useAiPersonalization: node.data?.useAiPersonalization !== false,
        aiPrompt: node.data?.aiPrompt || '',
      });
      order += 1;
      pending = 0;
      const next = getOutgoingEdges(node.id, edges)[0];
      currentId = next?.to || null;
    }
  }

  return order;
}

export function flowToSteps(nodes = [], edges = []) {
  if (!nodes.length) return [emptySequenceStep(1)];

  const startNode = nodes.find((node) => node.type === 'start');
  const roots = nodes.filter((node) => !getIncomingEdges(node.id, edges).length);
  const entry = startNode || roots.sort((a, b) => a.y - b.y)[0] || nodes.sort((a, b) => a.y - b.y)[0];
  const steps = [];
  if (entry?.type === 'start') {
    const firstEdge = getOutgoingEdges(entry.id, edges)[0];
    if (firstEdge) walkBranch(firstEdge.to, nodes, edges, steps, 0, 1);
  } else if (entry) {
    walkBranch(entry.id, nodes, edges, steps, 0, 1);
  }

  if (!steps.length && nodes.some((n) => n.type === 'email')) {
    const email = nodes.find((n) => n.type === 'email');
    steps.push({
      stepOrder: 1,
      dayDelay: 0,
      delayUnit: 'days',
      subjectTemplate: email.data?.subjectTemplate || '',
      bodyTemplate: email.data?.bodyTemplate || '',
      useAiPersonalization: email.data?.useAiPersonalization !== false,
      aiPrompt: email.data?.aiPrompt || '',
    });
  }

  return steps.length ? steps : [emptySequenceStep(1)];
}

export function appendNode(nodes, edges, node, options = {}) {
  const { attachFromId, branch = BRANCH_TYPES.DEFAULT } = options;
  const placed = { ...node };

  if (attachFromId) {
    const parent = nodes.find((n) => n.id === attachFromId);
    if (parent) {
      if (parent.type === 'condition') {
        const offsetX = branch === BRANCH_TYPES.TRUE ? -150 : 150;
        placed.x = parent.x + offsetX;
        placed.y = parent.y + 140;
      } else {
        placed.x = parent.x;
        placed.y = parent.y + 130;
      }
    }
  } else {
    const sorted = [...nodes].filter((n) => n.type !== 'start').sort((a, b) => a.y - b.y);
    const last = sorted[sorted.length - 1];
    placed.x = last?.x ?? 480;
    placed.y = last ? last.y + 130 : 180;
    if (last) {
      return {
        nodes: [...nodes, placed],
        edges: connectNodes([...nodes, placed], edges, last.id, placed.id),
        selectedNodeId: placed.id,
      };
    }
  }

  const nextNodes = [...nodes, placed];
  let nextEdges = edges;
  if (attachFromId) {
    nextEdges = connectNodes(nextNodes, edges, attachFromId, placed.id, branch);
  }

  return { nodes: nextNodes, edges: nextEdges, selectedNodeId: placed.id };
}

export function appendConditionWithBranches(nodes, edges) {
  const sorted = [...nodes].filter((n) => n.type !== 'start').sort((a, b) => a.y - b.y);
  const last = sorted[sorted.length - 1];
  const baseY = last ? last.y + 130 : 140;
  const baseX = last?.x ?? 480;

  const condition = createConditionNode({ x: baseX, y: baseY });
  const trueNode = createEmailNode(
    { subjectTemplate: 'Yes path — follow up' },
    { x: baseX - 180, y: baseY + 140 },
  );
  const falseNode = createEmailNode(
    { subjectTemplate: 'No path — follow up' },
    { x: baseX + 180, y: baseY + 140 },
  );

  let nextNodes = [...nodes, condition, trueNode, falseNode];
  let nextEdges = [...edges];

  if (last) {
    nextEdges = connectNodes(nextNodes, nextEdges, last.id, condition.id);
  }
  nextEdges = connectNodes(nextNodes, nextEdges, condition.id, trueNode.id, BRANCH_TYPES.TRUE);
  nextEdges = connectNodes(nextNodes, nextEdges, condition.id, falseNode.id, BRANCH_TYPES.FALSE);

  return { nodes: nextNodes, edges: nextEdges, selectedNodeId: condition.id };
}

export function deleteNodeFromGraph(nodes, edges, nodeId) {
  const target = nodes.find((n) => n.id === nodeId);
  if (target?.type === 'start') {
    return { nodes, edges, selectedNodeId: null };
  }
  const nextNodes = nodes.filter((n) => n.id !== nodeId);
  const nextEdges = removeEdgesForNode(nodeId, edges);
  if (!nextNodes.some((n) => n.type !== 'start')) {
    const flow = defaultFlow();
    return { nodes: flow.nodes, edges: flow.edges, selectedNodeId: null };
  }
  const ensured = ensureStartNode(nextNodes, nextEdges);
  return { nodes: ensured.nodes, edges: ensured.edges, selectedNodeId: null };
}

export function getConditionLabel(data = {}) {
  const map = {
    replied: 'If replied',
    opened: 'If opened',
    no_reply: 'If no reply',
  };
  return data.label || map[data.conditionType] || 'Condition';
}
