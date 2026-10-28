"use client";

import { useId, useState } from "react";
import { axisTick, compact, num, ratio } from "@/lib/format";
import type { BacktestResponse } from "@/lib/types";
import { linePath, linear, niceTicks, useWidth } from "./scales";

type Kind = "pinball" | "coverage";

/** Pinball P50 (model vs baseline) or 90 % coverage (vs target) by horizon. One y axis, direct labels. */
export function BacktestLines({ bt, kind, height = 230 }: { bt: BacktestResponse; kind: Kind; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const rows = bt.per_horizon;
  const target = bt.summary.target_coverage;
  const M = { top: 18, right: kind === "pinball" ? 64 : 16, bottom: 24, left: 44 };
  const pw = Math.max(40, width - M.left - M.right);
  const ph = height - M.top - M.bottom;
  const hs = rows.map((r) => r.h);
  const x = linear(hs[0], hs[hs.length - 1], M.left, M.left + pw);
  const stepW = rows.length > 1 ? pw / (rows.length - 1) : pw;

  const vals = kind === "pinball" ? rows.flatMap((r) => [r.pinball_p50, r.baseline_pinball_p50, 0]) : rows.map((r) => r.coverage_90).concat([target, 1]);
  const lo = kind === "coverage" ? Math.min(...vals) - 0.04 : 0;
  const ticks = niceTicks(lo, Math.max(...vals), 4);
  const y0 = Math.min(lo, ticks[0]);
  const y1 = Math.max(...vals, ticks[ticks.length - 1]);
  const y = linear(y0, y1, M.top + ph, M.top);

  const worse = rows.filter((r) => r.pinball_p50 > r.baseline_pinball_p50);
  const under = rows.filter((r) => r.coverage_90 < target);
  const model = rows.map((r) => (kind === "pinball" ? r.pinball_p50 : r.coverage_90));
  const base = rows.map((r) => r.baseline_pinball_p50);
  const summary =
    kind === "pinball"
      ? `P50 pinball loss by horizon: the model is lower than the baseline at ${rows.length - worse.length} of ${rows.length} horizons${worse.length ? `; higher at h = ${worse.map((w) => w.h).join(", ")}` : ""}.`
      : `90 % interval coverage by horizon against a ${ratio(target, 2)} target${under.length ? `; under target at h = ${under.map((u) => u.h).join(", ")}` : ""}.`;

  const columns = kind === "pinball" ? worse.map((r) => [r.h, r.h] as const) : under.length ? [[under[0].h, under[under.length - 1].h] as const] : [];
  const hr = hover != null ? rows[hover] : null;
  const every = width < 480 ? 4 : 2;
  const last = hs[hs.length - 1];
  const xTicks = hs.filter((h) => (h - hs[0]) % every === 0 && last - h >= every * 0.6).concat(last);

  return (
    <div ref={ref} className="relative">
      <svg
        role="img"
        aria-labelledby={titleId}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        tabIndex={0}
        className="block overflow-visible rounded-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * width;
          setHover(Math.max(0, Math.min(rows.length - 1, Math.round((px - M.left) / stepW))));
        }}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          setHover((h) => Math.max(0, Math.min(rows.length - 1, (h ?? -1) + (e.key === "ArrowRight" ? 1 : -1))));
        }}
      >
        <title id={titleId}>{summary}</title>
        {columns.map(([a, b]) => (
          <rect key={a} x={x(a) - stepW / 2.6} y={M.top} width={x(b) - x(a) + (stepW / 2.6) * 2} height={ph} rx={6} fill="var(--warn-tint)" />
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + pw} y1={y(v)} y2={y(v)} stroke="var(--hairline)" />
            <text x={M.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
              {kind === "pinball" ? axisTick(v) : v.toFixed(1)}
            </text>
          </g>
        ))}
        {rows.map((r) =>
          xTicks.includes(r.h) ? (
            <text key={r.h} x={x(r.h)} y={height - 6} textAnchor="middle" className="fill-ink-3 font-mono text-[11px]">
              {r.h}d
            </text>
          ) : null,
        )}
        {kind === "coverage" && (
          <g>
            <line x1={M.left} x2={M.left + pw} y1={y(target)} y2={y(target)} stroke="var(--ink-2)" strokeDasharray="4 3" />
            <text x={M.left + pw - 2} y={y(target) + 14} textAnchor="end" className="fill-ink-2 font-mono text-[11px]">
              target {ratio(target, 2)}
            </text>
          </g>
        )}
        {kind === "pinball" && (
          <path d={linePath(hs.map(x), base.map(y))} fill="none" stroke="var(--c-baseline)" strokeWidth={2} strokeDasharray="5 4" />
        )}
        <path d={linePath(hs.map(x), model.map(y))} fill="none" stroke="var(--c-accent)" strokeWidth={2} strokeLinejoin="round" />
        {kind === "pinball" &&
          rows.map((r) => <circle key={`b${r.h}`} cx={x(r.h)} cy={y(r.baseline_pinball_p50)} r={3} fill="var(--c-baseline)" stroke="var(--bg)" strokeWidth={1.5} />)}
        {rows.map((r, i) => {
          const off = kind === "coverage" && r.coverage_90 < target;
          return <circle key={`m${r.h}`} cx={x(r.h)} cy={y(model[i])} r={3.5} fill={off ? "var(--warn-fill)" : "var(--c-accent)"} stroke="var(--bg)" strokeWidth={1.5} />;
        })}
        {kind === "pinball" && (
          <>
            <text x={M.left + pw + 8} y={y(base[base.length - 1]) + 4} className="fill-ink-2 font-mono text-[11px]">
              baseline
            </text>
            <text x={M.left + pw + 8} y={y(model[model.length - 1]) + 4} className="fill-ink-2 font-mono text-[11px]">
              model
            </text>
          </>
        )}
        {kind === "pinball" &&
          worse.slice(0, 1).map((r) => (
            <text key="ann" x={M.left + 6} y={M.top + 12} className="fill-warn font-mono text-[11px]">
              {width < 520 ? `h=${r.h}: ${compact(r.pinball_p50)} vs ${compact(r.baseline_pinball_p50)}` : `h=${r.h}: model ${compact(r.pinball_p50)} vs baseline ${compact(r.baseline_pinball_p50)}`}
            </text>
          ))}
        {kind === "coverage" && under.length > 0 && (
          <text x={x(under[0].h) + 4} y={M.top + 12} className="fill-warn font-mono text-[11px]">
            too narrow at h {under[0].h}–{under[under.length - 1].h}
          </text>
        )}
        {hr && <line x1={x(hr.h)} x2={x(hr.h)} y1={M.top} y2={M.top + ph} stroke="var(--ink-3)" pointerEvents="none" />}
      </svg>
      {hr && (
        <div
          aria-hidden
          className="tip pointer-events-none absolute z-10 w-48 px-3 py-2 text-[12.5px]"
          style={{ left: Math.max(M.left, Math.min(x(hr.h) + (x(hr.h) > width - 220 ? -204 : 12), M.left + pw - 192)), top: M.top + ph / 2 }}
        >
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-tip-2">horizon {hr.h} d</div>
          {kind === "pinball" ? (
            <>
              <div className="flex justify-between">
                <span className="text-tip-2">Model</span>
                <span className="tnum font-semibold">{num(hr.pinball_p50)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tip-2">Baseline</span>
                <span className="tnum">{num(hr.baseline_pinball_p50)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-tip-2">Coverage</span>
              <span className="tnum font-semibold">{ratio(hr.coverage_90, 2)}</span>
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only-table">
        {hr ? (kind === "pinball" ? `h ${hr.h}: model ${num(hr.pinball_p50)}, baseline ${num(hr.baseline_pinball_p50)}` : `h ${hr.h}: coverage ${ratio(hr.coverage_90, 2)}`) : ""}
      </p>
    </div>
  );
}
