"use client";

import { useEffect, useMemo, useState } from "react";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { FunctionWorkbench } from "@/components/liquidity/FunctionWorkbench";
import { PermissionedRailPanel } from "@/components/liquidity/PermissionedRailPanel";
import { useDemoSnapshot } from "@/hooks/useDemoSnapshot";
import {
  buildGoldenIncident,
  goldenIncidentSnapshotFallback,
  type DemoMode,
  type GoldenIncident,
} from "@/lib/golden-incident";
import { buildPermissionedRailScenario } from "@/lib/permissioned-rail";
import type { DecisionPhase } from "@/lib/demo-phase";
import {
  formatCurrencyAmount,
  formatDate,
  formatDateTime,
  formatNumber,
  titleize,
} from "@/lib/backend/formatters";

export function DemoCockpit({ initialPhase = "pending" }: { initialPhase?: DecisionPhase }) {
  const phase = initialPhase;
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [evidenceCollapsed, setEvidenceCollapsed] = useState(false);
  const snapshot = useDemoSnapshot();
  const refreshSnapshot = snapshot.refresh;

  useEffect(() => {
    void refreshSnapshot().catch(() => undefined);
  }, [refreshSnapshot]);

  const mode: DemoMode = snapshot.data && !snapshot.error ? "live" : "replay";
  const incident = useMemo(
    () => buildGoldenIncident(snapshot.data ?? goldenIncidentSnapshotFallback),
    [snapshot.data],
  );
  const railScenario = useMemo(() => buildPermissionedRailScenario(incident), [incident]);
  const evidenceRevealed = phase !== "pending";
  const compactGridClass = [
    "grid gap-2 lg:gap-3",
    controlsCollapsed && evidenceCollapsed
      ? "xl:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]"
      : controlsCollapsed
        ? "xl:grid-cols-[3.5rem_minmax(0,1fr)_18.5rem]"
        : evidenceCollapsed
          ? "xl:grid-cols-[17.25rem_minmax(0,1fr)_3.5rem]"
          : "xl:grid-cols-[17.25rem_minmax(0,1fr)_18.5rem]",
  ].join(" ");

  return (
    <main className="demo-page demo-compact min-h-dvh px-2 pb-6 pt-0 text-[var(--ink)] sm:px-3" id="main-content">
      <DemoNav
        mode={mode}
        statusText={
          snapshot.error
            ? "API unavailable, deterministic fallback active"
            : snapshot.refetching
              ? "Refreshing evidence"
          : "Golden incident contract"
        }
      />

      <section className="mx-auto flex w-full max-w-[1800px] flex-col gap-2 pt-2">
        <RuntimeStrip
          mode={mode}
          phase={phase}
          loading={snapshot.loading || snapshot.refetching}
          error={snapshot.error?.message}
        />

        <section className={compactGridClass} id="demo-dashboard" aria-labelledby="decision-title">
          <aside className="demo-control-rail rounded-[18px] border border-[var(--line)] bg-[rgba(20,22,25,0.74)] p-2 shadow-[inset_0_1px_0_rgba(245,245,247,0.08)] backdrop-blur-xl">
            <CompactRailHeader
              collapsed={controlsCollapsed}
              label="Controls"
              meta="Simulation"
              onToggle={() => setControlsCollapsed((current) => !current)}
            />
            {controlsCollapsed ? (
              <CollapsedRailLabel label="queue" value={phase} />
            ) : (
              <div className="mt-2 grid gap-2">
                <CompactScenarioControls incident={incident} phase={phase} revealed={evidenceRevealed} />
                <PayoutQueue incident={incident} phase={phase} />
              </div>
            )}
          </aside>

          <section className="demo-simulation-stage min-h-[calc(100dvh-132px)] rounded-[24px] border border-[rgba(245,245,247,0.18)] bg-[linear-gradient(180deg,rgba(245,245,247,0.07),rgba(245,245,247,0.025)),rgba(15,16,17,0.62)] p-2 shadow-[0_28px_90px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(245,245,247,0.08)] backdrop-blur-xl">
            <section className="selected-decision selected-decision--compact">
              <div className="decision-kicker">
                <StateBadge state={phase} reason={stateReason(phase, incident)} />
                <span>{incident.accountId}</span>
              </div>
              <h1 id="decision-title">Approve EUR 4.1M payout?</h1>
              <p className="decision-thesis">Book balance says green. Usable liquidity says red.</p>
              <p className="decision-copy">
                TrueAvail prevents treasury teams from approving unsafe payments based on misleading balances.
              </p>
              <DecisionStateBar phase={phase} incident={incident} />
              <RailAlternativeSnapshot
                afterGap={railScenario.after.p05Gap}
                finalitySla={railScenario.permissioned.finalitySla}
                legacySla={railScenario.oldWay.finalitySla}
                revealed={evidenceRevealed}
              />

              <div className="demo-simulation-grid">
                <BookVsUsableSplit incident={incident} revealed={evidenceRevealed} />
                <section className="impact-rail impact-rail--compact" aria-labelledby="impact-title">
                  <div className="impact-rail__header">
                    <div>
                      <p className="eyebrow">Liquidity impact simulation</p>
                      <h2 id="impact-title">p05 corridor crosses survival floor</h2>
                    </div>
                    <span className="mono-chip">{mode === "live" ? "live" : "replay"}</span>
                  </div>
                  <IncidentCorridor incident={incident} revealed={evidenceRevealed} />
                </section>
              </div>

              <div className="decision-actions" aria-label="Decision actions">
                {phase === "pending" ? (
                  <>
                    <a className="command-button command-button--primary" href="?phase=breached">
                      Approve
                    </a>
                    <a className="command-button" href="?phase=breached#evidence">
                      Run Golden Incident
                    </a>
                    <a className="command-button command-button--ghost" href="?phase=breached">
                      Hold
                    </a>
                  </>
                ) : (
                  <>
                    <a className="command-button command-button--danger" href="?phase=rejected">
                      Reject
                    </a>
                    <a className="command-button" href="#contingency">Prefund</a>
                    <a className="command-button" href="#contingency">Throttle</a>
                    <a className="command-button command-button--ghost" href="?phase=pending">
                      Restart Demo
                    </a>
                  </>
                )}
              </div>
            </section>
          </section>

          <aside className="demo-evidence-rail rounded-[18px] border border-[var(--line)] bg-[rgba(20,22,25,0.74)] p-2 shadow-[inset_0_1px_0_rgba(245,245,247,0.08)] backdrop-blur-xl">
            <CompactRailHeader
              collapsed={evidenceCollapsed}
              label="Evidence"
              meta="Audit"
              onToggle={() => setEvidenceCollapsed((current) => !current)}
            />
            {evidenceCollapsed ? (
              <CollapsedRailLabel label="proof" value={evidenceRevealed ? "open" : "locked"} />
            ) : (
              <div className="mt-2 grid gap-2">
                <EvidenceChain incident={incident} revealed={evidenceRevealed} phase={phase} />
                <AuditStamp incident={incident} mode={mode} phase={phase} />
              </div>
            )}
          </aside>
        </section>
      </section>

      <PermissionedRailPanel incident={incident} />
      <FunctionWorkbench incident={incident} key={phase} mode={mode} phase={phase} />
      <ValueStrip incident={incident} />
      <PitchModePanel phase={phase} />

      <RiskEvidenceSection incident={incident} revealed={evidenceRevealed} />
      <GovernanceSection incident={incident} phase={phase} />
      <ContingencySection incident={incident} />
    </main>
  );
}

function RailAlternativeSnapshot({
  afterGap,
  finalitySla,
  legacySla,
  revealed,
}: {
  afterGap: number;
  finalitySla: string;
  legacySla: string;
  revealed: boolean;
}) {
  return (
    <div className={revealed ? "rail-alternative-strip rail-alternative-strip--revealed" : "rail-alternative-strip"} aria-label="Legacy rail versus permissioned rail summary">
      <div>
        <span>Legacy route</span>
        <strong>{revealed ? legacySla : "locked"}</strong>
        <small>{revealed ? "misses cut-off, keeps p05 gap" : "reveal evidence first"}</small>
      </div>
      <div>
        <span>Permissioned overlay</span>
        <strong>{revealed ? finalitySla : "available"}</strong>
        <small>{revealed ? "approved intragroup liquidity before cut-off" : "policy rail staged"}</small>
      </div>
      <div>
        <span>After overlay</span>
        <strong>{revealed ? formatEur(afterGap, 3) : "pending"}</strong>
        <small>{revealed ? "ledger move + residual throttle" : "not committed"}</small>
      </div>
    </div>
  );
}

function CompactRailHeader({
  collapsed,
  label,
  meta,
  onToggle,
}: {
  collapsed: boolean;
  label: string;
  meta: string;
  onToggle: () => void;
}) {
  return (
    <div
      className={
        collapsed
          ? "compact-rail-header flex min-h-[12rem] flex-col items-center justify-between gap-2"
          : "compact-rail-header flex items-center justify-between gap-2"
      }
    >
      <div className={collapsed ? "flex flex-col items-center gap-2 text-center" : "min-w-0"}>
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[rgba(245,245,240,0.5)]">
          {meta}
        </span>
        <strong
          className={
            collapsed
              ? "[writing-mode:vertical-rl] text-[11px] font-black uppercase tracking-[0.16em] text-[var(--ink)]"
              : "block truncate text-[12px] font-black uppercase tracking-[0.13em] text-[var(--ink)]"
          }
        >
          {label}
        </strong>
      </div>
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Open ${label} rail` : `Collapse ${label} rail`}
        className="grid h-8 min-w-8 place-items-center rounded-[10px] border border-[rgba(245,245,247,0.16)] bg-[rgba(245,245,247,0.07)] text-[12px] font-black text-[var(--ink)] shadow-[inset_0_1px_0_rgba(245,245,247,0.08)] transition-[border-color,background,transform] duration-150 hover:border-[rgba(240,106,27,0.52)] hover:bg-[rgba(240,106,27,0.12)] focus-visible:ring-2 focus-visible:ring-[rgba(240,106,27,0.55)]"
        onClick={onToggle}
        type="button"
      >
        {collapsed ? "+" : "-"}
      </button>
    </div>
  );
}

function CollapsedRailLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="compact-collapsed-rail mt-3 flex min-h-[20rem] flex-col items-center justify-between rounded-[14px] border border-[rgba(245,245,247,0.11)] bg-[rgba(245,245,247,0.035)] px-2 py-3 text-center">
      <span className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-[0.16em] text-[rgba(245,245,240,0.66)]">
        {label}
      </span>
      <strong className="[writing-mode:vertical-rl] text-[10px] font-black uppercase tracking-[0.16em] text-[var(--brand-orange)]">
        {value}
      </strong>
    </div>
  );
}

function CompactScenarioControls({
  incident,
  phase,
  revealed,
}: {
  incident: GoldenIncident;
  phase: DecisionPhase;
  revealed: boolean;
}) {
  const metrics = [
    ["Payout", formatEur(incident.payoutAmount, 1)],
    ["p05 gap", revealed ? formatEur(incident.p05Gap, 3) : "locked"],
    ["Stress loss", revealed ? formatEur(incident.target2StressLoss, 3) : "locked"],
    ["HHI", revealed ? `${incident.hhiAfterStress.toFixed(3)}` : "locked"],
  ];
  const phases: Array<[DecisionPhase, string]> = [
    ["pending", "Pending"],
    ["breached", "Breach"],
    ["rejected", "Reject"],
  ];

  return (
    <section className="rounded-[14px] border border-[rgba(245,245,247,0.12)] bg-[rgba(245,245,247,0.045)] p-2 shadow-[inset_0_1px_0_rgba(245,245,247,0.06)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[rgba(245,245,240,0.48)]">
            Scenario controls
          </p>
          <strong className="block truncate text-[12px] text-[var(--ink)]">{incident.accountId}</strong>
        </div>
        <span className="rounded-full border border-[rgba(240,106,27,0.34)] bg-[rgba(240,106,27,0.12)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--brand-orange)]">
          {phase}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {metrics.map(([label, value]) => (
          <div
            className="min-w-0 rounded-[10px] border border-[rgba(245,245,247,0.09)] bg-[rgba(10,12,14,0.4)] px-2 py-1.5"
            key={label}
          >
            <span className="block truncate text-[9px] font-black uppercase tracking-[0.12em] text-[rgba(245,245,240,0.44)]">
              {label}
            </span>
            <strong className="block truncate text-[12px] text-[var(--ink)]">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Replay state controls">
        {phases.map(([target, label]) => (
          <a
            className={[
              "rounded-[10px] border px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.1em] transition-[border-color,background,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-[rgba(240,106,27,0.55)]",
              phase === target
                ? "border-[rgba(240,106,27,0.56)] bg-[rgba(240,106,27,0.15)] text-[var(--brand-orange)]"
                : "border-[rgba(245,245,247,0.1)] bg-[rgba(245,245,247,0.045)] text-[rgba(245,245,240,0.68)] hover:border-[rgba(245,245,247,0.24)] hover:bg-[rgba(245,245,247,0.08)]",
            ].join(" ")}
            href={`?phase=${target}`}
            key={target}
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}

function RuntimeStrip({
  mode,
  phase,
  loading,
  error,
}: {
  mode: DemoMode;
  phase: DecisionPhase;
  loading?: boolean;
  error?: string;
}) {
  const runtimeStatus = error
    ? "Fallback active"
    : loading
      ? "Refreshing evidence"
      : "Ready for defense";

  return (
    <section
      className={error ? "runtime-strip runtime-strip--warning" : "runtime-strip"}
      aria-label="Demo runtime status"
      aria-live="polite"
    >
      <div>
        <span>Data source</span>
        <strong>{mode === "live" ? "Live API" : "Replay Snapshot"}</strong>
      </div>
      <div>
        <span>Runtime</span>
        <strong>{runtimeStatus}</strong>
      </div>
      <div>
        <span>Active state</span>
        <strong>{phase}</strong>
      </div>
      <div>
        <span>Fallback</span>
        <strong>{error ? "API unavailable" : "deterministic snapshot ready"}</strong>
      </div>
    </section>
  );
}

function DecisionStateBar({ phase, incident }: { phase: DecisionPhase; incident: GoldenIncident }) {
  const stateOrder = ["pending", "breached", "rejected"] as const;
  const currentIndex = stateOrder.indexOf(phase);
  const states = [
    {
      state: "pending",
      label: "False-safe view",
      reason: "Book balance appears sufficient.",
    },
    {
      state: "breached",
      label: "Risk revealed",
      reason: `p05 gap ${formatEur(incident.p05Gap, 3)} breaches survival floor.`,
    },
    {
      state: "rejected",
      label: "Gate blocks approval",
      reason: "Policy refuses unsafe payout.",
    },
    {
      state: "escalated",
      label: "Next state",
      reason: "Treasury owner attaches contingency plan.",
    },
    {
      state: "timed-out",
      label: "Cut-off risk",
      reason: "Payout waits for funding or throttle action.",
    },
  ];

  return (
    <ol className="decision-state-bar" aria-label="Decision state progression">
      {states.map((item, index) => {
        const isCurrent = item.state === phase;
        const isDone = index < currentIndex;
        const isFuture = item.state === "escalated" || item.state === "timed-out";
        return (
          <li
            className={[
              "decision-state",
              `decision-state--${item.state}`,
              isCurrent ? "decision-state--current" : "",
              isDone ? "decision-state--done" : "",
              isFuture ? "decision-state--future" : "",
            ].filter(Boolean).join(" ")}
            key={item.state}
          >
            <span>{item.state}</span>
            <strong>{item.label}</strong>
            <p>{item.reason}</p>
          </li>
        );
      })}
    </ol>
  );
}

function PitchModePanel({ phase }: { phase: DecisionPhase }) {
  const steps = [
    ["01", "Landing", "Problem and value", "/demo?phase=pending"],
    ["02", "Golden Incident", "Approve payout?", "/demo?phase=pending"],
    ["03", "Forecast", "Hidden p05 gap", "/demo?phase=breached#evidence"],
    ["04", "Stress + HHI", "Risk gets worse", "/demo?phase=breached#evidence"],
    ["05", "Optimizer", "No safe transfer", "/demo?phase=breached#governance"],
    ["06", "Governance", "Reject", "/demo?phase=rejected#governance"],
    ["07", "Permissioned Rail", "Policy-based overlay", "/demo?phase=rejected#permissioned-rail"],
    ["08", "Contingency", "Ledger move + throttle", "/demo?phase=rejected#contingency"],
    ["09", "ROI", "Business value", "/demo?phase=rejected#contingency"],
    ["10", "Judge View", "Working functions", "/judge"],
    ["11", "Technical View", "Implementation proof", "/technical"],
  ];
  const activeRange =
    phase === "pending" ? new Set(["01", "02"]) :
    phase === "breached" ? new Set(["03", "04", "05"]) :
    new Set(["06", "07", "08", "09"]);

  return (
    <section className={`pitch-mode pitch-mode--${phase}`} aria-labelledby="pitch-mode-title">
      <div className="section-heading">
        <p className="eyebrow">Pitch mode</p>
        <h2 id="pitch-mode-title">3-5 minute defense sequence</h2>
        <p>Use this rail to keep the demo story moving from false-safe approval to governed rejection and proof.</p>
      </div>
      <ol>
        {steps.map(([number, label, detail, href]) => (
          <li className={activeRange.has(number) ? "pitch-step pitch-step--active" : "pitch-step"} key={number}>
            <a href={href}>
              <span>{number}</span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PayoutQueue({ incident, phase }: { incident: GoldenIncident; phase: DecisionPhase }) {
  const rows = [
    {
      label: "Merchant payout cycle",
      account: incident.accountId,
      amount: incident.payoutAmount,
      state: phase,
      selected: true,
    },
    {
      label: "Card clearing delay",
      account: "atlas-eur-operating",
      amount: 2_550_000,
      state: "pending",
      selected: false,
    },
    {
      label: "Payroll reserve pressure",
      account: "atlas-usd-operating",
      amount: 1_800_000,
      state: "pending",
      selected: false,
    },
  ];

  return (
    <aside className="payout-queue" aria-labelledby="queue-title">
      <div className="rail-header">
        <p className="eyebrow">Payout queue</p>
        <h2 id="queue-title">Pending liquidity events</h2>
      </div>
      <div className="queue-list">
        {rows.map((row) => (
          <article className={row.selected ? "queue-row queue-row--selected" : "queue-row"} key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.account}</span>
            </div>
            <div>
              <b>{formatEur(row.amount, 1)}</b>
              <small>{row.state}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="queue-note">
        <span>Cut-off</span>
        <strong>2026-05-19 18:00 UTC</strong>
      </div>
    </aside>
  );
}

function BookVsUsableSplit({ incident, revealed }: { incident: GoldenIncident; revealed: boolean }) {
  return (
    <div className="book-usable-split" aria-label="Book balance versus usable liquidity">
      <article>
        <span>Traditional book balance</span>
        <strong>{formatEur(incident.bookBalance, 1)}</strong>
        <p>Ledger view appears sufficient for the payout.</p>
        <Meter value={incident.payoutAmount} max={incident.bookBalance} danger={false} label="payout vs book balance" />
      </article>
      <article className={revealed ? "breach-panel is-revealed" : "breach-panel"}>
        <span>Usable liquidity after controls</span>
        <strong>{revealed ? formatCurrencyAmount(incident.usableLiquidityAfterPayout, incident.payoutCurrency) : "Evidence locked"}</strong>
        <p>
          {revealed
            ? `p05 gap requires ${formatEur(incident.p05Gap, 3)} before approval.`
            : "Click Approve or Run Golden Incident to reveal the survival floor."}
        </p>
        <Meter value={revealed ? Math.abs(incident.usableLiquidityAfterPayout) : 0} max={incident.payoutAmount} danger={revealed} label="usable liquidity breach" />
      </article>
    </div>
  );
}

function EvidenceChain({
  incident,
  revealed,
  phase,
}: {
  incident: GoldenIncident;
  revealed: boolean;
  phase: DecisionPhase;
}) {
  const evidence = [
    {
      label: "Forecast",
      value: formatEur(incident.p05Gap, 3),
      reason: "p05 usable gap on atlas-eur-operating",
      state: revealed ? "breached" : "pending",
    },
    {
      label: "Stress",
      value: formatEur(incident.target2StressLoss, 3),
      reason: "TARGET2 outage stress loss",
      state: revealed ? "breached" : "pending",
    },
    {
      label: "HHI",
      value: `${incident.hhiAfterStress.toFixed(3)} > ${incident.hhiThreshold.toFixed(2)}`,
      reason: "Bank concentration above policy",
      state: revealed ? "breached" : "pending",
    },
    {
      label: "Optimizer",
      value: incident.optimizerStatus,
      reason: "No safe route under survival floors",
      state: revealed ? incident.optimizerStatus : "pending",
    },
    {
      label: "Gate",
      value: incident.governanceDecision,
      reason: "Unsafe decision blocked",
      state: phase === "rejected" ? "rejected" : revealed ? "breached" : "pending",
    },
  ];

  return (
    <aside className="evidence-chain" aria-labelledby="evidence-title">
      <div className="rail-header">
        <p className="eyebrow">Evidence chain</p>
        <h2 id="evidence-title">Constraint proof</h2>
      </div>
      <ol>
        {evidence.map((item) => (
          <li className={`evidence-row evidence-row--${item.state}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{revealed ? item.value : "locked"}</strong>
            <p>{revealed ? item.reason : "Waiting for decision click."}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function IncidentCorridor({ incident, revealed }: { incident: GoldenIncident; revealed: boolean }) {
  const points = incident.forecastRows.slice(0, 8);

  if (!points.length) {
    return <div className="empty-chart">No forecast rows in snapshot.</div>;
  }

  const values = points.flatMap((point) => [
    point.usable_liquidity_p05 ?? 0,
    point.usable_liquidity_p50 ?? 0,
    point.usable_liquidity_p95 ?? 0,
    0,
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.16, 1);
  const domainMin = min - padding;
  const domainMax = max + padding;
  const xFor = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const yFor = (value: number) => 90 - ((value - domainMin) / (domainMax - domainMin || 1)) * 80;
  const pathFor = (key: "usable_liquidity_p05" | "usable_liquidity_p50" | "usable_liquidity_p95") =>
    points
      .map((point, index) => {
        const value = point[key] ?? 0;
        return `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)}`;
      })
      .join(" ");
  const floorPath = points
    .map((_, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(0).toFixed(2)}`)
    .join(" ");

  return (
    <div className={revealed ? "incident-chart is-revealed" : "incident-chart"}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="incident-chart__grid" d="M 0 10 H 100 M 0 30 H 100 M 0 50 H 100 M 0 70 H 100 M 0 90 H 100" />
        <path className="incident-chart__line incident-chart__line--p95" d={pathFor("usable_liquidity_p95")} />
        <path className="incident-chart__line incident-chart__line--p50" d={pathFor("usable_liquidity_p50")} />
        <path className="incident-chart__line incident-chart__line--p05" d={pathFor("usable_liquidity_p05")} />
        <path className="incident-chart__floor" d={floorPath} />
        {points.map((point, index) => (
          <circle
            className={point.breach ? "incident-chart__point incident-chart__point--breach" : "incident-chart__point"}
            cx={xFor(index)}
            cy={yFor(point.usable_liquidity_p05 ?? 0)}
            r={point.breach ? 1.6 : 1}
            key={`${point.date}-${index}`}
          />
        ))}
      </svg>
      <div className="chart-labels">
        <span>{formatDate(points[0]?.date)}</span>
        <b>{revealed ? "breach visible" : "forecast hidden until decision"}</b>
        <span>{formatDate(points.at(-1)?.date)}</span>
      </div>
    </div>
  );
}

function AuditStamp({
  incident,
  mode,
  phase,
}: {
  incident: GoldenIncident;
  mode: DemoMode;
  phase: DecisionPhase;
}) {
  return (
    <section className="audit-stamp" aria-labelledby="audit-title">
      <div>
        <p className="eyebrow">Audit stamp</p>
        <h2 id="audit-title">{phase === "rejected" ? "Reject recorded" : "Decision trace"}</h2>
      </div>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{mode === "live" ? "Live API" : "Replay Snapshot"}</dd>
        </div>
        <div>
          <dt>Solver</dt>
          <dd>{phase === "pending" ? "queued" : incident.solverEngine}</dd>
        </div>
        <div>
          <dt>Gate</dt>
          <dd>{phase === "pending" ? "pending" : incident.governanceDecision}</dd>
        </div>
        <div>
          <dt>Evidence ID</dt>
          <dd>event-atlas-eur-merchant-payout</dd>
        </div>
      </dl>
    </section>
  );
}

function ValueStrip({ incident }: { incident: GoldenIncident }) {
  const values = [
    ["Released capital", incident.roi.releasedCapital],
    ["Fewer overdrafts", incident.roi.overdraftReduction],
    ["Early warning", incident.roi.earlyWarning],
    ["Less manual work", incident.roi.manualWorkReduction],
  ];

  return (
    <section className="value-strip" aria-label="Business value">
      {values.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function RiskEvidenceSection({ incident, revealed }: { incident: GoldenIncident; revealed: boolean }) {
  const rows = [
    ["p05 usable gap", formatEur(incident.p05Gap, 3), "Prefund or throttle before payout cut-off"],
    ["TARGET2 stress loss", formatEur(incident.target2StressLoss, 3), "Rail outage removes settlement flexibility"],
    ["ES99", formatEur(incident.es99, 3), "Tail loss matches the hidden cash gap"],
    ["HHI after stress", `${incident.hhiAfterStress.toFixed(3)} > ${incident.hhiThreshold.toFixed(2)}`, "Concentration policy blocks automatic approval"],
    ["Known event", incident.event, "Scheduled merchant payout creates the outflow"],
  ];

  return (
    <section className="evidence-section" id="evidence" aria-labelledby="risk-evidence-title">
      <div className="section-heading">
        <p className="eyebrow">Risk evidence cockpit</p>
        <h2 id="risk-evidence-title">Signal, cause, constraint, decision impact</h2>
        <p>
          Every red metric is tied to the payout decision. The system is not raising a vague alert,
          it is proving why approval is unsafe.
        </p>
      </div>
      <div className="evidence-ledger" aria-label="Risk evidence ledger">
        <div className="ledger-row ledger-row--head">
          <span>Constraint</span>
          <span>Current</span>
          <span>Decision impact</span>
        </div>
        {rows.map(([constraint, current, impact]) => (
          <div className={revealed ? "ledger-row ledger-row--danger" : "ledger-row"} key={constraint}>
            <span>{constraint}</span>
            <strong>{revealed ? current : "locked"}</strong>
            <p>{revealed ? impact : "Reveal evidence from the decision object."}</p>
          </div>
        ))}
      </div>
      <div className="root-cause-grid">
        {incident.rootCauses.slice(0, 4).map((cause) => (
          <article key={cause.title}>
            <span>{titleize(cause.type ?? "evidence")}</span>
            <h3>{cause.title}</h3>
            <p>{cause.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GovernanceSection({ incident, phase }: { incident: GoldenIncident; phase: DecisionPhase }) {
  return (
    <section className="governance-section" id="governance" aria-labelledby="governance-title">
      <div className="section-heading">
        <p className="eyebrow">Optimizer + governance gate</p>
        <h2 id="governance-title">Infeasible is a useful result</h2>
        <p>
          The solver did not fail the demo. It proved there is no safe transfer under survival floors
          and exposure constraints.
        </p>
      </div>
      <div className="governance-grid">
        <article className="governance-result">
          <span>Optimizer status</span>
          <strong>{incident.optimizerStatus}</strong>
          <p>{incident.optimizerReason}</p>
          <dl>
            <div>
              <dt>Solver</dt>
              <dd>{incident.solverEngine}</dd>
            </div>
            <div>
              <dt>Route plan</dt>
              <dd>0 safe transfers</dd>
            </div>
          </dl>
        </article>
        <article className={phase === "rejected" ? "reject-stamp is-final" : "reject-stamp"}>
          <span>Governance decision</span>
          <strong>{phase === "rejected" ? "rejected" : incident.governanceDecision}</strong>
          <p>Transfer rejected: survival floors conflict with bank exposure constraints.</p>
        </article>
        <div className="policy-table" role="table" aria-label="Policy blockers">
          <div role="row">
            <span role="columnheader">Blocker</span>
            <span role="columnheader">State</span>
          </div>
          {incident.blockers.concat(incident.warnings).map((blocker) => (
            <div role="row" key={blocker}>
              <span role="cell">{blocker}</span>
              <strong role="cell">blocks approval</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContingencySection({ incident }: { incident: GoldenIncident }) {
  return (
    <section className="contingency-section" id="contingency" aria-labelledby="contingency-title">
      <div className="section-heading">
        <p className="eyebrow">Contingency + ROI</p>
        <h2 id="contingency-title">Reject, then move to executable action</h2>
        <p>
          The demo ends with a funding plan, payment throttling option, ownership, and CFO value,
          not with a red monitoring screen.
        </p>
      </div>
      <div className="contingency-grid">
        {incident.contingencyActions.map((action) => (
          <article key={`${action.type}-${action.description}`}>
            <span>{action.type}</span>
            <strong>{action.amount ? formatEur(action.amount, 3) : "No amount"}</strong>
            <p>{action.description}</p>
            <dl>
              <div>
                <dt>Owner</dt>
                <dd>{action.owner}</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>{action.deadline ? formatDateTime(action.deadline) : "Before payout cut-off"}</dd>
              </div>
            </dl>
          </article>
        ))}
        <article className="roi-panel">
          <span>Business case</span>
          <strong>{incident.roi.reserveBefore} to {incident.roi.reserveAfter}</strong>
          <p>{incident.roi.summary}</p>
        </article>
      </div>
    </section>
  );
}

function Meter({
  value,
  max,
  danger,
  label,
}: {
  value: number;
  max: number;
  danger: boolean;
  label: string;
}) {
  const width = Math.max(3, Math.min(100, (value / max) * 100));
  return (
    <div className="meter" aria-label={label}>
      <span className={danger ? "meter__fill meter__fill--danger" : "meter__fill"} style={{ width: `${width}%` }} />
    </div>
  );
}

function StateBadge({ state, reason }: { state: DecisionPhase; reason: string }) {
  return (
    <span className={`state-badge state-badge--${state}`} title={reason}>
      <i aria-hidden="true" />
      {state}
    </span>
  );
}

function stateReason(phase: DecisionPhase, incident: GoldenIncident) {
  if (phase === "pending") return "Book balance appears sufficient, evidence is not yet revealed.";
  if (phase === "breached") return `p05 gap ${formatEur(incident.p05Gap, 3)} breaches the survival floor.`;
  return "Governance gate rejects the payout and records an audit stamp.";
}

function formatEur(value: number, fractionDigits = 1) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions =
      fractionDigits >= 3
        ? Math.floor((abs / 1_000_000) * 1000) / 1000
        : abs / 1_000_000;
    return `${sign}EUR ${millions.toLocaleString("en-US", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits === 3 ? 3 : 1,
    })}M`;
  }
  return `${sign}EUR ${formatNumber(abs)}`;
}
