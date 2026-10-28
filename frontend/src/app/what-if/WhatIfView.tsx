"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { WhatIfResult } from "@/components/dashboard/WhatIfResult";
import { Button, ErrorBanner, PageTitle, Skeleton, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { Adjustment, ScheduledFlow, WhatIfResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const HORIZON = 14;

interface Edit {
  shift: number;
  amount: number;
  remove: boolean;
}

const changed = (f: ScheduledFlow, e?: Edit): e is Edit => !!e && (e.remove || e.shift !== 0 || e.amount !== f.amount);

function toAdjustment(f: ScheduledFlow, e: Edit): Adjustment {
  return {
    flow_id: f.flow_id,
    account_id: f.account_id,
    expected_date: f.expected_date,
    amount: e.amount,
    direction: f.direction,
    ...(e.shift !== 0 ? { shift_days: e.shift } : {}),
    ...(e.remove ? { remove: true } : {}),
  };
}

/** Self-hosted: edit the scheduled flows and run the scenario against the live backend. */
export function WhatIfView() {
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const history = useApi("history", (s) => api.history(undefined, s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [sent, setSent] = useState<Adjustment[]>([]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [runNo, setRunNo] = useState(0);

  const list = flows.data ?? [];
  const adjustments = list.filter((f) => changed(f, edits[f.flow_id])).map((f) => toAdjustment(f, edits[f.flow_id]));
  const edit = (f: ScheduledFlow, patch: Partial<Edit>) =>
    setEdits((p) => ({ ...p, [f.flow_id]: { ...(p[f.flow_id] ?? { shift: 0, amount: f.amount, remove: false }), ...patch } }));
  const accById = new Map((accounts.data ?? []).map((a) => [a.account_id, a]));

  const run = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await api.runWhatIf({ horizon_days: HORIZON, adjustments });
      setResult(res);
      setSent(adjustments);
      setRunNo((n) => n + 1);
    } catch (e) {
      setRunError(e);
    } finally {
      setRunning(false);
    }
  };
  const reset = () => {
    setEdits({});
    setResult(null);
    setSent([]);
    setRunError(null);
  };
  const touched = [...new Set(sent.map((a) => a.account_id))];
  const chartAccount = picked ?? touched[0] ?? result?.alerts_before[0]?.account_id ?? accounts.data?.[0]?.account_id ?? null;

  return (
    <div className="container-page pb-8">
      <PageTitle eyebrow={`What-if · ${list.length} scheduled flows · nothing is executed`} title="Move a payment, watch the gap move.">
        Shift, resize or remove scheduled payments, then re-run the 14-day forecast to see which cash gaps disappear or appear. Only the forecast inputs change.
      </PageTitle>
      <ErrorBanner error={flows.error ?? accounts.error} onRetry={() => [flows, accounts].forEach((r) => r.error && r.reload())} retrying={flows.loading || accounts.loading} />
      <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="flows-h">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="flows-h" className="t-h4">
              Scheduled flows
            </h2>
            <p className="t-small mt-0.5">Edited rows are sent as adjustments; untouched rows keep their values.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset} disabled={!adjustments.length && !result} icon={<RotateCcw size={16} strokeWidth={1.75} aria-hidden />}>
              Reset
            </Button>
            <Button variant="accent" size="sm" onClick={run} loading={running} disabled={running || !flows.data}>
              {running ? "Running…" : `Run scenario${adjustments.length ? ` (${adjustments.length} change${adjustments.length > 1 ? "s" : ""})` : ""}`}
            </Button>
          </div>
        </header>
        {!flows.data && flows.loading && <Skeleton className="h-48 w-full" />}
        {flows.data && !list.length && <p className="t-small">No scheduled flows in the active dataset.</p>}
        {list.length > 0 && (
          <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-hairline text-[12.5px] text-ink-3 [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
                  <th>Flow</th>
                  <th>Account</th>
                  <th>Effective date</th>
                  <th className="w-28">Shift (d)</th>
                  <th className="w-44">Amount</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const e = edits[f.flow_id];
                  const ch = changed(f, e);
                  const acc = accById.get(f.account_id);
                  return (
                    <tr key={f.flow_id} className={`border-b border-hairline last:border-0 [&>td]:py-2.5 [&>td]:pr-3 ${ch ? "bg-accent-tint" : ""}`}>
                      <td className={e?.remove ? "text-ink-3 line-through" : ""}>
                        <div className="font-medium text-ink">
                          <span aria-hidden className={f.direction === "inflow" ? "text-good" : "text-gap"}>
                            {f.direction === "inflow" ? "▲ " : "▼ "}
                          </span>
                          {f.description}
                        </div>
                        <div className="font-mono text-[11.5px] text-ink-3">
                          {money(f.amount, f.currency)} · {f.rail} · {f.flow_id}
                        </div>
                      </td>
                      <td className="text-[13px]">{acc ? `${acc.bank_name} · ${acc.label}` : f.account_id}</td>
                      <td className="text-[13px] tnum">
                        {shortDate(f.effective_date)}
                        {f.effective_date !== f.expected_date && <div className="text-ink-3">expected {shortDate(f.expected_date)}</div>}
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`Shift ${f.description} by days`}
                          min={-14}
                          max={14}
                          value={e?.shift ?? 0}
                          disabled={e?.remove}
                          onChange={(ev) => edit(f, { shift: Math.trunc(Number(ev.target.value) || 0) })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`Amount of ${f.description} in ${f.currency}`}
                          min={0}
                          step={50000}
                          value={e?.amount ?? f.amount}
                          disabled={e?.remove}
                          onChange={(ev) => edit(f, { amount: Math.max(0, Number(ev.target.value) || 0) })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Remove ${f.description}`}
                          checked={e?.remove ?? false}
                          onChange={(ev) => edit(f, { remove: ev.target.checked })}
                          className="h-5 w-5 accent-[var(--accent)]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ErrorBanner error={runError} onRetry={run} retrying={running} />
      {result && accounts.data && flows.data && (
        <div className="mt-6">
          <WhatIfResult
            result={result}
            accounts={accounts.data}
            flows={flows.data}
            history={history.data}
            chartAccount={chartAccount}
            touched={touched}
            onPickAccount={setPicked}
            plotKey={`${chartAccount}-${runNo}`}
            dimmed={running}
          />
        </div>
      )}
    </div>
  );
}
