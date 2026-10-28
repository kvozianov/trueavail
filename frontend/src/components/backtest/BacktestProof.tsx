import { BacktestLines } from "@/components/charts/BacktestLines";
import { backtestFacts } from "@/lib/derive";
import { num, pctValue, ranges, ratio } from "@/lib/format";
import type { BacktestResponse } from "@/lib/types";

export function backtestHeadline(bt: BacktestResponse): string {
  const f = backtestFacts(bt);
  const imp = bt.summary.improvement_pct;
  const lead = imp >= 0 ? `${pctValue(imp)} lower loss than a seasonal-naive baseline` : `${pctValue(-imp)} higher loss than a seasonal-naive baseline`;
  if (imp < 0) return `${lead}.`;
  return f.worse.length === 0 ? `${lead}, at every horizon.` : `${lead} — and worse at ${f.worse.length === 1 ? "one horizon" : `${f.worse.length} horizons`}.`;
}

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>;

/** Three tonal stat cards. */
export function BacktestStats({ bt }: { bt: BacktestResponse }) {
  const s = bt.summary;
  const f = backtestFacts(bt);
  const k = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : num(v));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card-tonal p-5 sm:p-6">
        <p className="t-stat t-stat-l">{num(s.mean_pinball_p50)}</p>
        <p className="t-small mt-2">mean pinball loss P50 · model</p>
        <p className="mt-3 text-[13.5px] text-ink-2">
          vs <B>{num(s.baseline_mean_pinball_p50)}</B> seasonal-naive (net flow 7 days earlier, cumulated)
        </p>
      </div>
      <div className="card-tonal p-5 sm:p-6">
        <p className="t-stat t-stat-l">
          {f.better} / {f.total}
        </p>
        <p className="t-small mt-2">horizons where the model beats the baseline</p>
        <p className="mt-3 text-[13.5px] text-ink-2">
          {f.worse.length ? (
            <>
              loses at <B>h = {ranges(f.worse.map((w) => w.h))}</B>: {f.worse.map((w) => `${k(w.model)} vs ${k(w.baseline)}`).join(", ")}
            </>
          ) : (
            "no horizon where the baseline is better"
          )}
        </p>
      </div>
      <div className="card-tonal p-5 sm:p-6">
        <p className="t-stat t-stat-l">{ratio(s.mean_coverage_90)}</p>
        <p className="t-small mt-2">mean 90 % interval coverage · target {ratio(s.target_coverage, 2)}</p>
        <p className="mt-3 text-[13.5px] text-ink-2">
          {f.under.length ? (
            <>
              under target at <B>h = {ranges(f.under.map((u) => u.h))}</B> ({f.under.map((u) => ratio(u.coverage, 2)).join(" · ")})
              {f.onTargetFrom ? `; on target from h = ${f.onTargetFrom}` : ""}
            </>
          ) : (
            "on or above target at every horizon"
          )}
        </p>
      </div>
    </div>
  );
}

export function BacktestCharts({ bt }: { bt: BacktestResponse }) {
  const f = backtestFacts(bt);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="bt-pin">
        <h3 id="bt-pin" className="t-h4">
          Pinball loss P50 by horizon
        </h3>
        <p className="t-small mt-0.5 mb-4">
          Lower is better · account-currency units{f.worse.length ? ` · h = ${ranges(f.worse.map((w) => w.h))} highlighted` : ""}
        </p>
        <BacktestLines bt={bt} kind="pinball" />
        <Legend items={[["var(--c-accent)", "Model (P50)", false], ["var(--c-baseline)", `Baseline (${bt.baseline})`, true]]} />
      </section>
      <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="bt-cov">
        <h3 id="bt-cov" className="t-h4">
          90 % interval coverage by horizon
        </h3>
        <p className="t-small mt-0.5 mb-4">Share of actual balances inside P5–P95 · target {ratio(bt.summary.target_coverage, 2)} · amber = under target</p>
        <BacktestLines bt={bt} kind="coverage" />
        <Legend items={[["var(--c-accent)", "Coverage", false], ["var(--ink-2)", "Target", true], ["var(--warn-fill)", "Under target", false]]} />
      </section>
    </div>
  );
}

function Legend({ items }: { items: [string, string, boolean][] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
      {items.map(([c, l, dash]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="0" y1="4" x2="16" y2="4" stroke={c} strokeWidth="2" strokeDasharray={dash ? "4 3" : undefined} />
          </svg>
          {l}
        </span>
      ))}
    </div>
  );
}

/** "Where it is weak" — same type size as the wins. */
export function WeakSpots({ bt }: { bt: BacktestResponse }) {
  const f = backtestFacts(bt);
  return (
    <section className="rounded-3 border-l-[3px] border-warn-fill bg-warn-tint px-5 py-5 sm:px-6" aria-labelledby="weak-title">
      <h3 id="weak-title" className="text-[15px] font-semibold text-warn">
        Where it is weak — stated in the same type size as the wins
      </h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14.5px] text-ink-2">
        {f.worse.map((w) => (
          <li key={w.h}>
            At <B>h = {w.h}</B> the model is worse than the baseline ({num(w.model)} vs {num(w.baseline)}).
          </li>
        ))}
        {f.under.length > 0 && (
          <li>
            Intervals are too narrow for <B>h = {ranges(f.under.map((u) => u.h))}</B>: coverage{" "}
            <B>
              {ratio(Math.min(...f.under.map((u) => u.coverage)), 2)}–{ratio(Math.max(...f.under.map((u) => u.coverage)), 2)}
            </B>{" "}
            against {ratio(bt.summary.target_coverage, 2)}, so near-term gaps can be missed.{f.onTargetFrom ? ` From h = ${f.onTargetFrom} coverage is on target.` : ""}
          </li>
        )}
        <li>The backtest scores history only; scheduled payments are not replayed.</li>
        <li>Synthetic data from a known process: these numbers describe the method, not real-world accuracy.</li>
      </ul>
    </section>
  );
}
