"use client";

import { useState } from "react";
import { money, shortDate, sortAlerts } from "@/lib/format";
import type { Account, Alert } from "@/lib/types";
import { Empty, SeverityPill } from "./ui";

export function AlertsList({
  alerts,
  accounts,
  emptyText = "No cash gaps in the horizon.",
  onSelectAccount,
  limit,
}: {
  alerts: Alert[];
  accounts: Account[];
  emptyText?: string;
  onSelectAccount?: (id: string) => void;
  /** Show only the first `limit` alerts (most severe first) with a toggle for the rest. */
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts.length) return <Empty>{emptyText}</Empty>;
  const byId = new Map(accounts.map((a) => [a.account_id, a]));
  const sorted = sortAlerts(alerts);
  const hidden = limit != null && !expanded ? Math.max(0, sorted.length - limit) : 0;
  const shown = hidden ? sorted.slice(0, limit) : sorted;
  return (
    <>
      <ul className="divide-y divide-[var(--border)]">
        {shown.map((a) => {
          const acc = byId.get(a.account_id);
          const ccy = a.currency || acc?.currency;
          const name =
            a.account_id === "consolidated"
              ? `Consolidated ${a.currency}`
              : acc
                ? `${acc.bank_name} · ${acc.label}`
                : a.account_id;
          return (
            <li key={`${a.account_id}-${a.currency}-${a.date}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <SeverityPill severity={a.severity} />
                  {onSelectAccount && acc ? (
                    <button
                      type="button"
                      onClick={() => onSelectAccount(a.account_id)}
                      className="truncate text-left text-sm font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {name}
                    </button>
                  ) : (
                    <span className="truncate text-sm font-medium text-ink">{name}</span>
                  )}
                </div>
                <span className="text-xs text-ink-muted">{shortDate(a.date)}</span>
              </div>
              <p className="tabular mt-1 text-sm text-ink-2">
                Gap <span className="font-semibold text-crit">{money(a.gap_amount, ccy)}</span>: balance{" "}
                {money(a.quantile_balance, ccy)} vs buffer {money(a.required_buffer, ccy)}
              </p>
              {a.drivers.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-muted">
                  {a.drivers.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {limit != null && sorted.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-series-1 underline-offset-2 hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${sorted.length} alerts (${hidden} more)`}
        </button>
      )}
    </>
  );
}
