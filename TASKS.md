# TASKS.md — MVP Liquidity Control Tower

Цель MVP: за 3–5 минут показать жюри, что продукт находит будущий cash gap, объясняет причину, предлагает действие и показывает экономический эффект для CFO / Head of Treasury.

Главный демо-сценарий:

1. У компании “на бумаге” денег достаточно.
2. Система пересчитывает именно usable liquidity с учетом settlement delays, holidays, cut-offs, валют и банков.
3. Через 36 часов появляется риск cash gap в EUR.
4. Система объясняет причину: задержка card clearing + банковский holiday + крупный payout.
5. Система предлагает перебалансировку до cut-off.
6. Пользователь нажимает Approve.
7. Risk status меняется с Red на Green, показывается avoided overdraft и released idle reserve.

---

## Уровень 0 — Scope Lock

Статус: обязателен до начала кода.

### Задачи

- [ ] Зафиксировать название продукта: `Liquidity Control Tower`.
- [ ] Зафиксировать ICP: fintech / PSP / neobank с TPV от $50–100M+ в месяц.
- [ ] Зафиксировать главный экономический результат:
  - overdraft incidents: -75–90%;
  - manual treasury work: -50–60%;
  - forecast lead time: 24–48h;
  - frozen reserve: $15M -> $8–9M;
  - released liquidity: $6–7M.
- [ ] Выбрать один основной демо-кейс: EUR liquidity gap через 36 часов.
- [ ] Запретить в MVP:
  - реальные банковские API;
  - реальные платежи;
  - production ML;
  - сложный compliance/RBAC;
  - интеграции с ERP/TMS;
  - полноценный optimization solver.

### Результат

- Короткий текст на 5–7 предложений: что делает продукт, для кого и какой эффект дает.
- Один утвержденный demo story, который команда больше не меняет.

---

## Уровень 1 — Demo Data Foundation

Статус: must-have.

Цель: создать синтетические данные, на которых прототип будет выглядеть как реальный fintech treasury cockpit.

### Задачи

- [x] Создать файл с synthetic balances:
  - bank account;
  - currency;
  - current book balance;
  - settled balance;
  - minimum required buffer;
  - idle funds.
- [x] Создать файл с incoming / outgoing transactions:
  - date;
  - amount;
  - currency;
  - rail: SEPA, SWIFT, Card Clearing, Local Bank Transfer;
  - direction: inflow / outflow;
  - status: pending / settled;
  - source / destination bank;
  - business reason: payroll, merchant payout, card settlement, partner payment.
- [x] Создать settlement rules:
  - SEPA: T+1;
  - SWIFT: T+2;
  - Card Clearing: T+2/T+3;
  - Local Bank Transfer: T+0/T+1;
  - holidays move settlement to next business day.
- [x] Создать holiday / cut-off calendar:
  - weekend;
  - 1–2 fake bank holidays;
  - cut-off time for transfer.
- [x] Подготовить данные так, чтобы один cash gap возникал точно и стабильно.

### Результат

- `balances.json` или `balances.csv`.
- `transactions.json` или `transactions.csv`.
- `settlement_rules.json`.
- `calendar.json`.
- В данных есть один понятный “опасный момент”: EUR gap in 36h.

### Acceptance Criteria

- Данные можно загрузить без ручного редактирования.
- Gap появляется каждый раз при запуске демо.
- Причина gap понятна из данных, а не выглядит случайной.

---

## Уровень 2 — Core Logic Engine

Статус: must-have.

Цель: сделать простую, объяснимую логику, которая продает продукт лучше, чем “магический AI”.

### Задачи

- [x] Реализовать расчет settlement date:
  - transaction date + rail delay;
  - перенос с holiday/weekend на следующий рабочий день.
- [x] Реализовать расчет usable liquidity:

```text
usable liquidity =
  settled balance
  + expected settled inflows
  - expected outflows
  - required buffer
```

- [x] Построить forecast на 7–14 дней по валютам и банкам.
- [x] Реализовать cash gap detection:
  - если usable liquidity < 0 или ниже buffer threshold.
- [x] Реализовать severity:
  - Green: no risk;
  - Yellow: buffer pressure;
  - Red: cash gap / overdraft risk.
- [ ] Реализовать root cause explanation:
  - какие 2–3 события привели к gap;
  - rail delay;
  - holiday;
  - крупный payout;
  - недостаточный buffer в конкретном банке/валюте.
- [ ] Реализовать deterministic recommendation engine:
  - transfer from idle account;
  - transfer amount;
  - source bank;
  - destination bank;
  - currency;
  - deadline before cut-off;
  - estimated impact.

### Результат

- Функция `runForecast()`.
- Функция `detectCashGaps()`.
- Функция `explainGap()`.
- Функция `generateRecommendation()`.

### Acceptance Criteria

- Нажатие `Run Forecast` создает прогноз, alert и recommendation.
- Логика работает без ручных правок во время демо.
- Каждый результат можно объяснить жюри простыми словами.

---

## Уровень 2.5 — Predictive Cash Flow Architecture

Статус: roadmap для реализации после базового deterministic forecast.

Цель: превратить текущий расчет liquidity gap в понятную архитектуру прогнозирования cash flow, которую можно показать как технический план развития продукта.

### MVP-адаптация

В MVP не обучаем production ML-модель. Вместо этого делаем прозрачный deterministic baseline, который имитирует основные архитектурные слои и показывает, как система будет развиваться.

### Архитектурные слои

- [x] Слой A — Account / Currency Forecast:
  - прогноз по каждому банковскому счету;
  - прогноз по каждой валюте;
  - горизонт 7–14 дней;
  - в MVP: расчет на основе synthetic cash flows и settlement rules;
  - после MVP: LightGBM / MLForecast / Darts.
- [ ] Слой B — Portfolio Forecast:
  - агрегировать прогноз по валютам, счетам и payment rails;
  - показать общую картину компании;
  - в MVP: простой `reduce` по forecast points;
  - после MVP: Temporal Fusion Transformer или другой time-series model.
- [ ] Слой C — Forecast Reconciler:
  - сверять суммы account-level forecast с portfolio-level forecast;
  - гарантировать, что account -> currency -> rail -> total сходится;
  - в MVP: проверка totals и простая корректировка округлений;
  - после MVP: hierarchical forecasting reconciliation.
- [ ] Слой D — Online Corrector:
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
- [ ] Добавить anomaly flags:
  - unusually large transfer;
  - unexpected missing inflow;
  - payout spike above normal demo threshold.
- [ ] Добавить bank delay logic:
  - expected settlement date;
  - actual settlement date;
  - SLA breached / not breached;
  - probable delay reason.

### Вероятностный прогноз

- [ ] Добавить conservative / expected / optimistic сценарии:
  - pessimistic cash flow;
  - base cash flow;
  - optimistic cash flow.
- [ ] Добавить forecast band:
  - lower bound;
  - expected value;
  - upper bound.
- [ ] Сделать риск осторожным:
  - недооценка outflow опаснее, чем переоценка;
  - при сомнении risk status должен становиться Yellow, а не Green.

### Метрики качества

- [ ] Добавить demo metrics:
  - forecast error amount;
  - WAPE-like percentage;
  - alert lead time;
  - coverage of forecast band.
- [ ] Добавить model / logic version в snapshot:
  - чтобы на demo было видно, какая версия расчета дала результат.

### Safe launch roadmap

- [ ] Shadow mode:
  - система считает forecast, но не предлагает auto action;
  - человек сравнивает прогноз с фактом.
- [ ] Canary rollout:
  - сначала один банк и одна валюта;
  - потом несколько счетов;
  - потом весь portfolio.
- [ ] Backtesting:
  - прогонять историю строго вперед во времени;
  - не перемешивать будущие данные с прошлыми.

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
3. `portfolio`: агрегировать forecast по валютам и portfolio.
4. `reconcile`: проверить, что totals сходятся.
5. `bands`: добавить optimistic / expected / conservative сценарии.
6. `anomalies`: добавить flags для задержек и крупных outflows.
7. `metrics`: добавить простые demo metrics.
8. `snapshot`: вернуть все это через API одним понятным JSON.

### Acceptance Criteria

- Архитектура объясняет путь от простого MVP к production forecasting.
- MVP остается deterministic и понятным.
- В коде нет fake ML, который невозможно защитить.
- Каждый новый слой можно реализовать отдельной маленькой задачей.

---

## Уровень 3 — Control Tower UI

Статус: must-have.

Цель: показать не таблицу, а cockpit для Head of Treasury.

### Главный экран

- [ ] Верхняя панель KPI:
  - Total Cash;
  - Usable Liquidity;
  - At-Risk Amount;
  - Idle Reserve;
  - Forecast Horizon;
  - Risk Status.
- [ ] Forecast chart:
  - линия usable liquidity;
  - minimum buffer;
  - красная зона cash gap;
  - отметка “36h risk”.
- [ ] Currency / bank breakdown:
  - EUR, USD, GBP;
  - Bank A, Bank B, Bank C.
- [ ] Alert panel:
  - severity;
  - time to gap;
  - affected currency;
  - affected bank;
  - business impact.
- [ ] Recommendation card:
  - proposed action;
  - amount;
  - source;
  - destination;
  - deadline;
  - expected result.
- [ ] Buttons:
  - `Run Forecast`;
  - `View Explanation`;
  - `Approve Recommendation`;
  - `Simulate After`.

### Результат

- Один интерактивный dashboard, который можно показать на защите.

### Acceptance Criteria

- Жюри за 10 секунд понимает: где риск, когда он случится и что делать.
- Нет перегруза таблицами.
- Главный экран выглядит как fintech treasury tool, а не учебный калькулятор.

---

## Уровень 4 — Explainability Layer

Статус: strong must-have для победного питча.

Цель: доказать, что продукт не просто “предсказывает”, а помогает принять решение.

### Задачи

- [ ] Сделать explanation drawer / modal.
- [ ] Показать top root causes:
  - delayed card settlement: +2 days;
  - bank holiday moved inflow;
  - merchant payout due tomorrow;
  - EUR buffer below safe threshold.
- [ ] Показать timeline событий:
  - expected inflow date;
  - actual settlement date;
  - payout date;
  - gap date.
- [ ] Показать confidence / reliability score:
  - не как настоящий ML score, а как demo indicator.
- [ ] Добавить текстовое объяснение простыми словами:
  - “EUR looks healthy today, but usable liquidity drops below buffer on May 20 because the card settlement arrives one business day later than the merchant payout.”

### Результат

- `View Explanation` открывает понятную причину риска.

### Acceptance Criteria

- CFO понимает бизнес-причину.
- Treasury понимает операционную причину.
- CTO понимает, что логика не черный ящик.

---

## Уровень 5 — Recommendation + Approval Flow

Статус: must-have.

Цель: показать, что продукт доводит пользователя до действия, но не делает реальные переводы автоматически.

### Задачи

- [ ] Создать recommendation card с конкретным действием:
  - “Transfer EUR 3.0M from Bank B to Bank A before 15:00 cut-off.”
- [ ] Показать expected impact:
  - cash gap removed;
  - overdraft avoided;
  - risk status Green;
  - idle reserve reduced.
- [ ] Сделать кнопку `Approve Recommendation`.
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
  - status.

### Результат

- Сквозной сценарий: Forecast -> Alert -> Explanation -> Recommendation -> Approve -> Green status.

### Acceptance Criteria

- Пользователь видит, что система не просто аналитика, а decision-support.
- Нет обещания “мы сами двигаем деньги”, только human-approved treasury action.

---

## Уровень 6 — ROI / CFO Value Screen

Статус: killer-feature для жюри.

Цель: перевести техническую демку в деньги.

### Задачи

- [ ] Сделать блок `Before / After`.
- [ ] До рекомендации:
  - overdraft risk: High;
  - at-risk amount: EUR 2.4M;
  - required reserve: $15M;
  - manual work: 12 h/week.
- [ ] После рекомендации:
  - overdraft risk: Low;
  - at-risk amount: EUR 0;
  - optimized reserve: $8–9M;
  - released liquidity: $6–7M;
  - manual work: 5–6 h/week.
- [ ] Добавить CFO summary:
  - avoided overdraft;
  - released working capital;
  - fewer emergency treasury calls;
  - better confidence in multi-currency operations.

### Результат

- На экране есть понятный бизнес-эффект в деньгах и процентах.

### Acceptance Criteria

- В питче можно сказать: “Мы не просто строим графики, мы высвобождаем $6–7M замороженной ликвидности.”

---

## Уровень 7 — Demo Script & Pitch Assets

Статус: must-have перед защитой.

Цель: команда не должна импровизировать на сцене.

### Задачи

- [ ] Написать demo script на 3–5 минут:
  - проблема;
  - почему обычный cash balance обманывает;
  - запуск forecast;
  - найденный risk;
  - explanation;
  - recommendation;
  - approve;
  - ROI.
- [ ] Подготовить 3 скриншота:
  - dashboard before forecast;
  - red risk alert;
  - green after approval / ROI.
- [ ] Подготовить 1 слайд architecture:
  - synthetic data / APIs;
  - settlement engine;
  - account / currency forecast layer;
  - portfolio forecast layer;
  - forecast reconciler;
  - anomaly and bank delay checks;
  - recommendation engine;
  - dashboard.
- [ ] Подготовить 1 слайд business model:
  - ICP;
  - buyer;
  - pricing;
  - sales cycle.
- [ ] Подготовить 1 слайд roadmap:
  - real bank APIs;
  - ML forecasting;
  - ERP/TMS integrations;
  - compliance-grade audit;
  - scenario stress testing.

### Результат

- Готовый сценарий защиты.
- Команда знает, кто что говорит.
- Прототип показывается без лишних кликов.

### Acceptance Criteria

- Полная демка укладывается в 5 минут.
- Даже если код зависнет, у команды есть скриншоты.

---

## Уровень 8 — Stretch Features

Статус: делать только после уровней 1–7.

### Фичи

- [ ] Scenario simulator:
  - “What if card settlement is delayed by +1 day?”
  - “What if payout grows by 20%?”
- [ ] Currency heatmap:
  - где больше всего liquidity risk по валютам.
- [ ] Bank / rail reliability score:
  - какие банки/rails чаще создают задержки.
- [ ] CSV upload:
  - загрузка новых demo transactions.
- [ ] Export CFO report:
  - PDF/CSV summary.
- [ ] Slack/email alert mock:
  - не реальная интеграция, только визуальная симуляция.
- [ ] Role switcher:
  - CFO view;
  - Treasury view;
  - CTO/Data view.

### Правило

Если до защиты меньше 6 часов и уровни 1–7 не готовы, stretch features не делать.

---

## Уровень 9 — После Хакатона / Roadmap

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
- [ ] FX liquidity optimization.
- [ ] Compliance-grade audit trail.
- [ ] Access control and approval policies.
- [ ] Security audits.
- [ ] Multi-entity treasury support.
- [ ] SLA monitoring for banks and payment partners.

---

## Critical Path

Если времени мало, делать только это:

1. Synthetic data.
2. Settlement delay calculation.
3. Usable liquidity forecast.
4. Cash gap alert.
5. Explanation panel.
6. Recommendation card.
7. Approve button.
8. Before/after ROI block.
9. Demo script.

Без этих 9 пунктов MVP не продает идею.

---

## 48-Hour Build Plan

### День 1 — Logic + Data

- [ ] Утро: финализировать demo story и synthetic data.
- [ ] День: написать settlement / forecast / gap detection logic.
- [ ] Вечер: вывести результаты в простом UI.
- [ ] Ночь: добиться стабильного сквозного сценария без красоты.

### День 2 — UI + Pitch

- [ ] Утро: довести dashboard, chart, alert, recommendation.
- [ ] День: добавить explanation, approval flow, ROI.
- [ ] Вечер: подготовить demo script и слайды.
- [ ] Перед защитой: сделать backup screenshots и прогнать демо 5 раз подряд.

---

## Командные Роли

### Product / Business

- [ ] Формулирует проблему и ICP.
- [ ] Готовит ROI и бизнес-модель.
- [ ] Пишет demo script.
- [ ] Следит, чтобы фичи не уходили в overengineering.

### Data / Logic

- [ ] Делает synthetic dataset.
- [ ] Реализует settlement rules.
- [ ] Реализует forecast и cash gap detection.
- [ ] Готовит root cause explanation.

### Frontend / UI

- [ ] Делает dashboard.
- [ ] Делает charts и KPI cards.
- [ ] Делает alert / recommendation / ROI screens.
- [ ] Проверяет, что демо выглядит уверенно на проекторе.

### Presenter

- [ ] Репетирует 3–5 минутный pitch.
- [ ] Показывает только главный сценарий.
- [ ] Не рассказывает про лишние будущие фичи до roadmap slide.

---

## MVP Definition of Done

MVP считается готовым, если:

- [ ] Демо запускается с одной команды или одной кнопки.
- [ ] На экране видно текущее состояние ликвидности.
- [ ] Forecast показывает будущий EUR cash gap.
- [ ] Alert объясняет когда и где возникнет риск.
- [ ] Explanation объясняет почему риск возник.
- [ ] Recommendation предлагает конкретное действие.
- [ ] Approve меняет состояние риска на Green.
- [ ] ROI показывает экономический эффект.
- [ ] Есть backup screenshots.
- [ ] Команда может объяснить бизнес-ценность за 60 секунд.

---

## Anti-Tasks

Не тратить время на это в MVP:

- [ ] Реальные банковские подключения.
- [ ] Настоящие переводы денег.
- [ ] Сложный ML вместо понятной логики.
- [ ] Регистрацию, логин и роли.
- [ ] Много разных клиентов/кейсов.
- [ ] Слишком много графиков.
- [ ] Красивый landing page вместо рабочего cockpit.
- [ ] Полноценную базу данных, если хватает JSON/CSV.
- [ ] Интеграции со Slack, ERP, TMS, банками.
- [ ] Долгие споры о цветах до готовности core flow.

---

## Final Demo Checklist

- [ ] Открыть dashboard.
- [ ] Показать, что total cash выглядит нормально.
- [ ] Нажать `Run Forecast`.
- [ ] Показать EUR cash gap через 36h.
- [ ] Нажать `View Explanation`.
- [ ] Показать root causes.
- [ ] Показать recommendation.
- [ ] Нажать `Approve Recommendation`.
- [ ] Показать Green status.
- [ ] Показать ROI: released liquidity + avoided overdraft.
- [ ] Закончить фразой: “Мы превращаем treasury из ручного реагирования в прогнозное управление ликвидностью.”
