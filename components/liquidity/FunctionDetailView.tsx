import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { buildFunctionModules, functionKeys, type FunctionKey, type FunctionModule } from "@/lib/function-modules";
import { goldenIncidentFallback as incident } from "@/lib/golden-incident";

const functionNarrative: Record<FunctionKey, { title: string; body: string; decisionImpact: string }> = {
  forecast: {
    title: "Forecast turns book cash into usable cash risk.",
    body: "This function is the first place the false-safe payment breaks. It reads the account and corridor, then proves that downside liquidity falls below the survival floor before the payout window closes.",
    decisionImpact: "Approval cannot rely on book balance once the p05 corridor shows a usable cash gap.",
  },
  stress: {
    title: "Stress applies the rail failure before any transfer is trusted.",
    body: "TARGET2 outage stress removes settlement flexibility from the plan. The output is not a warning banner, it is a changed constraint set for the rest of the engine.",
    decisionImpact: "Treasury sees whether the payment survives a real settlement disruption.",
  },
  hhi: {
    title: "Concentration risk blocks routes that only look safe locally.",
    body: "The HHI layer converts stressed balances into bank exposure policy. It prevents the optimizer from moving money into a concentration state that would pass liquidity but fail governance.",
    decisionImpact: "The operator cannot hide risk by shifting the gap into one bank.",
  },
  optimizer: {
    title: "Optimizer proves that no safe transfer exists.",
    body: "The solver tests survival floors, HHI constraints, stress losses, and payout timing together. Infeasible is a useful result because it prevents a false-positive transfer recommendation.",
    decisionImpact: "The system refuses to manufacture a transfer plan when constraints conflict.",
  },
  governance: {
    title: "Governance converts model evidence into an auditable decision.",
    body: "The gate receives every blocker, then decides whether approval is legally safe inside the policy envelope. For this incident the correct action is reject, with evidence preserved.",
    decisionImpact: "The unsafe payout is blocked and the decision trace becomes defensible.",
  },
  contingency: {
    title: "Contingency turns rejection into executable treasury work.",
    body: "After rejection, the system gives the operator owned actions: prefund, throttle, or reroute before cut-off. The demo ends with work to do, not with a red screen.",
    decisionImpact: "Treasury moves from alert to action while protecting the survival floor.",
  },
};

export function FunctionDetailView({ functionKey }: { functionKey: FunctionKey }) {
  const modules = buildFunctionModules(incident, "rejected");
  const functionModule = modules.find((item) => item.key === functionKey) ?? modules[0];
  const narrative = functionNarrative[functionModule.key];
  const index = functionKeys.indexOf(functionModule.key);
  const previous = functionKeys[(index - 1 + functionKeys.length) % functionKeys.length];
  const next = functionKeys[(index + 1) % functionKeys.length];

  return (
    <main className="demo-page evidence-page function-detail-page" id="main-content">
      <DemoNav mode="replay" statusText={`${functionModule.name} drilldown`} />

      <section className="function-detail-hero" aria-labelledby="function-detail-title">
        <div>
          <p className="eyebrow">Function drilldown / {functionModule.step}</p>
          <h1 id="function-detail-title">{functionModule.name}</h1>
          <p>{narrative.title}</p>
        </div>
        <ReceiptPanel functionModule={functionModule} />
      </section>

      <section className="function-detail-grid" aria-label={`${functionModule.name} evidence`}>
        <article className={`function-proof function-proof--${functionModule.tone}`}>
          <span>{functionModule.metricLabel}</span>
          <strong>{functionModule.metricValue}</strong>
          <p>{narrative.body}</p>
        </article>

        <article className="function-contract">
          <p className="eyebrow">Call contract</p>
          <h2>Input, output, handoff</h2>
          <dl>
            <div>
              <dt>Input</dt>
              <dd>{functionModule.input}</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>{functionModule.output}</dd>
            </div>
            <div>
              <dt>Handoff</dt>
              <dd>{functionModule.handoff}</dd>
            </div>
          </dl>
        </article>

        <article className="function-execution">
          <p className="eyebrow">Execution trace</p>
          <h2>Checks run by this function</h2>
          <ol>
            {functionModule.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ol>
        </article>

        <article className="function-impact">
          <p className="eyebrow">Decision impact</p>
          <h2>{narrative.decisionImpact}</h2>
          <p>
            Current Golden Incident: {incident.accountId}, EUR 4.1M payout, governance gate
            records {incident.governanceDecision}.
          </p>
        </article>
      </section>

      <FunctionRail active={functionModule.key} modules={modules} />

      <section className="judge-actions" aria-label="Function drilldown actions">
        <Link className="command-button command-button--primary" href="/judge#functions">Back to Function Table</Link>
        <Link className="command-button" href={`/functions/${previous}`}>Previous Function</Link>
        <Link className="command-button" href={`/functions/${next}`}>Next Function</Link>
        <Link className="command-button command-button--ghost" href="/technical">Technical Proof</Link>
      </section>
    </main>
  );
}

function ReceiptPanel({ functionModule }: { functionModule: FunctionModule }) {
  return (
    <aside className={`function-detail-receipt function-detail-receipt--${functionModule.tone}`} aria-label="Function receipt">
      <span>{functionModule.endpoint}</span>
      <strong>{functionModule.status}</strong>
      <dl>
        {functionModule.receipt.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function FunctionRail({ active, modules }: { active: FunctionKey; modules: FunctionModule[] }) {
  return (
    <nav className="function-detail-rail" aria-label="Function drilldown navigation">
      {modules.map((item) => (
        <Link
          aria-current={item.key === active ? "page" : undefined}
          className={item.key === active ? "function-rail-link function-rail-link--active" : "function-rail-link"}
          href={`/functions/${item.key}`}
          key={item.key}
        >
          <span>{item.step}</span>
          <strong>{item.name}</strong>
        </Link>
      ))}
    </nav>
  );
}
