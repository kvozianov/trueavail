"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { WhatIfResult } from "@/components/WhatIfResult";
import { Card, Loading, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { Account, Adjustment, DemoScenarioSummary, ScheduledFlow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** One adjustment in words, e.g. "Shift merchant payout by +2 days (to Thu 21 May)". */
function describe(adj: Adjustment, flows: Map<string, ScheduledFlow>, accounts: Map<string, Account>): string {
  const flow = adj.flow_id ? flows.get(adj.flow_id) : undefined;
  const acc = accounts.get(adj.account_id);
  const ccy = flow?.currency ?? acc?.currency;
  const where = acc ? `${acc.bank_name} ${acc.label}` : adj.account_id;
  if (!flow) {
    return `Add ${adj.direction} ${money(adj.amount, ccy)} on ${shortDate(adj.expected_date)}, ${where}`;
  }
  if (adj.remove) return `Remove ${flow.description} (${money(flow.amount, flow.currency)})`;
  const parts: string[] = [];
  if (adj.amount !== flow.amount) parts.push(`resize to ${money(adj.amount, ccy)} (was ${money(flow.amount, ccy)})`);
  if (adj.shift_days) {
    const sign = adj.shift_days > 0 ? "+" : "";
    parts.push(
      `shift by ${sign}${adj.shift_days} days (expected ${shortDate(addDays(adj.expected_date, adj.shift_days))})`,
    );
  }
  const what = flow.description.charAt(0).toUpperCase() + flow.description.slice(1);
  return `${what}: ${parts.join(", ") || "unchanged"}`;
}

function DeltaBadges({ delta }: { delta: DemoScenarioSummary["delta"] }) {
  return (
    <span className="tabular flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {delta.gaps_removed > 0 && <span className="text-good">−{delta.gaps_removed} gap days</span>}
      {delta.gaps_added > 0 && <span className="text-crit">+{delta.gaps_added} gap days</span>}
      {!delta.gaps_removed && !delta.gaps_added && <span className="text-ink-muted">no change in gap days</span>}
    </span>
  );
}

/** Static demo: switch between what-if scenarios precomputed by backend/scripts/export_demo.py. */
export function DemoScenariosView() {
  const index = useApi("demo:scenarios", () => api.demoScenarios());
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedAccount, setPickedAccount] = useState<{ scenario: string; account: string } | null>(null);

  const list = index.data ?? [];
  const current = list.find((s) => s.id === pickedId) ?? list[0] ?? null;
  const scenario = useApi(current ? `demo:scenario:${current.id}` : null, () => api.demoScenario(current!));
  const data = scenario.data?.id === current?.id ? scenario.data : null;

  const accs = accounts.data ?? [];
  const accById = new Map(accs.map((a) => [a.account_id, a]));
  const flowById = new Map((flows.data ?? []).map((f) => [f.flow_id, f]));
  const adjusted = data ? [...new Set(data.adjustments.map((a) => a.account_id))] : [];
  const chartAccount =
    (pickedAccount && pickedAccount.scenario === current?.id ? pickedAccount.account : null) ??
    adjusted[0] ??
    accs[0]?.account_id ??
    null;

  const error = index.error ?? accounts.error ?? flows.error ?? scenario.error;

  return (
    <>
      <PageHeader
        title="What-if scenarios"
        description="Each scenario changes the scheduled payments (shift, resize, remove or add a flow) and re-runs the 14-day forecast, so you can see which cash gaps disappear or appear. Nothing is executed: only the forecast inputs change."
      />
      <p className="-mt-3 mb-4 text-xs text-ink-muted">
        Scenarios precomputed by the forecasting backend; edit flows freely in the self-hosted version.
      </p>
      <ErrorBanner
        error={error}
        onRetry={() => {
          for (const r of [index, accounts, flows, scenario]) if (r.error) r.reload();
        }}
      />

      {!index.data && index.loading && <Loading label="Loading scenarios…" />}

      {list.length > 0 && (
        <div role="group" aria-label="Scenarios" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const active = s.id === current?.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPickedId(s.id)}
                className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-series-1 ${
                  active ? "border-series-1 bg-[var(--series-1-band)]" : "border-line bg-surface hover:bg-surface-2"
                }`}
              >
                <span className="text-sm font-medium text-ink">{s.title}</span>
                <DeltaBadges delta={s.delta} />
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <Card className="mb-4" title={current.title} subtitle={current.description}>
          {data ? (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Adjustments sent to the what-if endpoint
              </h3>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {data.adjustments.map((a, i) => (
                  <li key={i}>{describe(a, flowById, accById)}</li>
                ))}
              </ul>
            </>
          ) : (
            scenario.loading && <Loading label="Loading scenario…" />
          )}
        </Card>
      )}

      {data && accs.length > 0 && (
        <WhatIfResult
          result={data}
          accounts={accs}
          subtitle={`${data.adjustments.length} adjustment${data.adjustments.length > 1 ? "s" : ""} · as of ${shortDate(data.scenario.as_of)} · threshold P5`}
          chartAccount={chartAccount}
          onPickAccount={(account) => current && setPickedAccount({ scenario: current.id, account })}
          adjustedAccounts={adjusted}
        />
      )}
    </>
  );
}
