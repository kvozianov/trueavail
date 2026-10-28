"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ButtonLink, GithubIcon, SectionEyebrow, Skeleton, StatTile, Ticker } from "@/components/ui";
import { DEMO } from "@/lib/api";
import { daysBetween, inDays, money, num, pctValue, ranges, ratio, shortDate } from "@/lib/format";
import { backtestFacts } from "@/lib/derive";
import { REPO_URL } from "@/lib/links";
import type { Account, BacktestResponse, ForecastResponse, HealthResponse, ScheduledFlow } from "@/lib/types";

const GlobeClient = dynamic(() => import("@/components/globe/GlobeClient"), { ssr: false });

export function Hero({
  forecast,
  accounts,
  flows,
  backtest,
  health,
  globeFallback,
}: {
  forecast: ForecastResponse | null;
  accounts: Account[] | null;
  flows: ScheduledFlow[] | null;
  backtest: BacktestResponse | null;
  health: HealthResponse | null;
  globeFallback: ReactNode;
}) {
  const fb = forecast?.first_breach ?? null;
  const acc = fb ? accounts?.find((a) => a.account_id === fb.account_id) : null;
  const f = backtest ? backtestFacts(backtest) : null;
  const ready = !!(forecast && accounts && flows);
  const stats: ReactNode[] = [
    forecast && accounts ? (
      fb && acc ? (
        <StatTile
          key="gap"
          gap
          value={<Ticker value={fb.required_buffer - fb.balance_p05} format={(v) => money(v, acc.currency)} />}
          label="first cash gap"
          note={`${acc.label} · ${shortDate(fb.date)}, ${inDays(daysBetween(forecast.as_of, fb.date))}`}
        />
      ) : (
        <StatTile key="gap" value="0" label={`cash gaps in ${forecast.horizon_days} days`} note="P5 stays above every buffer" />
      )
    ) : (
      <StatSkeleton key="gap" />
    ),
    backtest && f ? (
      <StatTile
        key="imp"
        value={<Ticker value={backtest.summary.improvement_pct} format={(v) => pctValue(v)} />}
        label="lower loss vs baseline"
        note={`Pinball P50, ${backtest.folds}-fold rolling backtest`}
      />
    ) : (
      <StatSkeleton key="imp" />
    ),
    backtest && f ? (
      <StatTile
        key="cov"
        value={<Ticker value={backtest.summary.mean_coverage_90} format={(v) => ratio(v, 2)} />}
        label="90 % interval coverage"
        note={`Target ${ratio(backtest.summary.target_coverage, 2)}${f.under.length ? ` · honest: under at h ${ranges(f.under.map((u) => u.h))}` : ""}`}
      />
    ) : (
      <StatSkeleton key="cov" />
    ),
  ];
  const d = health?.dataset;

  return (
    <section className="container-page grid gap-x-6 gap-y-10 pb-14 pt-12 md:pt-16 lg:grid-cols-12 lg:grid-rows-[auto_auto] lg:pb-14">
      <div className="min-w-0 lg:col-span-6 lg:self-end">
        <SectionEyebrow>14-day liquidity forecast · quantile ML ensemble</SectionEyebrow>
        <h1 className="t-display-xl mt-5 max-w-[560px]">See the cash gap before it happens.</h1>
        <p className="t-lead mt-5 max-w-[46ch]">
          TrueAvail forecasts a P5–P95 balance corridor for every bank account, 14 days ahead, and flags the days when the pessimistic case falls below the required
          buffer.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href="/forecast" variant="primary" size="lg" iconRight={<ArrowRight size={16} strokeWidth={1.75} aria-hidden />}>
            See the forecast
          </ButtonLink>
          <ButtonLink href="/how-it-works" variant="secondary" size="lg">
            How it works
          </ButtonLink>
          <a href={REPO_URL} className="ml-1 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-[15px] font-medium text-ink-2 hover:text-ink">
            <GithubIcon /> Source on GitHub
          </a>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[580px] self-center lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:max-w-none">
        <div className="mx-auto w-full max-w-[580px]">
          {ready ? <GlobeClient accounts={accounts!} flows={flows!} forecast={forecast} fallback={globeFallback} /> : <div className="aspect-square w-full">{globeFallback}</div>}
          <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            Illustrative locations and counterparties · {accounts ? accounts.length : "—"} accounts · {flows && forecast ? flows.filter((x) => x.effective_date > forecast.as_of).length : "—"}{" "}
            scheduled flows
          </p>
          {!DEMO && !ready && <p className="t-micro mt-1 text-center">Nodes appear once the backend responds.</p>}
        </div>
      </div>
      <div className="min-w-0 lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:self-start">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline pt-8 sm:grid-cols-3 sm:gap-x-11">
          {stats}
          {d && (
            <StatTile className="sm:hidden" value={num(d.rows)} label="observations" note={`${d.accounts} accounts × ${d.accounts ? Math.round(d.rows / d.accounts) : "—"} d`} />
          )}
        </div>
      </div>
    </section>
  );
}

function StatSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mt-3 h-3 w-24" />
      <Skeleton className="mt-2 h-3 w-36" />
    </div>
  );
}
