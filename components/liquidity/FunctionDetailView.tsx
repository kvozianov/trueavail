"use client";

import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
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
  aiCouncil: {
    title: "AI Council explains the decision without replacing governance.",
    body: "The council reads the deterministic evidence packet and produces a human-readable review. It is mocked during verification so the demo stays reproducible.",
    decisionImpact: "CFO and risk teams get explanation over facts, while the policy gate remains authoritative.",
  },
  roi: {
    title: "ROI translates avoided failure into capital efficiency.",
    body: "The ROI module connects early warning, reserve release, overdraft avoidance, and manual work reduction to the same rejected payout.",
    decisionImpact: "The pitch moves from model accuracy to a CFO case for why the product matters.",
  },
  contracts: {
    title: "OpenAPI and backend contracts prove implementation depth.",
    body: "The contract page exposes exported FastAPI paths, deterministic snapshot artifacts, and verification commands used by the frontend.",
    decisionImpact: "Judges can see this is not only a dashboard mockup; it has API contracts and replayable backend evidence.",
  },
  permissionedRail: {
    title: "The overlay compares legacy settlement with governed liquidity mobility.",
    body: "The permissioned rail prototype shows source, destination, amount, policy checks, signer approval, finality SLA, audit hash, and failure paths.",
    decisionImpact: "Treasury sees how already-approved intragroup liquidity can become usable before cut-off while residual risk stays governed.",
  },
};

export function FunctionDetailView({ functionKey }: { functionKey: FunctionKey }) {
  const { t, translate } = useLanguage();
  const modules = buildFunctionModules(incident, "rejected");
  const functionModule = modules.find((item) => item.key === functionKey) ?? modules[0];
  const narrative = functionNarrative[functionModule.key];
  const index = functionKeys.indexOf(functionModule.key);
  const previous = functionKeys[(index - 1 + functionKeys.length) % functionKeys.length];
  const next = functionKeys[(index + 1) % functionKeys.length];

  return (
    <main className="demo-page evidence-page function-detail-page" id="main-content">
      <DemoNav mode="replay" statusText={`${translate(functionModule.name)} drilldown`} />

      <section className="function-detail-hero" aria-labelledby="function-detail-title">
        <div>
          <p className="eyebrow">{t("Function drilldown", "Разбор функции")} / {functionModule.step}</p>
          <h1 id="function-detail-title">{translate(functionModule.name)}</h1>
          <p>{translate(narrative.title)}</p>
        </div>
        <ReceiptPanel functionModule={functionModule} />
      </section>

      <section className="function-detail-grid" aria-label={`${functionModule.name} evidence`}>
        <article className={`function-proof function-proof--${functionModule.tone}`}>
          <span>{translate(functionModule.metricLabel)}</span>
          <strong>{functionModule.metricValue}</strong>
          <p>{translate(narrative.body)}</p>
        </article>

        <article className="function-contract">
          <p className="eyebrow">{t("Call contract", "Контракт вызова")}</p>
          <h2>{t("Input, output, handoff", "Input, output, handoff")}</h2>
          <dl>
            <div>
              <dt>{t("Input", "Вход")}</dt>
              <dd>{translate(functionModule.input)}</dd>
            </div>
            <div>
              <dt>{t("Output", "Выход")}</dt>
              <dd>{translate(functionModule.output)}</dd>
            </div>
            <div>
              <dt>{t("Handoff", "Передача")}</dt>
              <dd>{translate(functionModule.handoff)}</dd>
            </div>
          </dl>
        </article>

        <article className="function-execution">
          <p className="eyebrow">{t("Execution trace", "Трасса выполнения")}</p>
          <h2>{t("Checks run by this function", "Проверки, которые выполняет функция")}</h2>
          <ol>
            {functionModule.checks.map((check) => (
              <li key={check}>{translate(check)}</li>
            ))}
          </ol>
        </article>

        <article className="function-impact">
          <p className="eyebrow">{t("Decision impact", "Влияние на решение")}</p>
          <h2>{translate(narrative.decisionImpact)}</h2>
          <p>
            {t(
              "Current Golden Incident: atlas-eur-operating, EUR 4.1M payout, governance gate records reject.",
              `Текущий Golden Incident: ${incident.accountId}, payout EUR 4.1M, governance gate записывает ${translate(incident.governanceDecision)}.`,
            )}
          </p>
        </article>
      </section>

      <FunctionRail active={functionModule.key} modules={modules} />

      <section className="judge-actions" aria-label={t("Function drilldown actions", "Действия разбора функции")}>
        <Link className="command-button command-button--primary" href="/judge#functions">{t("Back to Function Table", "Назад к таблице функций")}</Link>
        <Link className="command-button" href={`/functions/${previous}`}>{t("Previous Function", "Предыдущая функция")}</Link>
        <Link className="command-button" href={`/functions/${next}`}>{t("Next Function", "Следующая функция")}</Link>
        <Link className="command-button command-button--ghost" href="/technical">{t("Technical Proof", "Техническое доказательство")}</Link>
      </section>
    </main>
  );
}

function ReceiptPanel({ functionModule }: { functionModule: FunctionModule }) {
  const { t, translate } = useLanguage();

  return (
    <aside className={`function-detail-receipt function-detail-receipt--${functionModule.tone}`} aria-label={t("Function receipt", "Receipt функции")}>
      <span>{functionModule.endpoint}</span>
      <strong>{translate(functionModule.status)}</strong>
      <dl>
        {functionModule.receipt.map(([label, value]) => (
          <div key={label}>
            <dt>{translate(label)}</dt>
            <dd>{translate(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function FunctionRail({ active, modules }: { active: FunctionKey; modules: FunctionModule[] }) {
  const { t, translate } = useLanguage();

  return (
    <nav className="function-detail-rail" aria-label={t("Function drilldown navigation", "Навигация разбора функций")}>
      {modules.map((item) => (
        <Link
          aria-current={item.key === active ? "page" : undefined}
          className={item.key === active ? "function-rail-link function-rail-link--active" : "function-rail-link"}
          href={`/functions/${item.key}`}
          key={item.key}
        >
          <span>{item.step}</span>
          <strong>{translate(item.name)}</strong>
        </Link>
      ))}
    </nav>
  );
}
