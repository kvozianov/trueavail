"use client";

import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { axisTick, dayMonth, money, moneyFull, shortDate } from "@/lib/format";
import { runs } from "@/lib/derive";
import type { ForecastPoint, HistoryRow, KnownEvent } from "@/lib/types";
import { bandPath, linePath, linear, niceTicks, spreadLabels, useWidth } from "./scales";

export interface CorridorProps {
  /** Forecast points of one account (the "after"/main corridor). */
  points: ForecastPoint[];
  history?: HistoryRow[];
  historyDays?: number;
  /** Optional "before" corridor drawn grey and dashed underneath. */
  compare?: ForecastPoint[] | null;
  currency: string;
  asOf: string;
  /** Account name used in the chart's text alternative. */
  accountLabel: string;
  /** Changing the key cross-fades the plot (account switch); same key + new points morphs the paths. */
  plotKey?: string;
  height?: number;
  compact?: boolean;
  animate?: boolean;
  showEndLabels?: boolean;
  showMarkers?: boolean;
  showBufferLabel?: boolean;
  highlightDate?: string | null;
  tableVisible?: boolean;
  labels?: { main: string; compare?: string };
}

interface Day {
  date: string;
  actual?: number;
  p05?: number;
  p50?: number;
  p95?: number;
  cmp05?: number;
  cmp50?: number;
  cmp95?: number;
  buffer?: number;
  breach?: boolean;
  events?: KnownEvent[];
  step?: number;
}

const TOOLTIP_W = 232;

function buildDays(p: CorridorProps): { days: Day[]; anchor: number } {
  const hist = [...(p.history ?? [])].sort((a, b) => a.date.localeCompare(b.date)).filter((h) => h.date <= p.asOf).slice(-(p.historyDays ?? 21));
  const days: Day[] = hist.map((h) => ({ date: h.date, actual: h.ending_balance, buffer: h.required_buffer }));
  const anchor = hist.length && hist[hist.length - 1].date === p.asOf ? hist.length - 1 : -1;
  const cmp = new Map((p.compare ?? []).map((c) => [c.date, c]));
  const pts = [...p.points].sort((a, b) => a.date.localeCompare(b.date));
  pts.forEach((pt, i) => {
    const c = cmp.get(pt.date);
    days.push({
      date: pt.date,
      p05: pt.balance_p05,
      p50: pt.balance_p50,
      p95: pt.balance_p95,
      cmp05: c?.balance_p05,
      cmp50: c?.balance_p50,
      cmp95: c?.balance_p95,
      buffer: pt.required_buffer,
      breach: pt.breach,
      events: pt.known_events,
      step: i + 1,
    });
  });
  return { days, anchor };
}

export function corridorSummary(points: ForecastPoint[], accountLabel: string, currency: string): string {
  const breaches = points.filter((p) => p.breach);
  const buffer = points[0]?.required_buffer;
  if (!points.length) return `${accountLabel}: no forecast points.`;
  if (!breaches.length) {
    const min = points.reduce((m, p) => (p.balance_p05 < m.balance_p05 ? p : m), points[0]);
    return `${accountLabel}: P5 stays above the ${money(buffer, currency)} buffer for all ${points.length} days; lowest P5 ${money(min.balance_p05, currency)} on ${dayMonth(min.date)}.`;
  }
  const f = breaches[0];
  return `${accountLabel}: P5 falls below the ${money(buffer, currency)} buffer on ${dayMonth(f.date)}, gap ${money(f.required_buffer - f.balance_p05, currency)}; ${breaches.length} gap days in ${points.length}.`;
}

export function Corridor(props: CorridorProps) {
  const {
    currency,
    accountLabel,
    plotKey = "plot",
    height = 310,
    compact = false,
    animate = true,
    showEndLabels = !compact,
    showMarkers = true,
    showBufferLabel = true,
    highlightDate = null,
    tableVisible = false,
    labels = { main: "Forecast" },
    compare,
  } = props;
  const [wrapRef, width] = useWidth<HTMLDivElement>(800);
  const inView = useInView(wrapRef, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const play = animate && !reduce;
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  const { days, anchor } = useMemo(() => buildDays(props), [props]);
  const fIdx = days.map((d, i) => (d.p50 != null ? i : -1)).filter((i) => i >= 0);

  const M = { top: compact ? 14 : 24, right: showEndLabels ? 36 : 10, bottom: compact ? 20 : 26, left: compact ? 8 : 48 };
  const plotW = Math.max(40, width - M.left - M.right);
  const plotH = Math.max(40, height - M.top - M.bottom);

  const values: number[] = [0];
  for (const d of days) {
    for (const v of [d.actual, d.p05, d.p95, d.cmp05, d.cmp95, d.buffer]) if (v != null) values.push(v);
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.06 || 1;
  const ticks = niceTicks(lo - pad, hi + pad, compact ? 3 : 4);
  const y0 = Math.min(lo - pad, ticks[0]);
  const y1 = Math.max(hi + pad, ticks[ticks.length - 1]);
  const x = linear(0, Math.max(1, days.length - 1), M.left, M.left + plotW);
  const y = linear(y0, y1, M.top + plotH, M.top);
  const step = days.length > 1 ? plotW / (days.length - 1) : plotW;

  // Series (forecast series start at the as-of anchor so the fan opens from "now").
  const anchorBal = anchor >= 0 ? days[anchor].actual! : undefined;
  const fx = [...(anchor >= 0 ? [anchor] : []), ...fIdx].map(x);
  const series = (key: "p05" | "p50" | "p95" | "cmp05" | "cmp50" | "cmp95") =>
    [...(anchor >= 0 ? [anchorBal!] : []), ...fIdx.map((i) => days[i][key] ?? days[i].p50!)].map(y);
  const p05 = series("p05");
  const p50 = series("p50");
  const p95 = series("p95");
  const hasCmp = !!compare?.length;
  const c05 = hasCmp ? series("cmp05") : [];
  const c50 = hasCmp ? series("cmp50") : [];
  const c95 = hasCmp ? series("cmp95") : [];
  const histIdx = days.map((d, i) => (d.actual != null ? i : -1)).filter((i) => i >= 0);

  const bandD = bandPath(fx, p95, p05);
  const collapsedD = bandPath(fx, p50, p50);
  const p50D = linePath(fx, p50);
  const p05D = linePath(fx, p05);
  const actualD = linePath(histIdx.map(x), histIdx.map((i) => y(days[i].actual!)));
  const buffer = days.find((d) => d.buffer != null)?.buffer ?? null;
  const yBuf = buffer != null ? y(buffer) : null;
  const gapRuns = runs(days.map((d) => !!d.breach));
  const gradId = `${titleId}-grad`.replace(/:/g, "");

  // Buffer label: first candidate position whose box clears the actual line, both corridors and the markers.
  const bufLabel = (() => {
    if (yBuf == null || buffer == null) return null;
    const text = `required buffer ${money(buffer, currency)}`;
    const w = text.length * 6.7;
    const occupiedBy = (withMarkers: boolean) =>
      days.map((d, i) => {
        const ys: number[] = [];
        for (const v of [d.actual, d.p05, d.p50, d.p95, d.cmp05, d.cmp50, d.cmp95]) if (v != null) ys.push(y(v));
        if (withMarkers && d.events?.length && d.p50 != null) ys.push(y(d.p50) - 24, y(d.p50) + 24);
        return { x: x(i), lo: Math.min(...ys, Infinity) - 3, hi: Math.max(...ys, -Infinity) + 3 };
      });
    let occupied = occupiedBy(true);
    const free = (x0: number, y0: number) =>
      occupied.every((o) => o.x < x0 - step || o.x > x0 + w + step || o.hi < y0 - 11 || o.lo > y0 + 3);
    const cands: [number, number, "start" | "end"][] = [
      [M.left + 8, yBuf - 7, "start"],
      [M.left + 8, yBuf + 15, "start"],
      [M.left + plotW - 4 - w, yBuf - 7, "end"],
      [M.left + plotW - 4 - w, yBuf + 15, "end"],
      [M.left + plotW / 2 - w / 2, yBuf - 7, "start"],
      [M.left + plotW / 2 - w / 2, yBuf + 15, "start"],
    ];
    const ok = ([x0, y0]: [number, number, string]) => y0 > M.top + 8 && y0 < M.top + plotH - 2 && free(x0, y0);
    let hit = cands.find(ok);
    if (!hit) {
      occupied = occupiedBy(false);
      hit = cands.find(ok);
    }
    if (!hit) return null;
    const [x0, y0, anchor] = hit;
    return { text, x: anchor === "end" ? x0 + w : x0, y: y0, anchor };
  })();

  const xTickEvery = compact ? 7 : width < 520 ? 7 : 5;
  const xTicks = days.map((d, i) => ({ d, i })).filter(({ i }) => i % xTickEvery === 0);

  const endY = showEndLabels && fx.length ? spreadLabels([p95.at(-1)!, p50.at(-1)!, p05.at(-1)!], 13, M.top + 6, M.top + plotH) : [];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round((px - M.left) / step);
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    setHover((h) => {
      const cur = h ?? fIdx[0] ?? 0;
      if (e.key === "Home") return 0;
      if (e.key === "End") return days.length - 1;
      return Math.max(0, Math.min(days.length - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const hd = hover != null ? days[hover] : null;
  const hx = hover != null ? x(hover) : 0;
  const tipLeft = hd ? (hx + 14 + TOOLTIP_W > M.left + plotW || hx > width - 240 ? hx - 14 - TOOLTIP_W : hx + 14) : 0;
  const tipX = Math.max(M.left, Math.min(tipLeft, M.left + plotW - TOOLTIP_W));
  const summary = corridorSummary(props.points, accountLabel, currency);
  const t = (dur: number, delay = 0, ease: [number, number, number, number] = [0.2, 0, 0, 1]) => (play ? { duration: dur, delay, ease } : { duration: 0 });
  const opened = inView || !play;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="block overflow-visible rounded-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <title id={titleId}>{summary}</title>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.06 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>
        {/* 1. grid */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--hairline-2)" : "var(--hairline)"} />
            {!compact && (
              <text x={M.left - 10} y={y(v) + 3.5} textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
                {axisTick(v)}
              </text>
            )}
          </g>
        ))}
        {xTicks.map(({ d, i }) => (
          <text key={d.date} x={x(i)} y={height - 6} textAnchor="middle" className="fill-ink-3 font-mono text-[11px]">
            {dayMonth(d.date)}
          </text>
        ))}
        {/* 8. as-of divider */}
        {anchor >= 0 && (
          <g>
            <line x1={x(anchor)} x2={x(anchor)} y1={M.top - 4} y2={M.top + plotH} stroke="var(--ink-4)" strokeDasharray="2 3" />
            {!compact && (
              <text x={x(anchor) - 4} y={M.top - 9} textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
                as of
              </text>
            )}
          </g>
        )}
        <AnimatePresence initial={false}>
          <m.g key={plotKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t(0.32)}>
            {/* 2. gap bands */}
            <m.g initial={play ? { opacity: 0 } : false} animate={{ opacity: opened ? 1 : 0 }} transition={t(0.2, play ? 0.9 : 0)}>
              {gapRuns.map(([a, b]) => {
                const x0 = Math.max(M.left, x(a) - step / 2);
                const x1 = Math.min(M.left + plotW, x(b) + step / 2);
                return <rect key={`${a}-${b}`} x={x0} y={M.top} width={Math.max(0, x1 - x0)} height={plotH} fill="var(--gap-band)" />;
              })}
              {highlightDate &&
                days.map((d, i) =>
                  d.date === highlightDate && d.breach ? (
                    <rect key="hl" x={x(i) - step / 2} y={M.top} width={step} height={plotH} fill="var(--gap-band)" />
                  ) : null,
                )}
            </m.g>
            {/* before corridor */}
            {hasCmp && (
              <g>
                <path d={bandPath(fx, c95, c05)} fill="var(--c-before-band)" />
                <path d={linePath(fx, c50)} fill="none" stroke="var(--c-before)" strokeWidth={1.75} strokeDasharray="5 4" />
              </g>
            )}
            {/* 3. corridor */}
            <m.path
              initial={play ? { d: collapsedD } : false}
              animate={{ d: opened ? bandD : collapsedD }}
              transition={t(0.6, play ? 0.2 : 0)}
              fill={`url(#${gradId})`}
            />
            {/* 4. P5 edge */}
            <m.path
              initial={play ? { d: linePath(fx, p50), opacity: 0 } : false}
              animate={{ d: opened ? p05D : linePath(fx, p50), opacity: opened ? 0.7 : 0 }}
              transition={t(0.6, play ? 0.2 : 0)}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* 5. actual */}
            {histIdx.length > 1 && <path d={actualD} fill="none" stroke="var(--c-actual)" strokeWidth={1.75} strokeLinejoin="round" />}
            {/* 6. P50 */}
            <m.path
              initial={play ? { pathLength: 0 } : false}
              animate={{ pathLength: opened ? 1 : 0, d: p50D }}
              transition={{ pathLength: t(0.6, 0, [0.65, 0, 0.35, 1]), d: t(0.6) }}
              fill="none"
              stroke="var(--c-accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* 9. scheduled-flow markers */}
            {showMarkers &&
              fIdx.map((i, k) => {
                const d = days[i];
                if (!d.events?.length) return null;
                const net = d.events.reduce((s, e) => s + (e.direction === "inflow" ? e.amount : -e.amount), 0);
                const up = net >= 0;
                const cx = x(i);
                const cy = p50[anchor >= 0 ? k + 1 : k] + (up ? 18 : -18);
                const s = 5;
                const dPath = up ? `M${cx} ${cy - s} L${cx + s} ${cy + s * 0.8} L${cx - s} ${cy + s * 0.8}Z` : `M${cx} ${cy + s} L${cx + s} ${cy - s * 0.8} L${cx - s} ${cy - s * 0.8}Z`;
                return (
                  <m.path
                    key={d.date}
                    d={dPath}
                    fill={up ? "var(--good-fill)" : "var(--gap-fill)"}
                    initial={play ? { opacity: 0 } : false}
                    animate={{ opacity: opened ? 1 : 0 }}
                    transition={t(0.2, play ? 0.8 : 0)}
                  />
                );
              })}
            {/* 10. end labels */}
            {showEndLabels &&
              endY.length === 3 &&
              (["P95", "P50", "P5"] as const).map((lab, k) => (
                <text key={lab} x={M.left + plotW + 6} y={endY[k] + 3.5} className="fill-accent font-mono text-[11px]">
                  {lab}
                </text>
              ))}
          </m.g>
        </AnimatePresence>
        {/* 7. buffer */}
        {yBuf != null && (
          <g>
            <m.line
              x1={M.left}
              x2={M.left + plotW}
              y1={yBuf}
              y2={yBuf}
              stroke="var(--gap-fill)"
              strokeWidth={1.25}
              strokeDasharray="5 4"
              initial={play ? { x2: M.left } : false}
              animate={{ x2: opened ? M.left + plotW : M.left }}
              transition={t(0.3, play ? 0.6 : 0)}
            />
            {showBufferLabel && !compact && bufLabel && (
              <text x={bufLabel.x} y={bufLabel.y} textAnchor={bufLabel.anchor} paintOrder="stroke" stroke="var(--bg)" strokeWidth={3} className="fill-gap font-mono text-[11px]">
                {bufLabel.text}
              </text>
            )}
          </g>
        )}
        {/* 11. crosshair */}
        {hd && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={M.top} y2={M.top + plotH} stroke="var(--ink-3)" strokeWidth={1} />
            {hd.p50 != null && <circle cx={hx} cy={y(hd.p50)} r={3.5} fill="var(--c-accent)" stroke="var(--bg)" strokeWidth={2} />}
            {hd.p05 != null && <circle cx={hx} cy={y(hd.p05)} r={3} fill={hd.breach ? "var(--gap-fill)" : "var(--c-accent)"} stroke="var(--bg)" strokeWidth={1.5} />}
            {hd.actual != null && <circle cx={hx} cy={y(hd.actual)} r={3.5} fill="var(--c-actual)" stroke="var(--bg)" strokeWidth={2} />}
          </g>
        )}
      </svg>
      {hd && (
        <div
          aria-hidden
          className="tip pointer-events-none absolute z-10 px-3 py-2.5 text-[12.5px]"
          style={{ left: tipX, top: M.top + 6, width: TOOLTIP_W }}
        >
          <TooltipBody d={hd} currency={currency} labels={hasCmp ? labels : undefined} />
        </div>
      )}
      <p aria-live="polite" className="sr-only-table">
        {hd ? tooltipText(hd, currency) : ""}
      </p>
      <CorridorTable days={days} currency={currency} visible={tableVisible} caption={summary} hasCmp={hasCmp} labels={labels} />
    </div>
  );
}

function TooltipBody({ d, currency, labels }: { d: Day; currency: string; labels?: { main: string; compare?: string } }) {
  const row = (k: string, v: number | undefined, strong = false, gap = false) =>
    v == null ? null : (
      <div className="flex justify-between gap-3 py-[1px]">
        <span className="text-tip-2">{k}</span>
        <span className={`tnum ${strong ? "font-semibold" : ""} ${gap ? "text-tip-gap" : ""}`}>{money(v, currency)}</span>
      </div>
    );
  return (
    <>
      <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-tip-2">
        {shortDate(d.date)}
        {d.step ? ` · day ${d.step}` : " · actual"}
      </div>
      {d.actual != null && row("Actual", d.actual, true)}
      {d.p50 != null && (
        <>
          {labels?.compare && <div className="pt-0.5 text-[11.5px] font-medium">{labels.main}</div>}
          {row("P95", d.p95)}
          {row("P50", d.p50, true)}
          {row("P5", d.p05, false, d.breach)}
        </>
      )}
      {d.cmp50 != null && labels?.compare && (
        <>
          <div className="pt-1 text-[11.5px] font-medium">{labels.compare}</div>
          {row("P50", d.cmp50)}
          {row("P5", d.cmp05)}
        </>
      )}
      {d.breach && d.p05 != null && d.buffer != null && (
        <div className="mt-1.5 border-t border-white/15 pt-1.5 text-tip-gap">
          Gap {money(d.buffer - d.p05, currency)} below buffer {money(d.buffer, currency)}
        </div>
      )}
      {!d.breach && d.buffer != null && d.p50 != null && (
        <div className="mt-1.5 border-t border-white/15 pt-1.5 text-tip-2">Buffer {money(d.buffer, currency)}</div>
      )}
      {d.events?.map((e) => (
        <div key={e.flow_id} className="mt-1 text-tip-2">
          {e.direction === "inflow" ? "▲" : "▼"} {money(e.amount, currency)} {e.description}
        </div>
      ))}
    </>
  );
}

function tooltipText(d: Day, currency: string): string {
  const parts = [shortDate(d.date)];
  if (d.actual != null) parts.push(`actual ${moneyFull(d.actual, currency)}`);
  if (d.p50 != null) parts.push(`P95 ${money(d.p95, currency)}, P50 ${money(d.p50, currency)}, P5 ${money(d.p05, currency)}`);
  if (d.breach && d.buffer != null && d.p05 != null) parts.push(`gap ${money(d.buffer - d.p05, currency)}`);
  return parts.join(", ");
}

function CorridorTable({
  days,
  currency,
  visible,
  caption,
  hasCmp,
  labels,
}: {
  days: Day[];
  currency: string;
  visible: boolean;
  caption: string;
  hasCmp: boolean;
  labels: { main: string; compare?: string };
}) {
  return (
    <div className={visible ? "mt-4 max-h-80 overflow-auto rounded-2 border border-hairline" : "sr-only-table"}>
      <table className="w-full min-w-[520px] text-right text-[12.5px] tnum">
        <caption className={visible ? "px-3 py-2 text-left text-[12.5px] text-ink-3" : ""}>{caption}</caption>
        <thead className="sticky top-0 bg-bg-2 text-ink-3">
          <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:font-medium">
            <th className="text-left">Date</th>
            <th>Actual</th>
            <th>P5</th>
            <th>P50</th>
            <th>P95</th>
            {hasCmp && <th>{labels.compare ?? "Before"} P50</th>}
            <th>Buffer</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className="border-t border-hairline text-ink-2 [&>td]:px-3 [&>td]:py-1">
              <td className="text-left font-mono">{d.date}</td>
              <td>{d.actual != null ? moneyFull(d.actual, currency) : ""}</td>
              <td className={d.breach ? "text-gap" : ""}>{d.p05 != null ? moneyFull(d.p05, currency) : ""}</td>
              <td>{d.p50 != null ? moneyFull(d.p50, currency) : ""}</td>
              <td>{d.p95 != null ? moneyFull(d.p95, currency) : ""}</td>
              {hasCmp && <td>{d.cmp50 != null ? moneyFull(d.cmp50, currency) : ""}</td>}
              <td>{d.buffer != null ? moneyFull(d.buffer, currency) : ""}</td>
              <td className="text-gap">{d.breach && d.p05 != null && d.buffer != null ? moneyFull(d.buffer - d.p05, currency) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Legend row: swatches with the same encodings as the chart. */
export function CorridorLegend({ compare = false, labels = { main: "Forecast", compare: "Before" } }: { compare?: boolean; labels?: { main: string; compare?: string } }) {
  const item = (sw: React.ReactNode, text: string) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {sw}
      {text}
    </span>
  );
  const line = (color: string, dash?: string, w = 2) => (
    <svg width="16" height="8" aria-hidden>
      <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth={w} strokeDasharray={dash} />
    </svg>
  );
  const box = (bg: string) => <span aria-hidden className="inline-block h-2.5 w-3.5 rounded-[3px]" style={{ background: bg }} />;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-2">
      {!compare && item(line("var(--c-actual)", undefined, 1.75), "Actual")}
      {compare && item(box("var(--c-before-band)"), `${labels.compare} P5–P95`)}
      {compare && item(line("var(--c-before)", "4 3"), `${labels.compare} P50`)}
      {item(box("var(--accent-band)"), compare ? `${labels.main} P5–P95` : "P5–P95")}
      {item(line("var(--c-accent)"), compare ? `${labels.main} P50` : "P50")}
      {item(line("var(--gap-fill)", "5 4", 1.5), "Buffer")}
      {item(box("var(--gap-band)"), "Gap days")}
      {item(<span aria-hidden className="text-[10px] text-good-fill">▲</span>, "Inflow")}
      {item(<span aria-hidden className="text-[10px] text-gap-fill">▼</span>, "Outflow")}
    </div>
  );
}
