'use client';

import React from 'react';
import type { MindmapGraphEdge, MindmapGraphNode } from '@/lib/mindmapApi';

type LayoutNode = MindmapGraphNode & { x: number; y: number };

export type MindmapViewport = { panX: number; panY: number; zoom: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normString(v: unknown) {
  return String(v ?? '').trim();
}

/**
 * Simple radial-ish layout:
 * - center node fixed at (0,0)
 * - remaining nodes distributed on rings
 * This keeps implementation dependency-free while still supporting exploration.
 */
function computeLayout(params: { nodes: MindmapGraphNode[]; centerNodeId: string }): Map<string, LayoutNode> {
  const map = new Map<string, LayoutNode>();
  const nodes = params.nodes ?? [];
  const centerId = params.centerNodeId;

  const center = nodes.find((n) => n.id === centerId) ?? nodes[0];
  if (center) map.set(center.id, { ...center, x: 0, y: 0 });

  const others = nodes.filter((n) => n.id !== (center?.id ?? centerId));
  const ringSize = 10;
  const radiusStep = 220;

  for (let i = 0; i < others.length; i++) {
    const ring = Math.floor(i / ringSize) + 1;
    const idxInRing = i % ringSize;
    const countInRing = Math.min(ringSize, others.length - (ring - 1) * ringSize);
    const angle = (2 * Math.PI * idxInRing) / Math.max(1, countInRing);

    const r = ring * radiusStep;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    map.set(others[i].id, { ...others[i], x, y });
  }

  // Ensure all nodes exist even if center missing
  for (const n of nodes) {
    if (!map.has(n.id)) map.set(n.id, { ...n, x: 0, y: 0 });
  }
  return map;
}

function getNodeColor(params: { isCenter: boolean; isSelected: boolean; isDimmed: boolean }) {
  if (params.isCenter) return params.isSelected ? '#0D9488' : '#14B8A6';
  if (params.isDimmed) return '#CBD5E1';
  return params.isSelected ? '#1D4ED8' : '#FFFFFF';
}

function getNodeStroke(params: { isCenter: boolean; isSelected: boolean; isDimmed: boolean }) {
  if (params.isDimmed) return '#CBD5E1';
  if (params.isCenter) return '#0F766E';
  return params.isSelected ? '#1D4ED8' : '#CBD5E1';
}

export type MindmapCanvasProps = {
  nodes: MindmapGraphNode[];
  edges: MindmapGraphEdge[];
  centerNodeId: string;
  selectedNodeId: string | null;
  dimmedNodeIds?: Set<string>;

  viewport: MindmapViewport;
  onViewportChange: (v: MindmapViewport) => void;

  onNodeClick: (nodeId: string) => void;
};

// PUBLIC_INTERFACE
export function MindmapCanvas(props: MindmapCanvasProps) {
  /**
   * Interactive SVG renderer with:
   * - wheel zoom (cursor-centered)
   * - drag pan
   * - click nodes (select)
   *
   * This keeps the implementation dependency-free and works well for moderate graphs.
   */
  const { nodes, edges, centerNodeId, selectedNodeId, dimmedNodeIds, viewport, onViewportChange, onNodeClick } = props;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const layout = React.useMemo(() => computeLayout({ nodes, centerNodeId }), [nodes, centerNodeId]);

  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const viewBox = React.useMemo(() => {
    // Use a fixed world box; zoom/pan implemented by viewBox transform.
    // We create a camera by translating/zooming the viewBox.
    const baseW = 1600;
    const baseH = 1000;
    const z = clamp(viewport.zoom, 0.25, 3);
    const w = baseW / z;
    const h = baseH / z;
    const x = -w / 2 - viewport.panX;
    const y = -h / 2 - viewport.panY;
    return `${x} ${y} ${w} ${h}`;
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  function clientPointToWorld(evt: React.WheelEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = evt.clientX - rect.left;
    const cy = evt.clientY - rect.top;
    // Map to normalized [0..1]
    const nx = cx / rect.width;
    const ny = cy / rect.height;

    // Convert to current world coordinates within viewBox.
    const parts = viewBox.split(' ').map(Number);
    const [vx, vy, vw, vh] = parts;
    return { x: vx + nx * vw, y: vy + ny * vh };
  }

  const onWheel = React.useCallback(
    (evt: WheelEvent) => {
      // Important: this handler is attached with `{ passive: false }` (see effect below),
      // so preventDefault is allowed and will not trigger the console warning.
      evt.preventDefault();

      const dir = evt.deltaY > 0 ? -1 : 1;
      const zoomFactor = dir > 0 ? 1.12 : 0.9;

      // Convert the native WheelEvent into the minimal shape our helper expects.
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const cx = evt.clientX - rect.left;
      const cy = evt.clientY - rect.top;
      const nx = cx / rect.width;
      const ny = cy / rect.height;

      const parts = viewBox.split(' ').map(Number);
      const [vx, vy, vw, vh] = parts;
      const before = { x: vx + nx * vw, y: vy + ny * vh };

      const nextZoom = clamp(viewport.zoom * zoomFactor, 0.25, 3);

      // Preserve cursor point by adjusting pan after zoom.
      const baseW = 1600;
      const baseH = 1000;

      const wAfter = baseW / nextZoom;
      const hAfter = baseH / nextZoom;

      // In our camera model: viewBox.x = -w/2 - panX, so panX = -w/2 - viewBox.x.
      // We want the world point under cursor to stay fixed => solve pan directly.
      const nextPanX = -wAfter / 2 - before.x;
      const nextPanY = -hAfter / 2 - before.y;

      onViewportChange({ panX: nextPanX, panY: nextPanY, zoom: nextZoom });
    },
    [onViewportChange, viewBox, viewport.zoom]
  );

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Attach as non-passive so we can call preventDefault() without warnings.
    svg.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      svg.removeEventListener('wheel', onWheel as EventListener);
    };
  }, [onWheel]);

  const onPointerDown = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (evt.button !== 0) return;
    setIsPanning(true);
    (evt.currentTarget as any).setPointerCapture?.(evt.pointerId);
    panStart.current = { x: evt.clientX, y: evt.clientY, panX: viewport.panX, panY: viewport.panY };
  };

  const onPointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panStart.current) return;
    const dx = evt.clientX - panStart.current.x;
    const dy = evt.clientY - panStart.current.y;

    // Convert screen pixels to world units based on zoom.
    const worldDx = dx / clamp(viewport.zoom, 0.25, 3);
    const worldDy = dy / clamp(viewport.zoom, 0.25, 3);

    onViewportChange({
      ...viewport,
      panX: panStart.current.panX - worldDx,
      panY: panStart.current.panY - worldDy,
    });
  };

  const onPointerUp = (evt: React.PointerEvent<SVGSVGElement>) => {
    setIsPanning(false);
    (evt.currentTarget as any).releasePointerCapture?.(evt.pointerId);
    panStart.current = null;
  };

  return (
    <div className="w-full h-full rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-0">
      <svg
        ref={svgRef}
        className="w-full flex-1 min-h-0 touch-none"
        viewBox={viewBox}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="img"
        aria-label="Career mind map"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
          </marker>
        </defs>

        {/* Edges */}
        <g>
          {edges.map((e, idx) => {
            // Be defensive: some backends use from/to.
            const sourceId = normString((e as any).source || (e as any).from);
            const targetId = normString((e as any).target || (e as any).to);
            if (!sourceId || !targetId) return null;

            const s = layout.get(sourceId);
            const t = layout.get(targetId);
            if (!s || !t) return null;

            // If either endpoint is dimmed, dim the edge (more intuitive than requiring both).
            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(sourceId) || dimmedNodeIds.has(targetId) : false;

            return (
              <g key={`${sourceId}-${targetId}-${idx}`}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={isDimmed ? '#CBD5E1' : '#94A3B8'}
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                  opacity={isDimmed ? 0.35 : 0.85}
                />
                {e.label ? (
                  <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2} fontSize="12" fill="#64748B" textAnchor="middle">
                    {normString(e.label)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {Array.from(layout.values()).map((n) => {
            const isCenter = n.id === centerNodeId;
            const isSelected = n.id === selectedNodeId;
            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;

            const fill = getNodeColor({ isCenter, isSelected, isDimmed });
            const stroke = getNodeStroke({ isCenter, isSelected, isDimmed });

            const r = isCenter ? 52 : 44;
            const title = normString(n.title) || n.id;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={(evt) => {
                  evt.stopPropagation();
                  onNodeClick(n.id);
                }}
                style={{ cursor: 'pointer' }}
                aria-label={`Role node: ${title}`}
              >
                <circle r={r} fill={fill} stroke={stroke} strokeWidth={isSelected ? 3 : 2} opacity={isDimmed ? 0.45 : 1} />
                <text
                  y={-4}
                  fontSize={isCenter ? 13 : 12}
                  fill={isCenter ? '#FFFFFF' : '#0F172A'}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {title.length > 18 ? `${title.slice(0, 18)}…` : title}
                </text>
                {isCenter ? (
                  <text y={16} fontSize={10} fill="#ECFEFF" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    Current / Center
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Controls</span>
          <span>Drag to pan</span>
          <span>Scroll to zoom</span>
          <span>Click a node for details</span>
        </div>
        <div className="tabular-nums">
          Zoom: <span className="font-semibold text-slate-800">{Math.round(clamp(viewport.zoom, 0.25, 3) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
