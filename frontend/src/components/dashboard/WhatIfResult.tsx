"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Corridor, CorridorLegend } from "@/components/charts/Corridor";
import { Segmented, StatTile, Ticker } from "@/components/ui";
import { historyFor, worstAlert } from "@/lib/derive";
import { money, num, shortDate, sortAlerts } from "@/lib/format";
import type { Account, Alert, HistoryRow, ScheduledFlow, WhatIfResponse } from "@/lib/types";
import { AlertItem } from "./AlertsTimeline";

const key = (a: Alert) => `${a.account_id}|${a.currency}|${a.date}`;

/** Before → after: corridor morph for one touched account, delta tiles, alerts before / after. */
export function WhatIfResult({
  result,
  accounts,
  flows,
  chartAccount,
  touched,
  onPickAccount,
  plotKey,
  history,
  dimmed = false,
}: {
  result: WhatIfResponse;
  accounts: Account[];
  flows: ScheduledFlow[];
  chartAccount: string | null;
  touched: string[];
  onPickAccount: (id: string) => void;
  plotKey: string;
  /** Recent actual balances, so the corridor opens from the as-of balance. */
  history?: HistoryRow[] | null;
  dimmed?: boolean;
}) {
  const reduce = useReducedMotion();
  const byId = new Map(accounts.map((a) => [a.account_id, a]));
  const flowById = new Map(flows.map((f) => [f.flow_id, f]));
  const acc = chartAccount ? byId.get(chartAccount) : undefined;
  const wb = worstAlert(result.alerts_before);
  const wa = worstAlert(result.alerts_after);
  const afterKeys = new Set(result.alerts_after.map(key));
  const beforeKeys = new Set(result.alerts_before.map(key));
  const removed = result.alerts_before.filter((a) => !afterKeys.has(key(a)));
  const afterList = sortAlerts([...result.alerts_after, ...removed]);
  const pickable = touched.length ? touched : accounts.map((a) => a.account_id);
  const asOf = result.scenario.as_of;
  const d = result.delta;
  return (
    <div className={`space-y-6 transition-opacity duration-200 ${dimmed ? "opacity-60" : ""}`}>
      <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="wi-chart">
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="wi-chart" className="t-h4">
              {acc ? `${acc.bank_name} · ${acc.label}` : "Before vs after"}
            </h2>
            <p className="t-small mt-0.5">Grey dashed: before. Blue: after. Red bands: gap days after the change.</p>
          </div>
          {pickable.length > 1 && (
            <Segmented
              size="sm"
              label="Account in the chart"
              value={chartAccount ?? pickable[0]}
              onChange={onPickAccount}
              options={pickable.map((id) => ({ value: id, label: byId.get(id) ? `${byId.get(id)!.bank_name.replace(/\s+Bank$/i, "")} ${byId.get(id)!.currency}` : id }))}
            />
          )}
        </header>
        <div className="mb-3">
          <CorridorLegend compare labels={{ main: "After", compare: "Before" }} />
        </div>
        {acc && (
          <Corridor
            points={result.scenario.points.filter((p) => p.account_id === acc.account_id)}
            compare={result.baseline.points.filter((p) => p.account_id === acc.account_id)}
            currency={acc.currency}
            asOf={asOf}
            history={historyFor(history ?? null, acc.account_id)}
            historyDays={7}
            accountLabel={`${acc.bank_name} ${acc.label} after the scenario`}
            plotKey={plotKey}
            labels={{ main: "After", compare: "Before" }}
            height={300}
          />
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(
          [
            ["gap days removed", d.gaps_removed, d.gaps_removed ? "text-good" : ""],
            ["gap days added", d.gaps_added, d.gaps_added ? "!text-gap" : ""],
          ] as const
        ).map(([label, v, tone]) => (
          <div key={label} className="card-tonal p-4 sm:p-5">
            <StatTile size="m" value={<Ticker value={v} format={(x) => num(x)} className={tone} />} label={label} labelStyle="small" />
          </div>
        ))}
        <div className="card-tonal p-4 sm:p-5">
          <StatTile size="m" gap={!!wb} value={wb ? <Ticker value={wb.gap_amount} format={(x) => money(x, wb.currency)} /> : "none"} label="worst gap · before" labelStyle="small" note={wb ? shortDate(wb.date) : undefined} />
        </div>
        <div className="card-tonal p-4 sm:p-5">
          <StatTile size="m" gap={!!wa} value={wa ? <Ticker value={wa.gap_amount} format={(x) => money(x, wa.currency)} /> : "none"} label="worst gap · after" labelStyle="small" note={wa ? shortDate(wa.date) : "no gap left"} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="ab">
          <h3 id="ab" className="t-h4 mb-4">
            Alerts before ({result.alerts_before.length})
          </h3>
          {result.alerts_before.length ? (
            <ul>
              {sortAlerts(result.alerts_before).map((a, i, arr) => (
                <li key={key(a)}>
                  <AlertItem alert={a} account={byId.get(a.account_id)} asOf={asOf} flows={flowById} last={i === arr.length - 1} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-small">No cash gaps before the change.</p>
          )}
        </section>
        <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="aa">
          <h3 id="aa" className="t-h4 mb-4">
            Alerts after ({result.alerts_after.length})
            {removed.length > 0 && <span className="ml-2 text-[13px] font-normal text-good">{removed.length} removed</span>}
          </h3>
          {afterList.length ? (
            <ul>
              <AnimatePresence initial={false}>
                {afterList.map((a, i) => {
                  const gone = !afterKeys.has(key(a));
                  const fresh = !beforeKeys.has(key(a));
                  return (
                    <m.li
                      key={key(a)}
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduce ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: reduce ? 0 : 0.32 }}
                    >
                      {fresh && <span className="sr-only-table">New alert:</span>}
                      {gone && <span className="sr-only-table">Removed by the scenario:</span>}
                      <AlertItem alert={a} account={byId.get(a.account_id)} asOf={asOf} flows={flowById} last={i === afterList.length - 1} struck={gone} />
                    </m.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="t-small">No cash gaps in the horizon after the change.</p>
          )}
        </section>
      </div>
    </div>
  );
}
