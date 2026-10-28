"use client";

import type { ReactNode } from "react";
import { BacktestCharts, BacktestStats, WeakSpots, backtestHeadline } from "@/components/backtest/BacktestProof";
import { buildStages } from "@/components/how-it-works/stages";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Hero } from "@/components/landing/Hero";
import { HowItWorksTeaser } from "@/components/landing/HowItWorksTeaser";
import { ProofStrip } from "@/components/landing/ProofStrip";
import { WhatIfTeaser } from "@/components/landing/WhatIfTeaser";
import { ModelRoom } from "@/components/model-room/ModelRoom";
import { ButtonLink, ErrorBanner, SectionEyebrow, Skeleton } from "@/components/ui";
import { DEMO, api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const HORIZON = 14;

export function LandingView({ globeFallback }: { globeFallback: ReactNode }) {
  const health = useApi("health", (s) => api.health(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const forecast = useApi("forecast", (s) => api.runForecast({ horizon_days: HORIZON }, s));
  const alerts = useApi("alerts", (s) => api.alerts({ quantile: "p05", horizon_days: HORIZON }, s));
  const history = useApi("history", (s) => api.history(undefined, s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const explain = useApi("explain", (s) => api.explain(HORIZON, s));
  const backtest = useApi("backtest", (s) => api.runBacktest({}, s));
  const index = useApi(DEMO ? "demo:scenarios" : null, () => api.demoScenarios());

  const all = [health, accounts, forecast, alerts, history, flows, explain, backtest, index];
  const error = all.find((r) => r.error)?.error;
  const bt = backtest.data;
  const stages =
    health.data && explain.data && forecast.data && bt && alerts.data && accounts.data && flows.data
      ? buildStages({
          dataset: health.data.dataset,
          explain: explain.data,
          forecast: forecast.data,
          backtest: bt,
          alerts: alerts.data,
          accounts: accounts.data,
          scheduled: flows.data,
          scenarios: DEMO ? (index.data?.length ?? null) : null,
        })
      : null;

  return (
    <>
      {error ? (
        <div className="container-page">
          <ErrorBanner error={error} onRetry={() => all.forEach((r) => r.error && r.reload())} retrying={all.some((r) => r.loading)} />
        </div>
      ) : null}
      <Hero forecast={forecast.data} accounts={accounts.data} flows={flows.data} backtest={bt} health={health.data} globeFallback={globeFallback} />
      <ProofStrip bt={bt} />
      {explain.data && history.data && accounts.data && flows.data && alerts.data ? (
        <ModelRoom
          explain={explain.data}
          history={history.data}
          accounts={accounts.data}
          scheduled={flows.data}
          alerts={alerts.data.per_account}
          defaultAccount={forecast.data?.first_breach?.account_id ?? null}
        />
      ) : (
        <div className="container-page py-20">
          <Skeleton className="h-[480px] w-full rounded-4" />
        </div>
      )}
      {forecast.data && alerts.data && accounts.data && flows.data && (
        <DashboardPreview forecast={forecast.data} alerts={alerts.data} accounts={accounts.data} history={history.data} flows={flows.data} />
      )}
      {DEMO && index.data && accounts.data ? <WhatIfTeaser list={index.data} accounts={accounts.data} /> : null}
      {stages && <HowItWorksTeaser stages={stages} />}
      {bt && (
        <section id="proof" className="scroll-mt-28 py-16 sm:py-20" aria-labelledby="proof-title">
          <div className="container-page space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl">
                <SectionEyebrow>
                  Backtest · rolling origin · {bt.folds} folds · {bt.step_days}-day step · {bt.rows_evaluated} scored account-days
                </SectionEyebrow>
                <h2 id="proof-title" className="t-h2 mt-3">
                  {backtestHeadline(bt)}
                </h2>
              </div>
              <ButtonLink href="/backtest" variant="secondary">
                See the full backtest
              </ButtonLink>
            </div>
            <BacktestStats bt={bt} />
            <BacktestCharts bt={bt} />
            <WeakSpots bt={bt} />
          </div>
        </section>
      )}
      <ClosingCta />
    </>
  );
}
