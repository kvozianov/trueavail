/** The nine pipeline stages, each with one real number from the backend's output. */
import { backtestFacts } from "@/lib/derive";
import { dayMonth, money, num, pctValue, ranges, ratio, shortDate } from "@/lib/format";
import type { Account, AlertsResponse, BacktestResponse, DatasetInfo, ExplainResponse, ForecastResponse, ScheduledFlow } from "@/lib/types";

export interface StageData {
  dataset: DatasetInfo;
  explain: ExplainResponse;
  forecast: ForecastResponse;
  backtest: BacktestResponse;
  alerts: AlertsResponse;
  accounts: Account[];
  scheduled: ScheduledFlow[];
  /** Number of precomputed what-if scenarios (demo); null when what-if runs live. */
  scenarios: number | null;
}

export interface Stage {
  id: string;
  n: string;
  name: string;
  /** Box title(s) in the diagram; three for the split stages 04 and 07. */
  boxes: { title: string; metric: string }[];
  headline: string;
  body: string;
  big: string;
  bigLabel: string;
  gap?: boolean;
}

export function buildStages(d: StageData): Stage[] {
  const e = d.explain;
  const t = e.training;
  const w = e.model.weights;
  const fb = d.forecast.first_breach;
  const acc = fb ? d.accounts.find((a) => a.account_id === fb.account_id) : undefined;
  const bt = d.backtest;
  const f = backtestFacts(bt);
  const flowsByAcc = fb ? d.scheduled.filter((s) => s.account_id === fb.account_id) : [];
  const out = fb ? flowsByAcc.filter((s) => s.direction === "outflow" && s.effective_date <= fb.date).sort((a, b) => b.amount - a.amount)[0] : undefined;
  const late = flowsByAcc.filter((s) => s.direction === "inflow" && s.effective_date !== s.expected_date).sort((a, b) => b.amount - a.amount)[0];
  const daysPerAccount = d.dataset.accounts ? Math.round(d.dataset.rows / d.dataset.accounts) : d.dataset.rows;
  const nAcc = d.accounts.length;
  const corridorPoints = d.forecast.points.length;
  const lgb = e.model.n_estimators.lightgbm_quantile;
  const gb = e.model.n_estimators.sklearn_gbdt_quantile;
  const wl = (k: string) => num(w[k] ?? 0, 2);
  const gapDays = d.alerts.per_account.length;
  const fiTop = e.feature_importance.features[0];
  const weak = f.worse.length ? `h = ${ranges(f.worse.map((x) => x.h))}` : null;

  return [
    {
      id: "data",
      n: "01",
      name: "Synthetic generator / CSV upload",
      boxes: [{ title: "Synthetic generator / CSV upload", metric: `${num(d.dataset.rows)} rows · ${d.dataset.accounts} accounts${d.dataset.seed != null ? ` · seed ${d.dataset.seed}` : ""}` }],
      headline: "One row per account per day, plus the payments already scheduled.",
      body: `${d.dataset.accounts} accounts × ${daysPerAccount} days of balances and net flows, ${dayMonth(d.dataset.start)} – ${dayMonth(d.dataset.end)} ${d.dataset.end.slice(0, 4)}, produced by a seeded generator or uploaded as CSV and validated row by row. ${d.scheduled.length} known future payments come with it.`,
      big: num(d.dataset.rows),
      bigLabel: `rows · ${d.dataset.accounts} accounts × ${daysPerAccount} days`,
    },
    {
      id: "pg",
      n: "02",
      name: "PostgreSQL",
      boxes: [{ title: "PostgreSQL", metric: `datasets · ${d.scheduled.length} scheduled flows · runs` }],
      headline: "Datasets, scheduled flows and every forecast run are stored.",
      body: "The backend keeps the active dataset, its scheduled payments and a record of each forecast, backtest and what-if run in PostgreSQL (SQLite in the tests), so a run can be traced back to its inputs.",
      big: num(d.scheduled.length),
      bigLabel: "scheduled flows in the forecast window",
    },
    {
      id: "features",
      n: "03",
      name: "Feature engineering",
      boxes: [{ title: "Feature engineering", metric: `${t.feature_columns.length} features · ${num(t.rows_trainable)} trainable rows` }],
      headline: `${t.feature_columns.length} features per account-day, placed on the day money actually settles.`,
      body: `Calendar and holidays, net-flow lags of 1, 2 and 7 days, a 7-day mean and volatility, an EWMA and a MAD anomaly score.${late ? ` Known payments move to their effective date for the payment rail: the ${dayMonth(late.expected_date)} ${late.description.split(" from ")[0]} lands on ${dayMonth(late.effective_date)}.` : ""}`,
      big: num(t.rows_trainable),
      bigLabel: `trainable rows out of ${num(t.history_rows)} · ${t.anomaly_rows} anomalies flagged · ${t.known_event_rows} known-event rows`,
    },
    {
      id: "models",
      n: "04",
      name: "Three quantile models",
      boxes: [
        { title: "LightGBM", metric: lgb ? `${lgb} trees` : "quantile loss" },
        { title: "GBDT", metric: gb ? `${gb} trees` : "quantile loss" },
        { title: "EWMA", metric: "volatility baseline" },
      ],
      headline: "Three models each predict the 5th, 50th and 95th percentile of tomorrow's net flow.",
      body: `LightGBM and scikit-learn gradient boosting are trained with a quantile loss, so they learn the percentiles directly; the EWMA + rolling-volatility baseline keeps the forecast sensible when the trees have little to go on.${fiTop ? ` The strongest LightGBM feature is ${fiTop.label.toLowerCase()} (${pctValue(fiTop.share * 100)} of the gain).` : ""}`,
      big: `${lgb ?? "—"} + ${gb ?? "—"}`,
      bigLabel: "boosted trees per quantile, plus the EWMA baseline",
    },
    {
      id: "blend",
      n: "05",
      name: "Weighted quantile blend",
      boxes: [{ title: "Weighted quantile blend", metric: `${wl("lightgbm_quantile")} · ${wl("sklearn_gbdt_quantile")} · ${wl("ewma_volatility_baseline")}` }],
      headline: "The three forecasts are averaged quantile by quantile.",
      body: `P5 with P5, P50 with P50, P95 with P95, weighted ${wl("lightgbm_quantile")} LightGBM, ${wl("sklearn_gbdt_quantile")} gradient boosting and ${wl("ewma_volatility_baseline")} EWMA. The weights are fixed in the code, not tuned on the test folds.`,
      big: `${wl("lightgbm_quantile")} · ${wl("sklearn_gbdt_quantile")} · ${wl("ewma_volatility_baseline")}`,
      bigLabel: "blend weights",
    },
    {
      id: "corridor",
      n: "06",
      name: "Balance corridor",
      boxes: [{ title: "Balance corridor P5 / P50 / P95", metric: `${d.forecast.horizon_days} days × ${nAcc} accounts = ${corridorPoints} points` }],
      headline: "Start balance + scheduled flows + cumulated daily quantiles, day by day.",
      body:
        fb && acc
          ? `Each day's blended net-flow quantiles are added to today's settled balance and shifted by the known payments. ${acc.bank_name} ${acc.label} holds ${money(acc.settled_balance, acc.currency)} against a ${money(acc.required_buffer, acc.currency)} buffer${out ? `; the ${money(out.amount, acc.currency)} ${out.description} leaves on ${dayMonth(out.effective_date)}` : ""}${late && late.account_id === acc.account_id ? ` while the ${money(late.amount, acc.currency)} ${late.description.split(" from ")[0]} only settles on ${dayMonth(late.effective_date)}` : ""}.`
          : "Each day's blended net-flow quantiles are added to today's settled balance and shifted by the known payments. The result is a corridor, not a number.",
      big: fb && acc ? money(fb.balance_p05, acc.currency) : `${corridorPoints}`,
      bigLabel: fb && acc ? `${acc.bank_name.replace(/\s+Bank$/i, "")} ${acc.label} · P5 on ${dayMonth(fb.date)} · ${money(fb.required_buffer - fb.balance_p05, acc.currency)} below the buffer` : "corridor points",
      gap: !!fb,
    },
    {
      id: "uses",
      n: "07",
      name: "Alerts · What-if · Backtest",
      boxes: [
        { title: "Alerts", metric: `${gapDays} gap days` },
        { title: "What-if", metric: d.scenarios != null ? `${d.scenarios} scenarios` : "edit flows, re-run" },
        { title: "Backtest", metric: `${bt.summary.improvement_pct >= 0 ? "−" : "+"}${pctValue(Math.abs(bt.summary.improvement_pct))} loss` },
      ],
      headline: "The corridor feeds three tools.",
      body: `Alerts flag the days where P5 drops under the buffer (${gapDays} in ${d.forecast.horizon_days} days${fb ? `, the first on ${shortDate(fb.date)}` : ""}). What-if re-runs the corridor with edited payments. The rolling backtest scores the model on ${bt.folds} past cut-offs: ${pctValue(bt.summary.improvement_pct)} lower P50 pinball loss than a seasonal-naive baseline, coverage ${ratio(bt.summary.mean_coverage_90)} against ${ratio(bt.summary.target_coverage, 2)}${weak ? `, worse at ${weak}` : ""}.`,
      big: pctValue(bt.summary.improvement_pct),
      bigLabel: `lower loss than the baseline · ${f.better} / ${f.total} horizons better`,
    },
    {
      id: "api",
      n: "08",
      name: "FastAPI",
      boxes: [{ title: "FastAPI", metric: "JSON endpoints · OpenAPI at /docs" }],
      headline: "A Python API serves the whole pipeline as JSON.",
      body: "Forecast, explain, alerts, what-if, backtest, data upload and validation are FastAPI endpoints with typed request and response schemas; the interactive OpenAPI docs run at /docs.",
      big: `${bt.elapsed_seconds != null ? `${bt.elapsed_seconds.toFixed(1)} s` : "—"}`,
      bigLabel: `for the full ${bt.folds}-fold backtest on the backend`,
    },
    {
      id: "web",
      n: "09",
      name: "Next.js dashboard",
      boxes: [{ title: "Next.js dashboard", metric: "static export · live with docker" }],
      headline: "This site: the same dashboard, either live or precomputed.",
      body: "Self-hosted, the Next.js dashboard calls the API. The hosted demo is a static export that reads the backend's responses saved as JSON; every number on it came from the real backend.",
      big: `${nAcc}`,
      bigLabel: "accounts on the dashboard",
    },
  ];
}
