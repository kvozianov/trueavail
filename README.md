# Liquidity Control Tower

Кликабельное демо treasury/fintech продукта: система показывает инцидент ликвидности на карте, запускает ML-ансамбль, объясняет причину риска и предлагает безопасные действия.

## Что показать жюри

1. Запустить проект: `npm run dev`.
2. Открыть demo: `http://localhost:3000/demo`.
   Страница `http://localhost:3000/liquidity-control-tower` показывает ту же самую карту.
3. На карте сразу виден красный инцидент `New York usable liquidity breach`.
4. Нажать `Run ML analysis`.
5. Дождаться pipeline: карта, координаты, телеметрия, anomaly detection, risk score, ensemble aggregation, recommendations.
6. После результата открыть:
   - `View models` — голоса моделей ансамбля.
   - `Open details` — причина и evidence.
   - `Create ticket` — mock ticket flow.
   - `Accept recommendation` — принятие рекомендации.
   - `Close incident` — confirmation и закрытие инцидента.
   - `Deep Analytics For Jury` — все функции из документа.

## Главный сценарий

`Map error detected -> Run ML analysis -> ML ensemble -> Verdict -> Recommendations -> Ticket / Accept / Close`

Демо deterministic: без реального ML API и без реальных банковских действий. Все результаты локальные, но выглядят как production flow: confidence, risk score, model votes, evidence, recommendations и audit-like actions.

## Как мы нашли и показали функции

Источник: `/Users/kirill/Downloads/Liquidity_Control_Tower_Functions.docx`.

Функции из документа были перенесены в `lib/liquidity-ml-ensemble.ts` как `deepAnalyticsFunctions`. В интерфейсе они показаны в блоке `Deep Analytics For Jury`: каждая карточка кликабельна и открывает proof-modal с метрикой, сигналом, смыслом для жюри и endpoint/artifact, через который функция проверяется.

| # | Функция | Как показана в демо | Где искать / проверять |
|---|---|---|---|
| 1 | Liquidity Forecast | p05 forecast падает ниже survival floor | `/api/forecast/run` |
| 2 | ML Forecast Ensemble | несколько моделей дают общий confidence | `/api/forecast/run`, `View models` |
| 3 | Feature Engineering | календарь, лаги, EWMA, rolling stats, settlement flags | `backend/liquidity_control_tower/features.py` |
| 4 | Anomaly Filtering | красный маркер, MAD z-score 5.8 | `/api/forecast/run` |
| 5 | Known Events | payroll / credit repayment объясняют риск | `/api/forecast/run`, calendar panel |
| 6 | Risk Status | статус red/high risk выводится из прогноза | incident status badge |
| 7 | HHI Concentration | концентрация банка `HHI 0.312 > 0.25` | `/api/stress/run` |
| 8 | CCRI Bank Rating | downgrade банка влияет на exposure limits | `/api/optimizer/rebalance` |
| 9 | MIP Liquidity Optimizer | показывает, что safe route невозможен | `/api/optimizer/rebalance` |
| 10 | Survival Floor Constraints | нельзя спасать одну зону, ломая survival floor | `/api/optimizer/rebalance` |
| 11 | Stress Testing | TARGET2 / bank-run сценарии | `/api/stress/run` |
| 12 | Expected Shortfall 99% | tail loss `ES99 USD 1.84M` | `/api/stress/run` |
| 13 | Governance Gate | auto-approval blocked до подтверждения cover | `/api/recommendation/approve` |
| 14 | Contingency Plan | prefund, throttle, fallback rail | `/api/contingency/plan` |
| 15 | Recommendation Approval | пользователь принимает рекомендацию | `Accept recommendation` |
| 16 | Explainability | root cause, evidence, detected features | `/api/explainability/summary`, `Open details` |
| 17 | ROI Summary | avoided gap и tail loss для CFO story | `/api/roi/summary` |
| 18 | AI Council | 5 advisor critiques поверх фактов | `/api/ai-council/review` |
| 19 | OpenAI + Claude Routing | mock/openai/anthropic/mixed режимы | `/api/ai-council/review` |
| 20 | Demo Snapshot | единый payload для UI | `/api/demo/snapshot` |
| 21 | OpenAPI Contract | контракт backend для интеграции | `backend/artifacts/openapi.json` |
| 22 | UI Handoff Artifacts | snapshot, metadata, OpenAPI summary | `backend/artifacts/ui_handoff_summary.json` |
| 23 | Backend Verify | единая проверка демо | `npm run backend:verify` |

## Основные файлы

- `components/liquidity/WorldLiquidityMap.tsx` — карта, incident state, ML flow, ticket/accept/close actions.
- `components/liquidity/IncidentAnalysisDemo.tsx` — панели анализа, модалки, ticket form, model report, function proof.
- `lib/liquidity-ml-ensemble.ts` — mock incident, deterministic ensemble, функции из DOCX, report builder.
- `app/globals.css` — визуальный слой карты, инцидента, progress UI, модалок и mobile layout.

## Проверка

```bash
npm run lint
npm run build
npm run backend:test
```

Последняя проверка: lint OK, build OK, backend tests OK — 34 tests.

## Деплой на Vercel

Проект готов к Vercel как обычное Next.js приложение.

```bash
npm install
npm run lint
npm run build
```

На Vercel можно деплоить без Python backend: route `/api/backend/*` автоматически отдаёт deterministic demo artifacts из `backend/artifacts`. Если нужен живой FastAPI backend, добавь переменную окружения `BACKEND_URL=https://your-backend.example.com` в Vercel Project Settings.

Рекомендуемые настройки:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: оставить пустым
- Environment Variables: `BACKEND_URL` только если есть внешний backend

## Ограничение

ML, тикеты и отчёты в демо работают как безопасные local mocks. Реальные платежи, банковские операции и внешние ML/LLM вызовы не выполняются.
