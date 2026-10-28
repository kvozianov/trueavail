"use client";

import { animate, m, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { bandPath, linePath, linear, niceTicks } from "@/components/charts/scales";
import { Bars } from "@/components/charts/Bars";
import { Tag } from "@/components/ui";
import { COMPONENT_COLOR, COMPONENT_SHORT, GROUP_COLOR, runs } from "@/lib/derive";
import { axisTick, compact, dayMonth, money, num, shortAccount, shortDate } from "@/lib/format";
import type { Account, ExplainResponse, HistoryRow } from "@/lib/types";
import { ML_COMPONENTS, strips, type RoomFacts } from "./facts";

type Ease = [number, number, number, number];
const EASE: Ease = [0.2, 0, 0, 1];
const DRAW: Ease = [0.65, 0, 0.35, 1];

/** Counter that ticks to `to` over `dur` s; instant with reduced motion. */
function Count({ to, dur, delay = 0, suffix = "" }: { to: number; dur: number; delay?: number; suffix?: string }) {
  const ref = useRef<SVGTSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = `${num(to)}${suffix}`;
      return;
    }
    const c = animate(0, to, { duration: dur, delay, ease: "linear", onUpdate: (v) => (el.textContent = `${num(v)}${suffix}`) });
    return () => c.stop();
  }, [to, dur, delay, suffix, reduce]);
  return <tspan ref={ref}>{`${num(to)}${suffix}`}</tspan>;
}

/* ---------------------------------------------------------------- 01 observations */
export function ObservationsFrame({
  width,
  height,
  history,
  accounts,
  explain,
}: {
  width: number;
  height: number;
  history: HistoryRow[];
  accounts: Account[];
  explain: ExplainResponse;
}) {
  const reduce = useReducedMotion();
  const anomalies = new Map(explain.series.map((s) => [s.account_id, new Set(s.anomaly_dates ?? [])]));
  const rows = strips(history, accounts, anomalies);
  const labelW = 14 + Math.max(...rows.map((r) => shortAccount(r.account).length)) * 6.8 + 12;
  const top = 36;
  const bottom = 14;
  const x0 = labelW;
  const x1 = width - 14;
  const stripH = (height - top - bottom) / Math.max(1, rows.length);
  const n = Math.max(...rows.map((r) => r.bars.length), 1);
  const bw = (x1 - x0) / n;
  const total = explain.training.history_rows;
  const dur = reduce ? 0 : 1.2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="block">
      <defs>
        <clipPath id="obs-clip">
          <m.rect x={0} y={0} height={height} initial={reduce ? false : { width: x0 }} animate={{ width }} transition={{ duration: dur, ease: "linear" }} />
        </clipPath>
      </defs>
      <text x={width - 14} y={22} textAnchor="end" className="fill-ink-2 font-mono text-[12px]">
        <Count to={total} dur={dur} /> / {num(total)}
      </text>
      {width >= 480 && (
        <text x={14} y={22} className="fill-ink-3 font-mono text-[11px] uppercase tracking-[0.1em]">
          daily balances, normalised per account
        </text>
      )}
      {rows.map((r, k) => {
        const yTop = top + k * stripH;
        const hMax = stripH - 12;
        return (
          <g key={r.account.account_id}>
            <text x={14} y={yTop + stripH / 2 + 4} className="fill-ink-3 font-mono text-[11px]">
              {shortAccount(r.account)}
            </text>
            <g clipPath="url(#obs-clip)">
              {r.bars.map((b, i) => {
                const h = 3 + b.v * (hMax - 3);
                return (
                  <m.rect
                    key={b.date}
                    x={x0 + i * bw + bw * 0.2}
                    y={yTop + stripH - 6 - h}
                    width={Math.max(1, bw * 0.6)}
                    height={h}
                    rx={0.6}
                    initial={reduce || !b.anomaly ? false : { fill: "var(--ink-4)" }}
                    animate={{ fill: b.anomaly ? "var(--warn-fill)" : "var(--ink-4)", opacity: b.anomaly ? 1 : 0.75 }}
                    transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : dur }}
                    fill={b.anomaly ? "var(--warn-fill)" : "var(--ink-4)"}
                  >
                    {b.anomaly && <title>{`${r.account.label} ${b.date}: anomaly (MAD score), excluded from training`}</title>}
                  </m.rect>
                );
              })}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------- 02 features */
export function FeaturesFrame({ explain, facts }: { explain: ExplainResponse; facts: RoomFacts }) {
  const reduce = useReducedMotion();
  const groupOf = new Map(explain.feature_importance.features.map((f) => [f.feature, f.group]));
  const cols = explain.training.feature_columns;
  const groups: { id: string; title: string; items: string[] }[] = [
    { id: "calendar", title: "Calendar", items: cols.filter((c) => groupOf.get(c) === "calendar") },
    { id: "history", title: `Recent history (${shortAccount(facts.account)}, ${dayMonth(explain.as_of)})`, items: cols.filter((c) => groupOf.get(c) === "history") },
    { id: "scheduled", title: "Scheduled", items: cols.filter((c) => groupOf.get(c) === "scheduled") },
  ];
  const tint: Record<string, string> = {
    calendar: "bg-[color-mix(in_srgb,var(--c-calendar)_12%,transparent)] text-ink",
    history: "bg-accent-tint text-accent-ink",
    scheduled: "bg-[color-mix(in_srgb,var(--c-scheduled)_13%,transparent)] text-ink",
  };
  let k = 0;
  const totalHistory = groups[0].items.length + groups[1].items.length;
  return (
    <div className="h-full overflow-hidden px-4 pb-3 pt-4 sm:px-5">
      <p className="mb-2 text-right font-mono text-[12px] text-ink-2">{facts.features} features</p>
      <div className="space-y-2.5">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="eyebrow mb-1.5 rounded-1 bg-bg-2 px-2 py-1 !text-[10.5px]">{g.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((c) => {
                const i = k++;
                const v = facts.series.latest_features[c];
                const late = g.id === "scheduled";
                return (
                  <m.span
                    key={c}
                    title={explain.training.feature_labels[c]}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: late ? 0.6 : 1, y: 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.32, delay: late ? totalHistory * 0.03 + 0.15 + (i - totalHistory) * 0.03 : i * 0.03, ease: EASE }}
                    className={`rounded-1 px-1.5 py-0.5 font-mono text-[11px] leading-[1.5] ${tint[g.id]}`}
                  >
                    {c}
                    {g.id === "history" && v != null ? ` = ${compact(v)}` : ""}
                  </m.span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 03–06 corridor */
export function ChartFrame({ width, height, phase, facts }: { width: number; height: number; phase: 2 | 3 | 4 | 5; facts: RoomFacts }) {
  const reduce = useReducedMotion();
  const s = facts.series;
  const ccy = s.currency;
  const strip = 64;
  const H = height - strip;
  const M = { top: 30, right: 18, bottom: 24, left: 46 };
  const comps = ML_COMPONENTS.filter((c) => s.components[c]);
  const all = [s.start_balance, s.required_buffer, 0];
  for (const c of [...comps, "blend" as const]) {
    const b = s.components[c]!.balance;
    all.push(...b.p05, ...b.p95);
  }
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.06;
  const ticks = niceTicks(lo - pad, hi + pad, 4);
  const y = linear(Math.min(lo - pad, ticks[0]), Math.max(hi + pad, ticks[ticks.length - 1]), H - M.bottom, M.top);
  const n = s.dates.length;
  const x = linear(0, n, M.left, width - M.right);
  const xs = Array.from({ length: n + 1 }, (_, i) => x(i));
  const withStart = (v: number[]) => [s.start_balance, ...v].map(y);
  const T = (dur: number, delay = 0, ease: Ease = EASE) => (reduce ? { duration: 0 } : { duration: dur, delay, ease });
  const blend = s.components.blend!.balance;
  const bP05 = withStart(blend.p05);
  const bP50 = withStart(blend.p50);
  const bP95 = withStart(blend.p95);
  const gapRuns = runs(blend.p05.map((v) => v < s.required_buffer));
  const step = xs[1] - xs[0];
  const yBuf = y(s.required_buffer);
  const fg = facts.firstGap;
  const dotI = fg ? fg.i : facts.minP05.i;
  const dotX = x(dotI + 1);
  const dotY = y(blend.p05[dotI]);
  const markers = facts.flows.map((f) => {
    const i = s.dates.indexOf(f.effective_date);
    const up = f.direction === "inflow";
    return { f, i, cx: x(i + 1), cy: bP50[i + 1] + (up ? 20 : -20), up };
  });
  const xTickIdx = [0, 3, 7, 10, n].filter((i, k, a) => i <= n && a.indexOf(i) === k);
  const dates = [facts.series.dates[0] && addAsOf(facts.series.dates[0]), ...s.dates];
  const counter = phase === 2 ? "P5 · day 1" : phase === 3 ? `Σ w = ${num(Object.values(facts.weights).reduce((a, b) => a + b, 0), 2)}` : `- - required buffer ${money(s.required_buffer, ccy)}`;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden className="block overflow-visible">
        <defs>
          <linearGradient id="mr-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.06 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.22 }} />
          </linearGradient>
        </defs>
        <text x={width - M.right} y={18} textAnchor="end" className={`font-mono text-[12px] ${phase >= 4 ? "fill-gap" : "fill-ink-2"}`}>
          {counter}
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--hairline-2)" : "var(--hairline)"} />
            <text x={M.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-ink-3 font-mono text-[10.5px]">
              {axisTick(v)}
            </text>
          </g>
        ))}
        {xTickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-3 font-mono text-[10.5px]">
            {dayMonth(dates[i])}
          </text>
        ))}
        {/* gap bands (05+) */}
        {phase >= 4 && (
          <m.g initial={phase === 4 && !reduce ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={T(0.2, 0.45)}>
            {gapRuns.map(([a, b]) => {
              const x0 = Math.max(M.left, x(a + 1) - step / 2);
              const x1 = Math.min(width - M.right, x(b + 1) + step / 2);
              return <rect key={a} x={x0} y={M.top} width={Math.max(0, x1 - x0)} height={H - M.top - M.bottom} fill="var(--gap-band)" />;
            })}
          </m.g>
        )}
        {/* three component corridors (03), fading out in 04 */}
        {phase <= 3 &&
          comps.map((c, k) => {
            const b = s.components[c]!.balance;
            const color = COMPONENT_COLOR[c];
            const enter = phase === 2 && !reduce;
            return (
              <m.g key={c} initial={false} animate={{ opacity: phase === 3 ? 0 : 1 }} transition={T(0.6)}>
                <m.path
                  d={bandPath(xs, withStart(b.p95), withStart(b.p05))}
                  fill={color}
                  initial={enter ? { fillOpacity: 0 } : false}
                  animate={{ fillOpacity: 0.12 }}
                  transition={T(0.4, k * 0.5 + 0.3)}
                />
                <m.path
                  d={linePath(xs, withStart(b.p50))}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  initial={enter ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={T(0.5, k * 0.5, DRAW)}
                />
              </m.g>
            );
          })}
        {/* blend (04+) */}
        {phase >= 3 && (
          <m.g initial={phase === 3 && !reduce ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={T(0.6)}>
            <path d={bandPath(xs, bP95, bP05)} fill="url(#mr-grad)" />
            <m.path
              d={linePath(xs, bP05)}
              fill="none"
              stroke={phase >= 4 ? "var(--gap-fill)" : "var(--c-accent)"}
              strokeDasharray="3 3"
              initial={false}
              animate={{ opacity: phase >= 4 ? 1 : 0.6 }}
              transition={T(0.3)}
              strokeWidth={phase >= 4 ? 1.4 : 1}
            />
            <path d={linePath(xs, bP50)} fill="none" stroke="var(--c-accent)" strokeWidth={2} strokeLinejoin="round" />
          </m.g>
        )}
        {/* buffer (05+) */}
        {phase >= 4 && (
          <g>
            <m.line
              x1={M.left}
              x2={width - M.right}
              y1={yBuf}
              y2={yBuf}
              stroke="var(--gap-fill)"
              strokeWidth={1.25}
              strokeDasharray="5 4"
              initial={phase === 4 && !reduce ? { x2: M.left } : false}
              animate={{ x2: width - M.right }}
              transition={T(0.3)}
            />
          </g>
        )}
        <circle cx={x(0)} cy={y(s.start_balance)} r={3} fill="var(--c-actual)" />
        {/* gap day lights up (06) */}
        {phase === 5 && (
          <g>
            {markers.map((mk) => (
              <m.path
                key={mk.f.flow_id}
                d={mk.up ? `M${mk.cx} ${mk.cy - 5} L${mk.cx + 5} ${mk.cy + 4} L${mk.cx - 5} ${mk.cy + 4}Z` : `M${mk.cx} ${mk.cy + 5} L${mk.cx + 5} ${mk.cy - 4} L${mk.cx - 5} ${mk.cy - 4}Z`}
                fill={mk.up ? "var(--good-fill)" : "var(--gap-fill)"}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={T(0.25, 0.4)}
              />
            ))}
            {fg && !reduce && <circle className="g-pulse" cx={dotX} cy={dotY} r={7} />}
            <m.circle
              cx={dotX}
              cy={dotY}
              r={5}
              fill={fg ? "var(--gap-fill)" : "var(--good-fill)"}
              stroke="var(--bg)"
              strokeWidth={2}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              style={{ transformOrigin: `${dotX}px ${dotY}px` }}
              transition={T(0.35, 0.1)}
            />
          </g>
        )}
      </svg>
      {/* annotation + flow tags (06): HTML so text never clips, placed without overlaps */}
      {phase === 5 && (
        <Callouts
          width={width}
          height={H - M.bottom - 2}
          top={M.top}
          avoid={[{ x: dotX, y: dotY }, ...markers.map((mk) => ({ x: mk.cx, y: mk.cy }))]}
          items={[
            {
              key: "dot",
              x: dotX,
              y: dotY,
              below: true,
              delay: 0.3,
              node: (
                <span className={`inline-block whitespace-nowrap rounded-1 px-2 py-1 font-mono text-[11px] shadow-card ${fg ? "bg-gap-tint text-gap" : "bg-good-tint text-good"}`}>
                  {fg ? `${shortDate(fg.date)} · P5 ${compact(fg.p05)} · gap ${compact(fg.gap)}` : `min P5 ${money(facts.minP05.value, ccy)} · ${dayMonth(facts.minP05.date)}`}
                </span>
              ),
              text: fg ? `${shortDate(fg.date)} · P5 ${compact(fg.p05)} · gap ${compact(fg.gap)}` : `min P5 ${money(facts.minP05.value, ccy)} · ${dayMonth(facts.minP05.date)}`,
            },
            ...markers.slice(0, 3).map((mk, k) => {
              const text = `${money(mk.f.amount, ccy)} ${mk.f.description.split(" from ")[0]} · ${mk.f.rail}${mk.f.effective_date !== mk.f.expected_date ? ` (expected ${dayMonth(mk.f.expected_date)})` : ""}`;
              return {
                key: mk.f.flow_id,
                x: mk.cx,
                y: mk.cy,
                below: mk.up,
                delay: 0.5 + k * 0.1,
                text: `▲ ${text}`,
                node: <Tag kind={mk.up ? "in" : "out"}>{text}</Tag>,
              };
            }),
          ]}
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-center border-t border-hairline px-4 sm:px-5">
        <StripContent phase={phase} facts={facts} />
      </div>
    </div>
  );
}

function addAsOf(firstForecastDate: string) {
  const d = new Date(`${firstForecastDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface Callout {
  key: string;
  x: number;
  y: number;
  below: boolean;
  delay: number;
  text: string;
  node: React.ReactNode;
}

/** Places callouts next to their anchor point, inside the frame, without overlapping each other. */
function Callouts({ items, width, height, top, avoid }: { items: Callout[]; width: number; height: number; top: number; avoid: { x: number; y: number }[] }) {
  const reduce = useReducedMotion();
  const placed: [number, number, number, number][] = [];
  const hit = (b: [number, number, number, number]) =>
    placed.some((p) => !(b[2] + 6 < p[0] || b[0] - 6 > p[2] || b[3] + 4 < p[1] || b[1] - 4 > p[3])) ||
    avoid.some((a) => a.x > b[0] - 7 && a.x < b[2] + 7 && a.y > b[1] - 7 && a.y < b[3] + 7);
  return (
    <>
      {items.map((it) => {
        const w = Math.min(width - 16, it.text.length * 6.9 + 22);
        const h = 24;
        const xs = [it.x + 12, it.x - w - 12, it.x - w / 2].map((x) => Math.max(8, Math.min(x, width - w - 8)));
        const dirs = it.below ? [1, -1] : [-1, 1];
        let box: [number, number, number, number] | null = null;
        outer: for (let step = 0; step < 8; step++)
          for (const dir of dirs)
            for (const x of xs) {
              const y0 = dir > 0 ? it.y + 10 + step * (h + 4) : it.y - 10 - h - step * (h + 4);
              const y = Math.max(top, Math.min(y0, height - h - 4));
              const b: [number, number, number, number] = [x, y, x + w, y + h];
              if (!hit(b)) {
                box = b;
                break outer;
              }
            }
        if (!box) return null;
        placed.push(box);
        return (
          <m.div
            key={it.key}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, delay: it.delay }}
            className="pointer-events-none absolute"
            style={{ left: box[0], top: box[1], maxWidth: w }}
          >
            {it.node}
          </m.div>
        );
      })}
    </>
  );
}

function StripContent({ phase, facts }: { phase: 2 | 3 | 4 | 5; facts: RoomFacts }) {
  const reduce = useReducedMotion();
  const ccy = facts.series.currency;
  const comps = ML_COMPONENTS.filter((c) => facts.series.components[c]);
  if (phase === 2)
    return (
      <ul className="flex w-full flex-wrap gap-x-5 gap-y-1">
        {comps.map((c, k) => (
          <m.li
            key={c}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, delay: k * 0.5 + 0.4 }}
            className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-2"
          >
            <span aria-hidden className="h-[3px] w-3.5 rounded" style={{ background: COMPONENT_COLOR[c] }} />
            {COMPONENT_SHORT[c]} · P5 day 1 {compact(facts.day1P05[c])}
            {c === facts.widest ? " · widest by day " + facts.series.dates.length : ""}
          </m.li>
        ))}
      </ul>
    );
  if (phase === 3)
    return (
      <Bars
        className="w-full max-w-md !space-y-1"
        labelWidth="5.5rem"
        trackWidth="minmax(60px,1fr)"
        stagger={0.1}
        play
        rows={Object.entries(facts.weights).map(([k, w]) => ({ key: k, label: COMPONENT_SHORT[k] ?? k, value: w, share: w, color: COMPONENT_COLOR[k], display: num(w, 2), mono: true }))}
      />
    );
  if (phase === 4)
    return (
      <p className="text-[13px] text-ink-2">
        {facts.firstGap ? (
          <>
            P5 under the buffer on <strong className="text-gap">{facts.gapDays.length}</strong> of {facts.series.dates.length} days · first{" "}
            <strong className="text-ink">{shortDate(facts.firstGap.date)}</strong>
          </>
        ) : (
          <>
            P5 stays above the {money(facts.series.required_buffer, ccy)} buffer on all {facts.series.dates.length} days.
          </>
        )}
      </p>
    );
  const a = facts.firstAlert;
  return a ? (
    <m.div
      initial={reduce ? false : { y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.32, delay: 0.7, ease: EASE }}
      className="flex w-full min-w-0 items-center gap-3"
    >
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-gap-fill" />
      <p className="min-w-0 flex-1 truncate text-[13.5px]">
        <span className="font-semibold text-ink">Gap {money(a.gap_amount, ccy)}</span>{" "}
        <span className="text-ink-3">
          P5 {money(a.quantile_balance, ccy)} vs buffer {money(a.required_buffer, ccy)}
        </span>
      </p>
      <span className="shrink-0 text-[13px] font-semibold text-ink">{shortDate(a.date)}</span>
    </m.div>
  ) : (
    <p className="text-[13px] text-good">No alert: the lowest P5 stays {money(facts.minP05.value - facts.series.required_buffer, ccy)} above the buffer.</p>
  );
}

/* ---------------------------------------------------------------- aside: importance */
export function ImportanceFrame({ explain }: { explain: ExplainResponse }) {
  const fi = explain.feature_importance;
  const pos = fi.features.filter((f) => f.gain > 0);
  const max = Math.max(...pos.map((f) => f.share), 1e-9);
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-4 sm:px-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="t-h4">What the model looks at</p>
        <p className="font-mono text-[11.5px] text-ink-3">
          {COMPONENT_SHORT[fi.model] ?? fi.model} · P{Math.round(fi.quantile * 100)} · {fi.importance_type}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Bars
          labelWidth="minmax(0,1fr)"
          trackWidth="minmax(70px,0.9fr)"
          play
          className="!space-y-[7px]"
          rows={pos.map((f) => ({
            key: f.feature,
            label: f.label,
            value: f.share,
            share: f.share / max,
            color: GROUP_COLOR[f.group] ?? "var(--ink-3)",
            display: `${(f.share * 100).toFixed(1)} %`,
          }))}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
        {Object.entries(GROUP_COLOR).map(([g, c]) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c }} />
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}
