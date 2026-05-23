
# TrueAvail — Liquidity Control Tower

## Чем мы отличаемся от конкурентов

TrueAvail отличается тем, что не просто показывает текущий баланс и не просто подсвечивает уже случившуюся проблему.  
Мы **предсказываем будущую проблему ликвидности до того, как она станет операционным инцидентом**, объясняем причину риска и предлагаем безопасное действие.

Главная идея продукта:

```text
Predict the liquidity problem before it becomes a payment failure.
```

TrueAvail — это не обычный cash dashboard и не просто forecast tool. Система связывает **usable liquidity**, карту, settlement rails, ML-прогноз, stress testing, optimizer, governance и contingency actions в один защищаемый decision flow.

| Что обычно есть у конкурентов | Что есть у нас |
|---|---|
| Текущий баланс по счетам | Прогноз будущей `usable liquidity` с учётом cut-off, holidays, settlement delay и survival floor |
| Alert, когда проблема уже произошла | Early warning: система заранее видит, что p05 corridor пробьёт survival floor |
| Баланс как основная правда | Разделение `book cash` и `usable cash`: деньги могут быть на балансе, но быть недоступны |
| Таблица или BI dashboard | Интерактивная карта ликвидности с банковскими узлами, transfer rails, risk zones и calendar pressure |
| Прогноз одной цифрой | Quantile forecast corridor: `p05 / p50 / p95`, где downside-risk виден заранее |
| Общий risk score без причины | Root cause, evidence, telemetry, model votes и понятное объяснение риска |
| Простая бизнес-логика | ML ensemble: quantile models, anomaly detection, EWMA fallback, known events, risk aggregation |
| Реакция на факт нехватки денег | Предикт будущего cash gap до cut-off или payout window |
| Рекомендация без строгих ограничений | MIP optimizer с survival floors, transfer costs, CCRI, HHI и exposure constraints |
| “Найти любой перевод” | Умение честно сказать `infeasible`, если безопасного маршрута нет |
| Риск как цветной badge | HHI concentration, CCRI bank risk, Expected Shortfall 99%, stress scenarios |
| Автоматическое approval-поведение | Governance Gate, который блокирует unsafe approval и сохраняет audit trace |
| ML как black box | Mathematical Core: формулы, признаки, pinball loss, EWMA, MAD, HHI, ES99, MIP objective |
| Отдельные инструменты для forecast, stress, ops | Один end-to-end сценарий: forecast -> stress -> optimize -> govern -> contingency |
| Просто “красный экран” | Исполняемые действия: prefund, throttle, fallback rail, ticket, owner, deadline |
| Демо зависит от live backend | Deterministic replay snapshot, который работает на Vercel без Python backend |
| Нет понятного proof для жюри | Отдельные страницы `/judge`, `/technical`, `/functions/*` с доказательствами, метриками и API receipts |
| LLM принимает решение напрямую | AI Council работает только поверх рассчитанных deterministic facts и не делает банковские действия |

### Главная разница

Большинство решений отвечают:

```text
Сколько денег у нас сейчас?
```

TrueAvail отвечает:

```text
Будут ли эти деньги реально доступны в нужный момент, и что делать, если нет?
```

Это важно для treasury, потому что формально деньги могут быть на балансе, но фактически быть недоступны из-за banking day, cut-off, rail delay, concentration risk или survival floor.

Поэтому TrueAvail не просто предупреждает о проблеме, а доказывает:

```text
почему approval опасен
какое ограничение нарушено
какой риск создаётся
почему optimizer не может найти safe route
что treasury должна сделать дальше
```

### Что у нас есть, чего обычно нет у них

1. **Predictive liquidity breach detection**  
   Мы заранее предсказываем, что конкретный account может пробить survival floor. Проблема видна не после failed payment, а до cut-off.

2. **Usable liquidity вместо book balance**  
   Система понимает, что деньги на балансе ещё не всегда доступны. Она учитывает banking days, rail delays, settlement windows, holidays, known events и required buffers.

3. **Downside-first ML forecast**  
   Мы смотрим не только на средний прогноз. p05 показывает худший реалистичный сценарий, поэтому риск всплывает раньше, чем в обычном forecast dashboard.

4. **ML ensemble, а не одна модель**  
   Решение строится через ансамбль: quantile forecasting, anomaly detection, pattern recognition, risk scoring и decision aggregation. В demo можно открыть `View models` и увидеть голоса моделей.

5. **Known events и calendar intelligence**  
   Модель знает про payroll, merchant payout, credit repayment, holidays и settlement calendars. Поэтому она не просто говорит “аномалия”, а объясняет, почему риск появился именно сейчас.

6. **Stress before recommendation**  
   Перед рекомендацией система прогоняет stress scenarios: TARGET2 outage, bank-run, rail delay. То есть recommendation проверяется на устойчивость.

7. **Safe optimizer, not optimistic optimizer**  
   Оптимизатор ищет не просто самый дешёвый перевод, а безопасный route с учётом survival floors, HHI concentration, CCRI bank rating, transfer costs и exposure limits.

8. **Governance before action**  
   Даже если модель нашла сигнал, действие не проходит без governance gate. Unsafe auto-approval блокируется.

9. **From prediction to action**  
   Мы не заканчиваем на “у вас будет проблема”. Система предлагает, что делать: prefund, throttle payout, use fallback rail, create ticket, assign owner, set deadline.

### Как это видно в demo

В demo New York incident появляется до реального failed payment:

- book balance выглядит достаточным;
- модель видит, что p05 usable liquidity упадёт ниже survival floor;
- known event объясняет причину: credit repayment + delayed SWIFT cover;
- anomaly detection подтверждает abnormal movement;
- stress layer усиливает риск;
- HHI/CCRI показывают concentration and bank exposure issues;
- optimizer не находит safe route;
- governance блокирует unsafe approval;
- система предлагает prefund/throttle/ticket flow.

Именно это делает demo production-like: оно показывает не просто красивую карту, а полный путь от **предсказания проблемы** до **безопасного управляемого действия**.

## О продукте

Кликабельное treasury/fintech demo для управления ликвидностью.  
Главная идея: **book cash не равен usable cash**. Система показывает, где деньги числятся на балансе, но ещё не могут быть безопасно использованы из-за cut-off, settlement delay, survival floor, stress-сценариев, концентрации банка и governance-правил.

Demo deterministic: без реальных банковских операций, платежей и внешних ML/LLM вызовов по умолчанию. Все результаты безопасны для защиты перед жюри, но выглядят как production flow: карта, инцидент, ML ensemble, математические формулы, API receipts, evidence, recommendation, ticket flow и audit-like actions.

## Что показать жюри

1. Открыть проект: `https://trueavail.vercel.app`
2. Открыть `/landing` — короткая product story.
3. Открыть `/demo` — интерактивная карта и New York incident.
4. На карте виден красный инцидент `New York usable liquidity breach`.
5. Нажать `Run ML analysis`.
6. Дождаться pipeline:
   - map and snapshot ingest
   - geo validation
   - treasury telemetry
   - MAD anomaly detection
   - risk score / HHI / ES99
   - ML ensemble votes
   - recommendations
7. После результата открыть:
   - `View models` — голоса моделей ансамбля.
   - `Open details` — root cause, evidence, telemetry.
   - `Create ticket` — mock ticket flow.
   - `Accept recommendation` — принятие safe recommendation.
   - `Close incident` — confirmation и закрытие инцидента.
   - `Deep Analytics For Jury` — proof cards по функциям.
8. Открыть `/transfers` — отдельная вкладка `Переводы средств`: пользователь выбирает SWIFT treasury-command или TrueAvail blockchain rail, задаёт from/to/through/requirements и получает либо manual treasury receipt, либо encrypted-memo finality receipt. Счета, балансы, wallets, KYB и условия берутся из единого file-backed `treasury-ledger`.
9. Открыть `/transfers/compliance` — кабинет аудитора/регулятора: публично виден encrypted memo, а с demo view key раскрывается compliance report на тех же ledger-данных.
10. Открыть `/liquidity-control-tower` — отдельный operational map cockpit.
11. Открыть `/judge` — one-page proof для жюри.
12. Открыть `/technical` — математический аппарат, архитектура и OpenAPI.
13. Открыть `/functions/forecast`, `/functions/stress`, `/functions/hhi`, `/functions/optimizer`, `/functions/governance`, `/functions/contingency` — drilldown по функциям.

## Главный сценарий

```text
Map anomaly detected
-> Run ML analysis
-> ML ensemble votes
-> Risk verdict
-> Explainability
-> Recommendation
-> Ticket / Accept / Close
-> Judge proof / Technical proof
```

## Две демо-истории

В проекте сейчас есть две связанные поверхности.

### 1. Map Incident

Используется на `/demo` и `/liquidity-control-tower`.

Сценарий: `New York usable liquidity breach`.

Карта показывает банковские узлы, transfer rails, calendar pressure и красный incident marker. Пользователь выбирает treasury scenario, видит маршруты SWIFT/Fedwire/TARGET2, запускает ML analysis и получает deterministic verdict.

Ключевые элементы:

- New York incident marker.
- Account nodes: New York, Singapore, Riyadh, Frankfurt, London, Tokyo, Dubai.
- Scenarios:
  - NY credit repayment
  - Frankfurt EUR clearing
  - Singapore merchant payout
- Transfer rails with ETA and settlement notes.
- Calendar engine: banking days, cut-off, closed markets, seasonality.
- Layer stack on `/liquidity-control-tower`:
  - Risk zones
  - Transfer rails
  - Calendar pressure
  - Bank nodes
- Add Bank Account flow.
- Editable account capital and condition.
- ML ensemble modal flow.

### 2. Golden Incident

Используется на `/judge`, `/technical` и `/functions/*`.

Сценарий: `atlas-eur-operating`, EUR 4.1M merchant payout.

Система показывает, почему обычный ledger view выглядит безопасным, но usable liquidity после контролей даёт reject.

Ключевые метрики:

| Signal | Value |
|---|---|
| Payout | EUR 4.1M |
| p05 usable gap | EUR 2.136M |
| TARGET2 stress loss | EUR 2.021M |
| HHI after stress | 0.352 > 0.25 |
| Optimizer status | infeasible |
| Safe transfer routes | 0 |
| Governance decision | reject |
| Contingency | prefund / throttle |
| ROI story | reserve before $15M, after $8-9M |

## Математический аппарат

Проект показывает не просто красивую карту, а цепочку моделей и ограничений.

### Feature Engineering

Raw treasury events превращаются в признаки:

```text
hour_sin = sin((2πh) / 24)
hour_cos = cos((2πh) / 24)

EWMA_t = α · y_t + (1 - α) · EWMA_{t-1}

z_t = |y_t - median_W| / (1.4826 · MAD_W)
alert if z_t > 4
```

Что это даёт:

- cyclic time для cut-off и банковских окон;
- EWMA и lag-features для памяти балансов;
- rolling statistics;
- settlement flags;
- known events;
- robust MAD anomaly filtering.

### ML Forecasting

Прогноз строится как corridor, а не как одно число:

```text
p05 / p50 / p95 usable liquidity corridor
```

Используются:

- LightGBM Quantile
- sklearn Gradient Boosting Quantile
- EWMA volatility fallback
- weighted quantile ensemble

Функция потерь:

```text
L_α(y, ŷ) = max(α(y - ŷ), (α - 1)(y - ŷ))
```

Качество читается через:

```text
WAPE = Σ|y - ŷ| / Σ|y|
```

### Risk Management

Risk layer проверяет концентрацию, tail loss и bank exposure.

```text
HHI = Σ_b (Balance_b / Σ Balance_b)^2
```

```text
CCRI_b = w_F·F_b + w_M·M_b + w_O·O_b + w_C·C_b + w_S·S_b
```

```text
ES_99 = E[Shortfall | Shortfall >= VaR_99]
```

Что показывает demo:

- HHI выше threshold блокирует approval.
- CCRI downgrade уменьшает safe exposure.
- ES99 показывает tail-risk для CFO story.
- Stress scenarios меняют usable liquidity до optimizer.

### MIP Optimizer

Оптимизатор ищет transfer plan, который одновременно дешёвый и безопасный.

```text
min Σ variable_cost*x + fixed_fee*z + overdraft_penalty + survival_floor_penalty + bank_risk_penalty
```

Ограничения:

```text
Balance_after >= survival_floor
source_outflow <= available_liquidity
x_ij <= M * route_used_ij
bank_exposure <= MaxExposure(CCRI_bank)
HHI_after <= policy_threshold
```

В Golden Incident правильный результат — `infeasible`, потому что безопасного auto-transfer route нет.

### Governance Gate

Governance не даёт модели “продавить” unsafe action.

Gate получает:

- forecast breach;
- stress loss;
- HHI blocker;
- optimizer infeasible;
- survival floor conflict;
- warnings and blockers.

Результат:

```text
unsafe payout -> reject -> contingency plan
```

## Основные страницы

| Route | Что показывает |
|---|---|
| `/` | redirect на `/landing` |
| `/landing` | product landing: проблема, ценность, proof points |
| `/demo` | интерактивная карта, New York incident, ML analysis flow |
| `/liquidity-control-tower` | operational map cockpit с layer stack |
| `/judge` | one-page proof для жюри: функции, метрики, value |
| `/technical` | math core, architecture map, OpenAPI endpoints |
| `/functions/[functionKey]` | drilldown по forecast/stress/hhi/optimizer/governance/contingency |

## Backend API

Frontend ходит через Next.js proxy route:

```text
/api/backend/*
```

Если `BACKEND_URL` не задан, Vercel отдаёт deterministic artifacts из `backend/artifacts`.

Если `BACKEND_URL` задан, frontend проксирует запросы в live FastAPI backend.

Доступные endpoints:

| Endpoint | Назначение |
|---|---|
| `/health` | health check |
| `/api/demo/metadata` | metadata для demo |
| `/api/demo/snapshot` | единый payload cockpit |
| `/api/forecast/run` | forecast corridor |
| `/api/stress/run` | stress scenarios, HHI, ES99 |
| `/api/optimizer/rebalance` | MIP optimizer |
| `/api/recommendation/approve` | mock approval receipt |
| `/api/explainability/summary` | root cause and evidence |
| `/api/roi/summary` | CFO / ROI summary |
| `/api/contingency/plan` | prefund, throttle, fallback actions |
| `/api/ai-council/review` | mock/OpenAI/Anthropic/mixed governance review |

## Основные файлы

### Frontend

- `app/landing/page.tsx` — product landing.
- `app/demo/page.tsx` — main map demo.
- `app/liquidity-control-tower/page.tsx` — operational map cockpit.
- `app/judge/page.tsx` — judge proof page.
- `app/technical/page.tsx` — math and API proof page.
- `app/functions/[functionKey]/page.tsx` — function drilldown.
- `components/liquidity/WorldLiquidityMap.tsx` — карта, сценарии, layers, incident, ML flow.
- `components/liquidity/IncidentAnalysisDemo.tsx` — analysis panel, modals, ticket, model report, function proof.
- `components/liquidity/JudgeView.tsx` — proof table для жюри.
- `components/liquidity/TechnicalView.tsx` — математический аппарат и OpenAPI.
- `components/liquidity/FunctionWorkbench.tsx` — function-by-function cockpit.
- `components/liquidity/FunctionDetailView.tsx` — детальный разбор функции.
- `components/liquidity/FormulaCard.tsx` — карточки формул.
- `app/globals.css` — визуальный слой карты, cockpit, modals, math blocks, responsive layout.

### Logic / Demo Data

- `lib/liquidity-ml-ensemble.ts` — New York incident, deterministic ML ensemble, Deep Analytics functions.
- `lib/golden-incident.ts` — Golden Incident для judge/technical/functions.
- `lib/function-modules.ts` — forecast/stress/hhi/optimizer/governance/contingency modules.
- `lib/backend/*` — frontend client, types, mappers, formatters, endpoints.
- `backend/artifacts/demo_snapshot.json` — deterministic snapshot.
- `backend/artifacts/demo_metadata.json` — demo metadata.
- `backend/artifacts/openapi.json` — exported OpenAPI contract.
- `backend/artifacts/ui_handoff_summary.json` — UI handoff summary.

### Python Backend

- `backend/liquidity_control_tower/features.py` — feature engineering.
- `backend/liquidity_control_tower/forecasting.py` — quantile forecast ensemble.
- `backend/liquidity_control_tower/stress.py` — stress scenarios, ES99.
- `backend/liquidity_control_tower/risk.py` — HHI and risk status.
- `backend/liquidity_control_tower/optimizer.py` — PuLP MIP optimizer.
- `backend/liquidity_control_tower/governance.py` — approval gate.
- `backend/liquidity_control_tower/contingency.py` — contingency actions.
- `backend/liquidity_control_tower/explainability.py` — root cause and formulas.
- `backend/liquidity_control_tower/roi.py` — business value summary.
- `backend/liquidity_control_tower/ai_council.py` — mock/OpenAI/Anthropic review layer.
- `backend/liquidity_control_tower/api.py` — FastAPI app.

## Запуск локально

```bash
npm install
npm run dev
```

Локально открыть:

```text
http://localhost:3000/landing
http://localhost:3000/demo
http://localhost:3000/liquidity-control-tower
http://localhost:3000/judge
http://localhost:3000/technical
```

Деплой:

```text
https://trueavail.vercel.app/landing
https://trueavail.vercel.app/demo
https://trueavail.vercel.app/liquidity-control-tower
https://trueavail.vercel.app/judge
https://trueavail.vercel.app/technical
```

Для Python backend:

```bash
python3 -m pip install -r requirements.txt
npm run backend:dev
```

## Проверка

```bash
npm run lint
npm run build
npm run backend:test
```

Полная deterministic проверка backend demo path:

```bash
npm run backend:verify
```

Она прогоняет:

- forecast demo;
- optimizer demo;
- backend demo snapshot;
- AI Council в mock mode;
- OpenAPI/UI contract export;
- backend tests.

## Деплой на Vercel

Проект готов к Vercel как обычное Next.js приложение. Важно: приложение лежит во вложенной папке `liquidity-control-tower`, поэтому при импорте GitHub repo в Vercel нужно выбрать именно эту папку как Root Directory. Если деплоишь через CLI, запускай `vercel` из этой папки.

```bash
npm ci
npm run build
```

Рекомендуемые настройки:

| Setting | Value |
|---|---|
| Root Directory | `liquidity-control-tower` |
| Framework Preset | Next.js |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | оставить пустым |
| Node.js | `>=20.9.0` |

Environment variables:

| Variable | Нужно ли |
|---|---|
| `BACKEND_URL` | опционально, только если есть внешний FastAPI backend |
| `NEXT_PUBLIC_BLOCKCHAIN_SPLINE_SCENE` | опционально, по умолчанию используется встроенная Spline-сцена |
| `TREASURY_LEDGER_DATA_DIR` | опционально, локальный override для demo ledger; на Vercel пустым |
| `OPENAI_API_KEY` | опционально, только для live AI Council |
| `ANTHROPIC_API_KEY` | опционально, только для live AI Council |

Без `BACKEND_URL` Vercel использует safe static mock через `backend/artifacts`.

Transfer demo хранит временное состояние ledger в JSON. Локально это `.data/treasury-ledger.json`, а на Vercel автоматически используется writable scratch space функции. Это подходит для demo-сессии, но не является persistent storage; для production нужно заменить store на Vercel Postgres/KV или внешний ledger API.

## Ограничение безопасности

Demo не выполняет реальные платежи, банковские переводы, treasury operations или внешние approvals.

ML, tickets, recommendations, AI Council и approval receipts работают как безопасные deterministic mocks, чтобы показать продуктовую логику, математический аппарат и governance flow без операционного риска.
````
