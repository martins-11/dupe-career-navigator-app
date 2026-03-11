'use client';

import React from 'react';
import type { MindmapGraphEdge, MindmapGraphNode } from '@/lib/mindmapApi';

type LayoutNode = MindmapGraphNode & { x: number; y: number };

export type MindmapViewport = { panX: number; panY: number; zoom: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const DEFAULT_ZOOM = 2.3;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normString(v: unknown) {
  return String(v ?? '').trim();
}

/**
 * Graph-aware "mindmap" layout (dependency-free):
 * - BFS levels from center node (outgoing edges as directed by backend)
 * - Each level placed in a vertical column (x = level * step)
 * - Nodes within a level stacked vertically (y = index * step)
 *
 * This makes the rendering far more readable than a naive ring layout:
 * edges mostly flow left→right and the tree/branching structure is clearer.
 */
function computeLayout(params: {
  nodes: MindmapGraphNode[];
  edges: MindmapGraphEdge[];
  centerNodeId: string;
}): Map<string, LayoutNode> {
  const nodes = params.nodes ?? [];
  const edges = params.edges ?? [];
  const centerId = params.centerNodeId;

  const byId = new Map<string, MindmapGraphNode>();
  for (const n of nodes) byId.set(n.id, n);

  // Build adjacency (directed). If backend sends "from/to", MindmapApi normalized to source/target,
  // but we remain defensive here too.
  const out = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) {
    out.set(n.id, []);
    inDeg.set(n.id, 0);
  }

  for (const e of edges) {
    const s = normString((e as any).source || (e as any).from);
    const t = normString((e as any).target || (e as any).to);
    if (!s || !t) continue;
    if (!byId.has(s) || !byId.has(t)) continue;

    out.get(s)?.push(t);
    inDeg.set(t, (inDeg.get(t) ?? 0) + 1);
  }

  const center = byId.get(centerId) ?? nodes[0];
  const rootId = center?.id ?? centerId;

  // BFS levels
  const levelById = new Map<string, number>();
  const q: string[] = [];
  if (rootId) {
    levelById.set(rootId, 0);
    q.push(rootId);
  }

  while (q.length) {
    const cur = q.shift()!;
    const curLevel = levelById.get(cur) ?? 0;
    const neighbors = out.get(cur) ?? [];
    for (const nxt of neighbors) {
      if (!levelById.has(nxt)) {
        levelById.set(nxt, curLevel + 1);
        q.push(nxt);
      }
    }
  }

  // Any disconnected nodes: place them after the connected component.
  const connectedMax = Math.max(0, ...Array.from(levelById.values()));
  let spillLevel = connectedMax + 1;
  for (const n of nodes) {
    if (!levelById.has(n.id)) {
      levelById.set(n.id, spillLevel);
      spillLevel += 1;
    }
  }

  // Group by level and stable-sort:
  // - Prefer lower in-degree first (often "more primary" items)
  // - Then by title
  const nodesByLevel = new Map<number, MindmapGraphNode[]>();
  for (const n of nodes) {
    const lvl = levelById.get(n.id) ?? 0;
    const arr = nodesByLevel.get(lvl) ?? [];
    arr.push(n);
    nodesByLevel.set(lvl, arr);
  }

  for (const [lvl, arr] of nodesByLevel.entries()) {
    arr.sort((a, b) => {
      const da = inDeg.get(a.id) ?? 0;
      const db = inDeg.get(b.id) ?? 0;
      if (da !== db) return da - db;
      return normString(a.title).localeCompare(normString(b.title));
    });

    // Ensure center node is first at level 0.
    if (lvl === 0 && rootId) {
      const idx = arr.findIndex((n) => n.id === rootId);
      if (idx > 0) {
        const [root] = arr.splice(idx, 1);
        arr.unshift(root);
      }
    }
  }

  // Coordinates
  const map = new Map<string, LayoutNode>();
  const xStep = 340;
  const yStep = 140;

  for (const [lvl, arr] of Array.from(nodesByLevel.entries()).sort((a, b) => a[0] - b[0])) {
    const x = lvl * xStep;

    // Center the level vertically around y=0
    const totalH = (arr.length - 1) * yStep;
    const y0 = -totalH / 2;

    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      map.set(n.id, { ...n, x, y: y0 + i * yStep });
    }
  }

  // Pin root exactly at origin for predictable camera behavior.
  if (rootId && map.has(rootId)) {
    const root = map.get(rootId)!;
    map.set(rootId, { ...root, x: 0, y: 0 });
  }

  // Ensure all nodes exist
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

function wrapLabel(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const t = normString(text);
  if (!t) return [''];
  const words = t.split(/\s+/).filter(Boolean);

  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = w;

    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  // If we still have remaining words, indicate truncation.
  const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
  }

  // Hard truncate extremely long single tokens
  return lines.map((l) => (l.length > maxCharsPerLine ? `${l.slice(0, maxCharsPerLine - 1)}…` : l));
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
  const layout = React.useMemo(() => computeLayout({ nodes, edges, centerNodeId }), [nodes, edges, centerNodeId]);

  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const viewBox = React.useMemo(() => {
    // Use a fixed world box; zoom/pan implemented by viewBox transform.
    // We create a camera by translating/zooming the viewBox.
    const baseW = 1600;
    const baseH = 1000;
    const z = clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);
    const w = baseW / z;
    const h = baseH / z;
    const x = -w / 2 - viewport.panX;
    const y = -h / 2 - viewport.panY;
    return `${x} ${y} ${w} ${h}`;
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  const onWheel = React.useCallback(
    (evt: WheelEvent) => {
      // Important: this handler is attached with `{ passive: false }` (see effect below),
      // so preventDefault is allowed and will not trigger the console warning.
      evt.preventDefault();

      const dir = evt.deltaY > 0 ? -1 : 1;
      const zoomFactor = dir > 0 ? 1.12 : 0.9;

      const svg = svgRef.current;
      if (!svg) return;

      // Cursor position in the SVG element (screen pixels)
      const rect = svg.getBoundingClientRect();
      const cx = evt.clientX - rect.left;
      const cy = evt.clientY - rect.top;

      // Normalized cursor position within the SVG [0..1]
      const nx = rect.width > 0 ? cx / rect.width : 0.5;
      const ny = rect.height > 0 ? cy / rect.height : 0.5;

      // Current viewBox in world coords
      const parts = viewBox.split(' ').map(Number);
      const [vx, vy, vw, vh] = parts;

      // World point under cursor BEFORE zoom
      const before = { x: vx + nx * vw, y: vy + ny * vh };

      const nextZoom = clamp(viewport.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

      // Our camera model:
      // viewBox = [ -w/2 - panX, -h/2 - panY, w, h ] where w=baseW/zoom, h=baseH/zoom
      // We want the same world point to remain under the cursor after zoom:
      // before.x == viewBoxAfter.x + nx * wAfter
      const baseW = 1600;
      const baseH = 1000;

      const wAfter = baseW / nextZoom;
      const hAfter = baseH / nextZoom;

      const viewBoxAfterX = before.x - nx * wAfter;
      const viewBoxAfterY = before.y - ny * hAfter;

      // Convert desired viewBoxAfter.x/y back into panX/panY.
      const nextPanX = -wAfter / 2 - viewBoxAfterX;
      const nextPanY = -hAfter / 2 - viewBoxAfterY;

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
    const worldDx = dx / clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);
    const worldDy = dy / clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);

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

            const r = isCenter ? 56 : 46;
            const title = normString(n.title) || n.id;

            const lines = wrapLabel(title, isCenter ? 18 : 16, 2);
            const lineHeight = isCenter ? 14 : 13;

            // Vertically center multi-line label around y=0
            const labelStartY = lines.length === 1 ? 4 : -(lineHeight / 2) + 2;

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
                  fontSize={isCenter ? 13 : 12}
                  fill={isCenter ? '#FFFFFF' : '#0F172A'}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {lines.map((ln, i) => (
                    <tspan key={i} x={0} y={labelStartY + i * lineHeight}>
                      {ln}
                    </tspan>
                  ))}
                </text>

                {isCenter ? (
                  <text y={r - 14} fontSize={10} fill="#ECFEFF" textAnchor="middle" style={{ pointerEvents: 'none' }}>
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom / 1.12, MIN_ZOOM, MAX_ZOOM) })}
            disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) <= MIN_ZOOM + 1e-6}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom * 1.12, MIN_ZOOM, MAX_ZOOM) })}
            disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) >= MAX_ZOOM - 1e-6}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={() => onViewportChange({ ...viewport, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })}
            aria-label="Reset view"
            title="Reset view"
          >
            Reset
          </button>

          <div className="tabular-nums ml-2">
            Zoom: <span className="font-semibold text-slate-800">{Math.round(clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
