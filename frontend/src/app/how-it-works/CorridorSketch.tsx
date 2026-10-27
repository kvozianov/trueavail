/**
 * Static SVG of one account's real forecast corridor (from the precomputed demo JSON), drawn on the
 * server so the explainer page ships no chart library.
 */
import { axisNumber, dayMonth } from "@/lib/format";
import type { ForecastPoint, HistoryRow } from "@/lib/types";

const M = { top: 14, right: 12, bottom: 28, left: 46 };

/** Round tick values (1, 2, 2.5 or 5 × 10^k) inside [lo, hi]. */
function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => st >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.abs(t) < step / 1e6 ? 0 : t);
  return out;
}

type Props = { points: ForecastPoint[]; history: HistoryRow[]; currency: string };

/** Two drawings so the labels stay legible: a wide one from sm up, a narrow one on phones. */
export function CorridorSketch(props: Props) {
  return (
    <>
      <Sketch {...props} width={640} height={260} id="wide" className="hidden h-auto w-full sm:block" />
      <Sketch {...props} width={340} height={230} id="narrow" className="block h-auto w-full sm:hidden" />
    </>
  );
}

function Sketch({
  points,
  history,
  currency,
  width: W,
  height: H,
  id,
  className,
}: Props & { width: number; height: number; id: string; className: string }) {
  const hist = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  const anchor = hist[hist.length - 1];
  const dates = [...hist.map((h) => h.date), ...points.map((p) => p.date)];
  const values = [
    ...hist.map((h) => h.ending_balance),
    ...points.flatMap((p) => [p.balance_p05, p.balance_p95, p.required_buffer]),
  ];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.06;
  const y0 = lo - pad;
  const y1 = hi + pad;
  const x = (i: number) => M.left + (i / (dates.length - 1)) * (W - M.left - M.right);
  const y = (v: number) => M.top + (1 - (v - y0) / (y1 - y0)) * (H - M.top - M.bottom);
  const off = hist.length - 1; // forecast index offset: the fan opens at the last actual day

  const fan = [
    { i: off, lo: anchor.ending_balance, mid: anchor.ending_balance, hi: anchor.ending_balance },
    ...points.map((p, k) => ({ i: off + 1 + k, lo: p.balance_p05, mid: p.balance_p50, hi: p.balance_p95 })),
  ];
  const band =
    fan.map((f, k) => `${k ? "L" : "M"}${x(f.i).toFixed(1)} ${y(f.hi).toFixed(1)}`).join(" ") +
    " " +
    [...fan]
      .reverse()
      .map((f) => `L${x(f.i).toFixed(1)} ${y(f.lo).toFixed(1)}`)
      .join(" ") +
    " Z";
  const line = (pts: { i: number; v: number }[]) =>
    pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const buffer = points[0]?.required_buffer ?? 0;
  const ticks = niceTicks(y0, y1, 5);
  const breaches = points.map((p, k) => ({ p, i: off + 1 + k })).filter(({ p }) => p.breach);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-labelledby={`corridor-title-${id}`}>
      <title id={`corridor-title-${id}`}>
        Last 14 days of actual balance and the 14-day P5 to P95 forecast corridor with the required buffer line.
      </title>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
          <text x={M.left - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="var(--ink-muted)">
            {axisNumber(t)}
          </text>
        </g>
      ))}
      {breaches.map(({ i }) => (
        <rect
          key={i}
          x={x(i - 0.5)}
          width={x(1) - x(0)}
          y={M.top}
          height={H - M.top - M.bottom}
          fill="var(--critical-bg)"
        />
      ))}
      <path d={band} fill="var(--series-1-band)" />
      <path d={line(fan.map((f) => ({ i: f.i, v: f.mid })))} fill="none" stroke="var(--series-1)" strokeWidth={2} />
      <path
        d={line(fan.map((f) => ({ i: f.i, v: f.lo })))}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <path
        d={line(hist.map((h, k) => ({ i: k, v: h.ending_balance })))}
        fill="none"
        stroke="var(--actual)"
        strokeWidth={1.6}
      />
      <line
        x1={M.left}
        x2={W - M.right}
        y1={y(buffer)}
        y2={y(buffer)}
        stroke="var(--critical)"
        strokeWidth={1.4}
        strokeDasharray="6 4"
      />
      <text x={M.left + 6} y={y(buffer) - 6} fontSize={11} fill="var(--critical-ink)">
        required buffer {axisNumber(buffer)} {currency}
      </text>
      <line x1={x(off)} x2={x(off)} y1={M.top} y2={H - M.bottom} stroke="var(--axis)" strokeDasharray="2 3" />
      <text x={x(off) + 4} y={M.top + 10} fontSize={11} fill="var(--ink-muted)">
        forecast →
      </text>
      {[0, off, dates.length - 1].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          fontSize={11}
          textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"}
          fill="var(--ink-muted)"
        >
          {dayMonth(dates[i])}
        </text>
      ))}
    </svg>
  );
}
