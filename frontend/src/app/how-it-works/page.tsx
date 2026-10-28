import type { Metadata } from "next";
import { BacktestStats, WeakSpots, backtestHeadline } from "@/components/backtest/BacktestProof";
import { PipelineStory } from "@/components/how-it-works/PipelineStory";
import { buildStages } from "@/components/how-it-works/stages";
import { Bars } from "@/components/charts/Bars";
import { SectionEyebrow } from "@/components/ui";
import { DEMO } from "@/lib/api";
import { COMPONENT_COLOR, COMPONENT_LABEL } from "@/lib/derive";
import { money, num, numberWord, shortDate } from "@/lib/format";
import { REPO_URL } from "@/lib/links";
import type { Account, AlertsResponse, BacktestResponse, DemoScenarioSummary, ExplainResponse, ForecastResponse, HealthResponse, ScheduledFlow } from "@/lib/types";
// Precomputed backend output (backend/scripts/export_demo.py, `make demo-data`), read at build time.
import accountsJson from "../../../public/demo/accounts.json";
import alertsJson from "../../../public/demo/alerts.json";
import backtestJson from "../../../public/demo/backtest.json";
import explainJson from "../../../public/demo/explain.json";
import forecastJson from "../../../public/demo/forecast.json";
import healthJson from "../../../public/demo/health.json";
import scenariosJson from "../../../public/demo/scenarios/index.json";
import scheduledJson from "../../../public/demo/scheduled.json";

export const metadata: Metadata = {
  title: "How it works",
  description: "From a CSV to a cash gap in nine stages: data, features, a quantile ML ensemble, the balance corridor, alerts, what-if and the rolling backtest. Synthetic data.",
};

const accounts = accountsJson as Account[];
const backtest = backtestJson as unknown as BacktestResponse;
const explain = explainJson as unknown as ExplainResponse;
const forecast = forecastJson as unknown as ForecastResponse;
const health = healthJson as unknown as HealthResponse;
const alerts = alertsJson as unknown as AlertsResponse;
const scheduled = scheduledJson as ScheduledFlow[];
const scenarios = scenariosJson as unknown as DemoScenarioSummary[];

export default function Page() {
  const stages = buildStages({ dataset: health.dataset, explain, forecast, backtest, alerts, accounts, scheduled, scenarios: scenarios.length });
  const weights = Object.entries(explain.model.weights).sort((a, b) => b[1] - a[1]);
  const fb = forecast.first_breach;
  const fbAcc = fb ? accounts.find((a) => a.account_id === fb.account_id) : null;
  return (
    <article>
      <header className="container-page pb-8 pt-12 sm:pt-16">
        <SectionEyebrow>How it works · {stages.length} stages</SectionEyebrow>
        <h1 className="t-display-l mt-4 max-w-[18ch]">From a CSV to a cash gap, in {numberWord(stages.length)} stages.</h1>
        <p className="t-lead mt-5 max-w-[60ch]">
          TrueAvail looks two weeks ahead at a company&apos;s bank accounts and asks one question: on which days could an account run short of the cash it must keep? It
          answers with a range rather than a single number, checks that range against history, and lets you test what changes if a payment moves.
        </p>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
          The balance a bank shows today is <em>book</em> cash; only part of it can be spent. Each account has a <strong className="text-ink">required buffer</strong> it
          must not fall below, and payments land days after they are agreed. A day on which the pessimistic balance drops under the buffer is a{" "}
          <strong className="text-ink">cash gap</strong>
          {fb && fbAcc ? (
            <>
              {" "}
              . In the default synthetic dataset the first one is {fbAcc.bank_name} {fbAcc.label} on {shortDate(fb.date)}, {money(fb.required_buffer - fb.balance_p05, fbAcc.currency)} short.
            </>
          ) : (
            "."
          )}
        </p>
        <p className="t-small mt-4">
          Every number below comes from {DEMO ? "the backend's precomputed run shown on this demo" : "a saved backend run on the default dataset (make demo-data); the other pages call the live API"}.
        </p>
      </header>

      <div className="container-page">
        <PipelineStory stages={stages} />
      </div>

      <section className="container-page py-16" aria-labelledby="model-h">
        <SectionEyebrow>The model</SectionEyebrow>
        <h2 id="model-h" className="t-h2 mt-3 max-w-[30ch]">
          A quantile ML ensemble: three models, averaged percentile by percentile.
        </h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-2">
            <p>
              Two gradient-boosted tree models are trained with a quantile loss, so they learn the 5th, 50th and 95th percentile of the next day&apos;s net flow directly;
              the third is an EWMA + rolling-volatility baseline that keeps the forecast sensible when the trees have little to go on.
            </p>
            <p>
              <strong className="text-ink">P5</strong> is the pessimistic edge (the balance should fall below it on about 1 day in 20) and is what alerts use.{" "}
              <strong className="text-ink">P50</strong> is the median. <strong className="text-ink">P95</strong> is the optimistic edge. A gap is red when the shortfall is
              more than 10 % of the buffer, amber otherwise.
            </p>
            <p>
              The daily quantiles are summed into the corridor, which is deliberately on the wide side: in the backtest a narrower statistical band covered far too few
              actual balances.
            </p>
          </div>
          <div className="card p-5 sm:p-6">
            <p className="t-h4">Blend weights in this run</p>
            <p className="t-small mb-4 mt-0.5">
              {explain.training.feature_columns.length} features · {num(explain.training.rows_trainable)} trainable rows
            </p>
            <Bars
              labelWidth="minmax(0,1.2fr)"
              rows={weights.map(([k, w]) => ({ key: k, label: COMPONENT_LABEL[k] ?? k, value: w, share: w, color: COMPONENT_COLOR[k], display: num(w, 2) }))}
            />
          </div>
        </div>
      </section>

      <section className="container-page space-y-6 pb-16" aria-labelledby="bt-h">
        <SectionEyebrow>Does it work?</SectionEyebrow>
        <h2 id="bt-h" className="t-h2 max-w-[34ch]">
          {backtestHeadline(backtest)}
        </h2>
        <p className="max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
          The backtest cuts the history at {backtest.folds} past dates {backtest.step_days} days apart, trains only on what was known before each cut, forecasts the next{" "}
          {backtest.horizon_days} days and compares with what happened ({num(backtest.rows_evaluated)} account-days). The yardstick is a seasonal-naive forecast: each day
          repeats the same weekday last week. Pinball loss is the standard error for a percentile forecast (lower is better); coverage is the share of actual balances
          inside P5–P95, which should be close to 0.90.
        </p>
        <BacktestStats bt={backtest} />
        <WeakSpots bt={backtest} />
      </section>

      <section className="container-page pb-8" aria-labelledby="lim-h">
        <SectionEyebrow>Limitations</SectionEyebrow>
        <h2 id="lim-h" className="t-h2 mt-3">
          What it does not do.
        </h2>
        <ul className="mt-5 max-w-[70ch] list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">Synthetic data.</strong> The default dataset ({health.dataset.accounts} accounts ×{" "}
            {Math.round(health.dataset.rows / Math.max(1, health.dataset.accounts))} days, seed {health.dataset.seed}) is generated by a known process, so the backtest describes
            the method, not accuracy on real cash flows.
          </li>
          <li>
            <strong className="text-ink">Not calibrated on real banks.</strong> Buffers, settlement delays and holidays are reference tables in the repository.
          </li>
          <li>
            <strong className="text-ink">No bank connections.</strong> Data comes from the generator or a CSV upload. Nothing is paid, approved or moved; what-if only
            changes forecast inputs.
          </li>
          <li>
            <strong className="text-ink">No FX.</strong> Consolidated alerts add up accounts per currency without conversion.
          </li>
          <li>
            <strong className="text-ink">{DEMO ? "This hosted demo is precomputed." : "The numbers on this page are a saved run."}</strong> Every figure was produced by the real
            backend on the default dataset and saved as JSON (<code className="mono text-[13px]">make demo-data</code>). The full interactive pipeline runs with{" "}
            <code className="mono text-[13px]">docker compose up</code>.
          </li>
        </ul>
        <p className="mt-6 text-[15px] text-ink-2">
          Source code, tests and setup:{" "}
          <a href={REPO_URL} className="link font-medium">
            github.com/kvozianov/trueavail
          </a>
        </p>
      </section>
    </article>
  );
}
