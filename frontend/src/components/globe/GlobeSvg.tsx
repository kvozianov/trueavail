import type { GeoProjection } from "d3-geo";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { SIZE, arcPath, placeLabels, project, type LabelInput } from "./geometry";
import type { GlobeFlow, GlobeNode } from "./model";

export interface GlobeSvgProps {
  proj: GeoProjection;
  paths: { sphere: string; graticule: string; land: string };
  nodes: GlobeNode[];
  arcs: GlobeFlow[];
  /** Rendered width in CSS px: keeps labels at 12.5 / 11 px whatever the globe size. */
  renderSize: number;
  particles?: boolean;
  hoverId?: string | null;
  essentialOnly?: boolean;
  label: string;
  onNodeEnter?: (id: string | null) => void;
  onNodeClick?: (id: string) => void;
  onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onKeyDown?: (e: KeyboardEvent<SVGSVGElement>) => void;
  interactive?: boolean;
}

/** The globe drawing itself: no state, so the server can render it as the static fallback. */
export function GlobeSvg({
  proj,
  paths,
  nodes,
  arcs,
  renderSize,
  particles = false,
  hoverId = null,
  essentialOnly = false,
  label,
  onNodeEnter,
  onNodeClick,
  onPointerDown,
  onKeyDown,
  interactive = false,
}: GlobeSvgProps) {
  const k = SIZE / Math.max(200, renderSize);
  const projected = nodes.map((n) => ({ n, p: project(proj, n.city.lon, n.city.lat) }));
  const visible = projected.filter((v) => v.p.visible);
  const gapIds = new Set(nodes.filter((n) => n.gap).map((n) => n.id));

  // Essential labels on small globes: gap accounts plus nodes that sit far from every other node.
  const isolated = (id: string) => {
    const me = visible.find((v) => v.n.id === id)!.p;
    return visible.every((v) => v.n.id === id || Math.hypot(v.p.x - me.x, v.p.y - me.y) > 60 * k);
  };
  const inputs: LabelInput[] = visible
    .filter((v) => !essentialOnly || gapIds.has(v.n.id) || v.n.id === hoverId || isolated(v.n.id))
    .map((v) => ({
      id: v.n.id,
      x: v.p.x,
      y: v.p.y,
      priority: gapIds.has(v.n.id) ? 0 : v.n.id === hoverId ? 1 : 2,
      lines: [
        { text: v.n.city.name, kind: "city" as const },
        { text: v.n.account, kind: "acc" as const },
        ...(v.n.gap ? [{ text: v.n.gap, kind: "gap" as const }] : []),
        ...(v.n.id === hoverId ? [{ text: v.n.stat, kind: "acc" as const }] : []),
      ],
    }));
  const labels = placeLabels(
    inputs,
    k,
    visible.map((v) => v.p),
  );
  const arcDs = arcs.map((a) => ({ a, d: arcPath(proj, a.from, a.to) })).filter((x): x is { a: GlobeFlow; d: string } => !!x.d);
  const ends = arcs.flatMap((a) => [a.from, a.to]).filter((c) => !nodes.some((n) => n.city.name === c.name));
  const uniqueEnds = [...new Map(ends.map((c) => [c.name, c])).values()].map((c) => ({ c, p: project(proj, c.lon, c.lat) })).filter((e) => e.p.visible);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={label}
      tabIndex={interactive ? 0 : undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`block overflow-visible ${interactive ? "cursor-grab touch-pan-y active:cursor-grabbing focus-visible:outline-none" : ""}`}
    >
      <defs>
        <radialGradient id="g-sphere" cx="38%" cy="30%" r="75%">
          <stop offset="0%" style={{ stopColor: "var(--globe-ocean-1)" }} />
          <stop offset="100%" style={{ stopColor: "var(--globe-ocean-2)" }} />
        </radialGradient>
      </defs>
      <path d={paths.sphere} fill="url(#g-sphere)" />
      <path d={paths.graticule} fill="none" stroke="var(--globe-graticule)" strokeWidth={0.7} />
      <path d={paths.land} fill="var(--globe-land)" stroke="var(--globe-border)" strokeWidth={0.6} strokeLinejoin="round" />
      <path d={paths.sphere} fill="none" stroke="var(--hairline-2)" strokeWidth={1} />
      <g>
        {arcDs.map(({ a, d }) => (
          <path key={a.id} d={d} fill="none" stroke="var(--accent)" strokeOpacity={0.55} strokeWidth={1.3 * k} strokeDasharray={`${2.5 * k} ${4 * k}`}>
            <title>{a.title}</title>
          </path>
        ))}
        {uniqueEnds.map(({ c, p }) => (
          <circle key={c.name} cx={p.x} cy={p.y} r={2.4 * k} fill="var(--bg)" stroke="var(--accent)" strokeOpacity={0.6} strokeWidth={1.2 * k}>
            <title>{`${c.name} (illustrative counterparty)`}</title>
          </circle>
        ))}
        {particles &&
          arcDs.map(({ a, d }, i) => (
            <circle key={`p-${a.id}`} r={2.5 * k} fill="var(--accent)">
              <animateMotion dur="4.5s" begin={`-${((i * 0.65) % 4.5).toFixed(2)}s`} repeatCount="indefinite" path={d} />
            </circle>
          ))}
      </g>
      {labels.map((l) => {
        const node = visible.find((v) => v.n.id === l.id)!;
        let y = l.ty;
        return (
          <g key={`l-${l.id}`} pointerEvents="none">
            {l.lx != null && l.ly != null && <line x1={node.p.x} y1={node.p.y} x2={l.lx} y2={l.ly} stroke="var(--ink-4)" strokeWidth={0.8 * k} />}
            {l.lines.map((line, i) => {
              const fs = line.kind === "city" ? 12.5 : 11;
              if (i > 0) y += (line.kind === "city" ? 15 : 13) * k;
              return (
                <text
                  key={i}
                  x={l.tx}
                  y={y}
                  textAnchor={l.anchor}
                  style={{ fontSize: fs * k }}
                  className={
                    line.kind === "city"
                      ? `font-sans font-semibold ${gapIds.has(l.id) ? "fill-gap" : "fill-ink"}`
                      : line.kind === "gap"
                        ? "fill-gap font-mono"
                        : "fill-ink-3 font-mono"
                  }
                  paintOrder="stroke"
                  stroke="var(--bg)"
                  strokeWidth={3 * k}
                  strokeOpacity={0.85}
                >
                  {line.text}
                </text>
              );
            })}
          </g>
        );
      })}
      {visible.map(({ n, p }) => {
        const gap = gapIds.has(n.id);
        return (
          <g
            key={n.id}
            role={interactive ? "link" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `${n.city.name}: ${n.account}${n.gap ? `, ${n.gap}` : ""}. Open in the forecast.` : undefined}
            onPointerEnter={onNodeEnter ? () => onNodeEnter(n.id) : undefined}
            onPointerLeave={onNodeEnter ? () => onNodeEnter(null) : undefined}
            onFocus={onNodeEnter ? () => onNodeEnter(n.id) : undefined}
            onBlur={onNodeEnter ? () => onNodeEnter(null) : undefined}
            onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
            onKeyDown={onNodeClick ? (e) => (e.key === "Enter" || e.key === " ") && onNodeClick(n.id) : undefined}
            onPointerDown={interactive ? (e) => e.stopPropagation() : undefined}
            className={interactive ? "cursor-pointer outline-none [&:focus-visible>circle.ring]:opacity-100" : undefined}
          >
            {interactive && <circle cx={p.x} cy={p.y} r={14 * k} fill="transparent" />}
            {interactive && <circle className="ring opacity-0" cx={p.x} cy={p.y} r={10 * k} fill="none" stroke="var(--accent)" strokeWidth={2 * k} />}
            {gap && (
              <>
                <circle className="g-pulse" cx={p.x} cy={p.y} r={7} />
                <circle className="g-pulse g-pulse-2" cx={p.x} cy={p.y} r={7} />
              </>
            )}
            <circle cx={p.x} cy={p.y} r={(gap ? 5.5 : 4.5) * k} fill={gap ? "var(--gap-fill)" : "var(--accent)"} stroke="var(--bg)" strokeWidth={2 * k} />
          </g>
        );
      })}
    </svg>
  );
}
