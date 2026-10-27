import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEMO } from "@/lib/api";
import { money, num, shortDate } from "@/lib/format";
import { REPO_URL } from "@/lib/links";
import type { Account, BacktestResponse, ForecastResponse, HistoryRow, ScheduledFlow } from "@/lib/types";
// Precomputed backend output (backend/scripts/export_demo.py, `make demo-data`), read at build time.
import accountsJson from "../../../public/demo/accounts.json";
import backtestJson from "../../../public/demo/backtest.json";
import forecastJson from "../../../public/demo/forecast.json";
import historyJson from "../../../public/demo/history.json";
import scheduledJson from "../../../public/demo/scheduled.json";
import { CorridorSketch } from "./CorridorSketch";
import { PipelineDiagram } from "./PipelineDiagram";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What TrueAvail forecasts, how the pipeline and the quantile model work, how well it does in a backtest, and what it does not do.",
};

const backtest = backtestJson as unknown as BacktestResponse;
const forecast = forecastJson as unknown as ForecastResponse;
const accounts = accountsJson as Account[];
const history = historyJson as HistoryRow[];
const scheduled = scheduledJson as ScheduledFlow[];

const COMPONENT_NAMES: Record<string, string> = {
  lightgbm_quantile: "LightGBM quantile regression",
  sklearn_gbdt_quantile: "scikit-learn gradient boosting (quantile loss)",
  ewma_volatility_baseline: "EWMA + rolling-volatility baseline",
};

/** "1–3, 5" from [1, 2, 3, 5]. */
function ranges(xs: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    let j = i;
    while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
    out.push(i === j ? `${xs[i]}` : `${xs[i]}–${xs[j]}`);
    i = j;
  }
  return out.join(", ");
}

/** The worked example: the first forecast cash gap and the payments behind it. */
function example() {
  const breach = forecast.first_breach;
  if (!breach) return null;
  const acc = accounts.find((a) => a.account_id === breach.account_id);
  const flows = scheduled.filter((f) => f.account_id === breach.account_id);
  const outflow = flows
    .filter((f) => f.direction === "outflow" && f.effective_date <= breach.date)
    .sort((a, b) => b.amount - a.amount)[0];
  const lateInflow = flows
    .filter((f) => f.direction === "inflow" && f.effective_date > breach.date)
    .sort((a, b) => b.amount - a.amount)[0];
  if (!acc || !outflow) return null;
  return { breach, acc, outflow, lateInflow };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-ink-2">{children}</p>;
}

export default function Page() {
  const ex = example();
  const s = backtest.summary;
  const worse = backtest.per_horizon.filter((h) => h.pinball_p50 > h.baseline_pinball_p50).map((h) => h.h);
  const under = backtest.per_horizon.filter((h) => h.coverage_90 < s.target_coverage).map((h) => h.h);
  const better = backtest.per_horizon.length - worse.length;
  const laterOnTarget =
    under.length > 0 &&
    backtest.per_horizon.some((h) => h.h > Math.max(...under)) &&
    backtest.per_horizon.filter((h) => h.h > Math.max(...under)).every((h) => h.coverage_90 >= s.target_coverage);
  const shown = backtest.per_horizon.filter((h) => [1, 2, 3, 4, 5, 7, 10, 14].includes(h.h));
  const weights = Object.entries(forecast.model.weights).sort((a, b) => b[1] - a[1]);
  const exPoints = ex ? forecast.points.filter((p) => p.account_id === ex.acc.account_id) : [];
  const exHistory = ex ? history.filter((h) => h.account_id === ex.acc.account_id) : [];

  return (
    <article className="mx-auto max-w-3xl space-y-10 pb-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">How TrueAvail works</h1>
        <P>
          TrueAvail looks two weeks ahead at a company&apos;s bank accounts and asks one question: on which days could
          an account run short of the cash it must keep? It answers with a range rather than a single number, checks
          that range against history, and lets you test what changes if a payment moves.
        </P>
      </header>

      <Section id="problem" title="The problem: book cash is not usable cash">
        <P>
          The balance a bank shows today is <em>book</em> cash. Only part of it can actually be spent. Each account has
          a <strong className="text-ink">required buffer</strong> it must not fall below (a safety margin set by the
          treasury or a regulator), and payments do not land the moment they are agreed: card settlements arrive days
          after the sale, transfers wait for their payment rail and bank holidays. A company can therefore be
          profitable, have plenty of money on paper and still miss a payment on a Tuesday.
        </P>
        <P>
          A day on which the balance is expected to drop below the buffer is a{" "}
          <strong className="text-ink">cash gap</strong>. Finding gaps early leaves time to move money between accounts,
          delay a payout or arrange credit.
        </P>
        {ex && (
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm leading-relaxed text-ink-2">
              <span className="font-medium text-ink">Example from the default synthetic dataset.</span>{" "}
              {ex.acc.bank_name} {ex.acc.label} holds {money(ex.acc.settled_balance, ex.acc.currency)} against a{" "}
              {money(ex.acc.required_buffer, ex.acc.currency)} buffer. A {money(ex.outflow.amount, ex.acc.currency)}{" "}
              {ex.outflow.description} leaves on {shortDate(ex.outflow.effective_date)}
              {ex.lateInflow ? (
                <>
                  , while a {money(ex.lateInflow.amount, ex.acc.currency)} {ex.lateInflow.description} expected on{" "}
                  {shortDate(ex.lateInflow.expected_date)} only settles on {shortDate(ex.lateInflow.effective_date)}
                </>
              ) : null}
              . In the pessimistic case the balance on {shortDate(ex.breach.date)} is{" "}
              <span className="whitespace-nowrap">{money(ex.breach.balance_p05, ex.acc.currency)}</span>, a gap of{" "}
              {money(ex.breach.required_buffer - ex.breach.balance_p05, ex.acc.currency)} below the buffer.
            </p>
            <div className="mt-3">
              <CorridorSketch points={exPoints} history={exHistory} currency={ex.acc.currency} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Solid line: actual balance. Blue band: P5–P95 forecast, line P50, dashed P5. Red dashed line: required
              buffer; shaded days are cash gaps.
            </p>
          </div>
        )}
      </Section>

      <Section id="pipeline" title="The pipeline">
        <P>
          The input is one row per account per day (balance and net flow) plus the payments that are already known for
          the coming weeks. Everything else is computed by the backend, step by step:
        </P>
        <PipelineDiagram />
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">Features.</strong> For every day the model sees the calendar (weekday, month
            end, bank holidays), recent history (net flow 1, 2 and 7 days ago, a 7-day average and volatility, an
            exponentially weighted average), an anomaly score for unusual days, and the known payments placed on the
            date they will actually settle for their payment rail.
          </li>
          <li>
            <strong className="text-ink">Quantile ensemble.</strong> Three models predict each future day&apos;s net
            flow, not as one number but as three: a pessimistic, a middle and an optimistic value.
          </li>
          <li>
            <strong className="text-ink">Corridor.</strong> Starting from today&apos;s balance, the known payments and
            the predicted daily flows are added up day by day into a 14-day balance corridor.
          </li>
          <li>
            <strong className="text-ink">Uses.</strong> Alerts flag the days where the pessimistic edge crosses the
            buffer; what-if re-runs the corridor with edited payments; the backtest replays the model on past data and
            scores it.
          </li>
        </ol>
        <P>
          The backend is a Python FastAPI service, datasets and forecast runs are stored in PostgreSQL, and the
          dashboard is a Next.js app. <code className="font-mono text-sm">docker compose up</code> starts all three.
        </P>
      </Section>

      <Section id="model" title="The model">
        <P>
          The daily forecast is a weighted average of three models. Two are gradient-boosted decision trees trained with
          a quantile loss, so they learn the 5th, 50th and 95th percentile directly; the third is a simple statistical
          baseline that keeps the forecast sensible when the trees have little to go on. Weights in the current run:
        </P>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
          {weights.map(([name, w]) => (
            <li key={name} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-ink-2">{COMPONENT_NAMES[name] ?? name}</span>
              <span className="tabular font-medium text-ink">{num(w, 2)}</span>
            </li>
          ))}
        </ul>
        <dl className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["P5", "Pessimistic. The balance should fall below this line on only about 1 day in 20. Alerts use it."],
              ["P50", "The median: as likely to end up above as below."],
              ["P95", "Optimistic. The balance should exceed it on only about 1 day in 20."],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-surface p-3">
              <dt className="font-mono text-sm font-semibold text-ink">{k}</dt>
              <dd className="mt-1 text-sm text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
        <P>
          A cash gap is a day where P5 is below the required buffer; it is marked red when the shortfall exceeds 10 % of
          the buffer, amber otherwise. The daily quantiles are summed into the corridor, which is deliberately on the
          wide side: in the backtest a narrower statistical band covered far too few actual balances.
        </P>
      </Section>

      <Section id="backtest" title="Does it work? The backtest">
        <P>
          A forecast is only useful if it beats something simple. The backtest replays history: it cuts the data at{" "}
          {backtest.folds} past dates {backtest.step_days} days apart, trains only on what was known before each cut,
          forecasts the next {backtest.horizon_days} days and compares with what actually happened (
          {num(backtest.rows_evaluated)} account-days in total). The yardstick is a seasonal-naive forecast: &quot;each
          day repeats the same weekday last week&quot;.
        </P>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-xs text-ink-muted">Error (pinball loss, P50)</div>
            <div className="tabular mt-1 text-sm text-ink">
              <span className="font-semibold">{num(s.mean_pinball_p50)}</span> model vs{" "}
              {num(s.baseline_mean_pinball_p50)} baseline
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-xs text-ink-muted">Improvement over baseline</div>
            <div className={`tabular mt-1 text-sm font-semibold ${s.improvement_pct >= 0 ? "text-good" : "text-crit"}`}>
              {Math.abs(s.improvement_pct).toFixed(1)} % {s.improvement_pct >= 0 ? "lower error" : "higher error"}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <div className="text-xs text-ink-muted">P5–P95 coverage</div>
            <div className="tabular mt-1 text-sm text-ink">
              <span className="font-semibold">{s.mean_coverage_90.toFixed(3)}</span> vs target{" "}
              {s.target_coverage.toFixed(2)}
            </div>
          </div>
        </div>
        <P>
          <strong className="text-ink">Pinball loss</strong> is the standard error measure for forecasts of a
          percentile: lower is better, and it is in the account&apos;s currency.{" "}
          <strong className="text-ink">Coverage</strong> is the share of actual balances that landed inside the P5–P95
          corridor; for a 90 % corridor it should be close to 0.90.
        </P>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="tabular w-full min-w-[480px] text-right text-sm">
            <caption className="mb-2 text-left text-xs text-ink-muted">
              By days ahead (h). Units: account currency, averaged across accounts.
            </caption>
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-line [&>th]:py-2 [&>th]:pl-3 [&>th]:font-medium">
                <th className="!pl-0 text-left">h (days)</th>
                <th>Model P50 loss</th>
                <th>Baseline loss</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h) => (
                <tr key={h.h} className="border-b border-line last:border-0 [&>td]:py-1.5 [&>td]:pl-3">
                  <td className="!pl-0 text-left text-ink-2">{h.h}</td>
                  <td className={h.pinball_p50 > h.baseline_pinball_p50 ? "text-crit" : "text-ink"}>
                    {num(h.pinball_p50)}
                  </td>
                  <td className="text-ink-2">{num(h.baseline_pinball_p50)}</td>
                  <td className={h.coverage_90 < s.target_coverage ? "text-warn" : "text-ink"}>
                    {h.coverage_90.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-bg)] p-4 text-sm leading-relaxed text-ink-2">
          <p className="font-medium text-warn">Where it is weak</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              The model beats the baseline at {better} of {backtest.per_horizon.length} horizons
              {worse.length ? (
                <>
                  ; at h = {ranges(worse)} it is worse (P50 loss{" "}
                  {worse
                    .map((h) => backtest.per_horizon.find((r) => r.h === h)!)
                    .map((r) => `${num(r.pinball_p50)} vs ${num(r.baseline_pinball_p50)}`)
                    .join(", ")}
                  )
                </>
              ) : null}
              .
            </li>
            {under.length > 0 && (
              <li>
                The corridor is too narrow at h = {ranges(under)}: coverage{" "}
                {under.map((h) => backtest.per_horizon.find((r) => r.h === h)!.coverage_90.toFixed(2)).join(", ")}{" "}
                against {s.target_coverage.toFixed(2)}, so near-term gaps can be missed.
                {laterOnTarget ? ` From h = ${Math.max(...under) + 1} on, coverage is at or above target.` : ""}
              </li>
            )}
            <li>The backtest scores the model on history only; known scheduled payments are not replayed.</li>
          </ul>
        </div>
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">Synthetic data.</strong> The default dataset (5 accounts × 120 days, fixed
            seed) is generated by a known process, so the backtest numbers describe the method, not accuracy on real
            company cash flows.
          </li>
          <li>
            <strong className="text-ink">Not calibrated on real banks.</strong> Buffers, settlement delays and holidays
            are reference tables in the repository, not data from actual banks.
          </li>
          <li>
            <strong className="text-ink">No bank connections.</strong> Data comes from the generator or a CSV upload.
            Nothing is paid, approved or moved; what-if only changes forecast inputs.
          </li>
          <li>
            <strong className="text-ink">No FX.</strong> Consolidated alerts add up accounts per currency; there is no
            currency conversion.
          </li>
          {DEMO ? (
            <li>
              <strong className="text-ink">This hosted demo is precomputed.</strong> Every number in it was produced by
              the real backend on the default dataset and saved as JSON (
              <code className="font-mono text-sm">make demo-data</code>). The full interactive pipeline (your own CSV,
              any what-if, new backtests) runs locally with <code className="font-mono text-sm">docker compose up</code>
              .
            </li>
          ) : (
            <li>
              <strong className="text-ink">Numbers on this page</strong> come from a saved backend run on the default
              dataset (<code className="font-mono text-sm">make demo-data</code>); the Backtest page re-runs it live.
            </li>
          )}
        </ul>
        <p className="text-sm text-ink-2">
          Source code, tests and setup:{" "}
          <a href={REPO_URL} className="font-medium text-series-1 underline underline-offset-2">
            github.com/kvozianov/trueavail
          </a>
        </p>
      </Section>
    </article>
  );
}
