import { emptySequenceStep } from '../../constants/sequenceDefaults.js';

let nodeCounter = 0;
export function nextNodeId(prefix = 'node') {
  nodeCounter += 1;
  return `${prefix}-${Date.now()}-${nodeCounter}`;
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
      trueBranch: 'Stop sequence',
      falseBranch: 'Continue',
    },
  };
}

export function createWaitNode(days = 3, position = { x: 480, y: 160 }) {
  return {
    id: nextNodeId('wait'),
    type: 'wait',
    x: position.x,
    y: position.y,
    data: { days },
  };
}

export function defaultFlow() {
  const email = createEmailNode({}, { x: 480, y: 140 });
  return {
    nodes: [email],
    edges: [],
    selectedNodeId: email.id,
  };
}

export function stepsToFlow(steps = []) {
  if (!steps.length) return defaultFlow();

  const nodes = [];
  const edges = [];
  let y = 120;
  const x = 480;
  let prevId = null;

  steps.forEach((step, index) => {
    if (index > 0 && Number(step.dayDelay) > 0) {
      const waitNode = createWaitNode(step.dayDelay, { x, y });
      nodes.push(waitNode);
      if (prevId) edges.push({ from: prevId, to: waitNode.id });
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
    if (prevId) edges.push({ from: prevId, to: emailNode.id });
    prevId = emailNode.id;
    y += 130;
  });

  return {
    nodes,
    edges,
    selectedNodeId: nodes.find((n) => n.type === 'email')?.id || nodes[0]?.id || null,
  };
}

export function flowToSteps(nodes = [], edges = []) {
  const ordered = topologicalSort(nodes, edges);
  const steps = [];
  let pendingDelay = 0;
  let order = 1;

  for (const node of ordered) {
    if (node.type === 'wait') {
      pendingDelay += Number(node.data?.days) || 0;
      continue;
    }
    if (node.type === 'condition') {
      continue;
    }
    if (node.type === 'email') {
      steps.push({
        stepOrder: order,
        dayDelay: order === 1 ? pendingDelay : pendingDelay || Number(node.data?.dayDelay) || 0,
        subjectTemplate: node.data?.subjectTemplate || '',
        bodyTemplate: node.data?.bodyTemplate || '',
        useAiPersonalization: node.data?.useAiPersonalization !== false,
        aiPrompt: node.data?.aiPrompt || '',
      });
      pendingDelay = 0;
      order += 1;
    }
  }

  if (!steps.length && nodes.some((n) => n.type === 'email')) {
    const email = nodes.find((n) => n.type === 'email');
    steps.push({
      stepOrder: 1,
      dayDelay: 0,
      subjectTemplate: email.data?.subjectTemplate || '',
      bodyTemplate: email.data?.bodyTemplate || '',
      useAiPersonalization: email.data?.useAiPersonalization !== false,
      aiPrompt: email.data?.aiPrompt || '',
    });
  }

  return steps.length ? steps : [emptySequenceStep(1)];
}

function topologicalSort(nodes, edges) {
  if (!edges.length) {
    return [...nodes].sort((a, b) => a.y - b.y);
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map(nodes.map((n) => [n.id, []]));

  edges.forEach((edge) => {
    if (!byId.has(edge.from) || !byId.has(edge.to)) return;
    adjacency.get(edge.from).push(edge.to);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
  });

  const roots = nodes.filter((n) => (incoming.get(n.id) || 0) === 0).sort((a, b) => a.y - b.y);
  const queue = [...roots];
  const result = [];

  while (queue.length) {
    const node = queue.shift();
    result.push(node);
    for (const nextId of adjacency.get(node.id) || []) {
      incoming.set(nextId, incoming.get(nextId) - 1);
      if (incoming.get(nextId) === 0) {
        queue.push(byId.get(nextId));
        queue.sort((a, b) => a.y - b.y);
      }
    }
  }

  if (result.length < nodes.length) {
    const missing = nodes.filter((n) => !result.includes(n));
    return [...result, ...missing.sort((a, b) => a.y - b.y)];
  }

  return result;
}

export function connectChain(nodes, edges) {
  const sorted = [...nodes].sort((a, b) => a.y - b.y);
  const nextEdges = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    nextEdges.push({ from: sorted[i].id, to: sorted[i + 1].id });
  }
  return nextEdges;
}

export function appendNode(nodes, edges, node) {
  const sorted = [...nodes].sort((a, b) => a.y - b.y);
  const last = sorted[sorted.length - 1];
  const nextY = last ? last.y + 130 : 140;
  const placed = { ...node, x: last?.x ?? 480, y: nextY };
  const nextNodes = [...nodes, placed];
  const nextEdges = connectChain(nextNodes, [...edges, ...(last ? [{ from: last.id, to: placed.id }] : [])]);
  return { nodes: nextNodes, edges: nextEdges, selectedNodeId: placed.id };
}
