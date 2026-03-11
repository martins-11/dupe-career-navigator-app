'use client';

import React from 'react';
import type { MindmapGraphEdge, MindmapGraphNode } from '@/lib/mindmapApi';

type LayoutNode = MindmapGraphNode & { x: number; y: number; lane: LayoutLane };

export type MindmapViewport = { panX: number; panY: number; zoom: number };

type LayoutLane =
  | 'currentCircle'
  | 'leftPill'
  | 'leftCallout'
  | 'stepYellow'
  | 'rightCircle'
  | 'rightCallout'
  | 'rightPill'
  | 'bottomHidden';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
/**
 * Must match MindmapClient's default zoom for a coherent "Reset" experience.
 * (We keep a local constant here so the canvas is standalone.)
 */
const DEFAULT_ZOOM = 1.35;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normString(v: unknown) {
  return String(v ?? '').trim();
}

function numberOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function extractPercentRange(node: MindmapGraphNode): { left: string; right?: string } | null {
  // Best-effort: use any backend fields, but never fabricate placeholders.
  const raw =
    (node as any).score ??
    (node as any).matchPercent ??
    (node as any).match_percentage ??
    (node as any).similarity ??
    (node as any).compatibility ??
    (node as any).percent ??
    null;

  const n = numberOrNull(raw);
  if (n !== null) {
    const p = Math.round(n * (n <= 1 ? 100 : 1));
    return { left: `${p}%` };
  }

  const title = normString(node.title);
  const m = title.match(/(\d{1,3})\s*%(\s*-\s*(\d{1,3})\s*%)?/);
  if (m) {
    return m[3] ? { left: `${m[1]}%`, right: `${m[3]}%` } : { left: `${m[1]}%` };
  }

  return null;
}

function isLikelyStepNode(n: MindmapGraphNode): boolean {
  // Backend may provide an explicit type; keep heuristics as a fallback.
  const t = normString((n as any).type ?? (n as any).nodeType ?? (n as any).kind).toLowerCase();
  if (t.includes('step') || t.includes('milestone') || t.includes('transition') || t.includes('path')) return true;

  const title = normString(n.title).toLowerCase();
  // If the backend provides very short labels for stepping stones, treat as step.
  if (title && title.length <= 22 && (title.includes('skill') || title.includes('cert') || title.includes('project'))) return true;

  return false;
}

function computeLevels(params: { nodes: MindmapGraphNode[]; edges: MindmapGraphEdge[]; centerNodeId: string }): Map<string, number> {
  const nodes = params.nodes ?? [];
  const edges = params.edges ?? [];
  const centerId = params.centerNodeId;

  const byId = new Map<string, MindmapGraphNode>();
  for (const n of nodes) byId.set(n.id, n);

  const out = new Map<string, string[]>();
  for (const n of nodes) out.set(n.id, []);

  for (const e of edges) {
    const s = normString((e as any).source || (e as any).from);
    const t = normString((e as any).target || (e as any).to);
    if (!s || !t) continue;
    if (!byId.has(s) || !byId.has(t)) continue;
    out.get(s)?.push(t);
  }

  const root = byId.get(centerId) ?? nodes[0];
  const rootId = root?.id ?? centerId;

  const levelById = new Map<string, number>();
  const q: string[] = [];
  if (rootId) {
    levelById.set(rootId, 0);
    q.push(rootId);
  }

  while (q.length) {
    const cur = q.shift()!;
    const curLevel = levelById.get(cur) ?? 0;
    for (const nxt of out.get(cur) ?? []) {
      if (!levelById.has(nxt)) {
        levelById.set(nxt, curLevel + 1);
        q.push(nxt);
      }
    }
  }

  // Disconnected nodes: place them after connected component.
  const connectedMax = Math.max(0, ...Array.from(levelById.values()));
  let spill = connectedMax + 1;
  for (const n of nodes) {
    if (!levelById.has(n.id)) {
      levelById.set(n.id, spill);
      spill += 1;
    }
  }

  return levelById;
}

function nodeLane(params: { node: MindmapGraphNode; isCenter: boolean; isRightPrimary: boolean }): LayoutLane {
  if (params.isCenter) return 'currentCircle';

  // Steps must be the single-path nodes in the middle strip.
  if (isLikelyStepNode(params.node)) return 'stepYellow';

  const t = normString((params.node as any).type ?? (params.node as any).nodeType ?? (params.node as any).kind).toLowerCase();
  const title = normString(params.node.title).toLowerCase();

  // Left cluster pills: explicitly match the design's "Skills/Values/Experience" type labels when present.
  if (title.includes('skill') || title.includes('value') || title.includes('experience')) return 'leftPill';

  // Treat far/right primary as the big target circle.
  if (params.isRightPrimary || t.includes('target')) return 'rightCircle';

  // Generic callouts.
  if (t.includes('callout') || t.includes('detail') || t.includes('note')) return 'leftCallout';

  // Remaining nodes: bias them into callouts near left/right, but never create branches.
  // We'll place them as decorative callouts (still clickable) around clusters.
  if (title.length <= 20 && (title.includes('salary') || title.includes('timeline') || title.includes('match'))) return 'rightCallout';

  return 'leftCallout';
}

/**
 * Design-accurate layout (single-path, no sub-branches):
 * - Left cluster: current circle + three pills fanning above + 1-2 dark callouts below.
 * - Middle: CAREER TRANSITION PATHWAY dashed arrow + ~5 yellow step boxes in a single row.
 * - Right cluster: large target circle + one dark callout above + one green pill below.
 *
 * We keep the backend graph as the source of truth for labels/details, but render them in
 * the fixed design geometry.
 */
function computeLayout(params: {
  nodes: MindmapGraphNode[];
  edges: MindmapGraphEdge[];
  centerNodeId: string;
}): { layout: Map<string, LayoutNode>; order: { steps: string[]; leftPills: string[] } } {
  const nodes = params.nodes ?? [];
  const edges = params.edges ?? [];
  const centerId = params.centerNodeId;

  const byId = new Map<string, MindmapGraphNode>();
  for (const n of nodes) byId.set(n.id, n);

  const levelById = computeLevels({ nodes, edges, centerNodeId: centerId });

  const root = byId.get(centerId) ?? nodes[0];
  const rootId = root?.id ?? centerId;

  // Choose "right primary" as the farthest-level node, excluding the center.
  let rightPrimary: MindmapGraphNode | undefined;
  let bestLevel = -1;
  for (const n of nodes) {
    if (n.id === rootId) continue;
    const lvl = levelById.get(n.id) ?? 0;
    if (lvl > bestLevel) {
      bestLevel = lvl;
      rightPrimary = n;
    }
  }

  // Partition nodes.
  const leftPills: MindmapGraphNode[] = [];
  const stepCandidates: MindmapGraphNode[] = [];
  const others: MindmapGraphNode[] = [];

  for (const n of nodes) {
    if (n.id === rootId) continue;
    if (rightPrimary && n.id === rightPrimary.id) continue;

    if (isLikelyStepNode(n) || (levelById.get(n.id) ?? 0) >= 2) stepCandidates.push(n);
    else {
      const title = normString(n.title).toLowerCase();
      if (title.includes('skill') || title.includes('value') || title.includes('experience')) leftPills.push(n);
      else others.push(n);
    }
  }

  // Enforce exactly 3 left pills (design) by filling from "others" best-effort.
  const used = new Set<string>(leftPills.map((n) => n.id));
  const leftPillFill = others.filter((n) => !used.has(n.id)).slice(0, Math.max(0, 3 - leftPills.length));
  const leftPillsFinal = [...leftPills, ...leftPillFill].slice(0, 3);

  // Steps: choose up to 6 and keep stable order by level then id.
  const stepsFinal = [...stepCandidates]
    .sort((a, b) => {
      const la = levelById.get(a.id) ?? 0;
      const lb = levelById.get(b.id) ?? 0;
      if (la !== lb) return la - lb;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 6);

  // Remaining "others" become decorative callouts around clusters (still clickable).
  const remaining = others.filter((n) => !leftPillsFinal.some((p) => p.id === n.id));

  const layout = new Map<string, LayoutNode>();

  // Fixed world coordinates tuned to the screenshot.
  const leftX = -520;
  const rightX = 560;
  const centerY = 40;

  // Main strip y.
  const pathwayY = 40;

  // Left big circle (current).
  if (rootId) {
    layout.set(rootId, { ...(byId.get(rootId) as any), x: leftX, y: pathwayY, lane: 'currentCircle' });
  }

  // Left pills (fan/arc above-left).
  const pillX = leftX - 210;
  const pillYs = [-155, -105, -55];
  leftPillsFinal.forEach((n, i) => {
    layout.set(n.id, { ...(n as any), x: pillX, y: pillYs[i] ?? -90, lane: 'leftPill' });
  });

  // Left callouts (below-left).
  const leftCalloutXs = [leftX - 210, leftX - 70];
  const leftCalloutYs = [140, 195];
  remaining.slice(0, 2).forEach((n, i) => {
    layout.set(n.id, { ...(n as any), x: leftCalloutXs[i] ?? leftX - 120, y: leftCalloutYs[i] ?? 160, lane: 'leftCallout' });
  });

  // Steps (single horizontal path).
  const stepStartX = -120;
  const stepGap = 120;
  stepsFinal.forEach((n, i) => {
    layout.set(n.id, { ...(n as any), x: stepStartX + i * stepGap, y: pathwayY + 35, lane: 'stepYellow' });
  });

  // Right big circle.
  if (rightPrimary) {
    layout.set(rightPrimary.id, { ...(rightPrimary as any), x: rightX, y: pathwayY + 25, lane: 'rightCircle' });
  }

  // Right callout above (use next remaining if available).
  const rightCalloutNode = remaining.slice(2, 3)[0];
  if (rightCalloutNode) {
    layout.set(rightCalloutNode.id, { ...(rightCalloutNode as any), x: rightX - 40, y: -120, lane: 'rightCallout' });
  }

  // Right green pill below (use next remaining if available).
  const rightGreenNode = remaining.slice(3, 4)[0];
  if (rightGreenNode) {
    layout.set(rightGreenNode.id, { ...(rightGreenNode as any), x: rightX - 40, y: 155, lane: 'rightPill' });
  }

  // Any unpositioned nodes: hide from diagram (still exist in data; details panel works by selection).
  for (const n of nodes) {
    if (!layout.has(n.id)) {
      layout.set(n.id, { ...(n as any), x: 0, y: centerY + 520, lane: 'bottomHidden' });
    }
  }

  return {
    layout,
    order: {
      steps: stepsFinal.map((n) => n.id),
      leftPills: leftPillsFinal.map((n) => n.id),
    },
  };
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

  const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (usedWords < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
  }

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
   * This renderer matches design_for_mindmap.jpg:
   * - Single-path (no sub-branches) horizontal pathway.
   * - Left and right clusters with decorative callouts.
   *
   * Data is always sourced from backend/persona (node titles, details panel, etc).
   * We do not introduce placeholder labels.
   */
  const { nodes, edges, centerNodeId, selectedNodeId, dimmedNodeIds, viewport, onViewportChange, onNodeClick } = props;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const computed = React.useMemo(() => computeLayout({ nodes, edges, centerNodeId }), [nodes, edges, centerNodeId]);
  const layout = computed.layout;

  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const viewBox = React.useMemo(() => {
    // Keep a large viewBox so the diagram matches the screenshot spacing.
    const baseW = 1600;
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

      const baseW = 1600;
      const baseH = 760;

      const wAfter = baseW / nextZoom;
      const hAfter = baseH / nextZoom;

      const viewBoxAfterX = before.x - nx * wAfter;
      const viewBoxAfterY = before.y - ny * hAfter;

      const nextPanX = -wAfter / 2 - viewBoxAfterX;
      const nextPanY = -hAfter / 2 - viewBoxAfterY;

      onViewportChange({ panX: nextPanX, panY: nextPanY, zoom: nextZoom });
    },
    [onViewportChange, viewBox, viewport.zoom]
  );

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

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

  const stepNodes = computed.order.steps
    .map((id) => layout.get(id))
    .filter(Boolean)
    .sort((a, b) => (a!.x ?? 0) - (b!.x ?? 0)) as LayoutNode[];

  const leftCircle = layout.get(centerNodeId);
  const rightCircle = Array.from(layout.values()).find((n) => n.lane === 'rightCircle');

  const dottedLine = React.useMemo(() => {
    if (stepNodes.length === 0) return null;
    const y = stepNodes[0].y;
    // Span from just right of left circle to just left of right circle to match screenshot.
    const x1 = (leftCircle?.x ?? -520) + 95;
    const x2 = (rightCircle?.x ?? 560) - 120;
    return { x1, x2, y };
  }, [leftCircle?.x, rightCircle?.x, stepNodes]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col min-h-0" style={{ background: '#fff' }}>
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
          <marker id="mindmapArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mindmap-path-stroke)" />
          </marker>
        </defs>

        {/* Center label (top strip) */}
        <text
          x={0}
          y={-10}
          textAnchor="middle"
          fontSize={11}
          style={{ fill: 'var(--mindmap-text-muted)', fontWeight: 800, letterSpacing: '0.10em' }}
        >
          CAREER TRANSITION PATHWAY
        </text>

        {/* Middle dashed arrow (single path) */}
        {dottedLine ? (
          <line
            x1={dottedLine.x1}
            y1={dottedLine.y}
            x2={dottedLine.x2}
            y2={dottedLine.y}
            stroke="var(--mindmap-path-stroke)"
            strokeWidth={2}
            strokeDasharray="6 8"
            strokeLinecap="round"
            markerEnd="url(#mindmapArrow)"
            opacity={0.95}
          />
        ) : null}

        {/* Curved connectors from left pills to current circle (fan) */}
        {Array.from(layout.values())
          .filter((n) => n.lane === 'leftPill')
          .map((n) => {
            const root = layout.get(centerNodeId);
            if (!root) return null;

            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;
            const stroke = isDimmed ? 'rgba(44,140,147,0.25)' : 'var(--mindmap-teal-600)';

            const x1 = n.x + 70;
            const y1 = n.y;
            const x2 = root.x - 62;
            const y2 = root.y - 20;

            const cx = (x1 + x2) / 2;
            const cy = Math.min(y1, y2) - 110;

            return <path key={`arc-${n.id}`} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={2} />;
          })}

        {/* Curved connector to right callout */}
        {(() => {
          if (!rightCircle) return null;
          const rightCallout = Array.from(layout.values()).find((n) => n.lane === 'rightCallout');
          if (!rightCallout) return null;

          const x1 = rightCallout.x - 60;
          const y1 = rightCallout.y + 12;
          const x2 = rightCircle.x - 40;
          const y2 = rightCircle.y - 40;

          const cx = (x1 + x2) / 2;
          const cy = Math.min(y1, y2) - 70;

          return (
            <path
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              fill="none"
              stroke="var(--mindmap-teal-600)"
              strokeWidth={2}
              opacity={0.9}
            />
          );
        })()}

        {/* Nodes */}
        <g>
          {Array.from(layout.values()).map((n) => {
            const isCenter = n.id === centerNodeId;
            const isSelected = n.id === selectedNodeId;
            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;

            // Hidden nodes are not drawn to preserve "single path / no branches" fidelity.
            if (n.lane === 'bottomHidden') return null;

            const title = normString(n.title) || n.id;

            const stroke = isSelected ? 'rgba(13,148,136,0.9)' : 'rgba(0,0,0,0)';
            const strokeWidth = isSelected ? 3 : 0;
            const opacity = isDimmed ? 0.45 : 1;

            // Left big circle: show percent (if present) + title small (data-driven).
            if (isCenter || n.lane === 'currentCircle') {
              const r = 46;
              const pct = extractPercentRange(n);

              // We keep label text data-driven; if no percent exists, we don't add one.
              const smallLines = wrapLabel(title, 16, 2);

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onNodeClick(n.id);
                  }}
                  style={{ cursor: 'pointer', opacity }}
                  aria-label={`Role node: ${title}`}
                >
                  <circle r={r} fill="var(--mindmap-teal-700)" stroke={stroke} strokeWidth={strokeWidth} />
                  {pct ? (
                    <text fontSize={22} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 800 }} y={6}>
                      {pct.left}
                    </text>
                  ) : null}
                  <text
                    fontSize={11}
                    fill="#FFFFFF"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700, opacity: 0.95 }}
                    y={pct ? 26 : 12}
                  >
                    {smallLines.map((ln, i) => (
                      <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            if (n.lane === 'rightCircle') {
              const r = 46;
              const pct = extractPercentRange(n);
              const smallLines = wrapLabel(title, 18, 2);

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onNodeClick(n.id);
                  }}
                  style={{ cursor: 'pointer', opacity }}
                  aria-label={`Target role node: ${title}`}
                >
                  <circle r={r} fill="var(--mindmap-teal-700)" stroke={stroke} strokeWidth={strokeWidth} />
                  {pct ? (
                    <text fontSize={16} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 900 }} y={4}>
                      {pct.right ? `${pct.left} - ${pct.right}` : pct.left}
                    </text>
                  ) : null}
                  <text
                    fontSize={11}
                    fill="#FFFFFF"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700, opacity: 0.95 }}
                    y={pct ? 24 : 10}
                  >
                    {smallLines.map((ln, i) => (
                      <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            if (n.lane === 'stepYellow') {
              const w = 86;
              const h = 52;
              const rx = 10;
              const lines = wrapLabel(title, 14, 2);
              const lineHeight = 12;
              const labelStartY = lines.length === 1 ? 4 : -(lineHeight / 2) + 2;

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onNodeClick(n.id);
                  }}
                  style={{ cursor: 'pointer', opacity }}
                  aria-label={`Transition step: ${title}`}
                >
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="var(--mindmap-step-yellow)"
                    stroke="var(--mindmap-step-yellow-border)"
                    strokeWidth={1.5}
                  />
                  {isSelected ? (
                    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                  ) : null}
                  <text fontSize={11} fill="#1E2B32" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 800 }}>
                    {lines.map((ln, i) => (
                      <tspan key={i} x={0} y={labelStartY + i * lineHeight}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            if (n.lane === 'rightPill') {
              const w = 160;
              const h = 32;
              const rx = 999;
              const lines = wrapLabel(title, 22, 1);

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onNodeClick(n.id);
                  }}
                  style={{ cursor: 'pointer', opacity }}
                  aria-label={`Callout: ${title}`}
                >
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill="var(--mindmap-green-pill)" stroke={stroke} strokeWidth={strokeWidth} />
                  <text fontSize={11} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 800 }} y={4}>
                    {lines[0]}
                  </text>
                </g>
              );
            }

            // Dark callouts + left pills
            const isPill = n.lane === 'leftPill';
            const w = isPill ? 124 : 170;
            const h = isPill ? 34 : 54;
            const rx = isPill ? 999 : 14;
            const lines = wrapLabel(title, isPill ? 16 : 22, isPill ? 1 : 2);
            const lineHeight = isPill ? 12 : 13;
            const labelStartY = lines.length === 1 ? 4 : -(lineHeight / 2) + 2;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={(evt) => {
                  evt.stopPropagation();
                  onNodeClick(n.id);
                }}
                style={{ cursor: 'pointer', opacity }}
                aria-label={`Node: ${title}`}
              >
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={rx}
                  fill="var(--mindmap-charcoal)"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
                <text fontSize={12} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 800 }}>
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

        {/* Decorative nav chevrons (to match screenshot chrome) */}
        <g opacity={0.9} aria-hidden="true">
          <text x={720} y={-40} fontSize={18} style={{ fill: 'var(--mindmap-control-icon)', fontWeight: 900 }}>
            ▶
          </text>
          <text x={720} y={40} fontSize={18} style={{ fill: 'var(--mindmap-control-icon)', fontWeight: 900 }}>
            ◀
          </text>
          <text x={-720} y={160} fontSize={18} style={{ fill: 'var(--mindmap-control-icon)', fontWeight: 900 }}>
            ◀
          </text>
        </g>
      </svg>

      {/* Controls (kept functional; subtle like design) */}
      <div className="px-4 py-3 flex items-center justify-end gap-2 text-xs" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.10)', color: 'var(--mindmap-text-meta)' }}
          onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom / 1.12, MIN_ZOOM, MAX_ZOOM) })}
          disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) <= MIN_ZOOM + 1e-6}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>

        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.10)', color: 'var(--mindmap-text-meta)' }}
          onClick={() => onViewportChange({ ...viewport, zoom: clamp(viewport.zoom * 1.12, MIN_ZOOM, MAX_ZOOM) })}
          disabled={clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) >= MAX_ZOOM - 1e-6}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          className="px-2 py-1 rounded-md border bg-white"
          style={{ borderColor: 'rgba(0,0,0,0.10)', color: 'var(--mindmap-text-meta)' }}
          onClick={() => onViewportChange({ ...viewport, zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })}
          aria-label="Reset view"
          title="Reset view"
        >
          Reset
        </button>

        <div className="tabular-nums ml-2" style={{ color: 'var(--mindmap-text-meta)' }}>
          Zoom:{' '}
          <span className="font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>
            {Math.round(clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
