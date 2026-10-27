"use client";

import { useState } from "react";
import { AlertsList } from "@/components/AlertsList";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FanChart } from "@/components/FanChart";
import { Button, Card, Loading, PageHeader, Stat, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { money, num, shortDate } from "@/lib/format";
import type { Account, Adjustment, Alert, ScheduledFlow, WhatIfResponse } from "@/lib/types";
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

/** Largest gap among alerts; delta.worst_gap_* is the same number without its currency. */
function worstAlert(alerts: Alert[]): Alert | null {
  return alerts.reduce<Alert | null>((w, a) => (!w || a.gap_amount > w.gap_amount ? a : w), null);
}

function gapHint(a: Alert | null, byId: Map<string, Account>): string {
  if (!a) return "no gap";
  const acc = byId.get(a.account_id);
  const where = a.account_id === "consolidated" ? `consolidated ${a.currency}` : acc ? acc.label : a.account_id;
  return `${where} · ${shortDate(a.date)}`;
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
  const chartAcc = chartAccount ? accById.get(chartAccount) : undefined;
  const worstBefore = result ? worstAlert(result.alerts_before) : null;
  const worstAfter = result ? worstAlert(result.alerts_after) : null;

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
        <div className={`space-y-4 ${running ? "opacity-60" : ""}`}>
          <Card
            title="Scenario result"
            subtitle={
              sentAdjustments.length
                ? `${sentAdjustments.length} adjustment${sentAdjustments.length > 1 ? "s" : ""} applied`
                : "No adjustments: scenario equals baseline"
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Gap days removed"
                value={<span className="text-good">{num(result.delta.gaps_removed)}</span>}
              />
              <Stat
                label="Gap days added"
                value={
                  <span className={result.delta.gaps_added ? "text-crit" : ""}>{num(result.delta.gaps_added)}</span>
                }
              />
              <Stat
                label="Worst gap before"
                value={worstBefore ? money(worstBefore.gap_amount, worstBefore.currency) : num(0)}
                hint={gapHint(worstBefore, accById)}
              />
              <Stat
                label="Worst gap after"
                value={
                  <span
                    className={
                      result.delta.worst_gap_after < result.delta.worst_gap_before
                        ? "text-good"
                        : result.delta.worst_gap_after > result.delta.worst_gap_before
                          ? "text-crit"
                          : ""
                    }
                  >
                    {worstAfter ? money(worstAfter.gap_amount, worstAfter.currency) : num(0)}
                  </span>
                }
                hint={gapHint(worstAfter, accById)}
              />
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title={`Alerts before (${result.alerts_before.length})`} className="min-w-0">
              <AlertsList alerts={result.alerts_before} accounts={accs} onSelectAccount={setPicked} limit={5} />
            </Card>
            <Card title={`Alerts after (${result.alerts_after.length})`} className="min-w-0">
              <AlertsList
                alerts={result.alerts_after}
                accounts={accs}
                onSelectAccount={setPicked}
                limit={5}
                emptyText="No cash gaps in the horizon after the adjustments."
              />
            </Card>
          </div>

          <Card
            title="Before vs after"
            subtitle="Grey: baseline forecast. Blue: scenario forecast."
            actions={
              <select
                aria-label="Account"
                value={chartAccount ?? ""}
                onChange={(e) => setPicked(e.target.value)}
                className={`${inputClass} w-auto max-w-full`}
              >
                {accs.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.bank_name} · {a.label}
                    {sentAdjustments.some((x) => x.account_id === a.account_id) ? " (adjusted)" : ""}
                  </option>
                ))}
              </select>
            }
          >
            {chartAcc ? (
              <FanChart
                points={result.scenario.points.filter((p) => p.account_id === chartAcc.account_id)}
                compare={result.baseline.points.filter((p) => p.account_id === chartAcc.account_id)}
                currency={chartAcc.currency}
                labels={{ main: "Scenario", compare: "Baseline" }}
                height={320}
              />
            ) : (
              <p className="text-sm text-ink-muted">Select an account.</p>
            )}
            {chartAcc && (
              <p className="tabular mt-2 text-xs text-ink-muted">
                Settled balance {money(chartAcc.settled_balance, chartAcc.currency)} · required buffer{" "}
                {money(chartAcc.required_buffer, chartAcc.currency)}
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
