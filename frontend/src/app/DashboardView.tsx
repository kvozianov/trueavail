"use client";

import { useState } from "react";
import { AccountCards } from "@/components/AccountCards";
import { AlertsList } from "@/components/AlertsList";
import { DatasetStrip } from "@/components/DatasetStrip";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FanChart } from "@/components/FanChart";
import { ModelCard } from "@/components/ModelCard";
import { Button, Card, Loading, PageHeader } from "@/components/ui";
import { DEMO, api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const HORIZON = 14;

export function DashboardView() {
  const health = useApi("health", (s) => api.health(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const forecast = useApi("forecast", (s) => api.runForecast({ horizon_days: HORIZON }, s));
  const alerts = useApi("alerts", (s) => api.alerts({ quantile: "p05", horizon_days: HORIZON }, s));
  const [picked, setPicked] = useState<string | null>(null);

  const selected = picked ?? forecast.data?.first_breach?.account_id ?? accounts.data?.[0]?.account_id ?? null;
  const history = useApi(selected ? `history:${selected}` : null, (s) => api.history(selected!, s));

  const all = [health, accounts, forecast, alerts];
  const error = all.find((r) => r.error)?.error ?? history.error;
  const anyLoading = all.some((r) => r.loading);
  const retry = () => {
    for (const r of [...all, history]) if (r.error) r.reload();
  };
  const refresh = () => {
    forecast.reload();
    alerts.reload();
  };

  const acc = accounts.data?.find((a) => a.account_id === selected) ?? null;
  const points = forecast.data?.points.filter((p) => p.account_id === selected) ?? [];
  const hist = history.data?.filter((h) => h.account_id === selected) ?? [];
  const perAccount = alerts.data?.per_account ?? [];
  const consolidated = alerts.data?.consolidated ?? [];
  // Consolidated alerts are per currency (balances are not FX-converted), so group them that way.
  const currencies = [...new Set((accounts.data ?? []).map((a) => a.currency))];
  for (const a of consolidated) if (!currencies.includes(a.currency)) currencies.push(a.currency);

  return (
    <>
      <PageHeader
        title="Liquidity dashboard"
        description={`${HORIZON}-day balance corridors per account. A cash gap is a day where the pessimistic (P5) balance falls below the account's required buffer.`}
        actions={
          // The static demo serves one precomputed run; re-running needs the backend.
          DEMO ? undefined : (
            <Button onClick={refresh} disabled={forecast.loading || alerts.loading}>
              {forecast.loading ? "Running…" : "Re-run forecast"}
            </Button>
          )
        }
      />
      <ErrorBanner error={error} onRetry={retry} retrying={anyLoading} />

      <div className="space-y-4">
        {health.data ? (
          <DatasetStrip health={health.data} asOf={forecast.data?.as_of ?? null} />
        ) : (
          health.loading && <Loading label="Loading dataset…" />
        )}

        {accounts.data ? (
          <AccountCards accounts={accounts.data} forecast={forecast.data} selected={selected} onSelect={setPicked} />
        ) : (
          accounts.loading && <Loading label="Loading accounts…" />
        )}

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <Card
              className="min-w-0"
              title={acc ? `${acc.bank_name} · ${acc.label} (${acc.currency})` : "Forecast"}
              subtitle={
                forecast.data
                  ? `As of ${forecast.data.as_of} · last 21 days actual + ${forecast.data.horizon_days}-day forecast`
                  : undefined
              }
            >
              {forecast.data && acc ? (
                points.length ? (
                  <FanChart
                    points={points}
                    history={hist}
                    currency={acc.currency}
                    asOf={forecast.data.as_of}
                    height={320}
                  />
                ) : (
                  <p className="text-sm text-ink-muted">No forecast points for this account.</p>
                )
              ) : forecast.loading ? (
                <Loading label="Running forecast…" />
              ) : (
                <p className="text-sm text-ink-muted">Forecast not available.</p>
              )}
            </Card>
            {forecast.data && <ModelCard forecast={forecast.data} />}
          </div>

          <Card
            title="Alerts"
            subtitle={
              alerts.data
                ? `Threshold quantile ${alerts.data.threshold_quantile.toUpperCase()} · horizon ${HORIZON} d`
                : undefined
            }
            className="min-w-0"
          >
            {alerts.data && accounts.data ? (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Per account ({perAccount.length})
                  </h3>
                  <AlertsList alerts={perAccount} accounts={accounts.data} onSelectAccount={setPicked} limit={4} />
                </div>
                <div className="border-t border-line pt-3">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Consolidated per currency ({consolidated.length})
                  </h3>
                  <p className="mb-2 text-xs text-ink-muted">Sum of accounts in each currency; no FX conversion.</p>
                  <div className="space-y-3">
                    {currencies.map((ccy) => {
                      const group = consolidated.filter((a) => a.currency === ccy);
                      if (!group.length)
                        return (
                          <p key={ccy} className="text-xs text-ink-muted">
                            <span className="font-medium text-ink-2">{ccy}</span> · no consolidated gap
                          </p>
                        );
                      return (
                        <div key={ccy}>
                          <h4 className="mb-1 text-xs font-medium text-ink-2">
                            {ccy} ({group.length})
                          </h4>
                          <AlertsList alerts={group} accounts={accounts.data!} limit={3} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : alerts.loading || accounts.loading ? (
              <Loading label="Loading alerts…" />
            ) : (
              <p className="text-sm text-ink-muted">Alerts not available.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
