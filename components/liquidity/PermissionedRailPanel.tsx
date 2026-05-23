"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrencyAmount, formatNumber } from "@/lib/backend/formatters";
import type { GoldenIncident } from "@/lib/golden-incident";
import {
  buildPermissionedRailScenario,
  type RailOptionKey,
  type RailOutcomeKey,
  type RailPolicyCheck,
  type RailState,
} from "@/lib/permissioned-rail";

export function PermissionedRailPanel({ incident }: { incident: GoldenIncident }) {
  const scenario = useMemo(() => buildPermissionedRailScenario(incident), [incident]);
  const [rail, setRail] = useState<RailOptionKey>("legacy");
  const [outcome, setOutcome] = useState<RailOutcomeKey>("clear");
  const [activeCheckId, setActiveCheckId] = useState(scenario.policyChecks[0]?.id ?? "entity");
  const [playing, setPlaying] = useState(false);
  const [stateIndex, setStateIndex] = useState(1);

  const selectedRoute = rail === "legacy" ? scenario.oldWay : scenario.permissioned;
  const selectedFailure = scenario.failureScenarios.find((item) => item.key === outcome) ?? scenario.failureScenarios[0];
  const failedCheckId = rail === "permissioned" ? selectedFailure.failedCheckId : undefined;
  const activeCheck =
    scenario.policyChecks.find((check) => check.id === activeCheckId) ??
    scenario.policyChecks[0];
  const activeState = rail === "legacy"
    ? "breached"
    : playing
      ? scenario.states[stateIndex]?.state ?? selectedFailure.state
      : selectedFailure.state;

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setStateIndex((current) => (current >= scenario.states.length - 1 ? 0 : current + 1));
    }, 1050);
    return () => window.clearInterval(timer);
  }, [playing, scenario.states.length]);

  const selectRail = (nextRail: RailOptionKey) => {
    setRail(nextRail);
    setPlaying(false);
    setStateIndex(nextRail === "legacy" ? 1 : 2);
  };

  const selectOutcome = (nextOutcome: RailOutcomeKey) => {
    const nextScenario = scenario.failureScenarios.find((item) => item.key === nextOutcome) ?? scenario.failureScenarios[0];
    setOutcome(nextOutcome);
    setRail("permissioned");
    setPlaying(false);
    setStateIndex(Math.max(0, scenario.states.findIndex((item) => item.state === nextScenario.state)));
    if (nextScenario.failedCheckId) {
      setActiveCheckId(nextScenario.failedCheckId);
    }
  };

  return (
    <section className={`permissioned-rail permissioned-rail--${rail} permissioned-rail--state-${activeState}`} id="permissioned-rail" aria-labelledby="permissioned-rail-title">
      <div className="permissioned-rail__header">
        <div>
          <p className="eyebrow">Rail decision prototype</p>
          <h2 id="permissioned-rail-title">{scenario.railName}</h2>
          <p>{scenario.framing}</p>
        </div>
        <div className="rail-mode-toggle" role="group" aria-label="Rail mode">
          <button
            aria-pressed={rail === "legacy"}
            className={rail === "legacy" ? "rail-mode-toggle__button rail-mode-toggle__button--active" : "rail-mode-toggle__button"}
            onClick={() => selectRail("legacy")}
            type="button"
          >
            Legacy Rail
          </button>
          <button
            aria-pressed={rail === "permissioned"}
            className={rail === "permissioned" ? "rail-mode-toggle__button rail-mode-toggle__button--active" : "rail-mode-toggle__button"}
            onClick={() => selectRail("permissioned")}
            type="button"
          >
            Permissioned Rail
          </button>
        </div>
      </div>

      <div className="permissioned-rail__workspace">
        <RailRouteCard
          activeState={activeState}
          rail={rail}
          selectedRoute={selectedRoute}
          p05Before={scenario.before.p05Gap}
          p05After={rail === "legacy" ? scenario.oldWay.p05GapAfter : scenario.permissioned.p05GapAfter}
        />

        <div className="rail-policy-console">
          <div className="rail-console-heading">
            <div>
              <span>Policy checks</span>
              <strong>{rail === "legacy" ? "not available on legacy route" : selectedFailure.governance}</strong>
            </div>
            <button className="rail-replay-button" onClick={() => setPlaying((current) => !current)} type="button">
              {playing ? "Pause Replay" : "Replay Timeline"}
            </button>
          </div>

          <ol className="rail-state-timeline" aria-label="Rail state timeline">
            {scenario.states.map((item, index) => {
              const isActive = item.state === activeState || (playing && index === stateIndex);
              const isPast = rail === "permissioned" && index <= stateIndex;
              return (
                <li className={isActive ? "rail-state rail-state--active" : isPast ? "rail-state rail-state--past" : "rail-state"} key={item.state}>
                  <span>{item.state}</span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </li>
              );
            })}
          </ol>

          <div className="rail-policy-grid">
            {scenario.policyChecks.map((check) => (
              <button
                aria-pressed={check.id === activeCheck.id}
                className={policyClassName(check, failedCheckId, activeCheck.id, rail)}
                key={check.id}
                onClick={() => setActiveCheckId(check.id)}
                type="button"
              >
                <span>{check.label}</span>
                <strong>{failedCheckId === check.id ? "failed" : rail === "legacy" ? "not checked" : "passed"}</strong>
                <small>{check.metric}</small>
              </button>
            ))}
          </div>

          <article className="rail-check-detail" aria-live="polite">
            <span>{activeCheck.label}</span>
            <h3>{failedCheckId === activeCheck.id ? "Policy blocker" : "Policy evidence"}</h3>
            <p>{failedCheckId === activeCheck.id ? selectedFailure.reason : activeCheck.description}</p>
          </article>
        </div>

        <FinalityCertificate
          activeState={activeState}
          failedCheckId={failedCheckId}
          incident={incident}
          scenario={scenario}
          selectedFailure={selectedFailure}
        />
      </div>

      <div className="rail-comparison-table" role="table" aria-label="Legacy rail versus permissioned rail comparison">
        <div role="row">
          <span role="columnheader">Route</span>
          <span role="columnheader">Availability</span>
          <span role="columnheader">p05 gap after</span>
          <span role="columnheader">Time to liquidity</span>
          <span role="columnheader">Contingency</span>
        </div>
        {[scenario.oldWay, scenario.permissioned].map((route) => (
          <button
            className={rail === route.key ? "rail-comparison-row rail-comparison-row--active" : "rail-comparison-row"}
            key={route.key}
            onClick={() => selectRail(route.key)}
            role="row"
            type="button"
          >
            <span role="cell">{route.label}</span>
            <span role="cell">{route.availability}</span>
            <strong role="cell">{formatCurrencyAmount(route.p05GapAfter, route.currency)}</strong>
            <span role="cell">{formatRailMinutes(route.timeToLiquidityMinutes)}</span>
            <span role="cell">{route.contingency}</span>
          </button>
        ))}
      </div>

      <div className="rail-failure-lab" aria-label="Failure paths">
        <div>
          <p className="eyebrow">Failure path lab</p>
          <h3>Governance can still reject the overlay</h3>
          <p>Click a failure to show why the permissioned rail is policy-based, not magic.</p>
        </div>
        <div className="rail-failure-buttons">
          {scenario.failureScenarios.map((item) => (
            <button
              aria-pressed={item.key === outcome && rail === "permissioned"}
              className={item.key === outcome && rail === "permissioned" ? "rail-failure-button rail-failure-button--active" : "rail-failure-button"}
              key={item.key}
              onClick={() => selectOutcome(item.key)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.governance}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RailRouteCard({
  activeState,
  rail,
  selectedRoute,
  p05Before,
  p05After,
}: {
  activeState: RailState;
  rail: RailOptionKey;
  selectedRoute: ReturnType<typeof buildPermissionedRailScenario>["oldWay"];
  p05Before: number;
  p05After: number;
}) {
  return (
    <article className="rail-route-card">
      <div className="rail-route-card__top">
        <span>{selectedRoute.label}</span>
        <strong>{activeState}</strong>
      </div>
      <h3>{selectedRoute.route}</h3>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{selectedRoute.sourceAccount}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{selectedRoute.destinationAccount}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatCurrencyAmount(selectedRoute.amount, selectedRoute.currency)}</dd>
        </div>
        <div>
          <dt>Finality SLA</dt>
          <dd>{selectedRoute.finalitySla}</dd>
        </div>
      </dl>
      <div className="rail-before-after">
        <div>
          <span>Before</span>
          <strong>{formatCurrencyAmount(p05Before, selectedRoute.currency)}</strong>
          <small>p05 gap</small>
        </div>
        <div>
          <span>After</span>
          <strong>{formatCurrencyAmount(p05After, selectedRoute.currency)}</strong>
          <small>{rail === "legacy" ? "gap remains" : "residual gap"}</small>
        </div>
      </div>
    </article>
  );
}

function FinalityCertificate({
  activeState,
  failedCheckId,
  incident,
  scenario,
  selectedFailure,
}: {
  activeState: RailState;
  failedCheckId?: string;
  incident: GoldenIncident;
  scenario: ReturnType<typeof buildPermissionedRailScenario>;
  selectedFailure: ReturnType<typeof buildPermissionedRailScenario>["failureScenarios"][number];
}) {
  return (
    <aside className="rail-certificate" aria-label="Finality certificate and audit receipt">
      <div>
        <p className="eyebrow">Finality certificate</p>
        <h3>{failedCheckId ? "Not committed" : "Committed receipt"}</h3>
      </div>
      <dl>
        <div>
          <dt>Certificate</dt>
          <dd>{scenario.certificate.id}</dd>
        </div>
        <div>
          <dt>Signer</dt>
          <dd>{scenario.signer.role} / {scenario.signer.approvalState}</dd>
        </div>
        <div>
          <dt>Approval time</dt>
          <dd>{failedCheckId === "signer" ? "missing" : scenario.signer.approvalTime}</dd>
        </div>
        <div>
          <dt>Audit hash</dt>
          <dd>{failedCheckId ? "not issued" : scenario.certificate.auditHash}</dd>
        </div>
        <div>
          <dt>Residual risk</dt>
          <dd>{scenario.certificate.residualRisk}</dd>
        </div>
        <div>
          <dt>Golden Incident</dt>
          <dd>{incident.accountId} / {formatNumber(incident.payoutAmount)}</dd>
        </div>
      </dl>
      <div className={`rail-governance-stamp rail-governance-stamp--${activeState}`}>
        <span>Governance</span>
        <strong>{selectedFailure.governance}</strong>
        <p>{selectedFailure.reason}</p>
      </div>
    </aside>
  );
}

function policyClassName(
  check: RailPolicyCheck,
  failedCheckId: string | undefined,
  activeCheckId: string,
  rail: RailOptionKey,
) {
  return [
    "rail-policy-check",
    check.id === activeCheckId ? "rail-policy-check--active" : "",
    rail === "legacy" ? "rail-policy-check--muted" : "",
    failedCheckId === check.id ? "rail-policy-check--failed" : "",
  ].filter(Boolean).join(" ");
}

function formatRailMinutes(minutes: number) {
  if (minutes >= 1_200) return "T+1 bank day";
  if (minutes >= 60) return `${Math.round(minutes / 60)}h`;
  return `${minutes}m`;
}
