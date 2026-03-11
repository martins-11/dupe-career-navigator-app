'use client';

import React from 'react';
import type { MindmapGraphEdge, MindmapGraphNode } from '@/lib/mindmapApi';

type LayoutNode = MindmapGraphNode & { x: number; y: number; level: number };

export type MindmapViewport = { panX: number; panY: number; zoom: number };

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

function isLikelyStepNode(n: MindmapGraphNode): boolean {
  // Backend may provide an explicit type; keep heuristics as a fallback.
  const t = normString((n as any).type ?? (n as any).nodeType ?? (n as any).kind).toLowerCase();
  if (t.includes('step') || t.includes('milestone') || t.includes('transition')) return true;

  const title = normString(n.title).toLowerCase();
  // If the backend provides very short labels for stepping stones, treat as step.
  if (title && title.length <= 18 && (title.includes('skill') || title.includes('cert') || title.includes('project'))) return true;

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

/**
 * Layout tuned to match the screenshot design:
 * - Left cluster: 3 pill nodes (skills/values/experience) above a teal circle (current role)
 * - Center: dotted pathway with orange step nodes
 * - Right: target role pill + score badge (if present in data)
 *
 * Because the backend already returns a graph, we still compute a deterministic layout but
 * apply "design lanes" rather than generic columns.
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

  const levelById = computeLevels({ nodes, edges, centerNodeId: centerId });

  const root = byId.get(centerId) ?? nodes[0];
  const rootId = root?.id ?? centerId;

  // Classify nodes
  const steps: MindmapGraphNode[] = [];
  const level1: MindmapGraphNode[] = [];
  const rest: MindmapGraphNode[] = [];

  for (const n of nodes) {
    if (n.id === rootId) continue;
    const lvl = levelById.get(n.id) ?? 0;
    if (isLikelyStepNode(n) || lvl >= 2) steps.push(n);
    else if (lvl === 1) level1.push(n);
    else rest.push(n);
  }

  // Prefer specific left-bubble labels when present
  function findByKeyword(arr: MindmapGraphNode[], kw: string) {
    const k = kw.toLowerCase();
    return arr.find((n) => normString(n.title).toLowerCase().includes(k));
  }

  const skills = findByKeyword(level1, 'skill');
  const values = findByKeyword(level1, 'value');
  const experience = findByKeyword(level1, 'experience');

  const used = new Set<string>();
  for (const n of [skills, values, experience]) if (n) used.add(n.id);

  const remainingLeft = level1.filter((n) => !used.has(n.id));

  // Decide target node: best-effort choose the farthest level node (highest lvl)
  let target: MindmapGraphNode | undefined;
  let bestLevel = -1;
  for (const n of nodes) {
    const lvl = levelById.get(n.id) ?? 0;
    if (n.id === rootId) continue;
    if (lvl > bestLevel) {
      bestLevel = lvl;
      target = n;
    }
  }
  if (target && used.has(target.id)) target = remainingLeft[0] ?? steps[steps.length - 1];

  // Create coordinate map
  const map = new Map<string, LayoutNode>();

  // World coordinates (hand-tuned to match screenshot proportions)
  const leftX = -420;
  const centerX = 0;
  const rightX = 520;

  // Root circle in left cluster
  map.set(rootId, { ...(byId.get(rootId) as any), x: leftX, y: 30, level: 0 });

  // Left pill bubbles (stacked above)
  const leftBubbles = [skills, values, experience].filter(Boolean) as MindmapGraphNode[];
  const fallbackBubbles = remainingLeft.slice(0, Math.max(0, 3 - leftBubbles.length));
  const bubbles = [...leftBubbles, ...fallbackBubbles].slice(0, 3);

  const bubbleY = [-120, -70, -20];
  for (let i = 0; i < bubbles.length; i++) {
    const n = bubbles[i];
    map.set(n.id, { ...(n as any), x: leftX - 140, y: bubbleY[i] ?? -50 + i * 50, level: 1 });
  }

  // Orange steps row through the center
  const stepRow = steps.length ? steps : rest;
  const stepStartX = centerX - 140;
  const stepY = 70;
  const stepGap = 95;
  for (let i = 0; i < stepRow.length; i++) {
    const n = stepRow[i];
    map.set(n.id, { ...(n as any), x: stepStartX + i * stepGap, y: stepY, level: 2 });
  }

  // Put target on the right
  if (target) {
    map.set(target.id, { ...(target as any), x: rightX, y: 70, level: bestLevel });
  }

  // Place any unpositioned nodes in a soft stack below the steps (still selectable)
  let spillY = 170;
  for (const n of nodes) {
    if (!map.has(n.id)) {
      map.set(n.id, { ...(n as any), x: centerX - 180, y: spillY, level: levelById.get(n.id) ?? 99 });
      spillY += 65;
    }
  }

  return map;
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

function nodeVisualKind(params: { node: MindmapGraphNode; isCenter: boolean }) {
  if (params.isCenter) return 'currentCircle';
  if (isLikelyStepNode(params.node)) return 'stepOrange';
  // heuristic: treat "skills/values/experience" as pills
  const title = normString(params.node.title).toLowerCase();
  if (title.includes('skill') || title.includes('value') || title.includes('experience')) return 'leftPill';
  // far right node becomes target pill
  const t = normString((params.node as any).type ?? (params.node as any).nodeType).toLowerCase();
  if (t.includes('target')) return 'targetPill';
  return 'rolePill';
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
   * Updated visuals to match design_for_mindmap.jpg, while keeping all interactions unchanged.
   */
  const { nodes, edges, centerNodeId, selectedNodeId, dimmedNodeIds, viewport, onViewportChange, onNodeClick } = props;

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const layout = React.useMemo(() => computeLayout({ nodes, edges, centerNodeId }), [nodes, edges, centerNodeId]);

  const [isPanning, setIsPanning] = React.useState(false);
  const panStart = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const viewBox = React.useMemo(() => {
    const baseW = 1400;
    const baseH = 720;
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

      const baseW = 1400;
      const baseH = 720;

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

  // Determine step nodes for the pathway row (for the dotted arrow spanning across).
  const stepNodes = Array.from(layout.values())
    .filter((n) => nodeVisualKind({ node: n, isCenter: n.id === centerNodeId }) === 'stepOrange')
    .sort((a, b) => a.x - b.x);

  const dottedLine = React.useMemo(() => {
    if (stepNodes.length === 0) return null;
    const y = stepNodes[0].y;
    const x1 = stepNodes[0].x - 80;
    const x2 = stepNodes[stepNodes.length - 1].x + 120;
    return { x1, x2, y };
  }, [stepNodes]);

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden flex flex-col min-h-0"
      style={{ border: '1px solid rgba(0,0,0,0.10)', background: '#fff', boxShadow: 'var(--mindmap-shadow-soft)' }}
    >
      <div className="px-4 pt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-center" style={{ color: 'var(--mindmap-text-muted)' }}>
          CAREER TRANSITION PATHWAY
        </div>
      </div>

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

        {/* Dotted pathway line behind steps */}
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

        {/* Curved connector lines from left pills to current circle (design fan-in) */}
        {Array.from(layout.values())
          .filter((n) => {
            const kind = nodeVisualKind({ node: n, isCenter: n.id === centerNodeId });
            return kind === 'leftPill';
          })
          .map((n) => {
            const root = layout.get(centerNodeId);
            if (!root) return null;

            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;
            const stroke = isDimmed ? 'rgba(44,140,147,0.25)' : 'var(--mindmap-teal-600)';

            const x1 = n.x + 70;
            const y1 = n.y;
            const x2 = root.x - 55;
            const y2 = root.y;

            // Simple quadratic curve for "arc" look
            const cx = (x1 + x2) / 2;
            const cy = Math.min(y1, y2) - 90;

            return <path key={`arc-${n.id}`} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} fill="none" stroke={stroke} strokeWidth={2} />;
          })}

        {/* Edges (fallback) */}
        <g opacity={0.55}>
          {edges.map((e, idx) => {
            const sourceId = normString((e as any).source || (e as any).from);
            const targetId = normString((e as any).target || (e as any).to);
            if (!sourceId || !targetId) return null;

            const s = layout.get(sourceId);
            const t = layout.get(targetId);
            if (!s || !t) return null;

            // Don't duplicate the curved "fan" lines (those are derived)
            const sk = nodeVisualKind({ node: s, isCenter: s.id === centerNodeId });
            const tk = nodeVisualKind({ node: t, isCenter: t.id === centerNodeId });
            if (sk === 'leftPill' && tk === 'currentCircle') return null;

            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(sourceId) || dimmedNodeIds.has(targetId) : false;

            return (
              <line
                key={`${sourceId}-${targetId}-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={isDimmed ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.75)'}
                strokeWidth={2}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {Array.from(layout.values()).map((n) => {
            const isCenter = n.id === centerNodeId;
            const isSelected = n.id === selectedNodeId;
            const isDimmed = dimmedNodeIds ? dimmedNodeIds.has(n.id) : false;

            const kind = nodeVisualKind({ node: n, isCenter });

            const title = normString(n.title) || n.id;

            // Visual styles
            const stroke = isSelected ? 'rgba(13,148,136,0.9)' : 'rgba(0,0,0,0)';
            const strokeWidth = isSelected ? 3 : 0;

            const opacity = isDimmed ? 0.45 : 1;

            if (kind === 'currentCircle') {
              const r = 34;
              const lines = wrapLabel(title, 14, 2);
              const lineHeight = 13;
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
                  aria-label={`Role node: ${title}`}
                >
                  <circle r={r} fill="var(--mindmap-teal-700)" stroke={stroke} strokeWidth={strokeWidth} />
                  <text fontSize={12} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700 }}>
                    {lines.map((ln, i) => (
                      <tspan key={i} x={0} y={labelStartY + i * lineHeight}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            if (kind === 'stepOrange') {
              const w = 58;
              const h = 40;
              const rx = 10;
              const lines = wrapLabel(title, 12, 2);
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
                  aria-label={`Pathway step: ${title}`}
                >
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="var(--mindmap-step-orange)"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  <text fontSize={11} fill="#1E2B32" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700 }}>
                    {lines.map((ln, i) => (
                      <tspan key={i} x={0} y={labelStartY + i * lineHeight}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            // Default: pill node
            const pillW = kind === 'targetPill' ? 170 : kind === 'leftPill' ? 120 : 150;
            const pillH = kind === 'leftPill' ? 34 : 52;
            const rx = kind === 'leftPill' ? 999 : 16;

            const fill =
              kind === 'leftPill' || kind === 'targetPill' || kind === 'rolePill' ? 'var(--mindmap-teal-900)' : 'var(--mindmap-teal-900)';

            const lines = wrapLabel(title, kind === 'leftPill' ? 14 : 18, kind === 'leftPill' ? 1 : 2);
            const lineHeight = kind === 'leftPill' ? 12 : 13;
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
                  x={-pillW / 2}
                  y={-pillH / 2}
                  width={pillW}
                  height={pillH}
                  rx={rx}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
                <text fontSize={12} fill="#FFFFFF" textAnchor="middle" style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 700 }}>
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

      {/* Controls (kept functional; simplified visual to match design chrome) */}
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
          Zoom: <span className="font-semibold" style={{ color: 'var(--mindmap-text-muted)' }}>{Math.round(clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
