import type { Stage } from "./stages";

export const PIPE_W = 560;
export const PIPE_H = 664;
const BOX_H = 46;
const SINGLE = { x: 130, w: 300 };
const TRIPLE = [33, 205, 377].map((x) => ({ x, w: 150 }));
const ROW_Y = [8, 76, 144, 226, 308, 376, 458, 540, 608];

type State = "upcoming" | "done" | "active";

function boxesFor(i: number, stage: Stage) {
  const y = ROW_Y[i];
  return stage.boxes.length === 3 ? TRIPLE.map((b, k) => ({ ...b, y, ...stage.boxes[k] })) : [{ ...SINGLE, y, ...stage.boxes[0] }];
}

/** Edge paths between consecutive stages (bracket edges into / out of the split stages). */
export function edgePaths(stages: Stage[]): string[][] {
  const cx = SINGLE.x + SINGLE.w / 2;
  return stages.slice(1).map((s, k) => {
    const from = stages[k];
    const i = k + 1;
    const y0 = ROW_Y[i - 1] + BOX_H;
    const y1 = ROW_Y[i];
    const mid = y0 + (y1 - y0) / 2;
    if (s.boxes.length === 3) return TRIPLE.map((b) => `M${cx} ${y0} L${cx} ${mid} L${b.x + b.w / 2} ${mid} L${b.x + b.w / 2} ${y1}`);
    if (from.boxes.length === 3) return TRIPLE.map((b) => `M${b.x + b.w / 2} ${y0} L${b.x + b.w / 2} ${mid} L${cx} ${mid} L${cx} ${y1}`);
    return [`M${cx} ${y0} L${cx} ${y1}`];
  });
}

/** The nine-stage pipeline diagram. `active` lights a stage; `particles` animates the edges into it. */
export function PipelineSvg({
  stages,
  active,
  particles = false,
  allDone = false,
  className = "",
  title = "Pipeline diagram",
}: {
  stages: Stage[];
  active: number;
  particles?: boolean;
  allDone?: boolean;
  className?: string;
  title?: string;
}) {
  const edges = edgePaths(stages);
  const state = (i: number): State => (i === active ? "active" : allDone || i < active ? "done" : "upcoming");
  return (
    <svg viewBox={`0 0 ${PIPE_W} ${PIPE_H}`} className={`block h-auto w-full ${className}`} role="img" aria-label={title}>
      {edges.map((paths, k) => {
        const into = k + 1;
        const st = into === active ? "active" : allDone || into < active ? "done" : "upcoming";
        const stroke = st === "active" ? "var(--accent)" : st === "done" ? "var(--ink-4)" : "var(--hairline-2)";
        return (
          <g key={k}>
            {paths.map((d, j) => (
              <path key={j} d={d} fill="none" stroke={stroke} strokeWidth={st === "active" ? 1.5 : 1} />
            ))}
            {particles &&
              st === "active" &&
              paths.map((d, j) => (
                <circle key={`p${j}`} r={3} fill="var(--accent)">
                  <animateMotion dur={`${1.2 + j * 0.2}s`} repeatCount="indefinite" path={d} />
                </circle>
              ))}
          </g>
        );
      })}
      {stages.map((s, i) => {
        const st = state(i);
        return boxesFor(i, s).map((b, k) => (
          <g key={`${s.id}-${k}`}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={BOX_H}
              rx={10}
              fill={st === "active" ? "var(--accent-tint)" : "var(--bg)"}
              stroke={st === "active" ? "var(--accent)" : st === "done" ? "var(--ink-4)" : "var(--hairline-2)"}
              strokeWidth={st === "active" ? 1.5 : 1}
            />
            {k === 0 && (
              <text x={b.x + 14} y={b.y + 20} className={`font-mono text-[11px] ${st === "active" ? "fill-accent-ink" : "fill-ink-3"}`}>
                {s.n}
              </text>
            )}
            <text x={b.x + (k === 0 ? 40 : 14)} y={b.y + 20} className={`font-sans text-[13px] font-semibold ${st === "active" ? "fill-accent-ink" : st === "done" ? "fill-ink" : "fill-ink-3"}`}>
              {b.title}
            </text>
            <text x={b.x + (k === 0 ? 40 : 14)} y={b.y + 35} className={`font-mono text-[10.5px] ${st === "active" ? "fill-accent-ink" : "fill-ink-3"}`}>
              {b.metric}
            </text>
          </g>
        ));
      })}
    </svg>
  );
}
