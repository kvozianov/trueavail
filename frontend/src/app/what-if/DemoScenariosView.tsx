"use client";

import { useState } from "react";
import { ScenarioRow } from "@/components/dashboard/ScenarioRow";
import { WhatIfResult } from "@/components/dashboard/WhatIfResult";
import { ErrorBanner, PageTitle, Skeleton, Tag } from "@/components/ui";
import { api } from "@/lib/api";
import { addDays, money, shortDate } from "@/lib/format";
import type { Account, Adjustment, ScheduledFlow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** One adjustment in words, e.g. "Merchant payout: shift by +2 days (expected Thu 21 May)". */
function describe(adj: Adjustment, flows: Map<string, ScheduledFlow>, accounts: Map<string, Account>): { kind: "in" | "out" | "plain"; text: string } {
  const flow = adj.flow_id ? flows.get(adj.flow_id) : undefined;
  const acc = accounts.get(adj.account_id);
  const ccy = flow?.currency ?? acc?.currency;
  const kind = adj.direction === "inflow" ? "in" : "out";
  if (!flow) return { kind, text: `add ${adj.direction} ${money(adj.amount, ccy)} on ${shortDate(adj.expected_date)} · ${acc ? acc.label : adj.account_id}` };
  if (adj.remove) return { kind: "plain", text: `remove ${flow.description} (${money(flow.amount, flow.currency)})` };
  const parts: string[] = [];
  if (adj.amount !== flow.amount) parts.push(`resize to ${money(adj.amount, ccy)} (was ${money(flow.amount, ccy)})`);
  if (adj.shift_days) parts.push(`shift ${adj.shift_days > 0 ? "+" : ""}${adj.shift_days} d (expected ${shortDate(addDays(adj.expected_date, adj.shift_days))})`);
  return { kind, text: `${flow.description}: ${parts.join(", ") || "unchanged"}` };
}

/** Static demo: the six what-if scenarios precomputed by backend/scripts/export_demo.py. */
export function DemoScenariosView() {
  const index = useApi("demo:scenarios", () => api.demoScenarios());
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const history = useApi("history", (s) => api.history(undefined, s));
  const [picked, setPicked] = useState<string | null>(null);
  const [chartPick, setChartPick] = useState<{ s: string; a: string } | null>(null);
  const list = index.data ?? [];
  const current = list.find((s) => s.id === picked) ?? list[0] ?? null;
  const scenario = useApi(current ? `demo:scenario:${current.id}` : null, () => api.demoScenario(current!));
  const data = scenario.data?.id === current?.id ? scenario.data : null;
  const shown = data ?? scenario.data;
  const touched = current?.accounts ?? (shown ? [...new Set(shown.adjustments.map((a) => a.account_id))] : []);
  const chartAccount = (chartPick && chartPick.s === current?.id ? chartPick.a : null) ?? touched[0] ?? accounts.data?.[0]?.account_id ?? null;
  const accById = new Map((accounts.data ?? []).map((a) => [a.account_id, a]));
  const flowById = new Map((flows.data ?? []).map((f) => [f.flow_id, f]));
  const error = index.error ?? accounts.error ?? flows.error ?? scenario.error;

  return (
    <div className="container-page pb-8">
      <PageTitle eyebrow={`What-if · ${list.length || "—"} precomputed scenarios · nothing is executed`} title="Move a payment, watch the gap move.">
        Each scenario shifts, resizes, removes or adds a scheduled payment, and the backend re-runs the 14-day corridor. Edit flows freely in the self-hosted version.
      </PageTitle>
      <ErrorBanner error={error} onRetry={() => [index, accounts, flows, scenario].forEach((r) => r.error && r.reload())} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-5">
          {list.length
            ? list.map((s) => <ScenarioRow key={s.id} s={s} selected={s.id === current?.id} onSelect={() => setPicked(s.id)} />)
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[76px] w-full" />)}
          {shown && (
            <div className="card-flat mt-4 p-4">
              <p className="eyebrow mb-2">Adjustments sent to /api/whatif/run</p>
              <ul className="flex flex-col items-start gap-1.5">
                {shown.adjustments.map((a, i) => {
                  const dsc = describe(a, flowById, accById);
                  return (
                    <li key={i}>
                      <Tag kind={dsc.kind}>{dsc.text}</Tag>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div className="min-w-0 lg:col-span-7">
          {shown && accounts.data && flows.data ? (
            <WhatIfResult
              result={shown}
              accounts={accounts.data}
              flows={flows.data}
              history={history.data}
              chartAccount={chartAccount}
              touched={touched}
              onPickAccount={(a) => current && setChartPick({ s: current.id, a })}
              plotKey={chartAccount ?? "chart"}
              dimmed={!data}
            />
          ) : (
            <Skeleton className="h-[420px] w-full rounded-3" />
          )}
        </div>
      </div>
    </div>
  );
}
