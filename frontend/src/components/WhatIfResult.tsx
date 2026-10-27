"use client";

import { AlertsList } from "@/components/AlertsList";
import { FanChart } from "@/components/FanChart";
import { Card, Stat, inputClass } from "@/components/ui";
import { money, num, shortDate } from "@/lib/format";
import type { Account, Alert, WhatIfResponse } from "@/lib/types";

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

/** Before/after stats, alert lists and the overlaid fan chart of one what-if result. */
export function WhatIfResult({
  result,
  accounts,
  subtitle,
  chartAccount,
  onPickAccount,
  adjustedAccounts,
  dimmed = false,
}: {
  result: WhatIfResponse;
  accounts: Account[];
  subtitle: string;
  chartAccount: string | null;
  onPickAccount: (accountId: string) => void;
  adjustedAccounts: string[];
  dimmed?: boolean;
}) {
  const accById = new Map(accounts.map((a) => [a.account_id, a]));
  const chartAcc = chartAccount ? accById.get(chartAccount) : undefined;
  const worstBefore = worstAlert(result.alerts_before);
  const worstAfter = worstAlert(result.alerts_after);

  return (
    <div className={`space-y-4 ${dimmed ? "opacity-60" : ""}`}>
      <Card title="Scenario result" subtitle={subtitle}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Gap days removed" value={<span className="text-good">{num(result.delta.gaps_removed)}</span>} />
          <Stat
            label="Gap days added"
            value={<span className={result.delta.gaps_added ? "text-crit" : ""}>{num(result.delta.gaps_added)}</span>}
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
          <AlertsList alerts={result.alerts_before} accounts={accounts} onSelectAccount={onPickAccount} limit={5} />
        </Card>
        <Card title={`Alerts after (${result.alerts_after.length})`} className="min-w-0">
          <AlertsList
            alerts={result.alerts_after}
            accounts={accounts}
            onSelectAccount={onPickAccount}
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
            onChange={(e) => onPickAccount(e.target.value)}
            className={`${inputClass} w-auto max-w-full`}
          >
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.bank_name} · {a.label}
                {adjustedAccounts.includes(a.account_id) ? " (adjusted)" : ""}
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
  );
}
