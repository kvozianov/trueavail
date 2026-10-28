"use client";

import { useState } from "react";
import { Corridor } from "@/components/charts/Corridor";
import { ScenarioRow } from "@/components/dashboard/ScenarioRow";
import { ButtonLink, SectionEyebrow, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import type { Account, DemoScenarioSummary } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** Three representative scenarios: the first, the one that removes most gap days and the one that adds most. */
function pick(list: DemoScenarioSummary[]): DemoScenarioSummary[] {
  const byRemoved = [...list].sort((a, b) => b.delta.gaps_removed - a.delta.gaps_removed)[0];
  const byAdded = [...list].sort((a, b) => b.delta.gaps_added - a.delta.gaps_added)[0];
  const ids = [...new Set([list[0]?.id, byRemoved?.id, byAdded?.id].filter(Boolean))];
  return list.filter((s) => ids.includes(s.id));
}

export function WhatIfTeaser({ list, accounts }: { list: DemoScenarioSummary[]; accounts: Account[] }) {
  const rows = pick(list);
  const [id, setId] = useState(rows[0]?.id ?? null);
  const cur = rows.find((r) => r.id === id) ?? null;
  const scen = useApi(cur ? `demo:scenario:${cur.id}` : null, () => api.demoScenario(cur!));
  const data = scen.data?.id === cur?.id ? scen.data : null;
  const accId = cur?.accounts?.[0] ?? data?.adjustments[0]?.account_id;
  const acc = accounts.find((a) => a.account_id === accId);
  return (
    <section className="py-16 sm:py-20" aria-labelledby="wi-title">
      <div className="container-page grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionEyebrow>What-if · {list.length} precomputed scenarios</SectionEyebrow>
          <h2 id="wi-title" className="t-h2 mt-3">
            Test the decision before making it.
          </h2>
          <p className="t-lead mt-3 max-w-[44ch]">Move, resize or cancel a scheduled payment and the backend re-runs the 14-day corridor. Nothing is executed.</p>
          <div className="mt-6 space-y-2.5">
            {rows.map((s) => (
              <ScenarioRow key={s.id} s={s} selected={s.id === id} onSelect={() => setId(s.id)} compact />
            ))}
          </div>
          <ButtonLink href="/what-if" variant="secondary" className="mt-6">
            Open what-if
          </ButtonLink>
        </div>
        <div className="card min-w-0 p-5 sm:p-6 lg:col-span-7">
          {data && acc ? (
            <>
              <p className="eyebrow mb-1">
                {acc.bank_name} · {acc.label}
              </p>
              <p className="t-small mb-3">{data.description}</p>
              <Corridor
                points={data.scenario.points.filter((p) => p.account_id === acc.account_id)}
                compare={data.baseline.points.filter((p) => p.account_id === acc.account_id)}
                currency={acc.currency}
                asOf={data.scenario.as_of}
                accountLabel={`${acc.label}, scenario "${data.title}"`}
                plotKey={acc.account_id}
                labels={{ main: "After", compare: "Before" }}
                height={260}
              />
              <p className="t-micro mt-3">Grey dashed: before. Blue: after. Red bands: gap days after the change.</p>
            </>
          ) : (
            <Skeleton className="h-[320px] w-full" />
          )}
        </div>
      </div>
    </section>
  );
}
