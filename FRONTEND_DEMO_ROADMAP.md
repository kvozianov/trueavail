# Liquidity Control Tower Frontend Demo Roadmap

## Working Protocol for AI Agents

Before making frontend/design changes:

1. Read this file.
2. Follow the mandatory skill order in `Mandatory skills for frontend work`.
3. Keep the visual direction: **black/white governed liquidity decision cockpit**.
4. Do not create a generic fintech dashboard, SaaS landing page, or shadcn-style admin panel.
5. Treat the first screen as an operational decision interface centered on **Approve EUR 4.1M payout?**
6. Verify the final UI in browser screenshots before calling the work done.

## Итоговая цель

Фронтенд должен быть не витриной функций, а управляемой демо-историей для жюри.

Главная мысль:

**Book balance says green. Usable liquidity says red.**

Проект должен привести жюри к выводу:

**Liquidity Control Tower — это не просто dashboard. Это governed liquidity decision engine, который не дает treasury-команде принять опасное решение на основе misleading cash balance.**

## Что жюри должно понять

За первые 10-15 секунд:

- на бумаге баланс выглядит безопасным;
- реально доступная ликвидность уже в зоне риска;
- система заранее видит cash gap;
- система объясняет причину;
- система не просто рисует alert, а блокирует unsafe decision;
- система предлагает конкретный contingency plan.

За 3-5 минут:

- работает прогноз p05/p50/p95;
- работает stress testing;
- работает HHI/concentration risk;
- работает optimizer/governance logic;
- есть ROI и бизнес-эффект;
- есть технические доказательства: OpenAPI, snapshot, audit, solver status, backend contracts.

## Главный демо-сценарий

Один центральный Golden Incident:

- Account: `atlas-eur-operating`
- Date: `2026-05-19`
- Event: merchant payout cycle
- Payout: `EUR 4.1M`
- p05 usable liquidity gap: `EUR 2.136M`
- TARGET2 outage stress loss: `EUR 2.021M`
- ES99: `EUR 2.135M`
- HHI after stress: `0.352`
- HHI threshold: `0.25`
- Optimizer status: `infeasible`
- Governance decision: `reject`
- Contingency: prefund `EUR 2.136M` and/or throttle payout batch

Главный interactive moment:

**Approve EUR 4.1M payout?**

Судья должен сначала увидеть ситуацию как обычный treasurer: balance выглядит нормально, значит payout кажется безопасным. После клика система раскрывает, что это false-safe decision.

## Рекомендуемая структура фронтенда

Минимальный набор маршрутов:

- `/` — immediate demo entry, not a marketing landing.
- `/demo` — основной Golden Incident flow.
- `/judge` — страница для оценки жюри: функции, статус, метрики, доказательства.
- `/technical` — техническая глубина: архитектура, OpenAPI, backend contracts, reproducibility.

Если времени мало, `/judge` и `/technical` можно сделать вкладками внутри `/demo`.

## Visual Direction

Фронтенд должен выглядеть как **black/white governed liquidity decision cockpit**, а не как fintech dashboard и не как SaaS landing page.

Главный экран должен быть операционной сценой принятия решения:

```text
Payout queue -> Selected payment -> Evidence chain -> Liquidity impact simulation -> Approve/Reject -> Audit stamp
```

В центре интерфейса не "обзор метрик", а конкретный decision object:

**Approve EUR 4.1M payout?**

### Reference stack

Primary references:

- [Linear](https://linear.app/) — плотность, low-noise workflow, serious product feel, аккуратная навигация.
- [Vercel](https://vercel.com/) — черно-белая техническая строгость, sharp typography, evidence blocks.
- [Modern Treasury](https://www.moderntreasury.com/) — доменная близость: payments, ledgers, money movement, treasury infrastructure.
- [Column](https://column.com/) — banking infrastructure tone: API, rails, ledger, proof over decoration.

Secondary references:

- [Plain](https://www.plain.com/) — queues, statuses, escalation, operational B2B clarity.
- [Plausible](https://plausible.io/) — простая аналитика, low cognitive load, honest dashboard language.

Use only for ROI/storytelling, not visual style:

- [Ramp](https://ramp.com/)
- [Stripe](https://stripe.com/)

Do not copy any reference directly. The target is not "Vercel for fintech" or "Linear for banking". The target is an operational terminal for governed liquidity decisions.

### Mandatory skills for frontend work

These skills are required for future frontend/design work on this project. Any AI or engineer working on the frontend should read this file first, then follow this skill order.

#### Required skill order

1. `frontend-design`
   - Use for building the actual product interface.
   - Must produce a working decision cockpit, not a landing page.
   - Use when creating `/`, `/demo`, `/judge`, `/technical`, or major UI components.

2. `minimalist-ui`
   - Use to enforce the black/white visual discipline.
   - Must keep the interface flat, strict, typographic, and low-decoration.
   - Use to prevent colorful fintech/SaaS aesthetics.

3. `impeccable` or `design-taste-frontend`
   - Use for hierarchy, spacing, density, responsive behavior, and anti-generic design control.
   - Must remove generic dashboard patterns, decorative cards, empty KPI blocks, and visual noise.
   - Use before and after major layout changes.

4. `emil-design-eng`
   - Use for interaction polish.
   - Focus on the signature transition: `Approve? -> Risk revealed -> Reject`.
   - Refine hover, focus, loading, disabled, selected, breached, rejected, and replay/live states.

5. `web-design-guidelines`
   - Use for final UX, accessibility, readability, and responsive audit.
   - Must check contrast, text overflow, keyboard focus, semantic structure, and mobile/desktop behavior.

6. `browser` or `chrome`
   - Use for mandatory visual QA.
   - Take screenshots on desktop and mobile widths.
   - Verify the first screen actually reads as a decision cockpit.

7. `shadcn-ui`
   - Optional only for accessible primitives.
   - Do not use it as a visual style.
   - Do not create a default shadcn dashboard.

#### Skill usage rules

- Do not begin visual implementation without applying `frontend-design` and `minimalist-ui`.
- Do not ship a screen without a `browser`/`chrome` visual check.
- Do not call the design finished until `web-design-guidelines` has been used for audit.
- Use `impeccable`, `design-taste-frontend`, and `emil-design-eng` when the UI starts to look generic, too empty, too card-heavy, or too much like a SaaS template.
- If skills conflict, the project direction wins: **black/white governed liquidity decision cockpit**.

### Hard design constraints

Palette:

- Use only off-black, off-white, and grayscale.
- Emergency red is allowed only for usable liquidity breach, reject state, policy violation, and destructive warnings.
- Do not use green as a primary success color. If needed, use subdued gray/white states and reserve red for real danger.
- Do not use decorative color accents.

Layout:

- No decorative hero sections.
- No generic SaaS landing page.
- Fewer cards, more tables, rails, audit rows, queues, evidence panels, and traces.
- Every metric must connect to a decision or blocker.
- Avoid "CEO dashboard theater": big KPI tiles, empty graphs, abstract cash-flow waves, decorative bento grids.

Motion:

- Motion must reveal state changes, not decorate.
- Signature interaction: select payout -> reveal evidence chain -> simulate liquidity impact -> reject with audit stamp.
- Animate only opacity and transform.
- No glow, no glassmorphism, no gradient shimmer.

Typography:

- Dense, confident, operational.
- Use mono style for traces, IDs, API evidence, solver status, audit events.
- Avoid marketing copy. Prefer command language: `Hold`, `Release`, `Escalate`, `Rebalance`, `Reject`, `Prefund`, `Throttle`.

### Decision information architecture

Every main screen should follow this order:

```text
Decision -> Exposure -> Constraint -> Evidence -> Action -> Audit
```

Meaning:

- Decision: what action is being considered?
- Exposure: what money, bank, currency, rail, counterparty, and time window are affected?
- Constraint: which buffer, HHI threshold, CCRI limit, survival floor, or rail condition is violated?
- Evidence: forecast, stress, HHI, known event, optimizer status, governance blocker.
- Action: reject, prefund, throttle, escalate, fallback rail.
- Audit: timestamp, solver status, API source, replay/live mode, evidence IDs.

### Required state language

Use visible operational states:

- `pending`
- `breached`
- `escalated`
- `approved`
- `rejected`
- `timed-out`
- `replay`
- `live`

Each state must have a visible reason. A red status without a reason is not acceptable.

## Фаза 0. Demo Contract

### Цель

Зафиксировать один источник правды для всех экранов, чтобы цифры не расходились.

### Что сделать

- Создать frontend-level объект `goldenIncident`.
- Подключить данные из backend API.
- Подключить fallback из `backend/artifacts/demo_snapshot.json`.
- Ввести режимы:
  - `Live API`
  - `Replay Snapshot`
- На UI явно показывать, какой режим активен.

### Данные

Минимальный contract для UI:

```ts
type GoldenIncident = {
  accountId: "atlas-eur-operating";
  date: "2026-05-19";
  payoutAmount: number;
  payoutCurrency: "EUR";
  p05Gap: number;
  target2StressLoss: number;
  es99: number;
  hhiAfterStress: number;
  hhiThreshold: number;
  optimizerStatus: "optimal" | "infeasible" | "failed";
  governanceDecision: "approve" | "reject" | "escalate";
  contingencyActions: Array<{
    type: "prefund" | "throttle" | "credit_line" | "fallback_rail";
    amount?: number;
    description: string;
  }>;
};
```

### Deliverables

- `goldenIncident` data adapter.
- API/fallback loader.
- `Live API` / `Replay Snapshot` indicator.

### Acceptance criteria

- Все экраны используют одни и те же значения.
- Демо работает без backend через deterministic replay.
- Если API недоступен, UI не ломается и честно показывает replay mode.

### Риски

- Если цифры будут отличаться между блоками, жюри перестанет верить демо.
- Если fallback не готов, live demo становится хрупким.

## Фаза 1. Landing / Demo Entry

### Цель

За 10-15 секунд объяснить проблему и ценность проекта.

### Экран

Первый экран должен быть не marketing landing, а **decision cockpit**.

Recommended first-screen layout:

```text
Left rail: payout queue / pending liquidity events
Center: selected payout decision
Right rail: evidence chain
Bottom rail: liquidity impact simulation + audit trail
```

Center decision:

**Approve EUR 4.1M payout?**

Главный текст:

**Book balance says green. Usable liquidity says red.**

Подзаголовок:

**Liquidity Control Tower prevents treasury teams from approving unsafe payments based on misleading balances.**

CTA:

**Run Golden Incident**

### Компоненты

- `HeroIncident`
- `PayoutQueue`
- `SelectedPaymentDecision`
- `EvidenceChain`
- `LiquidityImpactSimulation`
- `AuditStamp`
- `ValueStrip`
- `DemoNav`
- `RunGoldenIncidentButton`

### Что показать

Value strip:

- `$6-7M released capital`
- `75-90% fewer overdrafts`
- `24-48h early warning`
- `50-60% less manual work`

Mini incident preview:

- `atlas-eur-operating`
- `EUR 4.1M payout`
- `2026-05-19`
- `Risk: hidden p05 breach`

### Acceptance criteria

- Жюри понимает, что продукт считает usable liquidity, а не просто book balance.
- На первом экране нет каталога функций.
- На первом экране нет декоративного SaaS hero.
- Есть один очевидный путь: выбрать payout и увидеть risk evidence.
- Центральный объект экрана — pending payout, а не абстрактная dashboard summary.

### Риски

- Слишком много текста превратит экран в документацию.
- Слишком много fintech-терминов сломает понимание для не-treasury жюри.
- Если первый экран выглядит как обычный SaaS landing, проект потеряет ощущение operational product.

## Фаза 2. Interactive Golden Incident

### Цель

Создать главный aha moment: судья почти принимает неправильное решение, а система показывает, почему оно unsafe.

### Flow

1. UI показывает payout request: `EUR 4.1M merchant payout`.
2. Book balance визуально выглядит нормальным.
3. UI задает вопрос: **Approve EUR 4.1M payout?**
4. Судья нажимает approve / reveal.
5. Система раскрывает usable liquidity forecast.
6. Появляется breach: p05 gap `EUR 2.136M`.
7. UI переводит decision object из `pending` в `breached`.
8. Action bar меняется с `Approve / Hold` на `Reject / Prefund / Throttle / Escalate`.

### Компоненты

- `ApprovalDecisionCard`
- `IncidentHeader`
- `BookVsUsableSplit`
- `ForecastCorridorChart`
- `RiskStatusPanel`
- `KnownEventsTimeline`
- `BreachExplanationDrawer`
- `DecisionStateBar`
- `ActionBar`

### Что показать

Book balance side:

- общий баланс выглядит достаточным;
- визуально зеленая зона;
- подпись: "Traditional view: balance appears safe."

Usable liquidity side:

- p05/p50/p95 corridor;
- buffer line;
- breach point on `2026-05-19`;
- подпись: "LCT view: usable liquidity breaches survival floor."

### Acceptance criteria

- Пользователь понимает before/after:
  - без LCT payout кажется безопасным;
  - с LCT виден hidden cash gap.
- Breach виден визуально, а не только текстом.
- Причина breach объяснена простым языком.
- Смена состояния `pending -> breached` видна в UI.
- Судья видит, что система не просто показывает график, а меняет допустимые действия.

### Риски

- Если график не показывает buffer/breach clearly, вау-момент потеряется.
- Если пользователь сразу видит все красное, не будет эффекта false-safe trap.
- Если action bar не меняется после evidence reveal, интерфейс будет выглядеть как monitoring, а не decision cockpit.

## Фаза 3. Risk Evidence Cockpit

### Цель

Доказать, что риск не "AI magic", а результат конкретных факторов: payout, settlement timing, stress, concentration.

### Экран должен ответить

- Where is the risk?
- When will it happen?
- Why will it happen?
- What makes it worse?
- Which constraint blocks approval?
- What action remains safe?

### Компоненты

- `RiskBadgeGrid`
- `StressBreakdown`
- `HHIMeter`
- `CCRIBadge`
- `KnownEventsPanel`
- `EvidenceDrawer`
- `ConstraintLedger`
- `TreasuryTensionPanel`

### Что показать

Risk evidence:

- p05 usable gap: `EUR 2.136M`
- TARGET2 outage loss: `EUR 2.021M`
- ES99: `EUR 2.135M`
- HHI: `0.352 > 0.25`
- known event: merchant payout cycle
- risk status: `Red`

Treasury tension layer:

- cut-off window for payout approval;
- usable buffer vs required survival floor;
- bank exposure / HHI policy;
- TARGET2 rail stress;
- fallback funding requirement;
- governance blocker.

### Рекомендуемая визуализация

- p05/p50/p95 как corridor chart.
- TARGET2 impact как waterfall.
- HHI как gauge или horizontal threshold meter.
- Known events как timeline.
- Risk badges как compact evidence rows, not decorative cards.
- Constraints как ledger/table: `constraint`, `threshold`, `current`, `status`, `effect on decision`.

### Acceptance criteria

- Каждая красная метрика имеет объяснение "что это значит для treasury".
- Судья понимает, что риск возникает из событий, концентрации и stress scenario.
- Нет ощущения, что система просто поставила красный статус без причин.
- Есть clear path: signal -> cause -> constraint -> decision impact.

### Риски

- BI-noise: слишком много графиков без story.
- Аббревиатуры без расшифровки: HHI, ES99, CCRI должны объясняться через последствия.
- Пустые метрики без decision impact запрещены.

## Фаза 4. Optimizer + Governance Gate

### Цель

Показать главный product value: система не просто прогнозирует риск, а предотвращает unsafe treasury action.

### Сюжет

После выявления риска система пытается найти safe transfer. Optimizer возвращает `infeasible`.

Важно объяснить:

**Infeasible — это не поломка. Это полезный результат: система доказала, что безопасного transfer при текущих constraints нет.**

### Компоненты

- `OptimizerResult`
- `ConstraintConflictView`
- `GovernanceGate`
- `RejectionReason`
- `AuditTrail`
- `PolicyBlockerTable`
- `RejectStamp`

### Что показать

Optimizer result:

- status: `infeasible`
- reason: survival floors conflict with exposure constraints
- route plan: no safe transfer

Governance gate:

- decision: `reject`
- blockers:
  - optimizer is not optimal;
  - p05 breach is not funded;
  - HHI after stress is above threshold;
  - TARGET2 feasibility requires fallback confirmation.

Decision state:

- before evidence: `pending`
- after forecast/stress: `breached`
- after optimizer/governance: `rejected`
- next possible states: `escalated`, `timed-out`

### Человеческий текст

**Transfer rejected: survival floors conflict with bank exposure constraints.**

**The system refuses a false-safe transfer and escalates to contingency actions.**

### Acceptance criteria

- Судья понимает, почему "просто перевести деньги" нельзя.
- `reject` выглядит как умное решение, а не как failed demo.
- Есть audit trail события.
- `Reject` сопровождается visible policy blockers и audit stamp.

### Риски

- Слово `infeasible` без объяснения выглядит как ошибка.
- Если governance gate спрятан, жюри увидит только red alert, а не decision engine.
- Если reject не выглядит финальным операционным решением, демо потеряет главный product value.

## Фаза 5. Contingency + ROI

### Цель

Закончить демо конкретным управленческим действием и бизнес-эффектом.

### Компоненты

- `ContingencyPlanCard`
- `ActionComparison`
- `ROIPanel`
- `NextActionsList`
- `DecisionSummary`

### Что показать

Contingency:

- prefund `atlas-eur-operating` by `EUR 2.136M`;
- throttle merchant payout batch;
- request fallback rail / intraday credit if needed;
- assign action owner: Treasury Lead / CFO approval.

ROI:

- reserve requirement: `$15M -> $8-9M`;
- released capital: `$6-7M`;
- overdraft incidents: `75-90% fewer`;
- manual work: `12h/week -> 5-6h/week`;
- early warning: `0-6h -> 24-48h`.

### Acceptance criteria

- Демо заканчивается действием, а не красной ошибкой.
- Жюри видит business value.
- Есть clear before/after:
  - without LCT: unsafe approval / failed payout risk;
  - with LCT: reject + contingency before failure.

### Риски

- Если показать только risk, проект выглядит как monitoring.
- Если ROI не связан с конкретным incident, цифры выглядят декоративно.

## Фаза 6. Judge View

### Цель

Дать жюри одну страницу, где видно: какие функции есть, что работает, где доказательства, какая ценность.

### Route

`/judge`

### Компоненты

- `JudgeScoreboard`
- `FunctionStatusTable`
- `DemoEvidencePanel`
- `BackendStatusCard`
- `MetricEvidenceCards`

### Таблица

| Function | Status | Demo | Evidence | Metric | Technical Depth | User Value |
| --- | --- | --- | --- | --- | --- | --- |
| Forecast Corridor | Works | Show forecast | p05/p50/p95 response | EUR 2.136M gap | ML ensemble | early warning |
| Stress Testing | Works | Run TARGET2 | stress response | EUR 2.021M loss | scenario engine | tail-risk visibility |
| HHI / CCRI | Works | Show concentration | HHI threshold | 0.352 > 0.25 | risk scoring | avoids bank concentration |
| Optimizer | Works | Find safe transfer | solver status | infeasible | PuLP MIP | avoids unsafe route |
| Governance Gate | Works | Show decision | blocker list | reject | policy rules | prevents bad approval |
| Contingency | Works | Show plan | action list | EUR 2.136M prefund | workflow logic | gives next action |
| ROI | Works | Show value | ROI summary | $6-7M released | financial model | CFO case |
| AI Council | Works/Mock | Show verdict | advisor output | decision review | LLM over facts | explainability |
| OpenAPI | Works | View contract | openapi.json | endpoints | FastAPI contracts | integration readiness |

### Acceptance criteria

- За 60 секунд видно, какие функции реально покрыты.
- Есть кнопки "Show Demo", "View Evidence", "View API".
- Жюри не надо искать технические доказательства по всему сайту.

### Риски

- Если `/judge` выглядит как документация, его не будут читать.
- Если нет статусов, жюри может не понять, что реально работает.

## Фаза 7. Technical View

### Цель

Показать техническую глубину без перегруза основного demo flow.

### Route

`/technical`

### Компоненты

- `ArchitectureMap`
- `ApiContractsPanel`
- `OpenApiViewer`
- `ReproducibilityPanel`
- `AICouncilPanel`
- `AuditTrail`
- `ModelStackPanel`

### Архитектурная схема

```text
Synthetic data
  -> Feature engineering
  -> Forecast p05/p50/p95
  -> Stress engine
  -> HHI / CCRI risk layer
  -> PuLP MIP optimizer
  -> Governance gate
  -> Contingency plan
  -> Audit / AI Council / ROI
```

### Что показать

- ML ensemble: LightGBM Quantile + sklearn Gradient Boosting Quantile + EWMA fallback.
- MAD anomaly filtering.
- Known events calendar.
- PuLP optimizer.
- Survival floor constraints.
- HHI and CCRI.
- ES99 calculation.
- Governance gate rules.
- OpenAPI contracts.
- Demo snapshot.
- Backend verify command.

### Acceptance criteria

- Техническая глубина видна без устного объяснения.
- Есть воспроизводимость: snapshot, timestamp, solver status, endpoint evidence.
- Жюри видит backend-ready MVP.

### Риски

- Техническая страница не должна конкурировать с demo story.
- Не надо начинать презентацию с этой страницы.

## Фаза 8. Polish, QA, Pitch Mode

### Цель

Сделать демо стабильным для защиты.

### Что проверить

- Полный сценарий проходит за 3-5 минут.
- Есть `Restart Demo`.
- Есть loading states.
- Есть error states.
- Есть fallback/replay mode.
- Все ключевые цифры совпадают между экранами.
- Responsive layout не ломается.
- Main CTA всегда понятен.
- Нет переполнения текста в карточках.
- Термины раскрываются через последствия.

### Pitch sequence

1. Landing: problem and value.
2. Golden Incident: approve payout?
3. Forecast: hidden p05 gap.
4. Stress + HHI: risk gets worse.
5. Optimizer: no safe transfer.
6. Governance: reject.
7. Contingency: prefund/throttle.
8. ROI: business value.
9. Judge View: working functions.
10. Technical View: implementation proof.

### Acceptance criteria

- Демо понятно без разработчика.
- Главный aha moment происходит в первые 60 секунд.
- Нет ощущения mock-only презентации.
- Есть технические доказательства.
- Есть business value.

## Компонентная карта

### Core demo components

- `DemoLayout`
- `HeroIncident`
- `PayoutQueue`
- `SelectedPaymentDecision`
- `EvidenceChain`
- `LiquidityImpactSimulation`
- `DecisionStateBar`
- `ActionBar`
- `ValueStrip`
- `IncidentHeader`
- `ApprovalDecisionCard`
- `BookVsUsableSplit`
- `ForecastCorridorChart`
- `RiskStatusPanel`
- `KnownEventsTimeline`
- `StressBreakdown`
- `HHIMeter`
- `CCRIBadge`
- `ConstraintLedger`
- `TreasuryTensionPanel`
- `OptimizerResult`
- `ConstraintConflictView`
- `GovernanceGate`
- `PolicyBlockerTable`
- `RejectStamp`
- `ContingencyPlanCard`
- `ROIPanel`
- `AuditTrail`

### Judge/technical components

- `JudgeScoreboard`
- `FunctionStatusTable`
- `MetricEvidenceCards`
- `ArchitectureMap`
- `ApiContractsPanel`
- `OpenApiViewer`
- `ReproducibilityPanel`
- `AICouncilPanel`
- `BackendStatusCard`

## Главные UX правила

1. Не показывать все функции сразу.
2. Каждая функция должна быть уликой в одном incident story.
3. Первый экран должен быть понятен человеку без treasury background.
4. Технические детали показывать после aha moment.
5. `Reject` должен выглядеть как полезный результат.
6. `Infeasible` всегда объяснять человеческим языком.
7. Везде показывать live/replay credibility.
8. Метрики связывать с конкретным решением.
9. Не делать generic SaaS landing.
10. Не превращать UI в BI-dashboard noise.
11. Не делать generic fintech dashboard.
12. Не использовать decorative KPI cards без action рядом.
13. Не использовать gradients, glow, glassmorphism, abstract cash-flow waves.
14. Красный использовать только для breach/reject/policy violation.
15. Каждый экран должен следовать цепочке `Decision -> Exposure -> Constraint -> Evidence -> Action -> Audit`.
16. Главный interaction должен быть: payout queue -> selected payment -> evidence chain -> liquidity impact simulation -> approve/reject with audit stamp.
17. UI language должен быть command-first: `Hold`, `Release`, `Escalate`, `Rebalance`, `Reject`, `Prefund`, `Throttle`.
18. Состояния `pending`, `breached`, `escalated`, `approved`, `rejected`, `timed-out`, `replay`, `live` должны быть видимыми и объясненными.

## Definition of Done

Фронтенд готов к показу, если:

- есть один стабильный Golden Incident flow;
- жюри может пройти сценарий кликами;
- первый экран выглядит как decision cockpit, а не landing page;
- есть payout queue, selected payout, evidence chain, impact simulation и audit stamp;
- работает fallback snapshot;
- есть visible API/replay status;
- forecast, stress, optimizer, governance и contingency отображаются в одном causality chain;
- ROI виден и связан с решением;
- red accent используется только для breach/reject/policy violation;
- нет decorative hero, generic KPI theater, gradients, glow, glassmorphism;
- все ключевые состояния имеют visible reason;
- `/judge` показывает функции и статусы;
- `/technical` показывает архитектуру и доказательства;
- демо занимает 3-5 минут;
- главный вывод ясен:

**Liquidity Control Tower prevents unsafe treasury decisions before payment failure happens.**
