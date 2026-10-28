"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { EmptyState, Segmented, Tag } from "@/components/ui";
import { dayMonth, daysBetween, inDays, money, pctValue, shortDate, sortAlerts } from "@/lib/format";
import type { Account, Alert, ScheduledFlow } from "@/lib/types";
import { parseDriver } from "./drivers";

export function AlertItem({
  alert,
  account,
  asOf,
  flows,
  last = false,
  onHover,
  struck = false,
}: {
  alert: Alert;
  account?: Account;
  asOf: string;
  flows: Map<string, ScheduledFlow>;
  last?: boolean;
  onHover?: (date: string | null) => void;
  struck?: boolean;
}) {
  const ccy = alert.currency || account?.currency;
  const name = alert.account_id === "consolidated" ? `Consolidated ${alert.currency}` : account ? `${account.bank_name} · ${account.label}` : alert.account_id;
  const n = daysBetween(asOf, alert.date);
  const red = alert.severity === "red";
  return (
    <div
      className={`grid grid-cols-[18px_minmax(0,1fr)_auto] gap-x-3 ${struck ? "opacity-45" : ""}`}
      onPointerEnter={() => onHover?.(alert.date)}
      onPointerLeave={() => onHover?.(null)}
    >
      <div className="relative flex justify-center pt-[5px]" aria-hidden>
        <span className={`relative z-[1] h-2.5 w-2.5 rounded-full ${red ? "bg-gap-fill" : "bg-warn-fill"}`} />
        {!last && <span className="absolute bottom-[-6px] top-[18px] w-[2px] rounded bg-hairline" />}
      </div>
      <div className={`min-w-0 pb-5 ${struck ? "line-through decoration-ink-4" : ""}`}>
        <p className="text-[14px]">
          <span className="font-semibold text-ink tnum">Gap {money(alert.gap_amount, ccy)}</span>{" "}
          <span className="text-[13px] text-ink-3">{name}</span>
          <span className="sr-only-table">{red ? " (red)" : " (amber)"}</span>
        </p>
        <p className="mt-0.5 text-[13.5px] text-ink-2 tnum">
          P5 balance <span className="font-semibold text-gap">{money(alert.quantile_balance, ccy)}</span> vs buffer {money(alert.required_buffer, ccy)}
          {!red && alert.required_buffer > 0 && (
            <span className="text-ink-3"> · amber: gap is {pctValue((alert.gap_amount / alert.required_buffer) * 100)} of the buffer</span>
          )}
        </p>
        {alert.drivers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {alert.drivers.map((d) => {
              const p = parseDriver(d, flows);
              return (
                <Tag key={p.key} kind={p.direction === "inflow" ? "in" : p.direction === "outflow" ? "out" : "plain"}>
                  {p.text}
                </Tag>
              );
            })}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-ink">{shortDate(alert.date)}</p>
        <p className="font-mono text-[11.5px] text-ink-3">{inDays(n)}</p>
      </div>
    </div>
  );
}

export function AlertsTimeline({
  perAccount,
  consolidated,
  accounts,
  flows,
  asOf,
  horizon,
  onHoverDate,
  limit = 4,
}: {
  perAccount: Alert[];
  consolidated: Alert[];
  accounts: Account[];
  flows: ScheduledFlow[];
  asOf: string;
  horizon: number;
  onHoverDate?: (d: string | null) => void;
  limit?: number;
}) {
  const [view, setView] = useState<"account" | "currency">("account");
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();
  const byId = new Map(accounts.map((a) => [a.account_id, a]));
  const flowById = new Map(flows.map((f) => [f.flow_id, f]));
  const sorted = sortAlerts(perAccount);
  const shown = expanded ? sorted : sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const gapAccounts = [...new Set(perAccount.map((a) => a.account_id))].map((id) => byId.get(id)?.label ?? id);
  const currencies = [...new Set(accounts.map((a) => a.currency))];

  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="alerts-title">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="alerts-title" className="t-h4">
            Alerts · {perAccount.length} in {horizon} days
          </h2>
          <p className="t-small mt-0.5">
            P5 below the buffer
            {gapAccounts.length === 1 ? ` · all on ${byId.get(perAccount[0].account_id)?.bank_name ?? ""} ${gapAccounts[0]}` : gapAccounts.length ? ` · ${gapAccounts.length} accounts` : ""}
          </p>
        </div>
        <Segmented
          label="Alert grouping"
          value={view}
          onChange={setView}
          options={[
            { value: "account", label: "Per account" },
            { value: "currency", label: "Per currency" },
          ]}
        />
      </header>
      {view === "account" ? (
        perAccount.length ? (
          <>
            <ul>
              <AnimatePresence initial={false}>
                {shown.map((a, i) => (
                  <m.li
                    key={`${a.account_id}-${a.date}`}
                    initial={reduce ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={reduce ? undefined : { opacity: 0, height: 0 }}
                    transition={{ duration: reduce ? 0 : 0.32, ease: [0.2, 0, 0, 1] }}
                  >
                    <AlertItem alert={a} account={byId.get(a.account_id)} asOf={asOf} flows={flowById} last={i === shown.length - 1} onHover={onHoverDate} />
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
            {rest.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="link text-[13.5px] font-medium">
                {expanded ? "Show fewer" : `Show all ${sorted.length} alerts · ${rest.length} more, ${dayMonth(rest[0].date)} – ${dayMonth(rest[rest.length - 1].date)} →`}
              </button>
            )}
          </>
        ) : (
          <EmptyState title={`No cash gaps in the next ${horizon} days.`} body="P5 stays above every buffer. Try a scenario to stress the schedule." />
        )
      ) : (
        <ul className="space-y-4">
          {currencies.map((ccy) => {
            const group = sortAlerts(consolidated.filter((a) => a.currency === ccy));
            const n = accounts.filter((a) => a.currency === ccy).length;
            return (
              <li key={ccy} className="rounded-3 bg-bg-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-ink">
                    {ccy} <span className="font-normal text-ink-3">· {n} {n === 1 ? "account" : "accounts"}</span>
                  </p>
                  {group.length ? (
                    <span className="text-[13px] font-medium text-gap">{group.length} consolidated gap days</span>
                  ) : (
                    <span className="text-[13px] font-medium text-good">no consolidated gap</span>
                  )}
                </div>
                {group.length > 0 && (
                  <ul className="mt-3">
                    {group.map((a, i) => (
                      <li key={a.date}>
                        <AlertItem alert={a} asOf={asOf} flows={flowById} last={i === group.length - 1} />
                      </li>
                    ))}
                  </ul>
                )}
                {!group.length && (
                  <p className="t-small mt-1">
                    Sum of {n === 1 ? "the account" : `the ${n} ${ccy} accounts`} stays above the summed buffer. No FX conversion.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
