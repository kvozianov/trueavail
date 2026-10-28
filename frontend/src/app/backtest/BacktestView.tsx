"use client";

import { useId, useState } from "react";
import { BacktestCharts, BacktestStats, WeakSpots, backtestHeadline } from "@/components/backtest/BacktestProof";
import { Button, Chip, ErrorBanner, Field, PageTitle, Skeleton, Tabs, inputClass, tabPanelProps } from "@/components/ui";
import { DEMO, api } from "@/lib/api";
import { num, ratio, shortDate } from "@/lib/format";
import type { BacktestRequest, BacktestResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const DEFAULTS: Required<BacktestRequest> = { horizon_days: 14, folds: 6, step_days: 7 };
type Tab = "summary" | "horizon" | "folds" | "json";

function Summary({ r }: { r: BacktestResponse }) {
  return (
    <p className="max-w-[72ch] text-[15px] leading-relaxed text-ink-2">
      Rolling origin: for each of {r.folds} folds the ensemble is retrained on history up to the cut-off and scores the next {r.horizon_days} days against actual balances;
      the baseline repeats the net flow from 7 days earlier. {num(r.rows_evaluated)} account-days were scored. Scheduled payments are not replayed, and the data is
      synthetic, so this measures the method, not real-world accuracy.
    </p>
  );
}

function PerHorizon({ r }: { r: BacktestResponse }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[720px] text-right text-[13.5px] tnum">
        <caption className="t-small pb-3 text-left">Bold marks the lower P50 pinball loss per row; coverage under target is amber.</caption>
        <thead>
          <tr className="border-b border-hairline text-[12.5px] text-ink-3 [&>th]:py-2 [&>th]:pl-3 [&>th]:font-medium">
            <th className="!pl-0 text-left">h</th>
            <th>Pinball P5</th>
            <th>Pinball P50</th>
            <th>Pinball P95</th>
            <th>Baseline P50</th>
            <th>MAE P50</th>
            <th>Baseline MAE</th>
            <th>Coverage 90</th>
          </tr>
        </thead>
        <tbody>
          {r.per_horizon.map((h) => {
            const win = h.pinball_p50 < h.baseline_pinball_p50;
            const under = h.coverage_90 < r.summary.target_coverage;
            return (
              <tr key={h.h} className="border-b border-hairline text-ink-2 last:border-0 [&>td]:py-2 [&>td]:pl-3">
                <td className="!pl-0 text-left font-mono">{h.h}</td>
                <td>{num(h.pinball_p05)}</td>
                <td className={win ? "font-semibold text-ink" : ""}>{num(h.pinball_p50)}</td>
                <td>{num(h.pinball_p95)}</td>
                <td className={!win ? "font-semibold text-ink" : ""}>{num(h.baseline_pinball_p50)}</td>
                <td>{num(h.mae_p50)}</td>
                <td>{num(h.baseline_mae)}</td>
                <td className={under ? "font-semibold text-warn" : ""}>{ratio(h.coverage_90, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Folds({ r }: { r: BacktestResponse }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[460px] text-left text-[13.5px] tnum">
        <thead>
          <tr className="border-b border-hairline text-[12.5px] text-ink-3 [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
            <th>Fold</th>
            <th>Train end</th>
            <th>Test window</th>
          </tr>
        </thead>
        <tbody>
          {r.folds_detail.map((f) => (
            <tr key={f.fold} className="border-b border-hairline text-ink-2 last:border-0 [&>td]:py-2 [&>td]:pr-3">
              <td className="font-mono">{f.fold}</td>
              <td>{shortDate(f.train_end)}</td>
              <td>
                {shortDate(f.test_start)} – {shortDate(f.test_end)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BacktestView() {
  const [form, setForm] = useState(DEFAULTS);
  const [params, setParams] = useState(DEFAULTS);
  const [tab, setTab] = useState<Tab>("summary");
  const idBase = useId();
  const res = useApi(`backtest:${params.horizon_days}:${params.folds}:${params.step_days}`, (s) => api.runBacktest(params, s));
  const r = res.data;
  const setNum = (k: keyof BacktestRequest) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));

  return (
    <div className="container-page pb-8">
      <PageTitle
        eyebrow={r ? `Backtest · rolling origin · ${r.folds} folds · ${r.step_days}-day step · ${num(r.rows_evaluated)} scored account-days` : "Backtest · rolling origin"}
        title={r ? backtestHeadline(r) : <Skeleton className="h-10 w-[min(640px,80vw)]" />}
        actions={DEMO && r?.elapsed_seconds != null ? <Chip tone="mono">precomputed · {r.elapsed_seconds.toFixed(2)} s on the backend</Chip> : undefined}
      />
      <ErrorBanner error={res.error} onRetry={res.reload} retrying={res.loading} />
      {!DEMO && (
        <form
          className="card-tonal mb-6 grid grid-cols-2 items-end gap-4 p-5 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (JSON.stringify(form) === JSON.stringify(params)) res.reload();
            else setParams(form);
          }}
        >
          <Field label="Horizon (days)">
            <input type="number" min={1} max={30} value={form.horizon_days} onChange={setNum("horizon_days")} className={inputClass} />
          </Field>
          <Field label="Folds">
            <input type="number" min={1} max={20} value={form.folds} onChange={setNum("folds")} className={inputClass} />
          </Field>
          <Field label="Step (days)">
            <input type="number" min={1} max={30} value={form.step_days} onChange={setNum("step_days")} className={inputClass} />
          </Field>
          <Button type="submit" variant="accent" loading={res.loading} disabled={res.loading}>
            {res.loading ? "Running…" : "Run backtest"}
          </Button>
        </form>
      )}
      {!r && res.loading && (
        <div className="space-y-6">
          <Skeleton className="h-36 w-full rounded-3" />
          <Skeleton className="h-72 w-full rounded-3" />
        </div>
      )}
      {r && (
        <div className={`space-y-6 ${res.loading ? "opacity-60" : ""}`}>
          <BacktestStats bt={r} />
          <BacktestCharts bt={r} />
          <section className="card min-w-0 p-5 sm:p-6">
            <Tabs
              idBase={idBase}
              label="Backtest details"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "summary", label: "Summary" },
                { value: "horizon", label: "Per horizon" },
                { value: "folds", label: "Folds" },
                { value: "json", label: "Raw JSON" },
              ]}
            />
            <div className="pt-5" {...tabPanelProps(idBase, tab)}>
              {tab === "summary" && <Summary r={r} />}
              {tab === "horizon" && <PerHorizon r={r} />}
              {tab === "folds" && <Folds r={r} />}
              {tab === "json" && (
                <pre className="max-h-96 overflow-auto rounded-2 bg-bg-2 p-4 font-mono text-[12px] leading-relaxed text-ink-2">{JSON.stringify(r, null, 2)}</pre>
              )}
            </div>
          </section>
          <WeakSpots bt={r} />
        </div>
      )}
    </div>
  );
}
