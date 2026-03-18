'use client';

import React from 'react';

export type ExploreMindmapViewport = { panX: number; panY: number; zoom: number };

export type ExploreMindmapNode = {
  id: string;
  title: string;
  kind: 'current' | 'recommended';
  meta?: Record<string, any>;
};

export type ExploreMindmapEdge = {
  source: string;
  target: string;
};

export type ExploreMindmapCanvasProps = {
  nodes: ExploreMindmapNode[];
  edges: ExploreMindmapEdge[];
  selectedNodeId: string | null;

  viewport: ExploreMindmapViewport;
  onViewportChange: (v: ExploreMindmapViewport) => void;

  onNodeClick: (nodeId: string) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function wrapLabel(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const t = String(text ?? '').trim();
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

  const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
  }
  return lines.map((l) => (l.length > maxCharsPerLine ? `${l.slice(0, maxCharsPerLine - 1)}…` : l));
}

function computeRadialLayout(nodes: ExploreMindmapNode[]) {
  const center = nodes.find((n) => n.kind === 'current') ?? nodes[0];
  const recommended = nodes.filter((n) => n.id !== center?.id);

  const count = Math.max(1, recommended.length);
  const radius = count <= 6 ? 250 : count <= 10 ? 300 : 360;

  const positions = new Map<string, { x: number; y: number }>();
  if (center) positions.set(center.id, { x: 0, y: 0 });

  const ordered = [...recommended].sort((a, b) => a.title.localeCompare(b.title));

  ordered.forEach((n, idx) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    positions.set(n.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  return positions;
}

// PUBLIC_INTERFACE
export function ExploreMindmapCanvas(props: ExploreMindmapCanvasProps) {
  /**
   * SVG renderer for Explore mind map.
   *
   * UX goals (per request):
   * - Make connectors very visible: thick + black.
   * - Especially ensure "current role → target roles" connections are unmistakable.
   */
  const { nodes, edges, selectedNodeId, viewport, onViewportChange, onNodeClick } = props;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const positions = React.useMemo(() => computeRadialLayout(nodes), [nodes]);

  const centerNode = React.useMemo(() => nodes.find((n) => n.kind === 'current') ?? nodes[0], [nodes]);

  const viewBox = React.useMemo(() => {
    const baseW = 1200;
    const baseH = 760;
    const z = clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);
    const w = baseW / z;
    const h = baseH / z;
    const x = -w / 2 - viewport.panX;
    const y = -h / 2 - viewport.panY;
    return `${x} ${y} ${w} ${h}`;
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  const onWheel = React.useCallback(
    (evt: WheelEvent) => {
      evt.preventDefault();

      const dir = evt.deltaY > 0 ? -1 : 1;
      const zoomFactor = dir > 0 ? 1.12 : 0.9;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const cx = evt.clientX - rect.left;
      const cy = evt.clientY - rect.top;

      const nx = rect.width > 0 ? cx / rect.width : 0.5;
      const ny = rect.height > 0 ? cy / rect.height : 0.5;

      const parts = viewBox.split(' ').map(Number);
      const [vx, vy, vw, vh] = parts;

      const before = { x: vx + nx * vw, y: vy + ny * vh };

      const nextZoom = clamp(viewport.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

      const baseW = 1200;
      const baseH = 760;

      const wAfter = baseW / nextZoom;
      const hAfter = baseH / nextZoom;

      const viewBoxAfterX = before.x - nx * wAfter;
      const viewBoxAfterY = before.y - ny * hAfter;

      const nextPanX = -wAfter / 2 - viewBoxAfterX;
      const nextPanY = -hAfter / 2 - viewBoxAfterY;

      onViewportChange({ panX: nextPanX, panY: nextPanY, zoom: nextZoom });
    },
    [onViewportChange, viewBox, viewport.zoom],
  );

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel as EventListener);
  }, [onWheel]);

  const onPointerDown = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (evt.button !== 0) return;

    const target = evt.target as any;
    if (target?.closest?.('[data-explore-mindmap-node="true"]')) return;

    setIsPanning(true);
    (evt.currentTarget as any).setPointerCapture?.(evt.pointerId);
    panStart.current = { x: evt.clientX, y: evt.clientY, panX: viewport.panX, panY: viewport.panY };
  };

  const onPointerMove = (evt: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panStart.current) return;
    const dx = evt.clientX - panStart.current.x;
    const dy = evt.clientY - panStart.current.y;

    const z = clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM);
    const worldDx = dx / z;
    const worldDy = dy / z;

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
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col min-h-0 bg-background border border-border">
      <svg
        ref={svgRef}
        className="w-full flex-1 min-h-0 touch-none"
        viewBox={viewBox}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="img"
        aria-label="Explore mind map"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* Subtle drop shadow to prevent thick black edges from blending into dark nodes. */}
          <filter id="exploreEdgeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.28" />
            <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.18" />
          </filter>
        </defs>

        <g aria-hidden="true" filter="url(#exploreEdgeShadow)">
          {edges.map((e, idx) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;

            const isSelectedEdge =
              Boolean(selectedNodeId) && (e.source === selectedNodeId || e.target === selectedNodeId);

            const isCenterEdge = Boolean(centerNode?.id) && (e.source === centerNode?.id || e.target === centerNode?.id);

            const dx = b.x - a.x;
            const dy = b.y - a.y;

            // Gentle arc so lines don't intersect the node bodies too harshly.
            const curvature = Math.min(190, Math.max(80, Math.abs(dy) * 0.55 + Math.abs(dx) * 0.14));
            const cx = a.x + dx * 0.5;
            const cy = Math.min(a.y, b.y) - curvature;

            // Requested: black + very visible, but slightly thinner than the previous "extra thick" styling.
            // Keep emphasis on:
            // - selected edges
            // - edges connected to the center/current node
            const strokeWidth = isSelectedEdge ? 7.5 : isCenterEdge ? 6.25 : 5.25;

            return (
              <path
                key={`${e.source}-${e.target}-${idx}`}
                d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                fill="none"
                stroke="#000000"
                strokeOpacity={isSelectedEdge ? 1 : 0.92}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </g>

        <g>
          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;

            const isCenter = centerNode?.id === n.id;
            const isSelected = selectedNodeId === n.id;

            if (isCenter) {
              const r = 56;
              const lines = wrapLabel(n.title, 18, 2);

              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  data-explore-mindmap-node="true"
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onNodeClick(n.id);
                  }}
                  style={{ cursor: 'pointer' }}
                  aria-label={`Current role: ${n.title}`}
                >
                  <circle
                    r={r}
                    fill="var(--primary)"
                    stroke={isSelected ? `rgba(var(--cn-primary-rgb), 0.95)` : 'rgba(0,0,0,0)'}
                    strokeWidth={isSelected ? 4 : 0}
                  />
                  <text
                    fontSize={12}
                    fill="var(--cn-white)"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 800, opacity: 0.98 }}
                    y={-2}
                  >
                    {lines.map((ln, i) => (
                      <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                  <text
                    fontSize={10}
                    fill={`rgba(var(--cn-white-rgb), 0.85)`}
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700 }}
                    y={28}
                  >
                    Current role
                  </text>
                </g>
              );
            }

            const w = 190;
            const h = 54;
            const rx = 16;
            const lines = wrapLabel(n.title, 22, 2);
            const lineHeight = 13;
            const labelStartY = lines.length === 1 ? 4 : -(lineHeight / 2) + 2;

            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                data-explore-mindmap-node="true"
                onClick={(evt) => {
                  evt.stopPropagation();
                  onNodeClick(n.id);
                }}
                style={{ cursor: 'pointer' }}
                aria-label={`Recommended role: ${n.title}`}
              >
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={rx}
                  fill="var(--explore-mindmap-node-rec-fill)"
                  stroke={isSelected ? `rgba(var(--cn-primary-rgb), 0.90)` : 'var(--explore-mindmap-node-rec-stroke)'}
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={1}
                />
                <text
                  fontSize={12}
                  fill="var(--explore-mindmap-node-rec-text)"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 900 }}
                >
                  {lines.map((ln, i) => (
                    <tspan key={i} x={0} y={labelStartY + i * lineHeight}>
                      {ln}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="px-4 py-3 flex items-center justify-end gap-2 text-xs border-t border-border">
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-background text-foreground"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom / 1.12, MIN_ZOOM, MAX_ZOOM) })}
          disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) <= MIN_ZOOM + 1e-6}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>

        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-background text-foreground"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom * 1.12, MIN_ZOOM, MAX_ZOOM) })}
          disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) >= MAX_ZOOM - 1e-6}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-background text-foreground"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onViewportChange({ panX: 0, panY: 0, zoom: 1 })}
          aria-label="Reset view"
          title="Reset view"
        >
          Reset
        </button>

        <div className="tabular-nums ml-2 text-muted-foreground">
          Zoom: <span className="font-semibold text-foreground">{Math.round(clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
