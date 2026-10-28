"use client";

import { useState } from "react";
import { Corridor } from "@/components/charts/Corridor";
import { ButtonLink, Skeleton, StatTile, Ticker } from "@/components/ui";
import { worstAlert } from "@/lib/derive";
import { dayMonth, money } from "@/lib/format";
import type { Account, DemoScenario, DemoScenarioSummary } from "@/lib/types";
import { ScenarioRow } from "./ScenarioRow";

/** Dashboard what-if card: precomputed scenario rows + a mini before → after corridor. */
export function ScenarioSwitcher({
  list,
  selectedId,
  onSelect,
  scenario,
  accounts,
}: {
  list: DemoScenarioSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  scenario: DemoScenario | null;
  accounts: Account[];
}) {
  const [more, setMore] = useState(false);
  const visible = more ? list : list.slice(0, 3);
  const accId = scenario ? (list.find((s) => s.id === scenario.id)?.accounts?.[0] ?? scenario.adjustments[0]?.account_id) : null;
  const acc = accounts.find((a) => a.account_id === accId) ?? null;
  const before = worstAlert(scenario?.alerts_before ?? []);
  const after = worstAlert(scenario?.alerts_after ?? []);
  const remaining = (scenario?.alerts_after ?? []).filter((a) => a.account_id === accId);

  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="scen-title">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="scen-title" className="t-h4">
            What-if · {list.length} precomputed scenarios
          </h2>
          <p className="t-small mt-0.5">Pick one to see the corridor move before → after. Nothing is executed.</p>
        </div>
        <ButtonLink href="/what-if" variant="secondary" size="sm">
          Open what-if
        </ButtonLink>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-2.5">
          {visible.map((s) => (
            <ScenarioRow key={s.id} s={s} selected={s.id === selectedId} onSelect={() => onSelect(s.id)} />
          ))}
          {list.length > 3 && (
            <button type="button" className="link text-[13.5px] font-medium" onClick={() => setMore((v) => !v)}>
              {more ? "Show fewer" : `Show ${list.length - 3} more`}
            </button>
          )}
        </div>
        <div className="min-w-0">
          {scenario && acc ? (
            <>
              <p className="eyebrow mb-2">
                {acc.bank_name} · {acc.label}
              </p>
              <Corridor
                points={scenario.scenario.points.filter((p) => p.account_id === acc.account_id)}
                compare={scenario.baseline.points.filter((p) => p.account_id === acc.account_id)}
                currency={acc.currency}
                asOf={scenario.scenario.as_of}
                accountLabel={`${acc.label}, scenario "${scenario.title}"`}
                plotKey={acc.account_id}
                height={170}
                compact
                showMarkers={false}
                labels={{ main: "After", compare: "Before" }}
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <StatTile
                  size="m"
                  gap={!!before}
                  label="worst gap · before"
                  value={before ? <Ticker value={before.gap_amount} format={(v) => money(v, before.currency)} /> : "none"}
                />
                <StatTile
                  size="m"
                  gap={!!after}
                  label="worst gap · after"
                  value={after ? <Ticker value={after.gap_amount} format={(v) => money(v, after.currency)} /> : "none"}
                  note={
                    remaining.length
                      ? `${remaining.length} gap ${remaining.length === 1 ? "day" : "days"} remain from ${dayMonth(remaining[0].date)}`
                      : "no gap days remain on this account"
                  }
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-[170px] w-full" />
              <p className="t-small">Pick a scenario to see the corridor move.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
