"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button, Card, Field, Loading, PageHeader, Stat, inputClass } from "@/components/ui";
import { DEMO, api } from "@/lib/api";
import { axisNumber, num, pct, shortDate } from "@/lib/format";
import type { BacktestRequest, BacktestResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const DEFAULTS: Required<BacktestRequest> = { horizon_days: 14, folds: 6, step_days: 7 };

const axisProps = {
  tick: { fill: "var(--ink-muted)", fontSize: 11 },
  stroke: "var(--axis)",
  tickLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    color: "var(--ink)",
  },
  labelStyle: { color: "var(--ink)", fontWeight: 600 },
};

/** Plain-language reading of the numbers; never claims more than they show. */
function summarize(r: BacktestResponse): string[] {
  const s = r.summary;
  const lines: string[] = [];
  const imp = s.improvement_pct;
  if (imp > 0.5) {
    lines.push(
      `Across ${r.folds} folds and ${r.horizon_days} horizons, the model's mean P50 pinball loss is ${num(s.mean_pinball_p50)} vs ${num(s.baseline_mean_pinball_p50)} for the ${r.baseline} baseline: ${imp.toFixed(1)}% lower.`,
    );
  } else if (imp < -0.5) {
    lines.push(
      `The model does not beat the ${r.baseline} baseline: its mean P50 pinball loss is ${Math.abs(imp).toFixed(1)}% higher (${num(s.mean_pinball_p50)} vs ${num(s.baseline_mean_pinball_p50)}).`,
    );
  } else {
    lines.push(`The model and the ${r.baseline} baseline are on par (P50 pinball loss within 0.5%).`);
  }
  const better = r.per_horizon.filter((h) => h.pinball_p50 < h.baseline_pinball_p50).length;
  lines.push(
    `The model has lower P50 pinball loss than the baseline at ${better} of ${r.per_horizon.length} horizons.`,
  );
  const gap = s.mean_coverage_90 - s.target_coverage;
  const under = r.per_horizon.filter((h) => h.coverage_90 < s.target_coverage).map((h) => h.h);
  if (Math.abs(gap) <= 0.01) {
    lines.push(`Mean P5–P95 coverage is ${pct(s.mean_coverage_90)}, close to the ${pct(s.target_coverage, 0)} target.`);
  } else if (gap < 0) {
    lines.push(
      `Mean P5–P95 coverage is ${pct(s.mean_coverage_90)}, below the ${pct(s.target_coverage, 0)} target: the corridor is too narrow, so gap alerts can be missed.`,
    );
  } else {
    lines.push(
      `Mean P5–P95 coverage is ${pct(s.mean_coverage_90)}, above the ${pct(s.target_coverage, 0)} target: the corridor is wider than needed, so alerts may be conservative.`,
    );
  }
  if (under.length && under.length < r.per_horizon.length) {
    lines.push(
      `Coverage falls below target at horizon${under.length === 1 ? "" : "s"} ${under.join(", ")} (days ahead).`,
    );
  }
  lines.push(
    `Scored on ${num(r.rows_evaluated)} account-day forecasts of synthetic data; this is not evidence of performance on real bank data.`,
  );
  return lines;
}

export function BacktestView() {
  const [form, setForm] = useState(DEFAULTS);
  const [params, setParams] = useState(DEFAULTS);
  const key = `backtest:${params.horizon_days}:${params.folds}:${params.step_days}`;
  const res = useApi(key, (s) => api.runBacktest(params, s));
  const r = res.data;

  const run = () => {
    if (JSON.stringify(form) === JSON.stringify(params)) res.reload();
    else setParams(form);
  };
  const setNum = (k: keyof BacktestRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

  return (
    <>
      <PageHeader
        title="Backtest"
        description="Rolling-origin evaluation: for each fold, train on history up to the cut-off, forecast the next days and score against actual ending balances. Baseline is a seasonal naive forecast (net flow from 7 days earlier, cumulated)."
      />
      <ErrorBanner error={res.error} onRetry={res.reload} retrying={res.loading} />

      {DEMO ? (
        <Card className="mb-4">
          <dl className="tabular grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(
              [
                ["Horizon", `${r?.horizon_days ?? DEFAULTS.horizon_days} days`],
                ["Folds", String(r?.folds ?? DEFAULTS.folds)],
                ["Step", `${r?.step_days ?? DEFAULTS.step_days} days`],
                ["Backend run time", r?.elapsed_seconds != null ? `${r.elapsed_seconds.toFixed(1)} s` : "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-muted">
            Precomputed by the backend with the default parameters. Change them and re-run in the self-hosted version (
            <code className="font-mono">docker compose up</code>).
          </p>
        </Card>
      ) : (
        <Card className="mb-4">
          <form
            className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <Field label="Horizon (days)">
              <input
                type="number"
                min={1}
                max={30}
                value={form.horizon_days}
                onChange={setNum("horizon_days")}
                className={inputClass}
              />
            </Field>
            <Field label="Folds">
              <input
                type="number"
                min={1}
                max={20}
                value={form.folds}
                onChange={setNum("folds")}
                className={inputClass}
              />
            </Field>
            <Field label="Step (days)">
              <input
                type="number"
                min={1}
                max={30}
                value={form.step_days}
                onChange={setNum("step_days")}
                className={inputClass}
              />
            </Field>
            <Button type="submit" variant="primary" disabled={res.loading}>
              {res.loading ? "Running…" : "Run backtest"}
            </Button>
          </form>
        </Card>
      )}

      {!r && res.loading && <Loading label="Running backtest…" />}

      {r && (
        <div className={`space-y-4 ${res.loading ? "opacity-60" : ""}`}>
          <Card title="Summary">
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Mean pinball P50 (model)" value={num(r.summary.mean_pinball_p50)} />
              <Stat label={`Mean pinball P50 (${r.baseline})`} value={num(r.summary.baseline_mean_pinball_p50)} />
              <Stat
                label="Improvement vs baseline"
                value={
                  <span className={r.summary.improvement_pct >= 0 ? "text-good" : "text-crit"}>
                    {Math.abs(r.summary.improvement_pct).toFixed(1)}%{" "}
                    {r.summary.improvement_pct >= 0 ? "lower loss" : "higher loss"}
                  </span>
                }
              />
              <Stat
                label="Mean P5–P95 coverage"
                value={pct(r.summary.mean_coverage_90)}
                hint={`target ${pct(r.summary.target_coverage, 0)}`}
              />
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              {summarize(r).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Pinball loss P50 by horizon" subtitle="Lower is better. Units: account currency.">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.per_horizon} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis dataKey="h" {...axisProps} tickFormatter={(h) => `${h}d`} />
                    <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={axisNumber} />
                    <Tooltip
                      {...tooltipStyle}
                      labelFormatter={(h) => `Horizon ${h} d`}
                      formatter={(v) => num(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      name="Model"
                      dataKey="pinball_p50"
                      stroke="var(--series-1)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      name={`Baseline (${r.baseline})`}
                      dataKey="baseline_pinball_p50"
                      stroke="var(--series-2)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 2.5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card
              title="P5–P95 interval coverage by horizon"
              subtitle="Share of actual balances inside the corridor. Target 0.90."
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.per_horizon} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis dataKey="h" {...axisProps} tickFormatter={(h) => `${h}d`} />
                    <YAxis
                      {...axisProps}
                      axisLine={false}
                      width={44}
                      domain={[0.6, 1]}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      labelFormatter={(h) => `Horizon ${h} d`}
                      formatter={(v) => pct(Number(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine
                      y={r.summary.target_coverage}
                      stroke="var(--ink-muted)"
                      strokeDasharray="4 3"
                      label={{ value: "target", position: "insideTopRight", fill: "var(--ink-muted)", fontSize: 11 }}
                    />
                    <Line
                      name="Coverage (90% interval)"
                      dataKey="coverage_90"
                      stroke="var(--series-1)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title="Per-horizon metrics"
            subtitle={`${r.folds} folds · step ${r.step_days} d · ${num(r.rows_evaluated)} rows evaluated`}
          >
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              <table className="tabular w-full min-w-[640px] text-right text-sm">
                <thead className="text-xs text-ink-muted">
                  <tr className="border-b border-line [&>th]:py-2 [&>th]:pl-3 [&>th]:font-medium">
                    <th className="text-left !pl-0">h</th>
                    <th>Pinball P5</th>
                    <th>Pinball P50</th>
                    <th>Pinball P95</th>
                    <th>Baseline pinball P50</th>
                    <th>MAE P50</th>
                    <th>Baseline MAE</th>
                    <th>Coverage 90</th>
                  </tr>
                </thead>
                <tbody>
                  {r.per_horizon.map((h) => (
                    <tr key={h.h} className="border-b border-line last:border-0 [&>td]:py-1.5 [&>td]:pl-3">
                      <td className="text-left !pl-0 text-ink-2">{h.h}</td>
                      <td>{num(h.pinball_p05)}</td>
                      <td className={h.pinball_p50 < h.baseline_pinball_p50 ? "font-semibold" : ""}>
                        {num(h.pinball_p50)}
                      </td>
                      <td>{num(h.pinball_p95)}</td>
                      <td className={h.baseline_pinball_p50 <= h.pinball_p50 ? "font-semibold" : ""}>
                        {num(h.baseline_pinball_p50)}
                      </td>
                      <td>{num(h.mae_p50)}</td>
                      <td>{num(h.baseline_mae)}</td>
                      <td className={h.coverage_90 < r.summary.target_coverage ? "text-warn" : ""}>
                        {pct(h.coverage_90)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Bold marks the lower pinball P50 per row. Coverage below target is highlighted.
            </p>
          </Card>

          <Card title="Folds">
            <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
              <table className="tabular w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs text-ink-muted">
                  <tr className="border-b border-line [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
                    <th>Fold</th>
                    <th>Train end</th>
                    <th>Test start</th>
                    <th>Test end</th>
                  </tr>
                </thead>
                <tbody>
                  {r.folds_detail.map((f) => (
                    <tr key={f.fold} className="border-b border-line last:border-0 [&>td]:py-1.5 [&>td]:pr-3">
                      <td>{f.fold}</td>
                      <td>{shortDate(f.train_end)}</td>
                      <td>{shortDate(f.test_start)}</td>
                      <td>{shortDate(f.test_end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
