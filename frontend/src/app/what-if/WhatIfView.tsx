"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { WhatIfResult } from "@/components/WhatIfResult";
import { Button, Card, Loading, PageHeader, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { Adjustment, ScheduledFlow, WhatIfResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const HORIZON = 14;

interface Edit {
  shift: number;
  amount: number;
  remove: boolean;
}

function isChanged(f: ScheduledFlow, e?: Edit): e is Edit {
  return !!e && (e.remove || e.shift !== 0 || e.amount !== f.amount);
}

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

export function WhatIfView() {
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [sentAdjustments, setSentAdjustments] = useState<Adjustment[]>([]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const list = flows.data ?? [];
  const adjustments = list.filter((f) => isChanged(f, edits[f.flow_id])).map((f) => toAdjustment(f, edits[f.flow_id]));

  const edit = (f: ScheduledFlow, patch: Partial<Edit>) =>
    setEdits((prev) => ({
      ...prev,
      [f.flow_id]: { ...(prev[f.flow_id] ?? { shift: 0, amount: f.amount, remove: false }), ...patch },
    }));

  const run = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const body = { horizon_days: HORIZON, adjustments };
      const res = await api.runWhatIf(body);
      setResult(res);
      setSentAdjustments(adjustments);
    } catch (e) {
      setRunError(e);
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setEdits({});
    setResult(null);
    setSentAdjustments([]);
    setRunError(null);
  };

  const loadError = flows.error ?? accounts.error;
  const accs = accounts.data ?? [];
  const accById = new Map(accs.map((a) => [a.account_id, a]));

  // Default chart account: first adjusted account, else first account with a gap before.
  const chartAccount =
    picked ?? sentAdjustments[0]?.account_id ?? result?.alerts_before[0]?.account_id ?? accs[0]?.account_id ?? null;

  return (
    <>
      <PageHeader
        title="What-if scenarios"
        description="Shift, resize or remove scheduled payments, then re-run the 14-day forecast to see which cash gaps disappear or appear. Nothing is executed: this only changes the forecast inputs."
      />
      <ErrorBanner
        error={loadError}
        onRetry={() => {
          if (flows.error) flows.reload();
          if (accounts.error) accounts.reload();
        }}
        retrying={flows.loading || accounts.loading}
      />

      <Card
        title="Scheduled flows"
        subtitle="Edited rows are sent as adjustments; untouched rows keep their original values."
        actions={
          <>
            <Button onClick={reset} disabled={!adjustments.length && !result}>
              Reset
            </Button>
            <Button variant="primary" onClick={run} disabled={running || !flows.data}>
              {running
                ? "Running…"
                : `Run scenario${adjustments.length ? ` (${adjustments.length} change${adjustments.length > 1 ? "s" : ""})` : ""}`}
            </Button>
          </>
        }
      >
        {!flows.data && flows.loading && <Loading label="Loading scheduled flows…" />}
        {flows.data && !list.length && (
          <p className="text-sm text-ink-muted">No scheduled flows in the active dataset.</p>
        )}
        {list.length > 0 && (
          <ul className="space-y-3 md:hidden">
            {list.map((f) => {
              const e = edits[f.flow_id];
              const changed = isChanged(f, e);
              const acc = accById.get(f.account_id);
              return (
                <li
                  key={f.flow_id}
                  className={`rounded-md border border-line p-3 ${changed ? "bg-[var(--series-1-band)]" : ""}`}
                >
                  <div className={e?.remove ? "text-ink-muted line-through" : ""}>
                    <div className="text-sm font-medium">
                      <span className={f.direction === "inflow" ? "text-good" : "text-crit"} aria-hidden>
                        {f.direction === "inflow" ? "▲ " : "▼ "}
                      </span>
                      {f.description}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {acc ? `${acc.bank_name} · ${acc.label}` : f.account_id} · {f.rail} ·{" "}
                      {shortDate(f.effective_date)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-[5rem_minmax(0,1fr)_auto] items-end gap-2">
                    <label className="text-xs text-ink-muted">
                      Shift (d)
                      <input
                        type="number"
                        min={-14}
                        max={14}
                        step={1}
                        value={e?.shift ?? 0}
                        disabled={e?.remove}
                        onChange={(ev) => edit(f, { shift: Math.trunc(Number(ev.target.value) || 0) })}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="text-xs text-ink-muted">
                      Amount ({f.currency})
                      <input
                        type="number"
                        min={0}
                        step={50000}
                        value={e?.amount ?? f.amount}
                        disabled={e?.remove}
                        onChange={(ev) => edit(f, { amount: Math.max(0, Number(ev.target.value) || 0) })}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="flex min-h-9 items-center gap-1.5 text-xs text-ink-2">
                      <input
                        type="checkbox"
                        checked={e?.remove ?? false}
                        onChange={(ev) => edit(f, { remove: ev.target.checked })}
                        className="h-4 w-4 accent-[var(--series-1)]"
                      />
                      Remove
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > 0 && (
          <div className="-mx-4 hidden overflow-x-auto px-4 sm:-mx-5 sm:px-5 md:block">
            <table className="tabular w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-line [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
                  <th>Flow</th>
                  <th>Account</th>
                  <th>Effective date</th>
                  <th className="w-28">Shift (days)</th>
                  <th className="w-40">Amount</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const e = edits[f.flow_id];
                  const changed = isChanged(f, e);
                  const acc = accById.get(f.account_id);
                  return (
                    <tr
                      key={f.flow_id}
                      className={`border-b border-line last:border-0 [&>td]:py-2 [&>td]:pr-3 ${changed ? "bg-[var(--series-1-band)]" : ""} ${e?.remove ? "text-ink-muted line-through" : ""}`}
                    >
                      <td>
                        <div className="font-medium">
                          <span className={f.direction === "inflow" ? "text-good" : "text-crit"} aria-hidden>
                            {f.direction === "inflow" ? "▲ " : "▼ "}
                          </span>
                          {f.description}
                        </div>
                        <div className="font-mono text-xs text-ink-muted">
                          {f.flow_id} · {f.rail} · {f.direction}
                        </div>
                      </td>
                      <td className="text-xs">{acc ? `${acc.bank_name} · ${acc.label}` : f.account_id}</td>
                      <td className="text-xs">
                        {shortDate(f.effective_date)}
                        {f.effective_date !== f.expected_date && (
                          <div className="text-ink-muted">expected {shortDate(f.expected_date)}</div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`Shift ${f.flow_id} by days`}
                          min={-14}
                          max={14}
                          step={1}
                          value={e?.shift ?? 0}
                          disabled={e?.remove}
                          onChange={(ev) => edit(f, { shift: Math.trunc(Number(ev.target.value) || 0) })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-ink-muted">{f.currency}</span>
                          <input
                            type="number"
                            aria-label={`Amount for ${f.flow_id}`}
                            min={0}
                            step={50000}
                            value={e?.amount ?? f.amount}
                            disabled={e?.remove}
                            onChange={(ev) => edit(f, { amount: Math.max(0, Number(ev.target.value) || 0) })}
                            className={inputClass}
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Remove ${f.flow_id}`}
                          checked={e?.remove ?? false}
                          onChange={(ev) => edit(f, { remove: ev.target.checked })}
                          className="h-4 w-4 accent-[var(--series-1)]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4">
        <ErrorBanner error={runError} onRetry={run} retrying={running} />
      </div>

      {result && (
        <WhatIfResult
          result={result}
          accounts={accs}
          subtitle={
            sentAdjustments.length
              ? `${sentAdjustments.length} adjustment${sentAdjustments.length > 1 ? "s" : ""} applied`
              : "No adjustments: scenario equals baseline"
          }
          chartAccount={chartAccount}
          onPickAccount={setPicked}
          adjustedAccounts={sentAdjustments.map((x) => x.account_id)}
          dimmed={running}
        />
      )}
    </>
  );
}
