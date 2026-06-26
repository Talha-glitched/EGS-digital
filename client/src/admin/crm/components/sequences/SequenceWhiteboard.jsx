import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mail, GitBranch, Clock, Minus, Plus, Maximize2 } from 'lucide-react';
import { cn } from '../ui/primitives.jsx';
import { nodeIcon } from './SequenceInspector.jsx';

const NODE_W = 220;
const NODE_H = 88;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nodeCenter(node) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

export default function SequenceWhiteboard({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onAddEmail,
  onAddCondition,
  onAddWait,
  onCanvasClick,
  focusKey,
}) {
  const boardRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [panning, setPanning] = useState(null);

  const sortedNodes = useMemo(() => [...nodes].sort((a, b) => a.y - b.y), [nodes]);

  const canvasSize = useMemo(() => {
    if (!nodes.length) return { width: 2800, height: 2000 };
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
    return {
      width: Math.max(2800, maxX + 600),
      height: Math.max(2000, maxY + 600),
    };
  }, [nodes]);

  const connectionPaths = useMemo(() => {
    const edgeList = edges.length
      ? edges
      : sortedNodes.slice(0, -1).map((node, i) => ({ from: node.id, to: sortedNodes[i + 1].id }));

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    return edgeList
      .map((edge) => {
        const from = byId[edge.from];
        const to = byId[edge.to];
        if (!from || !to) return null;
        const a = nodeCenter(from);
        const b = nodeCenter(to);
        const midY = (a.y + b.y) / 2;
        return `M ${a.x} ${a.y + NODE_H / 2} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y - NODE_H / 2}`;
      })
      .filter(Boolean);
  }, [edges, nodes, sortedNodes]);

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

  const onBoardMouseDown = (e) => {
    if (e.target.closest('[data-seq-node]') || e.target.closest('[data-seq-ui]')) return;
    if (e.button !== 0) return;
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
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
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

  return (
    <div
      className="crm-seq-whiteboard"
      ref={boardRef}
      onMouseDown={onBoardMouseDown}
      onMouseMove={onBoardMouseMove}
      onMouseUp={endInteraction}
      onMouseLeave={endInteraction}
    >
      <div
        className="crm-seq-board-canvas"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg className="crm-seq-board-lines" width={canvasSize.width} height={canvasSize.height} aria-hidden>
          {connectionPaths.map((d, i) => (
            <path key={i} d={d} className="crm-seq-board-path" />
          ))}
        </svg>

        {nodes.map((node) => {
          const Icon = nodeIcon(node.type);
          const selected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              data-seq-node
              className={cn('crm-seq-node', `is-${node.type}`, selected && 'is-selected')}
              style={{ left: node.x, top: node.y, width: NODE_W }}
              onMouseDown={(e) => {
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
            >
              <div className="crm-seq-node-head">
                <span className="crm-seq-node-icon">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="crm-seq-node-title">
                  {node.type === 'email' ? 'Send email' : node.type === 'wait' ? `Wait ${node.data?.days || 0}d` : node.data?.label || 'Condition'}
                </span>
              </div>
              <p className="crm-seq-node-preview">
                {node.type === 'email'
                  ? (node.data?.subjectTemplate || 'No subject yet')
                  : node.type === 'condition'
                    ? `${node.data?.trueBranch || 'Yes'} / ${node.data?.falseBranch || 'No'}`
                    : 'Delay before next step'}
              </p>
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
