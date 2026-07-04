import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mail, GitBranch, Clock, Minus, Plus, Maximize2, Link2, Pencil, Play } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';
import { nodeIcon } from './SequenceInspector.jsx';
import { formatDelayLabel } from '../../utils/sequenceDelay.js';
import { BRANCH_TYPES, getConditionLabel, getOutgoingEdges } from './sequenceFlow.js';

const NODE_W = 220;
const NODE_H = 96;
const START_W = 76;
const START_H = 30;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

const BRANCH_STYLES = {
  default: { stroke: '#94a3b8', marker: 'seq-arrow-default', label: null, className: 'is-default' },
  true: { stroke: '#16a34a', marker: 'seq-arrow-true', label: 'Yes', className: 'is-true' },
  false: { stroke: '#64748b', marker: 'seq-arrow-false', label: 'No', className: 'is-false' },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nodeSize(node) {
  if (node.type === 'start') return { w: START_W, h: START_H };
  return { w: NODE_W, h: NODE_H };
}

function portPosition(node, branch = BRANCH_TYPES.DEFAULT) {
  const { w, h } = nodeSize(node);
  if (node.type === 'condition') {
    if (branch === BRANCH_TYPES.TRUE) {
      return { x: node.x + w * 0.28, y: node.y + h };
    }
    if (branch === BRANCH_TYPES.FALSE) {
      return { x: node.x + w * 0.72, y: node.y + h };
    }
  }
  return { x: node.x + w / 2, y: node.y + h };
}

function buildEdgePath(fromNode, toNode, branch = BRANCH_TYPES.DEFAULT) {
  const start = portPosition(fromNode, branch);
  const { w: toW } = nodeSize(toNode);
  const end = { x: toNode.x + toW / 2, y: toNode.y };
  const deltaY = end.y - start.y;
  const control = Math.max(48, Math.abs(deltaY) * 0.45);
  const c1y = start.y + control;
  const c2y = end.y - control;
  const path = `M ${start.x} ${start.y} C ${start.x} ${c1y}, ${end.x} ${c2y}, ${end.x} ${end.y}`;
  const labelX = (start.x + end.x) / 2;
  const labelY = (start.y + end.y) / 2 - 8;
  return { path, labelX, labelY, endX: end.x, endY: end.y };
}

export default function SequenceWhiteboard({
  nodes,
  edges,
  selectedNodeId,
  linkingFrom,
  onSelectNode,
  onMoveNode,
  onAddEmail,
  onAddCondition,
  onAddWait,
  onCanvasClick,
  onStartLink,
  onCompleteLink,
  onCancelLink,
  onEditNode,
  onDisconnectEdge,
  focusKey,
}) {
  const boardRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);

  const canvasSize = useMemo(() => {
    if (!nodes.length) return { width: 2800, height: 2000 };
    const maxX = Math.max(...nodes.map((n) => n.x + nodeSize(n).w));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeSize(n).h));
    return {
      width: Math.max(2800, maxX + 600),
      height: Math.max(2000, maxY + 600),
    };
  }, [nodes]);

  const renderedEdges = useMemo(() => {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    return edges
      .map((edge) => {
        const from = byId[edge.from];
        const to = byId[edge.to];
        if (!from || !to) return null;
        const branch = edge.branch || BRANCH_TYPES.DEFAULT;
        const style = BRANCH_STYLES[branch] || BRANCH_STYLES.default;
        const geometry = buildEdgePath(from, to, branch);
        return { ...edge, branch, style, ...geometry };
      })
      .filter(Boolean);
  }, [edges, nodes]);

  const applyZoom = useCallback((nextZoom, anchorX, anchorY) => {
    const board = boardRef.current;
    if (!board) {
      setZoom(nextZoom);
      return;
    }
    const rect = board.getBoundingClientRect();
    const px = anchorX ?? rect.width / 2;
    const py = anchorY ?? rect.height / 2;
    const clamped = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setPan((prev) => ({
      x: px - ((px - prev.x) / zoom) * clamped,
      y: py - ((py - prev.y) / zoom) * clamped,
    }));
    setZoom(clamped);
  }, [zoom]);

  const onWheel = useCallback((e) => {
    if (!boardRef.current?.contains(e.target)) return;
    if (e.target.closest('[data-seq-ui]')) return;
    e.preventDefault();

    const rect = boardRef.current.getBoundingClientRect();
    const isZoomGesture = e.ctrlKey || e.metaKey;

    if (isZoomGesture) {
      const delta = -e.deltaY * 0.004;
      applyZoom(zoom + delta, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      setPan((prev) => ({
        x: prev.x - dx,
        y: prev.y - dy,
      }));
    }
  }, [applyZoom, zoom]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    board.addEventListener('wheel', onWheel, { passive: false });
    return () => board.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  useEffect(() => {
    if (!linkingFrom) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onCancelLink?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [linkingFrom, onCancelLink]);

  useEffect(() => {
    if (!selectedEdgeId) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDisconnectEdge?.(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedEdgeId, onDisconnectEdge]);

  const onBoardMouseDown = (e) => {
    if (e.target.closest('[data-seq-node]') || e.target.closest('[data-seq-ui]')) return;
    if (e.button !== 0) return;
    if (linkingFrom) {
      onCancelLink?.();
      return;
    }
    setSelectedEdgeId(null);
    onCanvasClick?.();
    setPanning({ startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y });
  };

  const onBoardMouseMove = useCallback((e) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      onMoveNode(dragging.id, dragging.originX + dx, dragging.originY + dy);
      return;
    }
    if (panning) {
      setPan({
        x: panning.originX + (e.clientX - panning.startX),
        y: panning.originY + (e.clientY - panning.startY),
      });
    }
  }, [dragging, onMoveNode, panning, zoom]);

  const endInteraction = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

  function fitView() {
    if (!nodes.length) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + nodeSize(n).w));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeSize(n).h));
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 120;
    const scale = clamp(Math.min(rect.width / contentW, rect.height / contentH), MIN_ZOOM, 1.2);
    setZoom(scale);
    setPan({
      x: (rect.width - contentW * scale) / 2 - minX * scale + 40 * scale,
      y: (rect.height - contentH * scale) / 2 - minY * scale + 40 * scale,
    });
  }

  useEffect(() => {
    if (!focusKey) return undefined;
    const timer = window.setTimeout(fitView, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit when switching sequences only
  }, [focusKey]);

  function handleNodeClick(node, event) {
    event.stopPropagation();
    setSelectedEdgeId(null);
    if (linkingFrom) {
      if (linkingFrom.nodeId !== node.id) {
        onCompleteLink?.(linkingFrom.nodeId, node.id, linkingFrom.branch);
      }
      return;
    }
    onSelectNode(node.id);
  }

  function handleDisconnect(edgeId, event) {
    event?.stopPropagation();
    onDisconnectEdge?.(edgeId);
    setSelectedEdgeId(null);
    setHoveredEdgeId(null);
  }

  function renderPorts(node) {
    if (node.type === 'start') {
      return (
        <button
          type="button"
          data-seq-ui
          className={cn('crm-seq-port is-start', linkingFrom?.nodeId === node.id && 'is-linking')}
          style={{ left: '50%', bottom: -7 }}
          title="Connect first step"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onStartLink?.(node.id, BRANCH_TYPES.DEFAULT);
          }}
        >
          <Link2 className="h-3 w-3" />
        </button>
      );
    }

    if (node.type === 'condition') {
      return (
        <>
          <button
            type="button"
            data-seq-ui
            className={cn('crm-seq-port is-true', linkingFrom?.nodeId === node.id && linkingFrom?.branch === BRANCH_TYPES.TRUE && 'is-linking')}
            style={{ left: '28%', bottom: -7 }}
            title="Yes path"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStartLink?.(node.id, BRANCH_TYPES.TRUE);
            }}
          >
            Yes
          </button>
          <button
            type="button"
            data-seq-ui
            className={cn('crm-seq-port is-false', linkingFrom?.nodeId === node.id && linkingFrom?.branch === BRANCH_TYPES.FALSE && 'is-linking')}
            style={{ left: '72%', bottom: -7 }}
            title="No path"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onStartLink?.(node.id, BRANCH_TYPES.FALSE);
            }}
          >
            No
          </button>
        </>
      );
    }

    const outgoing = getOutgoingEdges(node.id, edges);
    return (
      <button
        type="button"
        data-seq-ui
        className={cn('crm-seq-port is-default', linkingFrom?.nodeId === node.id && 'is-linking')}
        style={{ left: '50%', bottom: -7 }}
        title={outgoing.length ? 'Add another connection' : 'Connect to next step'}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onStartLink?.(node.id, BRANCH_TYPES.DEFAULT);
        }}
      >
        <Link2 className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div
      className={cn('crm-seq-whiteboard', linkingFrom && 'is-linking')}
      ref={boardRef}
      onMouseDown={onBoardMouseDown}
      onMouseMove={onBoardMouseMove}
      onMouseUp={endInteraction}
      onMouseLeave={endInteraction}
    >
      {linkingFrom && (
        <div className="crm-seq-link-banner" data-seq-ui>
          <Link2 className="h-3.5 w-3.5" />
          Click a target step to connect
          <button type="button" onClick={onCancelLink}>Cancel</button>
        </div>
      )}

      {selectedEdgeId && !linkingFrom && (
        <div className="crm-seq-link-banner is-muted" data-seq-ui>
          Connection selected — click ✕ or press Delete to remove
        </div>
      )}

      <div
        className="crm-seq-board-canvas"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg className="crm-seq-board-lines" width={canvasSize.width} height={canvasSize.height} aria-hidden>
          <defs>
            <marker id="seq-arrow-default" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#94a3b8" />
            </marker>
            <marker id="seq-arrow-true" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#16a34a" />
            </marker>
            <marker id="seq-arrow-false" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="#64748b" />
            </marker>
          </defs>

          {renderedEdges.map((edge) => {
            const isSelected = selectedEdgeId === edge.id;
            const isHovered = hoveredEdgeId === edge.id;
            return (
              <g
                key={edge.id}
                className={cn('crm-seq-edge-group', edge.style.className, isSelected && 'is-selected', isHovered && 'is-hovered')}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId((prev) => (prev === edge.id ? null : prev))}
              >
                <path
                  d={edge.path}
                  className="crm-seq-board-path-hit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    onSelectNode(null);
                  }}
                />
                <path
                  d={edge.path}
                  className="crm-seq-board-path"
                  stroke={edge.style.stroke}
                  markerEnd={`url(#${edge.style.marker})`}
                />
                {edge.style.label && (
                  <text x={edge.labelX} y={edge.labelY} className="crm-seq-edge-label" fill={edge.style.stroke}>
                    {edge.style.label}
                  </text>
                )}
                {(isSelected || isHovered) && (
                  <g
                    className="crm-seq-edge-delete"
                    transform={`translate(${edge.labelX}, ${edge.labelY + 10})`}
                    data-seq-ui
                    onClick={(e) => handleDisconnect(edge.id, e)}
                  >
                    <circle r="11" className="crm-seq-edge-delete-bg" />
                    <text textAnchor="middle" dominantBaseline="central" className="crm-seq-edge-delete-icon">✕</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          if (node.type === 'start') {
            const selected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                data-seq-node
                className={cn('crm-seq-node is-start', selected && 'is-selected', linkingFrom && linkingFrom.nodeId !== node.id && 'is-link-target')}
                style={{ left: node.x, top: node.y, width: START_W, minHeight: START_H }}
                onMouseDown={(e) => {
                  if (e.target.closest('[data-seq-ui]')) return;
                  e.stopPropagation();
                  onSelectNode(node.id);
                  setDragging({
                    id: node.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: node.x,
                    originY: node.y,
                  });
                }}
                onClick={(e) => handleNodeClick(node, e)}
              >
                <div className="crm-seq-start-inner">
                  <span className="crm-seq-start-icon">
                    <Play className="h-2.5 w-2.5" />
                  </span>
                  <span className="crm-seq-start-label">Start</span>
                </div>
                {renderPorts(node)}
              </div>
            );
          }

          const Icon = nodeIcon(node.type);
          const selected = selectedNodeId === node.id;
          const outgoing = getOutgoingEdges(node.id, edges);
          const { w, h } = nodeSize(node);

          return (
            <div
              key={node.id}
              data-seq-node
              className={cn(
                'crm-seq-node',
                `is-${node.type}`,
                selected && 'is-selected',
                linkingFrom && linkingFrom.nodeId !== node.id && 'is-link-target',
              )}
              style={{ left: node.x, top: node.y, width: w, minHeight: h }}
              onMouseDown={(e) => {
                if (e.target.closest('[data-seq-ui]')) return;
                e.stopPropagation();
                onSelectNode(node.id);
                setDragging({
                  id: node.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  originX: node.x,
                  originY: node.y,
                });
              }}
              onClick={(e) => handleNodeClick(node, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditNode?.(node.id);
              }}
            >
              <div className="crm-seq-node-toolbar" data-seq-ui>
                <button type="button" className="crm-seq-node-edit" onClick={(e) => { e.stopPropagation(); onEditNode?.(node.id); }} title="Edit step">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>

              <div className="crm-seq-node-head">
                <span className="crm-seq-node-icon">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="crm-seq-node-title">
                  {node.type === 'email'
                    ? 'Send email'
                    : node.type === 'wait'
                      ? `Wait ${formatDelayLabel(node.data?.amount ?? node.data?.days, node.data?.unit || 'days')}`
                      : getConditionLabel(node.data)}
                </span>
              </div>

              <p className="crm-seq-node-preview">
                {node.type === 'email'
                  ? (node.data?.subjectTemplate || 'No subject yet')
                  : node.type === 'condition'
                    ? `Yes → ${node.data?.trueAction === 'stop' ? 'Stop' : 'Continue'} · No → ${node.data?.falseAction === 'stop' ? 'Stop' : 'Continue'}`
                    : 'Delay before next step'}
              </p>

              {outgoing.length > 1 && (
                <span className="crm-seq-node-fan">{outgoing.length} paths</span>
              )}

              {renderPorts(node)}
            </div>
          );
        })}
      </div>

      <div className="crm-seq-bottom-dock" data-seq-ui>
        <div className="crm-seq-zoom-bar">
          <button type="button" className="crm-seq-zoom-btn" onClick={() => applyZoom(zoom - ZOOM_STEP)} aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM * 100}
            max={MAX_ZOOM * 100}
            value={Math.round(zoom * 100)}
            onChange={(e) => applyZoom(Number(e.target.value) / 100)}
            className="crm-seq-zoom-slider"
            aria-label="Zoom level"
          />
          <button type="button" className="crm-seq-zoom-btn" onClick={() => applyZoom(zoom + ZOOM_STEP)} aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <span className="crm-seq-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="crm-seq-zoom-btn" onClick={fitView} title="Fit to view" aria-label="Fit to view">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="crm-seq-palette">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">Add</span>
          <button type="button" onClick={onAddEmail} className="crm-seq-palette-btn">
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
          <button type="button" onClick={onAddCondition} className="crm-seq-palette-btn">
            <GitBranch className="h-3.5 w-3.5" />
            Condition
          </button>
          <button type="button" onClick={onAddWait} className="crm-seq-palette-btn">
            <Clock className="h-3.5 w-3.5" />
            Wait
          </button>
        </div>

        <div className="crm-seq-bottom-spacer" aria-hidden />
      </div>
    </div>
  );
}
