# TASKS.md — MVP Predictive Liquidity Control Tower

Цель MVP: за 3-5 минут показать жюри, что продукт находит будущий cash gap, объясняет причину, предлагает оптимальное действие и показывает экономический эффект для CFO / Head of Treasury.

Обновление этого плана: базовый deterministic MVP сохраняется, но усиливается конкретной математикой и алгоритмами:

- pandas feature pipeline;
- циклическое кодирование времени;
- EWMA;
- MAD-based anomaly filtering;
- LightGBM quantile forecasting;
- PuLP MIP optimizer;
- HHI concentration risk;
- CCRI mock bank risk scoring;
- stress testing на dashboard.

Технический стек:

- Frontend: Next.js, Vercel, dashboard widgets.
- Backend & ML: Python, FastAPI, pandas, LightGBM, PuLP.
- Данные MVP: synthetic CSV/JSON по 3-5 банкам, счетам, валютам, платежным рельсам и моковым стресс-сценариям.

Главный демо-сценарий:

1. У компании "на бумаге" денег достаточно.
2. Система пересчитывает именно usable liquidity с учетом settlement delays, holidays, cut-offs, валют и банков.
3. Backend строит прогнозный коридор балансов на горизонте 7-14 дней: 5% / 50% / 95%.
4. Через 36 часов появляется риск cash gap в EUR.
5. Система объясняет причину: задержка card clearing + банковский holiday + крупный payout.
6. Система считает HHI и показывает concentration risk, если портфель слишком сконцентрирован.
7. Пользователь запускает stress scenario: `Bank Run` или `TARGET2 Outage`.
8. Пользователь нажимает `Downgrade Bank Rating`, CCRI банка падает.
9. PuLP MIP-оптимизатор предлагает ребалансировку до cut-off.
10. Пользователь нажимает `Approve Recommendation`.
11. Risk status меняется с Red на Green, показывается avoided overdraft и released idle reserve.

---

## Phase 0: Scope Lock

Статус: обязателен до начала кода.

Цель: зафиксировать, что MVP продает одну сильную историю, а не превращается в набор разрозненных финансовых графиков.

### Задачи

- [ ] Зафиксировать название продукта: `Liquidity Control Tower`.
- [ ] Зафиксировать ICP: fintech / PSP / neobank с TPV от `$50-100M+` в месяц.
- [ ] Зафиксировать buyer persona:
  - CFO;
  - Head of Treasury;
  - Risk / Finance Operations lead.
- [ ] Зафиксировать главный экономический результат:
  - overdraft incidents: `-75-90%`;
  - manual treasury work: `-50-60%`;
  - forecast lead time: `24-48h`;
  - frozen reserve: `$15M -> $8-9M`;
  - released liquidity: `$6-7M`.
- [ ] Выбрать один основной демо-кейс: EUR liquidity gap через 36 часов.
- [ ] Зафиксировать математический тезис MVP:
  - прогнозируем диапазон будущих балансов;
  - проверяем ограничения `Balance_b >= B_min_b`;
  - минимизируем стоимость ребалансировки;
  - показываем концентрацию через HHI.
- [ ] Запретить в MVP:
  - реальные банковские API;
  - реальные платежи;
  - production ML platform;
  - сложный compliance/RBAC;
  - интеграции с ERP/TMS;
  - автопереводы без human approval.

### Результат

- Короткий текст на 5-7 предложений: что делает продукт, для кого и какой эффект дает.
- Один утвержденный demo story, который команда больше не меняет.
- Один математический narrative для жюри: `Forecast -> Risk Constraint -> Optimization -> Stress Test`.

---

## Phase 1: Data & ML

Цель: создать synthetic data foundation, deterministic liquidity logic и ML-прогнозный слой, который можно объяснить формулами.

---

### 1.1 Demo Data Foundation

Статус: done / сохранить и расширить.

Цель: создать синтетические данные, на которых прототип выглядит как реальный fintech treasury cockpit.

### Задачи

- [x] Создать файл с synthetic balances:
  - bank account;
  - currency;
  - current book balance;
  - settled balance;
  - minimum required buffer;
  - idle funds.
  - Математическая суть: каждый банк имеет `Balance_b`, `SettledBalance_b`, `B_min_b`, `Idle_b = max(0, Balance_b - B_min_b)`.
- [x] Создать файл с incoming / outgoing transactions:
  - date;
  - amount;
  - currency;
  - rail: SEPA, SWIFT, Card Clearing, Local Bank Transfer;
  - direction: inflow / outflow;
  - status: pending / settled;
  - source / destination bank;
  - business reason: payroll, merchant payout, card settlement, partner payment.
  - Математическая суть: временной ряд `y_t` строится как net cash flow `inflows_t - outflows_t`.
- [x] Создать settlement rules:
  - SEPA: `T+1`;
  - SWIFT: `T+2`;
  - Card Clearing: `T+2/T+3`;
  - Local Bank Transfer: `T+0/T+1`;
  - holidays move settlement to next business day.
  - Математическая суть: дата доступности денег равна `transaction_time + rail_delay`, затем переносится на следующий business day.
- [x] Создать holiday / cut-off calendar:
  - weekend;
  - 1-2 fake bank holidays;
  - cut-off time for transfer.
- [x] Подготовить данные так, чтобы один cash gap возникал точно и стабильно.
- [x] Расширить synthetic dataset до 3-5 моковых банков: `Bank A`, `Bank B`, `Bank C`, опционально `Bank D/E`.
  - Математическая суть: каждому банку добавить `CCRI_b`, `MaxExposure_b`, cost transfer matrix и `B_min_b`.
- [x] Добавить cost transfer matrix между банками.
  - Математическая суть: `cost_i_j` используется MIP-оптимизатором для минимизации стоимости переводов.

### Результат

- `balances.json` или `balances.csv`.
- `transactions.json` или `transactions.csv`.
- `settlement_rules.json`.
- `calendar.json`.
- `bank_risk_scores.json`.
- `transfer_costs.json`.
- В данных есть один понятный опасный момент: EUR gap in 36h.

### Acceptance Criteria

- [x] Данные можно загрузить без ручного редактирования.
- [x] Gap появляется каждый раз при запуске демо.
- [x] Причина gap понятна из данных, а не выглядит случайной.
- [x] Есть данные для HHI, CCRI и PuLP-ребалансировки.

---

### 1.2 Core Logic Engine

Статус: done / сохранить как deterministic baseline.

Цель: сделать простую, объяснимую логику, которая продает продукт лучше, чем "магический AI".

### Задачи

- [x] Реализовать расчет settlement date:
  - transaction date + rail delay;
  - перенос с holiday/weekend на следующий рабочий день.
  - Математическая суть: cash flow попадает в usable liquidity только после settlement date.
- [x] Реализовать расчет usable liquidity:

```text
usable liquidity =
  settled balance
  + expected settled inflows
  - expected outflows
  - required buffer
```

- [x] Построить forecast на 7-14 дней по валютам и банкам.
- [x] Реализовать cash gap detection:
  - если usable liquidity < 0 или ниже buffer threshold.
  - Математическая суть: риск возникает, когда `Balance_b,c,t < B_min_b,c`.
- [x] Реализовать severity:
  - Green: no risk;
  - Yellow: buffer pressure;
  - Red: cash gap / overdraft risk.
- [x] Реализовать root cause explanation:
  - какие 2-3 события привели к gap;
  - rail delay;
  - holiday;
  - крупный payout;
  - недостаточный buffer в конкретном банке/валюте.
- [x] Реализовать deterministic recommendation engine:
  - transfer from idle account;
  - transfer amount;
  - source bank;
  - destination bank;
  - currency;
  - deadline before cut-off;
  - estimated impact.
- [x] Подготовить deterministic baseline как fallback, если ML endpoint недоступен.
  - Математическая суть: baseline forecast должен возвращать тот же JSON shape, что и LightGBM quantile forecast.

### Результат

- [x] Функция `runForecast()` / `getLiquiditySnapshot()`.
- [x] Функция `detectCashGaps()`.
- [x] Функция `explainGap()`.
- [x] Функция `generateRecommendation()`.
- [x] Функция `buildForecastResponse()` с единым контрактом для deterministic и ML forecast.

### Acceptance Criteria

- [x] Backend для `Run Forecast` создает прогноз, alert и recommendation.
- [x] Логика работает без ручных правок во время демо.
- [x] Каждый результат можно объяснить жюри простыми словами.
- [x] Результат можно объяснить также формулой: settlement date, usable liquidity, `B_min`.

---

### 1.3 Data Pipeline & Feature Engineering

Статус: must-have для математического MVP.

Цель: подготовить ML-ready признаки для прогнозирования балансов и cash flows.

### Задачи

- [x] Реализовать backend loader на pandas.
  - Математическая суть: все источники приводятся к единой гранулярности `bank_id, account_id, currency, timestamp, amount, direction`.
- [x] Реализовать циклическое кодирование часа транзакции.
  - Математическая суть: используем тригонометрию, чтобы 23:00 и 00:00 были близкими точками: `hour_sin = sin(2*pi*h/24)`, `hour_cos = cos(2*pi*h/24)`.
- [x] Добавить календарные признаки:
  - day of week;
  - month end;
  - holiday flag;
  - payroll day;
  - merchant payout cycle.
  - Математическая суть: модель получает сезонность и known future events как объясняющие переменные.
- [x] Написать расчет EWMA для исторических объемов.
  - Математическая суть: сглаживаем шум и усиливаем свежие наблюдения по формуле `EWMA_t = alpha*y_t + (1-alpha)*EWMA_{t-1}`.
- [x] Реализовать rolling net flow и rolling volatility.
  - Математическая суть: считаем локальную тенденцию и изменчивость по окну `W`.
- [x] Реализовать фильтрацию аномальных транзакций через MAD-based Z-Score.
  - Математическая суть: `z_t = |y_t - median_W| / (1.4826*MAD_W)`; транзакции с `z_t > 4` помечаются как anomalies или исключаются из обучения.
- [x] Сохранять anomaly flags для explainability.
  - Математическая суть: anomaly не всегда удаляется из бизнес-логики; она может быть причиной alert.
- [x] Добавить unit tests для feature engineering.
  - Математическая суть: проверяем периодичность `hour_sin/hour_cos`, рекуррентность EWMA и корректную фильтрацию выбросов.

### Результат

- `features.py`.
- `build_features(transactions, balances, calendar)`.
- `filter_anomalies_mad_zscore(series, window, threshold=4)`.
- `add_cyclical_time_features(df)`.
- `add_ewma_features(df, alpha)`.

### Acceptance Criteria

- [x] Feature matrix строится одной командой.
- [x] `hour_sin/hour_cos`, EWMA и MAD Z-Score реально используются в pipeline.
- [x] Нет ручного удаления выбросов.
- [x] Фичи можно показать на architecture slide.

---

### 1.4 LightGBM Quantile Forecasting

Статус: must-have для Data Science narrative.

Цель: перейти от одного deterministic forecast к прогнозному коридору балансов.

### Задачи

- [x] Подготовить training matrix для LightGBM.
  - Математическая суть: target `y_t` — будущий баланс или net cash flow на горизонте `t+h`; features — calendar, EWMA, lag values, rolling stats, settlement flags.
- [x] Настроить LightGBM с quantile objective для `q=0.05`, `q=0.50`, `q=0.95`.
  - Математическая суть: модель минимизирует Pinball Loss и возвращает прогнозный коридор: pessimistic 5%, median 50%, optimistic 95%.
- [x] Обучать три отдельные quantile models или один wrapper над тремя конфигурациями.
  - Математическая суть: для каждого квантиля оптимизируется асимметричная ошибка `L_q(y, y_hat) = max(q*(y-y_hat), (q-1)*(y-y_hat))`.
- [x] Реализовать endpoint `POST /api/forecast/run`.
  - Математическая суть: API возвращает `balance_p05`, `balance_p50`, `balance_p95`, risk flag и expected breach time.
- [x] Добавить консервативную risk logic.
  - Математическая суть: риск возникает, если `balance_p05(t,b,c) < B_min_b,c`; p05 используется как downside scenario.
- [x] Рассчитать severity:
  - Green: `p05 >= B_min`;
  - Yellow: `p50 >= B_min > p05`;
  - Red: `p50 < B_min`.
- [x] Добавить backtest на synthetic history.
  - Математическая суть: rolling-origin validation без leakage; будущее не попадает в прошлое.
- [x] Добавить demo metrics:
  - WAPE по медиане;
  - coverage для `[p05, p95]`;
  - alert lead time;
  - model / logic version.

### Результат

- `train_quantile_models.py`.
- `forecast_service.py`.
- `POST /api/forecast/run`.
- JSON с прогнозным коридором 5% / 50% / 95%.

### Acceptance Criteria

- [x] Backend строит forecast band по банкам и валютам.
- [x] Прогноз не является fake ML: есть LightGBM objective и quantile outputs.
- [x] Модель может работать на synthetic data.
- [x] При нехватке времени deterministic forecast остается fallback.

---

### 1.5 Predictive Cash Flow Architecture

Статус: roadmap для реализации после базового deterministic forecast, но оставить в TASKS.md для защиты архитектуры.

Цель: показать путь от MVP к production forecasting.

### Архитектурные слои

- [x] Слой A — Account / Currency Forecast:
  - прогноз по каждому банковскому счету;
  - прогноз по каждой валюте;
  - горизонт 7-14 дней;
  - в MVP: synthetic cash flows + settlement rules;
  - после MVP: LightGBM / MLForecast / Darts.
- [x] Слой B — Portfolio Forecast:
  - агрегировать прогноз по валютам, счетам и payment rails;
  - показать общую картину компании;
  - в MVP: простой reduce по forecast points;
  - после MVP: Temporal Fusion Transformer или другой time-series model.
- [x] Слой C — Forecast Reconciler:
  - сверять суммы account-level forecast с portfolio-level forecast;
  - гарантировать, что account -> currency -> rail -> total сходится;
  - в MVP: проверка totals и простая корректировка округлений;
  - после MVP: hierarchical forecasting reconciliation.
- [x] Слой D — Online Corrector:
  - сравнивать forecast с фактическими событиями;
  - если real cash flow сильно расходится с планом, поднять alert;
  - в MVP: mock deviation check;
  - после MVP: incremental learning / River-style corrector.

### Аномалии и задержки

- [ ] Добавить known events calendar:
  - payroll days;
  - Black Friday / New Year;
  - merchant payout cycles;
  - bank holidays.
- [x] Добавить anomaly flags:
  - unusually large transfer;
  - unexpected missing inflow;
  - payout spike above normal demo threshold.
- [x] Добавить bank delay logic:
  - expected settlement date;
  - actual settlement date;
  - SLA breached / not breached;
  - probable delay reason.
- [ ] Связать anomaly flags с MAD-based Z-Score.
  - Математическая суть: anomaly flag появляется не из ручного порога, а из устойчивой статистики по rolling window.

### Open-source stack после MVP

Не устанавливать эти библиотеки в MVP без необходимости. Использовать как roadmap для презентации и будущей реализации.

- [ ] Darts:
  - единый интерфейс для time-series models;
  - probabilistic intervals.
- [ ] Nixtla / MLForecast / HierarchicalForecast:
  - массовый per-account forecast;
  - reconciliation по иерархии.
- [ ] PyTorch Forecasting:
  - Temporal Fusion Transformer для portfolio-level слоя.
- [ ] River:
  - online correction по свежим фактическим событиям.
- [ ] MLflow + DVC:
  - версии моделей и данных.
- [ ] Evidently AI:
  - drift monitoring.

### Маленький порядок реализации

1. `forecast`: построить daily forecast points по счетам.
2. `risk`: добавить cash gap detection и severity.
3. `features`: добавить cyclical time, EWMA, MAD Z-Score.
4. `bands`: добавить p05 / p50 / p95 через LightGBM quantile.
5. `portfolio`: агрегировать forecast по валютам и portfolio.
6. `reconcile`: проверить, что totals сходятся.
7. `anomalies`: добавить flags для задержек и крупных outflows.
8. `metrics`: добавить простые demo metrics.
9. `snapshot`: вернуть все это через API одним понятным JSON.

---

## Phase 2: Optimizer

Цель: реализовать ядро принятия решений: оптимальный перевод между счетами, контроль концентрации и реакция на падение рейтинга банка.

---

### 2.1 MIP Liquidity Optimizer With PuLP

Статус: must-have для математической защиты.

### Задачи

- [x] Описать 3-5 моковых счетов и матрицу комиссий переводов.
  - Математическая суть: переменная решения `x_i_j >= 0` означает сумму перевода из банка `i` в банк `j`; `cost_i_j` — стоимость такого перевода.
- [x] Реализовать PuLP-модель минимизации transfer costs.
  - Математическая суть: минимизируем `sum_i sum_j cost_i_j * x_i_j`.
- [x] Добавить ограничения сохранения баланса для каждого банка.
  - Математическая суть: `Balance_b + inflow_transfers_b - outflow_transfers_b >= B_min_b`.
- [x] Добавить ограничение доступной ликвидности источника.
  - Математическая суть: `sum_j x_b_j <= max(0, Balance_b - B_min_b)`; нельзя вывести больше свободного остатка.
- [x] Добавить binary variable для включения / выключения маршрута перевода.
  - Математическая суть: `x_i_j <= M * route_used_i_j`; это превращает задачу в MIP и позволяет учитывать fixed transfer fee.
- [x] Добавить fixed fee в objective.
  - Математическая суть: минимизируем `sum cost_i_j*x_i_j + sum fixed_fee_i_j*route_used_i_j`.
- [x] Вернуть оптимальный transfer plan.
  - Математическая суть: solver возвращает набор путей `source -> destination -> amount`, который закрывает дефицит с минимальной стоимостью.
- [x] Реализовать endpoint `POST /api/optimizer/rebalance`.
  - Математическая суть: frontend отправляет текущие балансы, `B_min`, risk flags и получает оптимальную рекомендацию.

### Результат

- `optimizer.py`.
- `solve_liquidity_rebalance(balances, limits, transfer_costs)`.
- `POST /api/optimizer/rebalance`.
- Response:
  - solver status;
  - selected routes;
  - transfer amounts;
  - total cost;
  - post-transfer balances;
  - infeasible reason, если решения нет.

### Acceptance Criteria

- [x] Оптимизатор решает задачу переводов между 3-5 счетами через PuLP.
- [x] Ни один итоговый баланс после rebalance не ниже `B_min`, если задача feasible.
- [x] Если free liquidity недостаточно, solver возвращает `infeasible`, а UI показывает Red alert.
- [x] Рекомендация содержит сумму, источник, получателя, cost и expected post-transfer balances.

---

### 2.2 HHI Concentration Index

Статус: must-have.

### Задачи

- [x] Реализовать функцию расчета HHI по балансам банков.
  - Математическая суть: `HHI = sum_b (Balance_b / sum_b' Balance_b')^2`; чем выше индекс, тем сильнее концентрация средств.
- [x] Добавить threshold alert при `HHI > 0.25`.
  - Математическая суть: порог `0.25` означает, что портфель слишком концентрирован и нужен rebalance.
- [x] Показывать вклад каждого банка в HHI.
  - Математическая суть: вклад банка равен квадрату его доли `share_b^2`, поэтому один крупный баланс резко повышает риск.
- [x] Использовать HHI как триггер для recommendation.
  - Математическая суть: даже если cash gap нет, высокая концентрация может требовать перевода части средств.

### Результат

- `calculate_hhi(balances_by_bank)`.
- `concentration_alert`.
- `bank_contribution_to_hhi`.

### Acceptance Criteria

- [x] HHI считается по формуле, а не моковым статусом.
- [x] При `HHI > 0.25` появляется concentration warning.
- [x] Dashboard может объяснить, какой банк создает концентрацию.

---

### 2.3 Mock CCRI Bank Risk Scoring

Статус: must-have для risk-management demo.

### Задачи

- [x] Создать mock CCRI score для 3 банков.
  - Математическая суть: `CCRI_b` — синтетический risk score банка на шкале 0-100, где низкий score повышает ограничение на максимальную экспозицию.
- [x] Создать mapping CCRI -> Max Exposure.
  - Математическая суть: например, `MaxExposure_b = TotalCash * exposure_limit(CCRI_b)`.
- [x] Реализовать кнопку / скрипт `Downgrade Bank Rating`.
  - Математическая суть: после downgrade банк получает lower CCRI и lower max exposure limit.
- [x] Связать downgrade с MIP-оптимизатором.
  - Математическая суть: новое ограничение `Balance_b <= MaxExposure_b(CCRI_b)` заставляет solver вывести часть средств из рискованного банка.
- [x] Добавить audit event для действия downgrade.
  - Математическая суть: фиксируем входные балансы, старый/новый CCRI и transfer plan, чтобы решение было воспроизводимым.

### Результат

- `bank_risk_scores.json`.
- `downgradeBankRating(bankId)`.
- `max_exposure_by_ccri(score)`.
- Optimizer trigger after downgrade.

### Acceptance Criteria

- [x] Downgrade банка автоматически запускает расчет вывода средств.
- [x] После downgrade система показывает, сколько средств надо вывести и куда.
- [x] Решение объясняется через новое exposure constraint.

---

### 2.4 Optimizer Tests

### Задачи

- [x] Написать тест, где один банк падает ниже `B_min`.
  - Математическая суть: PuLP должен найти перевод с минимальным cost, который возвращает банк выше лимита.
- [x] Написать тест на невозможный rebalance.
  - Математическая суть: если суммарной свободной ликвидности недостаточно, solver должен вернуть `infeasible`.
- [x] Написать тест на HHI alert.
  - Математическая суть: при концентрации средств в одном банке `HHI > 0.25` должен появиться concentration warning.
- [x] Написать тест на CCRI downgrade.
  - Математическая суть: снижение `CCRI_b` уменьшает `MaxExposure_b`, и solver выводит лишний баланс.

---

## Phase 3: Dashboard Next.js

Цель: показать не таблицу, а cockpit для Head of Treasury: риск, прогноз, стресс-сценарии и рекомендации понятны за 10 секунд.

---

### 3.0 Backend Contracts For External UI

Статус: done.

UI будет делаться отдельным сервисом/дизайном, поэтому текущий этап закрывает backend-контракты, которые будущий dashboard будет дергать.

- [x] Реализовать `POST /api/stress/run`.
  - Математическая суть: `Balance_after(b,c) = Balance_before(b,c) * stress_multiplier(s,b,c)`.
- [x] Реализовать сценарии `Bank Run` и `TARGET2 Outage`.
  - Математическая суть: backend применяет жестко заданные stress coefficients по банку и валюте.
- [x] Реализовать расчет `Expected Shortfall 99%`.
  - Математическая суть: `ES_99 = mean(losses in the worst 1% tail)`.
- [x] После stress пересчитывать HHI и accounts below `B_min`.
  - Математическая суть: stressed balances становятся входом для `HHI` и buffer constraints.
- [x] После stress опционально запускать optimizer.
  - Математическая суть: stressed balances передаются в PuLP MIP как новые `Balance_b`.
- [x] Реализовать `POST /api/recommendation/approve`.
  - Математическая суть: approval применяет `source_balance -= x_i_j`, `destination_balance += x_i_j`.
- [x] Реализовать `GET /api/demo/snapshot`.
  - Математическая суть: единый payload объединяет forecast corridor, stress results и optimizer recommendation.
- [x] Реализовать `POST /api/explainability/summary`.
  - Математическая суть: backend возвращает root causes, timeline, formula cards и data-quality notes.
- [x] Реализовать `POST /api/roi/summary`.
  - Математическая суть: backend считает `avoided_gap`, `released_reserve`, `optimizer_cost` и ES 99% для CFO блока.
- [x] Реализовать `POST /api/ai-council/review`.
  - Математическая суть: 5 независимых AI advisors интерпретируют forecast, stress, HHI, ES99 и PuLP output; chairman собирает verdict.
- [x] Добавить OpenAI live mode и deterministic mock fallback.
  - Математическая суть: LLM не заменяет расчет, а объясняет и критикует уже рассчитанные математические факты.
- [ ] Добавить Claude / Anthropic как optional second LLM provider для AI Council.
  - Математическая суть: multi-model council сравнивает независимые выводы OpenAI и Claude поверх одного и того же facts payload.
- [ ] Реализовать provider routing для AI Council: `openai`, `anthropic`, `mock`, `mixed`.
  - Математическая суть: разные advisors могут получать один и тот же `forecast + stress + optimizer + ROI` контекст, но отвечать через разные LLM-провайдеры.
- [ ] Реализовать mixed council demo.
  - Математическая суть: например, `Quant/Data Scientist` и `Chairman` через OpenAI, `Contrarian Risk Officer` и `CFO Lens` через Claude, fallback на mock при отсутствии ключа.
- [ ] Добавить env config без хранения секретов: `OPENAI_API_KEY`, `OPENAI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`.
  - Математическая суть: ключи не попадают в репозиторий; backend выбирает live provider только из environment variables.
- [x] Покрыть backend flow тестами.
  - Математическая суть: проверены ES99, stress coefficients, optimizer-after-stress, approval audit, explainability, ROI, AI Council и demo snapshot.

---

### 3.1 Control Tower UI

Статус: must-have.

### Главный экран

- [ ] Верхняя панель KPI:
  - Total Cash;
  - Usable Liquidity;
  - At-Risk Amount;
  - Idle Reserve;
  - Forecast Horizon;
  - HHI;
  - ES 99%;
  - Risk Status.
  - Математическая суть: KPI считаются из forecast, optimizer output и stress-adjusted balances.
- [ ] Forecast chart:
  - линия usable liquidity;
  - forecast corridor `p05 / p50 / p95`;
  - minimum buffer `B_min`;
  - красная зона cash gap;
  - отметка "36h risk".
  - Математическая суть: пересечение `p05` или `p50` с `B_min` превращается в Yellow / Red alert.
- [ ] Currency / bank breakdown:
  - EUR, USD, GBP;
  - Bank A, Bank B, Bank C.
  - Математическая суть: доля каждого банка `Balance_b / TotalBalance` объясняет HHI и concentration risk.
- [ ] Alert panel:
  - severity;
  - time to gap;
  - affected currency;
  - affected bank;
  - HHI warning;
  - CCRI warning;
  - business impact.
- [ ] Recommendation card:
  - proposed action;
  - amount;
  - source;
  - destination;
  - deadline;
  - transfer cost;
  - expected result.
- [ ] Buttons:
  - `Run Forecast`;
  - `View Explanation`;
  - `Run Optimizer`;
  - `Approve Recommendation`;
  - `Simulate After`.

### Результат

- Один интерактивный dashboard, который можно показать на защите.

### Acceptance Criteria

- [ ] Жюри за 10 секунд понимает: где риск, когда он случится и что делать.
- [ ] Нет перегруза таблицами.
- [ ] Главный экран выглядит как fintech treasury tool, а не учебный калькулятор.
- [ ] На dashboard видны forecast band, `B_min`, HHI, ES 99% и risk status.

---

### 3.2 Stress Testing Widget

Статус: must-have.

### Задачи

- [ ] Создать виджет `Stress Testing`.
  - Математическая суть: сценарии умножают текущие балансы на фиксированные stress coefficients, имитируя Monte Carlo logic для демо.
- [ ] Добавить статичную метрику `Expected Shortfall 99%`.
  - Математическая суть: ES 99% трактуется как средняя потеря в худшем 1% сценариев; в MVP это статичная demo metric.
- [ ] Добавить кнопку `Bank Run`.
  - Математическая суть: frontend применяет коэффициенты, например `Bank A: 0.72`, `Bank B: 0.88`, `Bank C: 0.95`, чтобы имитировать массовый отток.
- [ ] Добавить кнопку `TARGET2 Outage`.
  - Математическая суть: frontend применяет коэффициенты settlement shock, например `EUR balances * 0.80` и delayed inflows, чтобы показать инфраструктурный стресс.
- [ ] После сценария пересчитать HHI, cash gap и recommendation.
  - Математическая суть: stress-adjusted balances становятся входом для `HHI`, `B_min` checks и PuLP optimizer.
- [ ] Добавить визуальный before/after stress state.
  - Математическая суть: показываем, как коэффициенты меняют баланс и риск.

### Acceptance Criteria

- [ ] Кнопки `Bank Run` и `TARGET2 Outage` меняют моковые балансы через stress coefficients.
- [ ] После клика риск и рекомендации пересчитываются.
- [ ] Стресс-тест выглядит как demo Monte Carlo logic, но честно обозначен как deterministic mock.

---

### 3.3 Explainability Layer

Статус: strong must-have для победного питча.

Цель: доказать, что продукт не просто "предсказывает", а помогает принять решение.

### Задачи

- [ ] Сделать explanation drawer / modal.
- [ ] Показать top root causes:
  - delayed card settlement: +2 days;
  - bank holiday moved inflow;
  - merchant payout due tomorrow;
  - EUR buffer below safe threshold;
  - HHI above `0.25`;
  - CCRI downgrade reduced max exposure.
- [ ] Показать timeline событий:
  - expected inflow date;
  - actual settlement date;
  - payout date;
  - gap date;
  - rating downgrade date;
  - optimizer recommendation time.
- [ ] Показать confidence / reliability score:
  - не как настоящий production ML score, а как demo indicator.
- [ ] Добавить текстовое объяснение простыми словами:
  - "EUR looks healthy today, but usable liquidity drops below buffer on May 20 because the card settlement arrives one business day later than the merchant payout."
- [ ] Добавить data / tech mode с формулами.
  - Математическая суть: жюри видит `EWMA`, `MAD Z-Score`, `HHI`, `B_min` constraints и objective function PuLP.
- [x] Подготовить backend payload для explanation drawer.
  - Математическая суть: root causes и formula cards уже считаются API-слоем, UI только отрисовывает.

### Результат

- `View Explanation` открывает понятную причину риска.

### Acceptance Criteria

- [ ] CFO понимает бизнес-причину.
- [ ] Treasury понимает операционную причину.
- [ ] CTO понимает, что логика не черный ящик.
- [ ] Data Scientist может объяснить, где используется ML, а где deterministic optimization.

---

### 3.4 Recommendation + Approval Flow

Статус: must-have.

Цель: показать, что продукт доводит пользователя до действия, но не делает реальные переводы автоматически.

### Задачи

- [ ] Создать recommendation card с конкретным действием:
  - "Transfer EUR 3.0M from Bank B to Bank A before 15:00 cut-off."
  - Математическая суть: карточка показывает оптимальный результат MIP: `x_i_j`, `source`, `destination`, `cost`, `post_balance`.
- [ ] Показать expected impact:
  - cash gap removed;
  - overdraft avoided;
  - risk status Green;
  - idle reserve reduced;
  - HHI reduced;
  - CCRI exposure compliant.
- [ ] Сделать кнопку `Run Optimizer`.
  - Математическая суть: frontend отправляет stress-adjusted balances в PuLP endpoint.
- [ ] Сделать кнопку `Approve Recommendation`.
  - Математическая суть: approval применяет `x_i_j` к моковым балансам и пересчитывает `B_min`, HHI и risk status.
- [ ] После approve обновить состояние:
  - alert resolved;
  - chart changes to green;
  - recommendation marked as approved;
  - audit event appears.
- [ ] Добавить mock audit log:
  - timestamp;
  - user;
  - action;
  - reason;
  - solver status;
  - input balances;
  - selected transfers;
  - status.

### Результат

- Сквозной сценарий: Forecast -> Alert -> Explanation -> Stress -> Optimizer -> Approve -> Green status.

### Acceptance Criteria

- [ ] Пользователь видит, что система не просто аналитика, а decision-support.
- [ ] Нет обещания "мы сами двигаем деньги", только human-approved treasury action.
- [ ] Transfer plan математически соответствует ограничениям `Balance_b >= B_min_b`.

---

### 3.5 ROI / CFO Value Screen

Статус: killer-feature для жюри.

Цель: перевести техническую демку в деньги.

### Задачи

- [ ] Сделать блок `Before / After`.
- [ ] До рекомендации:
  - overdraft risk: High;
  - at-risk amount: EUR 2.4M;
  - required reserve: `$15M`;
  - manual work: `12 h/week`;
  - HHI above threshold.
- [ ] После рекомендации:
  - overdraft risk: Low;
  - at-risk amount: EUR 0;
  - optimized reserve: `$8-9M`;
  - released liquidity: `$6-7M`;
  - manual work: `5-6 h/week`;
  - HHI below or closer to threshold.
- [ ] Добавить CFO summary:
  - avoided overdraft;
  - released working capital;
  - fewer emergency treasury calls;
  - better confidence in multi-currency operations.
- [ ] Добавить optimizer economics.
  - Математическая суть: сравнить transfer cost с avoided overdraft / released reserve.
- [x] Подготовить backend payload для ROI / CFO value screen.
  - Математическая суть: API возвращает `avoided_gap`, `released_reserve`, `optimizer_cost`, `ES_99`.

### Результат

- На экране есть понятный бизнес-эффект в деньгах и процентах.

### Acceptance Criteria

- [ ] В питче можно сказать: "Мы не просто строим графики, мы высвобождаем `$6-7M` замороженной ликвидности."

---

### 3.6 Demo Script & Pitch Assets

Статус: must-have перед защитой.

Цель: команда не должна импровизировать на сцене.

### Задачи

- [ ] Написать demo script на 3-5 минут:
  - проблема;
  - почему обычный cash balance обманывает;
  - запуск forecast;
  - найденный risk;
  - explanation;
  - stress scenario;
  - CCRI downgrade;
  - optimizer recommendation;
  - approve;
  - ROI.
- [ ] Подготовить 5 скриншотов:
  - dashboard before forecast;
  - red risk alert;
  - stress scenario;
  - optimizer recommendation;
  - green after approval / ROI.
- [ ] Подготовить 1 слайд architecture:
  - synthetic data / APIs;
  - pandas feature pipeline;
  - settlement engine;
  - LightGBM quantile forecast;
  - account / currency forecast layer;
  - portfolio forecast layer;
  - HHI / CCRI risk checks;
  - PuLP optimizer;
  - dashboard.
- [ ] Подготовить 1 слайд formulas:
  - `hour_sin`, `hour_cos`;
  - `EWMA`;
  - `MAD Z-Score`;
  - `Pinball Loss`;
  - `HHI`;
  - PuLP objective and constraints.
- [ ] Подготовить 1 слайд business model:
  - ICP;
  - buyer;
  - pricing;
  - sales cycle.
- [ ] Подготовить 1 слайд roadmap:
  - real bank APIs;
  - production ML forecasting;
  - ERP/TMS integrations;
  - compliance-grade audit;
  - scenario stress testing.

### Результат

- Готовый сценарий защиты.
- Команда знает, кто что говорит.
- Прототип показывается без лишних кликов.

### Acceptance Criteria

- [ ] Полная демка укладывается в 5 минут.
- [ ] Даже если код зависнет, у команды есть скриншоты.
- [ ] Каждый математический блок объясняется одной фразой.

---

## Stretch Features

Статус: делать только после Phase 1-3.

### Фичи

- [ ] Scenario simulator:
  - "What if card settlement is delayed by +1 day?"
  - "What if payout grows by 20%?"
- [ ] Currency heatmap:
  - где больше всего liquidity risk по валютам.
- [ ] Bank / rail reliability score:
  - какие банки/rails чаще создают задержки.
- [ ] CSV upload:
  - загрузка новых demo transactions.
- [ ] Export CFO report:
  - PDF/CSV summary.
- [ ] Anthropic Claude provider for AI Council:
  - Contrarian / CFO / Regulatory advisors can run on Claude, while Quant / Chairman stay on OpenAI.
- [ ] Slack/email alert mock:
  - не реальная интеграция, только визуальная симуляция.
- [ ] Role switcher:
  - CFO view;
  - Treasury view;
  - CTO/Data view.
- [ ] FX liquidity optimization:
  - Математическая суть: добавить exchange rate и FX transfer cost в objective.
- [ ] Multi-currency HHI:
  - Математическая суть: считать concentration risk отдельно по валютам и в base currency.

### Правило

Если до защиты меньше 6 часов и Phase 1-3 не готовы, stretch features не делать.

---

## После Хакатона / Roadmap

Статус: не кодить в MVP, только показать в презентации.

### Roadmap

- [ ] Real bank/API integrations.
- [ ] ERP / TMS / ledger integrations.
- [ ] Production ML forecasting:
  - account / currency granular model;
  - portfolio-level model;
  - hierarchical reconciliation;
  - online correction.
- [ ] Probabilistic forecast bands:
  - conservative;
  - expected;
  - optimistic.
- [ ] Anomaly handling:
  - known future events;
  - shock transfers;
  - bank SLA delays.
- [ ] Forecast validation:
  - rolling backtests;
  - shadow deployment;
  - canary rollout.
- [ ] Scenario stress testing.
- [ ] Real Monte Carlo simulation:
  - Математическая суть: генерировать много сценариев cash flow и считать VaR / Expected Shortfall.
- [ ] Multi-provider LLM governance:
  - OpenAI + Claude + deterministic mock fallback;
  - provider-level evaluation for answer quality, latency and JSON reliability.
- [ ] FX liquidity optimization.
- [ ] Compliance-grade audit trail.
- [ ] Access control and approval policies.
- [ ] Security audits.
- [ ] Multi-entity treasury support.
- [ ] SLA monitoring for banks and payment partners.

---

## Critical Path

Если времени мало, делать только это:

1. [x] Synthetic data.
2. [x] Settlement delay calculation.
3. [x] Usable liquidity forecast.
4. [x] `hour_sin`, `hour_cos`, EWMA, MAD Z-Score anomaly filter.
5. [x] LightGBM quantile forecast для p05 / p50 / p95.
6. [x] Cash gap alert через `B_min`.
7. [x] HHI и alert при `HHI > 0.25`.
8. [x] PuLP optimizer для переводов между 3-5 счетами.
9. [x] Mock CCRI + `Downgrade Bank Rating`.
10. [ ] Explanation panel.
11. [ ] Stress testing widget: `Bank Run`, `TARGET2 Outage`, ES 99%.
12. [ ] Recommendation card.
13. [ ] Approve button.
14. [ ] Before/after ROI block.
15. [ ] Demo script.

Без этих пунктов MVP не продает идею прогнозного управления ликвидностью.

---

## 48-Hour Build Plan

### День 1 — Logic + Data

- [ ] Утро: финализировать demo story и synthetic data.
- [ ] День: написать settlement / forecast / gap detection logic.
- [ ] День: добавить feature engineering `hour_sin/hour_cos`, EWMA, MAD Z-Score.
- [ ] Вечер: вывести результаты в простом UI.
- [ ] Ночь: добиться стабильного сквозного сценария без красоты.

### День 2 — Optimizer + UI + Pitch

- [ ] Утро: реализовать PuLP optimizer, HHI, CCRI downgrade.
- [ ] День: довести dashboard, chart, alert, recommendation.
- [ ] День: добавить stress testing, ES 99%, approval flow, ROI.
- [ ] Вечер: подготовить demo script и слайды.
- [ ] Перед защитой: сделать backup screenshots и прогнать демо 5 раз подряд.

---

## Командные Роли

### Product / Business

- [ ] Формулирует проблему и ICP.
- [ ] Готовит ROI и бизнес-модель.
- [ ] Пишет demo script.
- [ ] Следит, чтобы фичи не уходили в overengineering.

### Data / ML

- [ ] Делает synthetic dataset.
- [ ] Реализует pandas feature pipeline.
- [ ] Реализует циклическое время, EWMA, MAD Z-Score.
- [ ] Настраивает LightGBM quantile forecast.
- [ ] Готовит forecast metrics и объяснение Pinball Loss.

### Backend / Optimization

- [ ] Реализует settlement rules.
- [ ] Реализует forecast API.
- [ ] Реализует HHI.
- [ ] Реализует CCRI mock risk scoring.
- [ ] Реализует PuLP MIP optimizer.
- [ ] Готовит root cause explanation.

### Frontend / UI

- [ ] Делает dashboard.
- [ ] Делает charts и KPI cards.
- [ ] Делает stress testing widget.
- [ ] Делает alert / recommendation / ROI screens.
- [ ] Проверяет, что демо выглядит уверенно на проекторе.

### Presenter

- [ ] Репетирует 3-5 минутный pitch.
- [ ] Показывает только главный сценарий.
- [ ] Объясняет формулы простым языком.
- [ ] Не рассказывает про лишние будущие фичи до roadmap slide.

---

## MVP Definition of Done

MVP считается готовым, если:

- [ ] Демо запускается с одной команды или одной кнопки.
- [ ] На экране видно текущее состояние ликвидности.
- [ ] Forecast показывает будущий EUR cash gap.
- [ ] Forecast возвращает коридор p05 / p50 / p95.
- [ ] Alert объясняет когда и где возникнет риск.
- [ ] Explanation объясняет почему риск возник.
- [ ] HHI показывает concentration risk и alert при `> 0.25`.
- [ ] CCRI downgrade запускает rebalance recommendation.
- [ ] PuLP optimizer предлагает конкретное действие.
- [ ] Recommendation предлагает конкретный перевод.
- [ ] Approve меняет состояние риска на Green.
- [ ] Stress widget показывает `Bank Run`, `TARGET2 Outage` и ES 99%.
- [ ] ROI показывает экономический эффект.
- [ ] Есть backup screenshots.
- [ ] Команда может объяснить бизнес-ценность за 60 секунд.
- [ ] Команда может объяснить математику за 60 секунд.

---

## Anti-Tasks

Не тратить время на это в MVP:

- [ ] Реальные банковские подключения.
- [ ] Настоящие переводы денег.
- [ ] Production-grade ML platform.
- [ ] Регистрацию, логин и роли.
- [ ] Много разных клиентов/кейсов.
- [ ] Слишком много графиков.
- [ ] Красивый landing page вместо рабочего cockpit.
- [ ] Полноценную базу данных, если хватает JSON/CSV.
- [ ] Интеграции со Slack, ERP, TMS, банками.
- [ ] Долгие споры о цветах до готовности core flow.
- [ ] Заменять PuLP эвристикой, если можно показать честную constrained optimization.
- [ ] Скрывать математику: MVP должен быть explainable, а не magical AI.

---

## Final Demo Checklist

- [ ] Открыть dashboard.
- [ ] Показать, что total cash выглядит нормально.
- [ ] Нажать `Run Forecast`.
- [ ] Показать EUR cash gap через 36h.
- [ ] Показать forecast corridor p05 / p50 / p95.
- [ ] Показать HHI и concentration risk.
- [ ] Нажать `View Explanation`.
- [ ] Показать root causes.
- [ ] Нажать `Bank Run` или `TARGET2 Outage`.
- [ ] Показать ES 99%.
- [ ] Нажать `Downgrade Bank Rating`.
- [ ] Показать CCRI drop.
- [ ] Нажать `Run Optimizer`.
- [ ] Показать recommendation.
- [ ] Нажать `Approve Recommendation`.
- [ ] Показать Green status.
- [ ] Показать ROI: released liquidity + avoided overdraft.
- [ ] Закончить фразой: "Мы превращаем treasury из ручного реагирования в прогнозное управление ликвидностью."
