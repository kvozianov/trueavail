import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { formatCurrencyAmount } from "@/lib/backend/formatters";
import { goldenIncidentFallback as incident } from "@/lib/golden-incident";

const functions = [
  ["Forecast Corridor", "Works", "Show forecast", "p05/p50/p95 response", "EUR 2.136M gap", "ML ensemble", "early warning"],
  ["Stress Testing", "Works", "Run TARGET2", "stress response", "EUR 2.021M loss", "scenario engine", "tail-risk visibility"],
  ["HHI / CCRI", "Works", "Show concentration", "HHI threshold", "0.352 > 0.25", "risk scoring", "avoids bank concentration"],
  ["Optimizer", "Works", "Find safe transfer", "solver status", "infeasible", "PuLP MIP", "avoids unsafe route"],
  ["Governance Gate", "Works", "Show decision", "blocker list", "reject", "policy rules", "prevents bad approval"],
  ["Contingency", "Works", "Show plan", "action list", "EUR 2.136M prefund", "workflow logic", "gives next action"],
  ["ROI", "Works", "Show value", "ROI summary", "$6-7M released", "financial model", "CFO case"],
  ["AI Council", "Works / Mock", "Show verdict", "advisor output", "decision review", "LLM over facts", "explainability"],
  ["OpenAPI", "Works", "View contract", "openapi.json", "11 endpoints", "FastAPI contracts", "integration readiness"],
];

export function JudgeView() {
  return (
    <main className="demo-page evidence-page" id="main-content">
      <DemoNav mode="replay" statusText="Judge evidence packet" />

      <section className="judge-hero" aria-labelledby="judge-title">
        <div>
          <p className="eyebrow">Judge view</p>
          <h1 id="judge-title">One page proof that the demo works</h1>
          <p>
            The core incident is complete: forecast breach, TARGET2 stress, concentration risk,
            infeasible optimizer, governance reject, contingency plan, and business value.
          </p>
        </div>
        <div className="judge-summary">
          <span>Golden Incident</span>
          <strong>{incident.accountId}</strong>
          <p>{formatCurrencyAmount(incident.payoutAmount, incident.payoutCurrency)} payout, {incident.governanceDecision} gate.</p>
        </div>
      </section>

      <section className="judge-scoreboard" aria-label="Judge metrics">
        <article>
          <span>p05 gap</span>
          <strong>EUR 2.136M</strong>
          <p>Hidden downside liquidity breach.</p>
        </article>
        <article>
          <span>TARGET2 loss</span>
          <strong>EUR 2.021M</strong>
          <p>Stress scenario removes settlement flexibility.</p>
        </article>
        <article>
          <span>HHI</span>
          <strong>0.352</strong>
          <p>Above the 0.25 concentration threshold.</p>
        </article>
        <article>
          <span>Decision</span>
          <strong>reject</strong>
          <p>Unsafe approval blocked by policy.</p>
        </article>
      </section>

      <section className="function-status" id="functions" aria-labelledby="function-status-title">
        <div className="section-heading">
          <p className="eyebrow">Function status table</p>
          <h2 id="function-status-title">Capabilities, evidence, metric, and user value</h2>
        </div>
        <div className="function-table" role="table" aria-label="Function status table">
          <div role="row">
            {["Function", "Status", "Demo", "Evidence", "Metric", "Technical depth", "User value"].map((header) => (
              <span role="columnheader" key={header}>{header}</span>
            ))}
          </div>
          {functions.map((row) => (
            <div role="row" key={row[0]}>
              {row.map((cell, index) => (
                <span role="cell" key={`${row[0]}-${cell}`} className={index === 1 ? "status-cell" : undefined}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="judge-actions" aria-label="Judge action links">
        <Link className="command-button command-button--primary" href="/demo">Show Demo</Link>
        <Link className="command-button" href="/demo#evidence">View Evidence</Link>
        <Link className="command-button" href="/technical">View API</Link>
      </section>
    </main>
  );
}
