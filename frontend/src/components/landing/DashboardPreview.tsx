"use client";

import { Corridor, CorridorLegend } from "@/components/charts/Corridor";
import { AlertItem } from "@/components/dashboard/AlertsTimeline";
import { ButtonLink, SectionEyebrow, StatTile } from "@/components/ui";
import { historyFor, worstAlert } from "@/lib/derive";
import { money, shortDate, sortAlerts } from "@/lib/format";
import type { Account, AlertsResponse, ForecastResponse, HistoryRow, ScheduledFlow } from "@/lib/types";

export function DashboardPreview({
  forecast,
  alerts,
  accounts,
  history,
  flows,
}: {
  forecast: ForecastResponse;
  alerts: AlertsResponse;
  accounts: Account[];
  history: HistoryRow[] | null;
  flows: ScheduledFlow[];
}) {
  const id = forecast.first_breach?.account_id ?? accounts[0]?.account_id;
  const acc = accounts.find((a) => a.account_id === id)!;
  const per = alerts.per_account;
  const accAlerts = sortAlerts(per.filter((a) => a.account_id === id)).slice(0, 4);
  const worst = worstAlert(per);
  const flowById = new Map(flows.map((f) => [f.flow_id, f]));
  const currencies = [...new Set(accounts.map((a) => a.currency))];
  return (
    <section className="py-16 sm:py-20" aria-labelledby="cc-title">
      <div className="container-page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow>Command center</SectionEyebrow>
            <h2 id="cc-title" className="t-h2 mt-3">
              One screen per treasury morning.
            </h2>
          </div>
          <ButtonLink href="/forecast" variant="primary">
            Open the forecast
          </ButtonLink>
        </div>
        <div className="card grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h3 className="t-h4">
              {acc.bank_name} · {acc.label}
            </h3>
            <p className="t-small mb-3 mt-0.5">Last 21 days actual + {forecast.horizon_days}-day forecast · P5 / P50 / P95</p>
            <CorridorLegend />
            <div className="mt-3">
              <Corridor
                points={forecast.points.filter((p) => p.account_id === id)}
                history={historyFor(history, id)}
                currency={acc.currency}
                asOf={forecast.as_of}
                accountLabel={`${acc.bank_name} ${acc.label}`}
                height={300}
              />
            </div>
          </div>
          <div className="min-w-0">
            <p className="t-h4 mb-4">Alerts on this account · first {accAlerts.length}</p>
            {accAlerts.length ? (
              <ul>
                {accAlerts.map((a, i) => (
                  <li key={a.date}>
                    <AlertItem alert={a} account={acc} asOf={forecast.as_of} flows={flowById} last={i === accAlerts.length - 1} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-small">No cash gaps in the next {forecast.horizon_days} days.</p>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="card-tonal p-5">
            <StatTile size="l" value={per.length} label={`gap days in ${forecast.horizon_days}`} labelStyle="small" />
          </div>
          <div className="card-tonal p-5">
            <StatTile size="l" gap={!!worst} value={worst ? money(worst.gap_amount, worst.currency) : "none"} label={worst ? `worst gap (${shortDate(worst.date)})` : "worst gap"} labelStyle="small" />
          </div>
          <div className="card-tonal p-5">
            <StatTile size="l" value={alerts.consolidated.length} label={`consolidated gaps (${currencies.join(" · ")})`} labelStyle="small" />
          </div>
        </div>
      </div>
    </section>
  );
}
