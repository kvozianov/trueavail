import Link from "next/link";
import type { DecisionPhase } from "@/lib/demo-phase";
import { buildFunctionModules } from "@/lib/function-modules";
import type { DemoMode, GoldenIncident } from "@/lib/golden-incident";

export function FunctionWorkbench({
  incident,
  mode,
  phase,
}: {
  incident: GoldenIncident;
  mode: DemoMode;
  phase: DecisionPhase;
}) {
  const modules = buildFunctionModules(incident, phase);
  const defaultOpenKey = phase === "pending" ? "forecast" : phase === "breached" ? "optimizer" : "governance";

  return (
    <section className="function-workbench" id="functions" aria-labelledby="function-workbench-title">
      <div className="function-workbench__header">
        <div>
          <p className="eyebrow">Function workbench</p>
          <h2 id="function-workbench-title">Inspect the engine, function by function</h2>
          <p>
            The cockpit is split into callable functions. Each module carries its own input,
            output, endpoint receipt, and next handoff in the liquidity decision chain.
          </p>
        </div>
        <span className="replay-status">
          <i aria-hidden="true" />
          {mode === "live" ? "live functions" : "replay receipts"}
        </span>
      </div>

      <div className="function-module-grid">
        {modules.map((module) => (
          <details
            className={`function-module function-module--${module.tone}`}
            key={module.key}
            open={module.key === defaultOpenKey}
          >
            <summary>
              <span>{module.step}</span>
              <strong>{module.name}</strong>
              <small>{module.status}</small>
            </summary>

            <div className="function-module__body">
              <div className="function-inspector__metric">
                <span>{module.metricLabel}</span>
                <strong>{module.metricValue}</strong>
              </div>

              <div className="function-io-grid">
                <div>
                  <span>Input</span>
                  <p>{module.input}</p>
                </div>
                <div>
                  <span>Output</span>
                  <p>{module.output}</p>
                </div>
                <div>
                  <span>Handoff</span>
                  <p>{module.handoff}</p>
                </div>
              </div>

              <div className="function-receipt">
                <dl>
                  <div>
                    <dt>Endpoint</dt>
                    <dd>{module.endpoint}</dd>
                  </div>
                  {module.receipt.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <ol>
                  {module.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ol>
              </div>

              <Link className="function-detail-link" href={`/functions/${module.key}`}>
                Open function drilldown
              </Link>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
