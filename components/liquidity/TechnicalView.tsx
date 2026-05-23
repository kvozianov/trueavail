"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import openApiArtifact from "@/backend/artifacts/openapi.json";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import type { LocalizedMessage } from "@/lib/i18n";
import { goldenIncidentFallback as incident } from "@/lib/golden-incident";
import { buildPermissionedRailScenario } from "@/lib/permissioned-rail";

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
  "Permissioned mobility overlay",
  "Blockchain transfer router",
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
  "Permissioned settlement ledger prototype",
  "Solana / Polygon / Base / Stellar / ZK rail scoring",
];

type MathCoreItem = {
  id: string;
  label: LocalizedMessage;
  title: LocalizedMessage;
  principle: LocalizedMessage;
  formulas: Array<{
    name: LocalizedMessage;
    expression: string;
    note: LocalizedMessage;
  }>;
  signals: LocalizedMessage[];
  proof: LocalizedMessage;
  accent: string;
};

const mathCoreItems: MathCoreItem[] = [
  {
    id: "feature",
    label: { en: "01 Feature Engineering", ru: "01 Инжиниринг признаков" },
    title: { en: "Time becomes geometry. Shocks become explainable signals.", ru: "Время становится геометрией. Шоки становятся объяснимыми сигналами." },
    principle: {
      en: "The pipeline turns raw balances into cyclic time features, EWMA lag signals, and robust anomaly flags before any model votes.",
      ru: "Пайплайн превращает сырые балансы в циклические признаки времени, EWMA-lag сигналы и устойчивые флаги аномалий до голосования моделей.",
    },
    formulas: [
      {
        name: { en: "Cyclic hour encoding", ru: "Циклическое кодирование часа" },
        expression: "hour_sin = sin((2πh) / 24)\nhour_cos = cos((2πh) / 24)",
        note: { en: "23:00 and 00:00 stay close in model space.", ru: "23:00 и 00:00 остаются близко в пространстве модели." },
      },
      {
        name: { en: "EWMA memory", ru: "EWMA-память" },
        expression: "EWMA_t = α · y_t + (1 - α) · EWMA_{t-1}",
        note: { en: "Fresh balance movements get stronger weight.", ru: "Свежие движения баланса получают больший вес." },
      },
      {
        name: { en: "MAD shock filter", ru: "MAD-фильтр шоков" },
        expression: "z_t = |y_t - median_W| / (1.4826 · MAD_W)\nalert if z_t > 4",
        note: { en: "Median deviation resists one-off treasury spikes.", ru: "Медианное отклонение устойчиво к разовым treasury-скачкам." },
      },
    ],
    signals: [
      { en: "Cyclical time", ru: "Циклическое время" },
      { en: "Lag-features", ru: "Lag-признаки" },
      { en: "MAD anomaly gate", ru: "MAD anomaly gate" },
    ],
    proof: {
      en: "In the demo this is why the New York marker is red before analysis starts.",
      ru: "В демо именно поэтому маркер New York красный ещё до запуска анализа.",
    },
    accent: "#f06a1b",
  },
  {
    id: "forecast",
    label: { en: "02 ML Forecasting", ru: "02 ML-прогноз" },
    title: { en: "The model forecasts a corridor, not a single optimistic number.", ru: "Модель прогнозирует коридор, а не одну оптимистичную цифру." },
    principle: {
      en: "LightGBM quantile models optimize downside liquidity, so treasury sees p05 risk before book cash looks broken.",
      ru: "LightGBM quantile оптимизирует downside-liquidity, поэтому treasury видит p05-риск до того, как book cash выглядит сломанным.",
    },
    formulas: [
      {
        name: { en: "Pinball loss", ru: "Pinball loss" },
        expression: "L_α(y, ŷ) = max(α(y - ŷ), (α - 1)(y - ŷ))",
        note: { en: "Asymmetric loss makes the forecast conservative around cash gaps.", ru: "Асимметричная loss делает прогноз консервативным вокруг кассовых разрывов." },
      },
      {
        name: { en: "WAPE quality check", ru: "WAPE-контроль качества" },
        expression: "WAPE = Σ|y - ŷ| / Σ|y|",
        note: { en: "The metric stays readable for finance and model owners.", ru: "Метрика понятна finance-команде и владельцам моделей." },
      },
    ],
    signals: [
      { en: "p05 / p50 / p95", ru: "p05 / p50 / p95" },
      { en: "Quantile voting", ru: "Голосование квантилей" },
      { en: "Usable cash corridor", ru: "Коридор доступной ликвидности" },
    ],
    proof: {
      en: "This is why the final verdict says book balance is not usable soon enough.",
      ru: "Поэтому финальный verdict говорит, что book balance не становится usable достаточно быстро.",
    },
    accent: "#111111",
  },
  {
    id: "optimizer",
    label: { en: "03 MIP Optimizer", ru: "03 MIP-оптимизатор" },
    title: { en: "The solver searches for money movement that is cheap and safe.", ru: "Solver ищет движение денег, которое одновременно дешёвое и безопасное." },
    principle: {
      en: "PuLP solves a mixed-integer program with fees, fixed costs, overdraft penalties, survival floors, concentration limits, and bank risk.",
      ru: "PuLP решает MIP-задачу с комиссиями, фиксированными сборами, штрафами за overdraft, survival floors, concentration limits и bank risk.",
    },
    formulas: [
      {
        name: { en: "Cost objective", ru: "Целевая функция издержек" },
        expression: "min Σ_t [ Σ(φ · x + F · z) + Σρ_a · s_{a,t} + Σπ_a · o_{a,t} + Σκ_a · (B_{a,t} - B_max)_+ + γ · RS_b · x ]",
        note: { en: "If every safe route violates a constraint, infeasible is the correct answer.", ru: "Если каждый безопасный route нарушает constraint, infeasible — правильный ответ." },
      },
    ],
    signals: [
      { en: "Transfer fees", ru: "Комиссии переводов" },
      { en: "Survival floor constraints", ru: "Ограничения survival floor" },
      { en: "No false-positive route", ru: "Без false-positive route" },
    ],
    proof: {
      en: "In the golden incident the optimizer finds 0 safe auto-transfer routes.",
      ru: "В golden incident оптимизатор находит 0 безопасных auto-transfer routes.",
    },
    accent: "#b42318",
  },
  {
    id: "risk",
    label: { en: "04 Risk Management", ru: "04 Управление рисками" },
    title: { en: "Risk is scored before governance can approve a payout.", ru: "Риск скорится до того, как governance может одобрить payout." },
    principle: {
      en: "The system combines bank concentration, correspondent risk, and expected shortfall so a single attractive route cannot hide counterparty exposure.",
      ru: "Система объединяет концентрацию банка, correspondent risk и expected shortfall, чтобы один привлекательный route не скрывал counterparty exposure.",
    },
    formulas: [
      {
        name: { en: "HHI concentration", ru: "HHI-концентрация" },
        expression: "HHI = Σ_b ( Balance_b / Σ_{b'} Balance_{b'} )²",
        note: { en: "Values above 0.25 trigger counterparty concentration alerts.", ru: "Значения выше 0.25 включают alert по concentration risk." },
      },
      {
        name: { en: "CCRI bank score", ru: "CCRI-скоринг банка" },
        expression: "CCRI_b = w_F·F_b + w_M·M_b + w_O·O_b + w_C·C_b + w_S·S_b",
        note: { en: "Fundamental, market, operational, concentration, and sanctions factors vote together.", ru: "Фундаментальные, рыночные, операционные, концентрационные и санкционные факторы голосуют вместе." },
      },
      {
        name: { en: "Expected Shortfall", ru: "Expected Shortfall" },
        expression: "ES_{1-α} = E[ Shortfall | Shortfall ≥ VaR_{1-α} ]",
        note: { en: "Answers how much liquidity is lost once the bad scenario already happened.", ru: "Отвечает, сколько ликвидности теряется, если плохой сценарий уже наступил." },
      },
    ],
    signals: [
      { en: "HHI > 0.25", ru: "HHI > 0.25" },
      { en: "CCRI downgrade", ru: "CCRI downgrade" },
      { en: "ES99 tail loss", ru: "ES99 tail loss" },
    ],
    proof: {
      en: "This is the blocker behind the final recommendation to hold, ticket, and govern.",
      ru: "Это blocker за финальной рекомендацией hold, ticket и govern.",
    },
    accent: "#7a4a0b",
  },
];

export function TechnicalView() {
  const { t, translate } = useLanguage();
  const paths = Object.entries(openApi.paths ?? {});
  const rail = buildPermissionedRailScenario(incident);

  return (
    <main className="demo-page evidence-page" id="main-content">
      <DemoNav mode="replay" statusText="Technical evidence packet" />

      <section className="technical-hero" aria-labelledby="technical-title">
        <div>
          <p className="eyebrow">{t("Technical view")}</p>
          <h1 id="technical-title">{t("Backend-ready proof behind the cockpit")}</h1>
          <p>{t("The main demo stays focused on the decision. This page exposes reproducibility, API contracts, model stack, solver status, and deterministic snapshot evidence.",
            "Главное демо фокусируется на решении. Эта страница показывает воспроизводимость, API-контракты, стек моделей, solver status и deterministic snapshot evidence.")}</p>
        </div>
        <div className="technical-proof">
          <span>{t("OpenAPI")}</span>
          <strong>{paths.length} {t("endpoints", "эндпоинтов")}</strong>
          <p>{openApi.info?.title ?? "TrueAvail Backend"} v{openApi.info?.version ?? "0.1.0"}</p>
        </div>
      </section>

      <section className="architecture-map" aria-labelledby="architecture-title">
        <div className="section-heading">
          <p className="eyebrow">{t("Architecture map")}</p>
          <h2 id="architecture-title">{t("From data to governed action")}</h2>
        </div>
        <ol>
          {architectureStages.map((stage) => (
            <li key={stage}>{translate(stage)}</li>
          ))}
        </ol>
      </section>

      <MathematicalCoreShowcase />

      <section className="technical-grid">
        <article>
          <p className="eyebrow">{t("Reproducibility")}</p>
          <h2>{t("Deterministic snapshot")}</h2>
          <dl>
            <div>
              <dt>{t("Scenario")}</dt>
              <dd>target2_outage</dd>
            </div>
            <div>
              <dt>{t("Account")}</dt>
              <dd>{incident.accountId}</dd>
            </div>
            <div>
              <dt>{t("Solver status")}</dt>
              <dd>{translate(incident.optimizerStatus)}</dd>
            </div>
            <div>
              <dt>{t("Verify command")}</dt>
              <dd><code>npm run backend:verify</code></dd>
            </div>
          </dl>
        </article>

        <article>
          <p className="eyebrow">{t("Model stack")}</p>
          <h2>{t("Forecast, stress, risk, solver")}</h2>
          <ul className="technical-list">
            {modelStack.map((item) => (
              <li key={item}>{translate(item)}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="technical-overlay-proof" aria-labelledby="technical-overlay-title">
        <div>
          <p className="eyebrow">{t("Permissioned mobility overlay", "Оверлей permissioned mobility")}</p>
          <h2 id="technical-overlay-title">{t("Simulated settlement ledger prototype, not a production payment rail", "Симулированный settlement ledger prototype, не production payment rail")}</h2>
          <p>
            {t(
              "The demo models a corporate permissioned ledger rail beside legacy SWIFT and correspondent routes. It only accelerates access to already-approved intragroup liquidity, and every movement remains gated by policy, signer approval, residual risk, and audit evidence.",
              "Демо моделирует корпоративный permissioned ledger rail рядом с legacy SWIFT и correspondent routes. Он только ускоряет доступ к уже разрешённой intragroup liquidity, а каждое движение остаётся под policy, signer approval, residual risk и audit evidence.",
            )}
          </p>
        </div>
        <dl>
          <div>
            <dt>{t("Source", "Источник")}</dt>
            <dd>{rail.permissioned.sourceAccount}</dd>
          </div>
          <div>
            <dt>{t("Destination", "Назначение")}</dt>
            <dd>{rail.permissioned.destinationAccount}</dd>
          </div>
          <div>
            <dt>{t("Amount", "Сумма")}</dt>
            <dd>EUR {(rail.permissioned.amount / 1_000_000).toFixed(3)}M</dd>
          </div>
          <div>
            <dt>{t("Finality SLA", "SLA финализации")}</dt>
            <dd>{rail.permissioned.finalitySla}</dd>
          </div>
          <div>
            <dt>{t("Policy version", "Версия policy")}</dt>
            <dd>{rail.certificate.policyVersion}</dd>
          </div>
          <div>
            <dt>{t("Audit hash", "Аудит-хэш")}</dt>
            <dd>{rail.certificate.auditHash}</dd>
          </div>
        </dl>
      </section>

      <section className="api-contracts" aria-labelledby="api-contracts-title">
        <div className="section-heading">
          <p className="eyebrow">{t("API contracts")}</p>
          <h2 id="api-contracts-title">{t("FastAPI endpoints used by the frontend")}</h2>
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

      <section className="judge-actions" aria-label={t("Technical action links", "Технические ссылки действий")}>
        <Link className="command-button command-button--primary" href="/demo?phase=pending">{t("Run Golden Incident")}</Link>
        <Link className="command-button" href="/transfers">{t("Fund Transfers", "Переводы средств")}</Link>
        <Link className="command-button" href="/demo?phase=rejected#permissioned-rail">{t("View Overlay Prototype", "Открыть прототип оверлея")}</Link>
        <Link className="command-button" href="/judge">{t("Judge View")}</Link>
      </section>
    </main>
  );
}

function MathematicalCoreShowcase() {
  const { message, t } = useLanguage();
  const [activeId, setActiveId] = useState(mathCoreItems[0].id);
  const activeItem = mathCoreItems.find((item) => item.id === activeId) ?? mathCoreItems[0];
  const activeIndex = mathCoreItems.findIndex((item) => item.id === activeItem.id);

  return (
    <section
      className={`math-core-showcase math-core-showcase--${activeItem.id}`}
      id="math-core"
      style={{ "--math-accent": activeItem.accent } as CSSProperties}
      aria-labelledby="math-core-title"
    >
      <div className="math-core-showcase__header">
        <div>
          <p className="eyebrow">{t("Mathematical Core", "Математический аппарат")}</p>
          <h2 id="math-core-title">{t("The formulas behind the live liquidity decision", "Формулы за live-решением по ликвидности")}</h2>
          <p>
            {t(
              "The jury can see exactly how raw treasury data moves through feature engineering, ML quantiles, optimization, and risk governance.",
              "Жюри видит, как сырые treasury-данные проходят через feature engineering, ML-квантили, оптимизацию и risk governance.",
            )}
          </p>
        </div>
        <div className="math-core-meter" aria-hidden="true">
          <span className="math-core-meter__track math-core-meter__track--one" />
          <span className="math-core-meter__track math-core-meter__track--two" />
          <span className="math-core-meter__track math-core-meter__track--three" />
          <span className="math-core-meter__scan" />
          <strong>{activeIndex + 1}/4</strong>
        </div>
      </div>

      <div className="math-core-switcher" role="tablist" aria-label={t("Mathematical model groups", "Группы математических моделей")}>
        {mathCoreItems.map((item, index) => (
          <button
            aria-controls="math-core-panel"
            aria-selected={item.id === activeItem.id}
            className={item.id === activeItem.id ? "math-core-tab math-core-tab--active" : "math-core-tab"}
            key={item.id}
            onClick={() => setActiveId(item.id)}
            role="tab"
            style={{ "--tab-index": index } as CSSProperties}
            type="button"
          >
            <span>{message(item.label)}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="math-core-stage" id="math-core-panel" role="tabpanel">
        <div className="math-core-stage__visual" aria-hidden="true">
          <div className="math-flow-line math-flow-line--one" />
          <div className="math-flow-line math-flow-line--two" />
          <div className="math-flow-line math-flow-line--three" />
          <div className="math-pulse-node math-pulse-node--input">data</div>
          <div className="math-pulse-node math-pulse-node--model">ML</div>
          <div className="math-pulse-node math-pulse-node--risk">risk</div>
          <div className="math-pulse-node math-pulse-node--action">govern</div>
          <article className="math-core-explainer">
            <span>{message(activeItem.label)}</span>
            <h3>{message(activeItem.title)}</h3>
            <p>{message(activeItem.principle)}</p>
            <div className="math-core-signal-row">
              {activeItem.signals.map((signal) => (
                <em key={signal.en}>{message(signal)}</em>
              ))}
            </div>
            <strong>{message(activeItem.proof)}</strong>
          </article>
        </div>

        <div className="math-formula-stack" aria-label={t("Formula cards", "Карточки формул")}>
          {activeItem.formulas.map((formula, index) => (
            <article
              className="math-formula-card"
              key={formula.expression}
              style={{ "--formula-index": index } as CSSProperties}
            >
              <span>{message(formula.name)}</span>
              <FormulaExpression expression={formula.expression} />
              <p>{message(formula.note)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="math-core-pipeline" aria-label={t("Mathematical pipeline", "Математический пайплайн")}>
        {[
          { en: "Cyclic encoding", ru: "Cyclic encoding" },
          { en: "EWMA memory", ru: "EWMA-память" },
          { en: "MAD filter", ru: "MAD-фильтр" },
          { en: "Quantile forecast", ru: "Quantile forecast" },
          { en: "MIP solve", ru: "MIP solve" },
          { en: "Risk gate", ru: "Risk gate" },
        ].map((step, index) => (
          <span key={step.en} style={{ "--pipeline-index": index } as CSSProperties}>{message(step)}</span>
        ))}
      </div>
    </section>
  );
}

function FormulaExpression({ expression }: { expression: string }) {
  switch (expression) {
    case "hour_sin = sin((2πh) / 24)\nhour_cos = cos((2πh) / 24)":
      return (
        <div className="math-equation math-equation--stacked" aria-label={expression}>
          <div className="math-eq-row">
            <Var name="hour" sub="sin" />
            <Op>=</Op>
            <Func name="sin">
              <Frac numerator={<><span>2πh</span></>} denominator="24" />
            </Func>
          </div>
          <div className="math-eq-row">
            <Var name="hour" sub="cos" />
            <Op>=</Op>
            <Func name="cos">
              <Frac numerator={<><span>2πh</span></>} denominator="24" />
            </Func>
          </div>
        </div>
      );
    case "EWMA_t = α · y_t + (1 - α) · EWMA_{t-1}":
      return (
        <div className="math-equation" aria-label={expression}>
          <Var name="EWMA" sub="t" />
          <Op>=</Op>
          <span>α · <Var name="y" sub="t" /></span>
          <Op>+</Op>
          <span>(1 - α) · <Var name="EWMA" sub="t-1" /></span>
        </div>
      );
    case "z_t = |y_t - median_W| / (1.4826 · MAD_W)\nalert if z_t > 4":
      return (
        <div className="math-equation math-equation--stacked" aria-label={expression}>
          <div className="math-eq-row">
            <Var name="z" sub="t" />
            <Op>=</Op>
            <Frac
              numerator={<><span>|</span><Var name="y" sub="t" /><span> - median</span><Sub value="W" /><span>|</span></>}
              denominator={<><span>1.4826 · MAD</span><Sub value="W" /></>}
            />
          </div>
          <div className="math-eq-row math-eq-row--small">
            <span>alert if</span>
            <Var name="z" sub="t" />
            <Op>&gt;</Op>
            <span>4</span>
          </div>
        </div>
      );
    case "L_α(y, ŷ) = max(α(y - ŷ), (α - 1)(y - ŷ))":
      return (
        <div className="math-equation" aria-label={expression}>
          <Var name="L" sub="α" />
          <span>(y, ŷ)</span>
          <Op>=</Op>
          <Func name="max">
            <span>α(y - ŷ),</span>
            <span>(α - 1)(y - ŷ)</span>
          </Func>
        </div>
      );
    case "WAPE = Σ|y - ŷ| / Σ|y|":
      return (
        <div className="math-equation" aria-label={expression}>
          <span>WAPE</span>
          <Op>=</Op>
          <Frac numerator="Σ |y - ŷ|" denominator="Σ |y|" />
        </div>
      );
    case "min Σ_t [ Σ(φ · x + F · z) + Σρ_a · s_{a,t} + Σπ_a · o_{a,t} + Σκ_a · (B_{a,t} - B_max)_+ + γ · RS_b · x ]":
      return (
        <div className="math-equation math-equation--objective" aria-label={expression}>
          <span className="math-min">min</span>
          <span className="math-sigma">Σ<Sub value="t" /></span>
          <span className="math-bracket">[</span>
          <Term>Σ(φ · x + F · z)</Term>
          <Op>+</Op>
          <Term>Σρ<Sub value="a" /> · s<Sub value="a,t" /></Term>
          <Op>+</Op>
          <Term>Σπ<Sub value="a" /> · o<Sub value="a,t" /></Term>
          <Op>+</Op>
          <Term>Σκ<Sub value="a" /> · (B<Sub value="a,t" /> - B<Sub value="max" />)<Sub value="+" /></Term>
          <Op>+</Op>
          <Term>γ · RS<Sub value="b" /> · x</Term>
          <span className="math-bracket">]</span>
        </div>
      );
    case "HHI = Σ_b ( Balance_b / Σ_{b'} Balance_{b'} )²":
      return (
        <div className="math-equation" aria-label={expression}>
          <span>HHI</span>
          <Op>=</Op>
          <span className="math-sigma">Σ<Sub value="b" /></span>
          <span>(</span>
          <Frac
            numerator={<><span>Balance</span><Sub value="b" /></>}
            denominator={<><span>Σ</span><Sub value={"b'"} /><span> Balance</span><Sub value={"b'"} /></>}
          />
          <span>)<Sup value="2" /></span>
        </div>
      );
    case "CCRI_b = w_F·F_b + w_M·M_b + w_O·O_b + w_C·C_b + w_S·S_b":
      return (
        <div className="math-equation math-equation--ccri" aria-label={expression}>
          <Var name="CCRI" sub="b" />
          <Op>=</Op>
          <Term>w<Sub value="F" /> · F<Sub value="b" /></Term>
          <Op>+</Op>
          <Term>w<Sub value="M" /> · M<Sub value="b" /></Term>
          <Op>+</Op>
          <Term>w<Sub value="O" /> · O<Sub value="b" /></Term>
          <Op>+</Op>
          <Term>w<Sub value="C" /> · C<Sub value="b" /></Term>
          <Op>+</Op>
          <Term>w<Sub value="S" /> · S<Sub value="b" /></Term>
        </div>
      );
    case "ES_{1-α} = E[ Shortfall | Shortfall ≥ VaR_{1-α} ]":
      return (
        <div className="math-equation" aria-label={expression}>
          <Var name="ES" sub="1-α" />
          <Op>=</Op>
          <span>E[ Shortfall | Shortfall ≥ </span>
          <Var name="VaR" sub="1-α" />
          <span>]</span>
        </div>
      );
    default:
      return <pre>{expression}</pre>;
  }
}

function Var({ name, sub }: { name: string; sub?: string }) {
  return (
    <span className="math-var">
      {name}
      {sub ? <Sub value={sub} /> : null}
    </span>
  );
}

function Sub({ value }: { value: string }) {
  return <sub>{value}</sub>;
}

function Sup({ value }: { value: string }) {
  return <sup>{value}</sup>;
}

function Op({ children }: { children: ReactNode }) {
  return <span className="math-op">{children}</span>;
}

function Func({ name, children }: { name: string; children: ReactNode }) {
  return (
    <span className="math-func">
      <span>{name}</span>
      <span className="math-paren">(</span>
      <span className="math-func__body">{children}</span>
      <span className="math-paren">)</span>
    </span>
  );
}

function Frac({ numerator, denominator }: { numerator: ReactNode; denominator: ReactNode }) {
  return (
    <span className="math-frac">
      <span>{numerator}</span>
      <i />
      <span>{denominator}</span>
    </span>
  );
}

function Term({ children }: { children: ReactNode }) {
  return <span className="math-term">{children}</span>;
}
