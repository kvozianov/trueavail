/**
 * Architecture diagram as inline SVG (server-rendered, no JS). One node list, two layouts:
 * horizontal from md up, vertical on phones. Colors come from the CSS tokens, so it follows light/dark.
 */

type Node = { id: string; title: string; lines: string[]; kind?: "stage" | "output" | "infra" };
type Placed = Node & { x: number; y: number; w: number; h: number };
type Edge = { from: string; to: string; label?: string };

const NODES: Node[] = [
  {
    id: "data",
    title: "Data",
    lines: ["daily balance per account", "+ known future payments", "(synthetic or your CSV)"],
  },
  {
    id: "features",
    title: "Features",
    lines: ["calendar, holidays", "lags of 1, 2, 7 days", "7-day mean, volatility", "EWMA, settlement dates"],
  },
  {
    id: "model",
    title: "Quantile ensemble",
    lines: ["LightGBM + gradient", "boosting + EWMA", "→ daily net flow", "P5 / P50 / P95"],
  },
  {
    id: "corridor",
    title: "Balance corridor",
    lines: ["start balance", "+ scheduled payments", "+ cumulated quantiles", "= 14-day P5/P50/P95"],
  },
  { id: "alerts", title: "Alerts", lines: ["P5 below", "the buffer"], kind: "output" },
  { id: "whatif", title: "What-if", lines: ["edit payments,", "re-run"], kind: "output" },
  { id: "backtest", title: "Backtest", lines: ["score vs", "naive baseline"], kind: "output" },
  { id: "pg", title: "PostgreSQL", lines: ["datasets, payments,", "forecast runs"], kind: "infra" },
  { id: "api", title: "FastAPI backend", lines: ["Python: the pipeline", "above, JSON API"], kind: "infra" },
  { id: "web", title: "Next.js dashboard", lines: ["charts, alerts,", "what-if, backtest"], kind: "infra" },
];

const EDGES: Edge[] = [
  { from: "data", to: "features" },
  { from: "features", to: "model" },
  { from: "model", to: "corridor" },
  { from: "corridor", to: "alerts" },
  { from: "corridor", to: "whatif" },
  { from: "corridor", to: "backtest" },
  { from: "pg", to: "api" },
  { from: "api", to: "web" },
];

const LINE = 15;
const PAD_TOP = 24;

function nodeHeight(n: Node) {
  return PAD_TOP + 8 + n.lines.length * LINE;
}

function place(layout: "wide" | "narrow"): {
  nodes: Placed[];
  width: number;
  height: number;
  group: { x: number; y: number; w: number; h: number };
} {
  const byId = new Map(NODES.map((n) => [n.id, n]));
  const out: Placed[] = [];
  const put = (id: string, x: number, y: number, w: number, h?: number) => {
    const n = byId.get(id)!;
    out.push({ ...n, x, y, w, h: h ?? nodeHeight(n) });
  };
  if (layout === "wide") {
    const stageW = 166;
    const gap = 18;
    ["data", "features", "model", "corridor"].forEach((id, i) => put(id, 2 + i * (stageW + gap), 6, stageW, 104));
    ["alerts", "whatif", "backtest"].forEach((id, i) => put(id, 150 + i * 190, 150, 150, 58));
    const iy = 278;
    put("pg", 30, iy, 196, 58);
    put("api", 262, iy, 196, 58);
    put("web", 494, iy, 196, 58);
    return { nodes: out, width: 724, height: 352, group: { x: 2, y: 246, w: 718, h: 102 } };
  }
  const w = 300;
  let y = 10;
  for (const id of ["data", "features", "model", "corridor"]) {
    const n = byId.get(id)!;
    put(id, 20, y, w);
    y += nodeHeight(n) + 26;
  }
  ["alerts", "whatif", "backtest"].forEach((id, i) => put(id, 20 + i * 102, y, 96, 58));
  y += 58 + 60;
  const groupY = y - 30;
  for (const id of ["pg", "api", "web"]) {
    put(id, 40, y, 260, 58);
    y += 58 + 24;
  }
  return { nodes: out, width: 340, height: y + 4, group: { x: 20, y: groupY, w: 300, h: y - groupY - 10 } };
}

function edgePath(a: Placed, b: Placed): string {
  if (b.kind === "output") {
    // From the bottom of the corridor box down to the top of each output.
    const x1 = a.x + a.w / 2;
    const y1 = a.y + a.h;
    const x2 = b.x + b.w / 2;
    const y2 = b.y - 6;
    return `M${x1} ${y1} C${x1} ${y1 + 22} ${x2} ${y2 - 22} ${x2} ${y2}`;
  }
  if (Math.abs(a.y - b.y) < 1) return `M${a.x + a.w} ${a.y + a.h / 2} L${b.x - 6} ${b.y + b.h / 2}`;
  return `M${a.x + a.w / 2} ${a.y + a.h} L${b.x + b.w / 2} ${b.y - 6}`;
}

function Diagram({ layout, className }: { layout: "wide" | "narrow"; className: string }) {
  const { nodes, width, height, group } = place(layout);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const marker = `arrow-${layout}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-labelledby={`pipeline-title-${layout}`}
    >
      <title id={`pipeline-title-${layout}`}>
        Pipeline: data, features, quantile ensemble, balance corridor, then alerts, what-if and backtest. Runs as
        PostgreSQL, a FastAPI backend and a Next.js dashboard under docker compose.
      </title>
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-muted)" />
        </marker>
      </defs>
      <rect
        x={group.x}
        y={group.y}
        width={group.w}
        height={group.h}
        rx={10}
        fill="none"
        stroke="var(--axis)"
        strokeDasharray="5 4"
      />
      <text x={group.x + 12} y={group.y + 18} fontSize={12} fill="var(--ink-muted)" fontFamily="var(--font-mono)">
        docker compose up
      </text>
      {EDGES.map((e) => {
        const a = byId.get(e.from)!;
        const b = byId.get(e.to)!;
        return (
          <path
            key={`${e.from}-${e.to}`}
            d={edgePath(a, b)}
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth={1.4}
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      {nodes.map((n) => {
        const accent = n.kind === "output" ? "var(--series-1)" : n.kind === "infra" ? "var(--axis)" : "var(--border)";
        const fill =
          n.kind === "output" ? "var(--series-1-band)" : n.kind === "infra" ? "var(--surface-2)" : "var(--surface)";
        const center = n.kind === "output";
        const tx = center ? n.x + n.w / 2 : n.x + 12;
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={fill} stroke={accent} strokeWidth={1.2} />
            <text
              x={tx}
              y={n.y + 19}
              fontSize={13}
              fontWeight={600}
              fill="var(--ink)"
              textAnchor={center ? "middle" : "start"}
            >
              {n.title}
            </text>
            {n.lines.map((l, i) => (
              <text
                key={i}
                x={tx}
                y={n.y + PAD_TOP + (center ? 11 : 12) + i * LINE}
                fontSize={11.5}
                fill="var(--ink-2)"
                textAnchor={center ? "middle" : "start"}
              >
                {l}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function PipelineDiagram() {
  return (
    <figure className="rounded-lg border border-line bg-surface p-3 sm:p-4">
      <Diagram layout="wide" className="hidden h-auto w-full md:block" />
      <Diagram layout="narrow" className="mx-auto block h-auto w-full max-w-sm md:hidden" />
      <figcaption className="mt-2 text-xs text-ink-muted">
        Top: the forecasting pipeline inside the backend. Bottom: the three services that{" "}
        <code className="font-mono">docker compose up</code> starts. The hosted demo serves the backend&apos;s output as
        static JSON instead of calling it live.
      </figcaption>
    </figure>
  );
}
