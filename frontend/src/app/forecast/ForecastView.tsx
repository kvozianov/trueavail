"use client";

import { RotateCcw, Table2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Corridor, CorridorLegend } from "@/components/charts/Corridor";
import { AccountRail, RailSkeleton } from "@/components/dashboard/AccountRail";
import { AlertsTimeline } from "@/components/dashboard/AlertsTimeline";
import { ModelCard } from "@/components/dashboard/ModelCard";
import { ScenarioSwitcher } from "@/components/dashboard/ScenarioSwitcher";
import { Button, ButtonLink, Chip, DemoDisabledButton, ErrorBanner, PageTitle, Segmented, Skeleton } from "@/components/ui";
import { DEMO, api } from "@/lib/api";
import { accountStates, gapHeadline, historyFor, sortForRail } from "@/lib/derive";
import { longDate, stampOfTimestamp } from "@/lib/format";
import { useApi } from "@/lib/useApi";

const HORIZON = 14;

export function ForecastView() {
  const params = useSearchParams();
  const router = useRouter();
  const health = useApi("health", (s) => api.health(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const forecast = useApi("forecast", (s) => api.runForecast({ horizon_days: HORIZON }, s));
  const alerts = useApi("alerts", (s) => api.alerts({ quantile: "p05", horizon_days: HORIZON }, s));
  const history = useApi("history", (s) => api.history(undefined, s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const manifest = useApi(DEMO ? "demo:manifest" : null, () => api.demoManifest());
  const index = useApi(DEMO ? "demo:scenarios" : null, () => api.demoScenarios());
  const [scenId, setScenId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [table, setTable] = useState(false);
  const [histDays, setHistDays] = useState<"21" | "60">("21");

  const list = index.data ?? [];
  const current = list.find((s) => s.id === scenId) ?? list[0] ?? null;
  const scenario = useApi(current ? `demo:scenario:${current.id}` : null, () => api.demoScenario(current!));
  const scen = scenario.data && scenario.data.id === current?.id ? scenario.data : null;

  const states = sortForRail(accountStates(accounts.data ?? [], forecast.data));
  const fromQuery = params.get("account");
  const selected =
    (fromQuery && states.some((s) => s.account.account_id === fromQuery) ? fromQuery : null) ??
    forecast.data?.first_breach?.account_id ??
    states[0]?.account.account_id ??
    null;
  const select = (id: string) => router.replace(`?account=${encodeURIComponent(id)}`, { scroll: false });
  const acc = accounts.data?.find((a) => a.account_id === selected) ?? null;

  const all = [health, accounts, forecast, alerts, history, flows];
  const error = all.find((r) => r.error)?.error ?? index.error ?? scenario.error;
  const retry = () => [...all, index, scenario].forEach((r) => r.error && r.reload());
  const loading = !forecast.data || !accounts.data;

  const scenarioOnChart = applied && scen && selected && (current?.accounts ?? []).includes(selected);
  const basePoints = forecast.data?.points.filter((p) => p.account_id === selected) ?? [];
  const mainPoints = scenarioOnChart ? scen!.scenario.points.filter((p) => p.account_id === selected) : basePoints;
  const runChip = forecast.data?.run_id != null ? `run #${forecast.data.run_id}${manifest.data ? ` · ${stampOfTimestamp(manifest.data.generated_at)}` : ""}` : null;
  const currencies = [...new Set((accounts.data ?? []).map((a) => a.currency))];
  const consolidated = alerts.data?.consolidated ?? [];

  return (
    <div className="container-page pb-8">
      <PageTitle
        eyebrow={
          forecast.data
            ? `Forecast · as of ${longDate(forecast.data.as_of)} · horizon ${forecast.data.horizon_days} d · threshold ${alerts.data?.threshold_quantile.toUpperCase() ?? "P05"}`
            : "Forecast"
        }
        title={forecast.data && alerts.data ? gapHeadline(forecast.data, alerts.data.per_account) : <Skeleton className="h-10 w-[min(560px,80vw)]" />}
        actions={
          <>
            {runChip && <Chip tone="mono">{runChip}</Chip>}
            {DEMO ? (
              <DemoDisabledButton>Re-run forecast</DemoDisabledButton>
            ) : (
              <Button
                variant="accent"
                size="sm"
                icon={<RotateCcw size={16} strokeWidth={1.75} aria-hidden />}
                loading={forecast.loading}
                onClick={() => {
                  forecast.reload();
                  alerts.reload();
                }}
              >
                {forecast.loading ? "Running…" : "Re-run forecast"}
              </Button>
            )}
          </>
        }
      />
      <ErrorBanner error={error} onRetry={retry} retrying={all.some((r) => r.loading)} />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0">
          {loading ? (
            <RailSkeleton />
          ) : (
            <AccountRail
              states={states}
              history={history.data}
              horizon={forecast.data!.horizon_days}
              selected={selected}
              onSelect={select}
              note={
                alerts.data
                  ? consolidated.length
                    ? `Consolidated per currency: gaps in ${[...new Set(consolidated.map((c) => c.currency))].join(", ")}. Sum of accounts, no FX conversion.`
                    : `Consolidated per currency: no gap in ${currencies.join(", ").replace(/, ([^,]*)$/, " or $1")}. Sum of accounts, no FX conversion.`
                  : null
              }
            />
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="fan-title">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="fan-title" className="t-h4">
                  {acc ? `${acc.bank_name} · ${acc.label}` : "Forecast"}
                </h2>
                <p className="t-small mt-0.5">
                  {forecast.data ? `Last ${histDays} days actual + ${forecast.data.horizon_days}-day forecast · P5 / P50 / P95 · as of ${longDate(forecast.data.as_of).slice(4, -5)}` : "Loading forecast…"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {scenarioOnChart && (
                  <span className="inline-flex items-center gap-1.5">
                    <Chip tone="accent">Scenario applied</Chip>
                    <button type="button" onClick={() => setApplied(false)} className="link inline-flex items-center gap-1 text-[13px]">
                      <X size={14} strokeWidth={1.75} aria-hidden /> Clear
                    </button>
                  </span>
                )}
                <Segmented
                  size="sm"
                  label="History shown"
                  value={histDays}
                  onChange={setHistDays}
                  options={[
                    { value: "21", label: "History 21 d" },
                    { value: "60", label: "60 d" },
                  ]}
                />
                <Button size="sm" variant="ghost" aria-pressed={table} onClick={() => setTable((v) => !v)} icon={<Table2 size={16} strokeWidth={1.75} aria-hidden />}>
                  Table view
                </Button>
              </div>
            </header>
            <div className="mb-3">
              <CorridorLegend compare={!!scenarioOnChart} labels={{ main: "Scenario", compare: "Baseline" }} />
            </div>
            {forecast.data && acc ? (
              <Corridor
                points={mainPoints}
                compare={scenarioOnChart ? basePoints : null}
                history={historyFor(history.data, selected)}
                historyDays={Number(histDays)}
                currency={acc.currency}
                asOf={forecast.data.as_of}
                accountLabel={`${acc.bank_name} ${acc.label}`}
                plotKey={`${selected}:${histDays}`}
                highlightDate={hoverDate}
                tableVisible={table}
                labels={{ main: "Scenario", compare: "Baseline" }}
                height={320}
              />
            ) : (
              <Skeleton className="h-[320px] w-full" />
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            {alerts.data && accounts.data && forecast.data && flows.data ? (
              <AlertsTimeline
                perAccount={alerts.data.per_account}
                consolidated={alerts.data.consolidated}
                accounts={accounts.data}
                flows={flows.data}
                asOf={forecast.data.as_of}
                horizon={forecast.data.horizon_days}
                onHoverDate={setHoverDate}
              />
            ) : (
              <Skeleton className="h-[420px] w-full rounded-3" />
            )}
            {forecast.data ? <ModelCard forecast={forecast.data} /> : <Skeleton className="h-[360px] w-full rounded-3" />}
          </div>

          {DEMO ? (
            list.length > 0 && accounts.data ? (
              <ScenarioSwitcher
                list={list}
                selectedId={current?.id ?? null}
                onSelect={(id) => {
                  setScenId(id);
                  setApplied(true);
                  const s = list.find((x) => x.id === id);
                  if (s?.accounts?.length && selected && !s.accounts.includes(selected)) select(s.accounts[0]);
                }}
                scenario={scen}
                accounts={accounts.data}
              />
            ) : (
              <Skeleton className="h-[320px] w-full rounded-3" />
            )
          ) : (
            <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div>
                <h2 className="t-h4">What-if</h2>
                <p className="t-small mt-0.5">
                  {flows.data ? `${flows.data.length} scheduled flows in the active dataset. ` : ""}Shift, resize or remove them and re-run the forecast.
                </p>
              </div>
              <ButtonLink href="/what-if" variant="secondary" size="sm">
                Open what-if
              </ButtonLink>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
