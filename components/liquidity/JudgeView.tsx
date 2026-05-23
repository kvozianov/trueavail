"use client";

import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import { formatCurrencyAmount } from "@/lib/backend/formatters";
import { goldenIncidentFallback as incident } from "@/lib/golden-incident";
import { buildPermissionedRailScenario } from "@/lib/permissioned-rail";

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
  [
    "Permissioned Liquidity Mobility Overlay",
    "Prototype",
    "Compare rails",
    "policy checks + audit hash",
    "12m finality SLA",
    "typed UI simulation",
    "makes approved intragroup liquidity usable before cut-off",
  ],
];

const judgeMetrics = [
  {
    label: "p05 gap",
    value: "EUR 2.136M",
    body: "Hidden downside liquidity breach.",
    tone: "danger",
  },
  {
    label: "TARGET2 loss",
    value: "EUR 2.021M",
    body: "Stress scenario removes settlement flexibility.",
    tone: "warning",
  },
  {
    label: "HHI",
    value: "0.352",
    body: "Above the 0.25 concentration threshold.",
    tone: "warning",
  },
  {
    label: "Decision",
    value: "reject",
    body: "Unsafe approval blocked by policy.",
    tone: "blocked",
  },
  {
    label: "Overlay SLA",
    value: "12m",
    body: "Approved intragroup EUR liquidity becomes usable before cut-off.",
    tone: "neutral",
  },
];

export function JudgeView() {
  const { t, translate } = useLanguage();
  const rail = buildPermissionedRailScenario(incident);

  return (
    <main className="demo-page evidence-page" id="main-content">
      <DemoNav mode="replay" statusText="Judge evidence packet" />

      <section className="judge-hero" aria-labelledby="judge-title">
        <div className="judge-hero__copy">
          <p className="eyebrow">{t("Judge view")}</p>
          <h1 id="judge-title">{t("One page proof that the demo works")}</h1>
          <p>
            {t("The core incident is complete: forecast breach, TARGET2 stress, concentration risk, infeasible optimizer, governance reject, contingency plan, and business value.",
              "Основной инцидент завершён: forecast breach, TARGET2 stress, concentration risk, infeasible optimizer, governance reject, contingency plan и business value.")}
          </p>
          <div className="judge-hero__proofline" aria-label={t("Judge proof chain", "Цепочка доказательства для жюри")}>
            <span>{t("Forecast", "Прогноз")}</span>
            <i />
            <span>{t("Stress", "Стресс")}</span>
            <i />
            <span>{t("Optimize", "Оптимизация")}</span>
            <i />
            <span>{t("Govern", "Governance")}</span>
            <i />
            <span>{t("Overlay", "Overlay")}</span>
          </div>
        </div>
        <div className="judge-summary">
          <span>{t("Golden Incident", "Golden Incident")}</span>
          <strong>{incident.accountId}</strong>
          <p>{formatCurrencyAmount(incident.payoutAmount, incident.payoutCurrency)} {t("payout", "payout")}, {translate(incident.governanceDecision)} gate, {rail.permissioned.finalitySla} overlay SLA.</p>
          <dl>
            <div>
              <dt>{t("Owner", "Владелец")}</dt>
              <dd>Treasury</dd>
            </div>
            <div>
              <dt>{t("Evidence", "Evidence")}</dt>
              <dd>10/10</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="judge-scoreboard" aria-label={t("Judge metrics", "Метрики для жюри")}>
        {judgeMetrics.map((metric, index) => (
          <article className={`judge-metric-card judge-metric-card--${metric.tone}`} key={metric.label}>
            <div className="judge-metric-card__top">
              <span>{translate(metric.label)}</span>
              <em>0{index + 1}</em>
            </div>
            <strong>{translate(metric.value)}</strong>
            <p>{translate(metric.body)}</p>
            <div className="judge-metric-card__spark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </article>
        ))}
      </section>

      <section className="function-status" id="functions" aria-labelledby="function-status-title">
        <div className="section-heading">
          <p className="eyebrow">{t("Function status table")}</p>
          <h2 id="function-status-title">{t("Capabilities, evidence, metric, and user value")}</h2>
          <p>
            {t(
              "Each row is a demo-ready capability with proof, metric, implementation depth, and buyer value.",
              "Каждая строка — demo-ready capability с proof, метрикой, технической глубиной и ценностью для покупателя.",
            )}
          </p>
        </div>
        <div className="function-table" role="table" aria-label={t("Function status table")}>
          <div role="row">
            {["Function", "Status", "Demo", "Evidence", "Metric", "Technical depth", "User value"].map((header) => (
              <span role="columnheader" key={header}>{translate(header)}</span>
            ))}
          </div>
          {functions.map((row) => (
            <div role="row" key={row[0]}>
              {row.map((cell, index) => (
                <span role="cell" key={`${row[0]}-${cell}`} className={index === 1 ? "status-cell" : undefined}>
                  {translate(cell)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="judge-actions" aria-label={t("Judge action links", "Ссылки действий для жюри")}>
        <Link className="command-button command-button--primary" href="/demo?phase=pending">{t("Show Demo")}</Link>
        <Link className="command-button" href="/demo?phase=rejected#evidence">{t("View Evidence")}</Link>
        <Link className="command-button" href="/demo?phase=rejected#permissioned-rail">{t("Compare Rails")}</Link>
        <Link className="command-button" href="/technical">{t("View API")}</Link>
      </section>
    </main>
  );
}
