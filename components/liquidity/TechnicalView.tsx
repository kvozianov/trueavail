import Link from "next/link";
import openApiArtifact from "@/backend/artifacts/openapi.json";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { goldenIncidentFallback as incident } from "@/lib/golden-incident";

const openApi = openApiArtifact as {
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, unknown>>;
};

const architectureStages = [
  "Synthetic data",
  "Feature engineering",
  "Forecast p05/p50/p95",
  "Stress engine",
  "HHI / CCRI risk layer",
  "PuLP MIP optimizer",
  "Governance gate",
  "Contingency plan",
  "Audit / AI Council / ROI",
];

const modelStack = [
  "LightGBM Quantile",
  "sklearn Gradient Boosting Quantile",
  "EWMA volatility fallback",
  "MAD anomaly filtering",
  "Known events calendar",
  "Survival floor constraints",
  "Expected Shortfall 99%",
  "OpenAPI contract export",
];

export function TechnicalView() {
  const paths = Object.entries(openApi.paths ?? {});

  return (
    <main className="demo-page evidence-page" id="main-content">
      <DemoNav mode="replay" statusText="Technical evidence packet" />

      <section className="technical-hero" aria-labelledby="technical-title">
        <div>
          <p className="eyebrow">Technical view</p>
          <h1 id="technical-title">Backend-ready proof behind the cockpit</h1>
          <p>
            The main demo stays focused on the decision. This page exposes reproducibility,
            API contracts, model stack, solver status, and deterministic snapshot evidence.
          </p>
        </div>
        <div className="technical-proof">
          <span>OpenAPI</span>
          <strong>{paths.length} endpoints</strong>
          <p>{openApi.info?.title ?? "TrueAvail Backend"} v{openApi.info?.version ?? "0.1.0"}</p>
        </div>
      </section>

      <section className="architecture-map" aria-labelledby="architecture-title">
        <div className="section-heading">
          <p className="eyebrow">Architecture map</p>
          <h2 id="architecture-title">From data to governed action</h2>
        </div>
        <ol>
          {architectureStages.map((stage) => (
            <li key={stage}>{stage}</li>
          ))}
        </ol>
      </section>

      <section className="technical-grid">
        <article>
          <p className="eyebrow">Reproducibility</p>
          <h2>Deterministic snapshot</h2>
          <dl>
            <div>
              <dt>Scenario</dt>
              <dd>target2_outage</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{incident.accountId}</dd>
            </div>
            <div>
              <dt>Solver status</dt>
              <dd>{incident.optimizerStatus}</dd>
            </div>
            <div>
              <dt>Verify command</dt>
              <dd><code>npm run backend:verify</code></dd>
            </div>
          </dl>
        </article>

        <article>
          <p className="eyebrow">Model stack</p>
          <h2>Forecast, stress, risk, solver</h2>
          <ul className="technical-list">
            {modelStack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="api-contracts" aria-labelledby="api-contracts-title">
        <div className="section-heading">
          <p className="eyebrow">API contracts</p>
          <h2 id="api-contracts-title">FastAPI endpoints used by the frontend</h2>
        </div>
        <div className="endpoint-list">
          {paths.map(([path, methods]) => (
            <article key={path}>
              <strong>{path}</strong>
              <span>{Object.keys(methods).join(", ").toUpperCase()}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="judge-actions" aria-label="Technical action links">
        <Link className="command-button command-button--primary" href="/demo">Run Golden Incident</Link>
        <Link className="command-button" href="/judge">Judge View</Link>
      </section>
    </main>
  );
}
