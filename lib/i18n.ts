export type Language = "en" | "ru";

export type LocalizedMessage = {
  en: string;
  ru: string;
};

export const languageLabels: Record<Language, string> = {
  en: "English",
  ru: "Русский",
};

const ruPhrases: Record<string, string> = {
  "Skip to content": "Перейти к содержимому",
  "TrueAvail home": "Главная TrueAvail",
  Home: "Главная",
  Map: "Карта",
  Demo: "Демо",
  Judge: "Жюри",
  Technical: "Техника",
  "Open Demo": "Открыть демо",
  "Open navigation menu": "Открыть меню",
  "Close navigation menu": "Закрыть меню",
  "Demo navigation": "Навигация демо",
  "Data source status": "Статус источника данных",
  "Live API": "Live API",
  "Replay Snapshot": "Replay-снимок",
  "World liquidity simulation": "Симуляция мировой ликвидности",
  "Operational map cockpit": "Операционный map cockpit",
  "Judge evidence packet": "Пакет доказательств для жюри",
  "Technical evidence packet": "Технический пакет доказательств",
  "Product landing": "Продуктовая страница",

  "Liquidity Map Simulation": "Симуляция карты ликвидности",
  "Global liquidity control map": "Глобальная карта управления ликвидностью",
  "Pick a treasury scenario, watch the affected account light up, and trace which SWIFT or local rail the system uses before it approves, throttles, or blocks the deal.":
    "Выберите treasury-сценарий, посмотрите как загорается проблемный счёт и проследите, какой SWIFT или локальный rail система использует перед approval, throttling или блокировкой сделки.",
  "bank nodes": "банковских узлов",
  "active rails": "активных rails",
  "Incident closed": "Инцидент закрыт",
  "Program ready": "Система готова",
  "Anomaly detected": "Аномалия обнаружена",
  "USD capital": "Капитал USD",
  "EUR capital": "Капитал EUR",
  Session: "Сессия",
  "Action needed": "Нужно действие",
  "Jury Control": "Управление для жюри",
  "Choose where the deal lands": "Выберите, куда попадает сделка",
  "The selected scenario paints transfer routes on the map and explains the program decision in treasury language.":
    "Выбранный сценарий рисует маршруты переводов на карте и объясняет решение системы treasury-языком.",
  "Global Rail Mesh": "Глобальная сеть rails",
  "live transfer path": "активный маршрут перевода",
  "live transfer paths": "активных маршрута перевода",
  "Selected Account": "Выбранный счёт",
  "Selected account": "Выбранный счёт",
  "Liquidity floor": "Минимум ликвидности",
  "Primary rail": "Основной rail",
  Capital: "Капитал",
  Condition: "Условие",
  "Generate Account Condition": "Сгенерировать условие счёта",
  "Program Response": "Ответ системы",
  "Scenario account": "Счёт сценария",
  "After deal": "После сделки",
  "After program action": "После действия системы",
  "Transfer Rails": "Платёжные rails",
  "Money movement shown on the map": "Движение денег показано на карте",
  "What The Program Does": "Что делает система",
  "Calendar Engine": "Календарный движок",
  "Banking days and seasonality change usable cash": "Банковские дни и сезонность меняют доступную ликвидность",
  "Calendar-adjusted effect": "Эффект с учётом календаря",
  "Seasonality pressure": "Сезонное давление",
  "Add Bank Or Account": "Добавить банк или счёт",
  "Add a new treasury node": "Добавить новый treasury-узел",
  "Choose a country, name the bank, enter account code and capital. It appears on the map immediately.":
    "Выберите страну, банк, код счёта и капитал. Узел сразу появится на карте.",
  Country: "Страна",
  Bank: "Банк",
  "Account code": "Код счёта",
  "Starting capital": "Начальный капитал",
  "Add Bank Account": "Добавить банковский счёт",
  "Mapped accounts": "Счета на карте",
  "BANK / ACCOUNT": "БАНК / СЧЁТ",
  CURRENCY: "ВАЛЮТА",
  CAPITAL: "КАПИТАЛ",
  FLOOR: "МИНИМУМ",
  CONDITION: "УСЛОВИЕ",
  "Healthy": "Норма",
  Watch: "Наблюдать",
  Blocked: "Заблокировано",
  "Activity (session)": "Активность (сессия)",
  "other accounts at this location": "других счетов в этой локации",
  "Banking day delay": "Задержка банковского дня",
  "Seasonality model": "Модель сезонности",
  "Risk route": "Рискованный маршрут",
  "Transfer rail": "Rail перевода",
  Closed: "Закрыт",
  Analyzed: "Проанализировано",
  Anomaly: "Аномалия",
  Risk: "Риск",
  Confidence: "Уверенность",
  "Awaiting analysis": "Ожидает анализа",

  "Map Error Detected": "Ошибка на карте обнаружена",
  Type: "Тип",
  Zone: "Зона",
  Detected: "Обнаружено",
  "Run ML analysis": "Запустить ML-анализ",
  "Run ML analysis again": "Запустить ML-анализ снова",
  "Analyzing...": "Анализируется...",
  "Open details": "Открыть детали",
  "Simulate failed run": "Показать ошибку анализа",
  "ML ensemble pipeline": "Пайплайн ML-ансамбля",
  "Run needs attention": "Запуск требует внимания",
  "Analysis completed": "Анализ завершён",
  "Models are running": "Модели выполняются",
  "Analysis failed": "Анализ не выполнен",
  "Retry analysis": "Повторить анализ",
  "Risk score": "Оценка риска",
  "Final Verdict": "Итоговый вывод",
  "View models": "Посмотреть модели",
  "Download report": "Скачать отчёт",
  "Create ticket": "Создать тикет",
  "Accept recommendation": "Принять рекомендацию",
  "Recommendation accepted": "Рекомендация принята",
  "Close incident": "Закрыть инцидент",
  "Demo lifecycle updated": "Состояние демо обновлено",
  "Deep Analytics For Jury": "Углублённая аналитика для жюри",
  "Every MVP function is visible and clickable": "Каждая MVP-функция видна и кликабельна",
  "These cards turn the document functions into a live demo layer: each function has a signal, proof point, endpoint, and jury narrative.":
    "Эти карточки превращают функции из документа в живой демо-слой: у каждой есть сигнал, proof point, endpoint и объяснение для жюри.",
  "verified in demo": "проверено в демо",
  "queued for analysis": "ожидает анализа",
  "p05 gap": "p05 gap",
  "TARGET2 loss": "TARGET2 loss",
  Decision: "Решение",
  "Hidden downside liquidity breach.": "Скрытый downside-пробой ликвидности.",
  "Stress scenario removes settlement flexibility.": "Stress-сценарий убирает settlement flexibility.",
  "Above the 0.25 concentration threshold.": "Выше concentration threshold 0.25.",
  "Unsafe approval blocked by policy.": "Небезопасный approval заблокирован политикой.",
  "Incident details": "Детали инцидента",
  Incident: "Инцидент",
  Status: "Статус",
  Coordinates: "Координаты",
  Source: "Источник",
  "Expected vs observed": "Ожидалось vs наблюдается",
  "Why the marker is red": "Почему маркер красный",
  Expected: "Ожидалось",
  Observed: "Наблюдается",
  "Root cause": "Основная причина",
  "ML ensemble model report": "Отчёт моделей ML-ансамбля",
  Verdict: "Вердикт",
  "Create treasury ticket": "Создать treasury-тикет",
  "Ticket title": "Название тикета",
  Owner: "Владелец",
  "Action note": "Комментарий к действию",
  Cancel: "Отмена",
  Creating: "Создаётся",
  "Ticket created": "Тикет создан",
  "is linked to the incident and visible in the lifecycle state.": "привязан к инциденту и виден в состоянии сценария.",
  Confirmation: "Подтверждение",
  "Close the incident after recommendation acceptance?": "Закрыть инцидент после принятия рекомендации?",
  "This is a demo-safe state change. It does not touch real banking systems.":
    "Это безопасное демо-действие. Реальные банковские системы не затрагиваются.",
  "Endpoint / artifact": "Endpoint / артефакт",
  "Demo metric": "Метрика демо",
  "Verified by current ensemble run": "Проверено текущим запуском ансамбля",
  "Queued until ML analysis runs": "Ожидает запуска ML-анализа",
  "How it works in the demo": "Как это работает в демо",

  "Forecast & Data Science": "Прогноз и Data Science",
  "Optimization & Risk": "Оптимизация и риск",
  "Workflow & Business Value": "Workflow и бизнес-ценность",
  "UI & Integration": "UI и интеграция",
  "Liquidity Forecast": "Прогноз ликвидности",
  "ML Forecast Ensemble": "ML-ансамбль прогноза",
  "Feature Engineering": "Инжиниринг признаков",
  "Anomaly Filtering": "Фильтрация аномалий",
  "Known Events": "Известные события",
  "Risk Status": "Статус риска",
  "HHI Concentration": "Концентрация HHI",
  "CCRI Bank Rating": "CCRI-рейтинг банка",
  "MIP Liquidity Optimizer": "MIP-оптимизатор ликвидности",
  "Survival Floor Constraints": "Ограничения survival floor",
  "Stress Testing": "Stress Testing",
  "Expected Shortfall 99%": "Expected Shortfall 99%",
  "Governance Gate": "Governance Gate",
  "Contingency Plan": "Contingency Plan",
  "Recommendation Approval": "Согласование рекомендации",
  Explainability: "Explainability",
  "ROI Summary": "Сводка ROI",
  "AI Council": "AI Council",
  "OpenAI + Claude Routing": "Маршрутизация OpenAI + Claude",
  "Demo Snapshot": "Demo Snapshot",
  "OpenAPI Contract": "OpenAPI-контракт",
  "UI Handoff Artifacts": "UI handoff-артефакты",
  "Backend Verify": "Backend Verify",

  "New York usable liquidity breach": "Пробой доступной ликвидности New York",
  "ML-detected settlement anomaly": "ML-аномалия settlement-процесса",
  "Awaiting ML ensemble analysis": "Ожидает анализа ML-ансамбля",
  "New York Fedwire and USD payroll liquidity zone": "Зона ликвидности New York Fedwire и USD payroll",
  "The map shows a red anomaly on the New York USD account because a scheduled credit repayment collides with a delayed SWIFT cover leg.":
    "Карта показывает красную аномалию на USD-счёте New York: плановое погашение кредита конфликтует с задержанным SWIFT-cover.",
  "The New York account should remain above its USD survival floor after scheduled debits and confirmed inbound liquidity.":
    "Счёт New York должен оставаться выше USD survival floor после плановых списаний и подтверждённой входящей ликвидности.",
  "Projected p05 usable liquidity drops below the survival floor before the Singapore cover becomes usable in New York.":
    "Прогноз p05 доступной ликвидности падает ниже survival floor до того, как cover из Singapore становится доступным в New York.",
  "High probability usable-liquidity breach detected": "Обнаружена высокая вероятность пробоя доступной ликвидности",
  "The New York book balance looks sufficient, but scheduled debit timing plus T+1 cover availability drops p05 usable liquidity below the survival floor.":
    "Книжный баланс New York выглядит достаточным, но тайминг списания и доступность cover на T+1 опускают p05 доступной ликвидности ниже survival floor.",
  "The ensemble agrees that this is a real liquidity incident rather than a map rendering issue. Coordinates are valid, telemetry is abnormal, known events explain timing, and governance should block automatic approval.":
    "Ансамбль считает это реальным инцидентом ликвидности, а не ошибкой отрисовки карты. Координаты валидны, телеметрия аномальна, known events объясняют тайминг, governance должен блокировать авто-approval.",

  "NY credit repayment": "Погашение кредита NY",
  "Frankfurt EUR clearing": "EUR-клиринг Франкфурта",
  "Singapore merchant payout": "Merchant payout Сингапур",
  "Treasury jury scenario 01": "Сценарий жюри Treasury 01",
  "Treasury jury scenario 02": "Сценарий жюри Treasury 02",
  "Treasury jury scenario 03": "Сценарий жюри Treasury 03",
  debit: "списание",
  "Credit repayment due from the New York account before 16:00 ET.": "Погашение кредита со счёта New York до 16:00 ET.",
  "Merchant settlement batch requires prefunding before APAC cut-off.": "Пакет merchant settlement требует prefunding до APAC cut-off.",
  "Oil revenue sweep is delayed; keep reserve for dollar liquidity.": "Oil revenue sweep задержан; нужно сохранить резерв USD-ликвидности.",
  "TARGET2 clearing pressure: preserve EUR buffer through market close.": "Давление TARGET2 clearing: сохранить EUR buffer до закрытия рынка.",
  "Sterling desk requests USD fallback rail while FX window is open.": "Sterling desk запрашивает USD fallback rail, пока открыто FX-окно.",
  "Custody fee settlement collides with overnight liquidity hold.": "Custody fee settlement конфликтует с overnight liquidity hold.",
  "Regional payout rail needs reserve after correspondent bank delay.": "Региональный payout rail требует резерв после задержки correspondent bank.",
  "Approve repayment only after SWIFT cover is confirmed; otherwise hold for treasurer approval.":
    "Одобрить погашение только после подтверждения SWIFT-cover; иначе удержать до approval казначея.",
  "NY cut-off turns cash into T+1 liquidity": "NY cut-off превращает cash в T+1 ликвидность",
  "The book balance exists today, but the DBS cover becomes usable after the New York credit window.":
    "Book balance есть сегодня, но DBS-cover становится доступным после кредитного окна New York.",
  "+1 banking day, payroll-season buffer raised": "+1 банковский день, payroll buffer повышен",
  "Frankfurt TARGET2 outage blocks EUR clearing": "TARGET2 outage во Frankfurt блокирует EUR clearing",
  "TARGET2 outage removes same-day settlement flexibility and raises concentration pressure at Deutsche Bank.":
    "TARGET2 outage убирает same-day settlement flexibility и повышает concentration pressure в Deutsche Bank.",
  "TARGET2 stress, HHI above policy threshold": "TARGET2 stress, HHI выше policy threshold",
  "APAC payout season raises the Singapore floor": "APAC payout season повышает floor Singapore",
  "The payout falls in a merchant settlement peak, so the model increases the reserve before approving release.":
    "Payout попадает в пик merchant settlement, поэтому модель повышает резерв перед approval release.",
  "seasonal buffer +18%, fallback rail armed": "seasonal buffer +18%, fallback rail готов",

  "Ingest map and demo snapshot data": "Получение данных карты и demo snapshot",
  "Read account balances, route legs, settlement calendar, known events, and forecast corridor.":
    "Читает балансы счетов, участки маршрута, календарь расчётов, известные события и прогнозный коридор.",
  "Validate coordinates and affected zone": "Проверка координат и зоны риска",
  "Confirm the incident belongs to the New York Fedwire liquidity zone and active scenario account.":
    "Подтверждает, что инцидент относится к зоне New York Fedwire liquidity и активному счёту сценария.",
  "Analyze treasury telemetry": "Анализ treasury-телеметрии",
  "Compare p05, p50, survival floor, scheduled debit, inbound cover, and settlement window.":
    "Сравнивает p05, p50, минимальный запас, плановое списание, входящее покрытие и окно расчётов.",
  "Run anomaly detection": "Запуск anomaly detection",
  "Apply robust MAD z-score and known-event features to separate signal from outlier noise.":
    "Применяет MAD z-score и признаки известных событий, чтобы отделить сигнал от шума выбросов.",
  "Calculate risk score and tail loss": "Расчёт risk score и tail loss",
  "Combine HHI, ES99, CCRI downgrade, stress loss, and liquidity gap into a risk score.":
    "Объединяет HHI, ES99, снижение CCRI, stress loss и дефицит ликвидности в оценку риска.",
  "Aggregate ML ensemble votes": "Агрегация голосов ML-ансамбля",
  "Merge forecast, anomaly, risk, pattern, and governance votes into one deterministic verdict.":
    "Сводит голоса прогноза, аномалий, риска, паттернов и governance в один детерминированный вывод.",
  "Generate recommendations and actions": "Формирование рекомендаций и действий",
  "Create a jury-readable explanation, action list, ticket payload, and downloadable report.":
    "Создаёт понятное для жюри объяснение, список действий, payload тикета и скачиваемый отчёт.",

  "Judge view": "Вид для жюри",
  "One page proof that the demo works": "Одна страница доказательства, что демо работает",
  "Function status table": "Таблица статуса функций",
  "Capabilities, evidence, metric, and user value": "Capabilities, evidence, metric и ценность для пользователя",
  Function: "Функция",
  Evidence: "Доказательство",
  Metric: "Метрика",
  "Technical depth": "Техническая глубина",
  "User value": "Ценность",
  Works: "Работает",
  "Works / Mock": "Работает / Mock",
  "Show Demo": "Показать демо",
  "View Evidence": "Показать evidence",
  "View API": "Показать API",
  "Technical view": "Технический вид",
  "Backend-ready proof behind the cockpit": "Backend-ready доказательство за cockpit",
  "Architecture map": "Карта архитектуры",
  "From data to governed action": "От данных к управляемому действию",
  Reproducibility: "Воспроизводимость",
  "Deterministic snapshot": "Детерминированный snapshot",
  Scenario: "Сценарий",
  Account: "Счёт",
  "Solver status": "Статус solver",
  "Verify command": "Команда проверки",
  "Model stack": "Стек моделей",
  "Forecast, stress, risk, solver": "Forecast, stress, risk, solver",
  "API contracts": "API-контракты",
  "FastAPI endpoints used by the frontend": "FastAPI endpoints, которые использует frontend",
  "Run Golden Incident": "Запустить Golden Incident",
  "Judge View": "Вид для жюри",

  "Treasury liquidity observatory": "Treasury liquidity observatory",
  "Book cash isn’t usable cash.": "Book cash — это ещё не доступная ликвидность.",
  "TrueAvail shows when cash becomes usable, where downside risk appears, and what treasury should do before a settlement window closes.":
    "TrueAvail показывает, когда cash становится доступным, где возникает downside risk и что treasury должен сделать до закрытия settlement window.",
  "Open live demo": "Открыть live demo",
  "View technical proof": "Показать technical proof",
  "Product presentation": "Презентация продукта",
  "Know the exact moment liquidity can be used.": "Знать точный момент, когда ликвидность можно использовать.",
  "Investor and buyer narrative": "Нарратив для инвестора и покупателя",
  "A presentation page built like a briefing.": "Презентационная страница в формате briefing.",
  "Live proof packet": "Live proof packet",
  "What the demo proves in one pass.": "Что демо доказывает за один проход.",

  Close: "Закрыть",
  Ticket: "Тикет",
  "Map state": "Состояние карты",
  "Capital totals": "Итоги капитала",
  "Simulation output": "Результат симуляции",
  "Map controls": "Управление картой",
  "Banking days and seasonality": "Банковские дни и сезонность",
  "Projected world liquidity map": "Проекционная карта мировой ликвидности",
  "Map incident popup": "Popup инцидента на карте",
  "Hide incident popup": "Скрыть popup инцидента",
  "Open incident": "Открыть инцидент",
  account: "счёт",
  confidence: "уверенность",
  Title: "Название",
  "Generated at": "Сформировано",
  Severity: "Критичность",
  "Model votes": "Голоса моделей",
  "Liquidity Control Tower - ML Ensemble Incident Report": "Liquidity Control Tower - отчёт ML-ансамбля по инциденту",
  high: "высокий",
  HIGH: "ВЫСОКИЙ",
  warning: "предупреждение",
  blocked: "заблокировано",
  hold: "удержать",
  reject: "отклонить",
  escalate: "эскалировать",
  pending: "ожидает",
  running: "выполняется",
  completed: "завершено",
  failed: "ошибка",
  "ML analysis running": "ML-анализ выполняется",
  "Incident selected": "Инцидент выбран",
  "The incident is closed in local demo state and the map marker is muted.": "Инцидент закрыт в локальном demo state, маркер на карте приглушён.",
  "The recommended hold/prefund action is accepted for this session.": "Рекомендованное действие hold/prefund принято для этой сессии.",
  "has been created and linked to the New York incident.": "создан и привязан к инциденту New York.",
  "The incident state changed locally.": "Состояние инцидента локально изменено.",
  "Ticket title is required.": "Укажите название тикета.",
  "Ticket owner is required.": "Укажите владельца тикета.",
  "Telemetry checksum mismatch in the synthetic correspondent-bank feed. Retry uses the stable demo snapshot.":
    "Checksum телеметрии не совпал в синтетическом correspondent-bank feed. Повтор использует стабильный demo snapshot.",

  "United States": "США",
  "United States of America": "США",
  "United Kingdom": "Великобритания",
  "Saudi Arabia": "Саудовская Аравия",
  "United Arab Emirates": "ОАЭ",
  Germany: "Германия",
  Singapore: "Сингапур",
  Japan: "Япония",
  UAE: "ОАЭ",
  "New York": "Нью-Йорк",
  Riyadh: "Эр-Рияд",
  Frankfurt: "Франкфурт",
  London: "Лондон",
  Tokyo: "Токио",
  Dubai: "Дубай",
  Wed: "Ср",
  Thu: "Чт",
  Fri: "Пт",
  Sat: "Сб",
  Sun: "Вс",
  Payroll: "Payroll",
  Tax: "Налоги",
  "Month-end": "Конец месяца",
  Holiday: "Праздник",
  Supplier: "Поставщики",
  Merchant: "Мерчанты",
  auto: "авто",
  min: "мин.",

  "A corporate loan repayment hits the New York USD account at 16:00 ET.":
    "Погашение корпоративного кредита попадает на USD-счёт New York в 16:00 ET.",
  "DBS to JPM cover": "DBS → JPM cover",
  "SNB standby sweep": "SNB standby sweep",
  "T+1 bank day": "T+1 банковский день",
  "after NY cut-off": "после NY cut-off",
  "same-day cover": "same-day cover",
  "Singapore is open, but New York usability slips one banking day.":
    "Singapore открыт, но доступность в New York сдвигается на один банковский день.",
  "Riyadh operating window overlaps the New York afternoon session.":
    "Операционное окно Riyadh пересекается с дневной сессией New York.",
  "Detects New York would fall below the USD survival floor after the repayment.":
    "Обнаруживает, что New York упадёт ниже USD survival floor после погашения.",
  "Routes a SWIFT cover payment from Singapore and a smaller standby sweep from Riyadh.":
    "Строит SWIFT-cover из Singapore и меньший standby sweep из Riyadh.",
  "Keeps Frankfurt EUR untouched because currency mismatch would add FX and settlement risk.":
    "Не трогает Frankfurt EUR, потому что currency mismatch добавит FX и settlement risk.",
  "TARGET2 close blocks same-day usability": "TARGET2 close блокирует same-day usability",
  "The EUR debit arrives during the closing window, so the optimizer treats book cash as unavailable.":
    "EUR debit приходит во время closing window, поэтому optimizer считает book cash недоступным.",
  "auto-release rejected, manual split required": "auto-release отклонён, требуется ручное разделение",
  "TARGET2 close": "TARGET2 close",
  "next clear window": "следующее clearing window",
  "split settles": "split settles",
  "Reject auto-release; split the settlement or require manual CFO override.":
    "Отклонить auto-release; разделить settlement или запросить ручной CFO override.",
  "A EUR supplier settlement is booked against Frankfurt during TARGET2 close.":
    "EUR supplier settlement забронирован на Frankfurt во время TARGET2 close.",
  "TARGET2 debit": "TARGET2 debit",
  "The debit lands after the EUR settlement window and cannot be made usable today.":
    "Debit попадает после EUR settlement window и не может стать usable сегодня.",
  "Flags Frankfurt as a policy breach because post-trade usable cash drops under the EUR floor.":
    "Отмечает Frankfurt как policy breach, потому что post-trade usable cash падает ниже EUR floor.",
  "Blocks automatic release and asks for either partial settlement or extra EUR funding.":
    "Блокирует automatic release и запрашивает partial settlement или дополнительное EUR funding.",
  "Shows no USD route because cross-currency rescue is not pre-approved in the scenario.":
    "Не показывает USD route, потому что cross-currency rescue не pre-approved в сценарии.",
  "APAC merchant payout batch lands on the Singapore account before inbound cash arrives.":
    "APAC merchant payout batch попадает на счёт Singapore до входящего cash.",
  "JPM liquidity bridge": "JPM liquidity bridge",
  "Saudi reserve release": "Saudi reserve release",
  "4h 45m": "4ч 45м",
  "6h 20m": "6ч 20м",
  "APAC same day": "APAC same day",
  "reserve fallback": "reserve fallback",
  "New York sends before Singapore payout cut-off, so cash remains usable today.":
    "New York отправляет до Singapore payout cut-off, поэтому cash остаётся usable сегодня.",
  "Reserve is modeled as fallback because local window overlap is thin.":
    "Резерв смоделирован как fallback, потому что overlap локального окна узкий.",
  "Forecast sees the payout collide with missing inbound settlement.":
    "Forecast видит конфликт payout с отсутствующим inbound settlement.",
  "Uses New York as first rescue rail and Riyadh as reserve only if Singapore remains below floor.":
    "Использует New York как первый rescue rail и Riyadh как резерв, если Singapore остаётся ниже floor.",
  "Leaves an audit trace showing amount, rail, source account, and residual buffer.":
    "Оставляет audit trace с суммой, rail, source account и residual buffer.",
  "Proceed with payout after liquidity bridge; throttle last 20% if SWIFT confirmation is late.":
    "Продолжить payout после liquidity bridge; throttle последние 20%, если SWIFT confirmation опоздает.",
  "loan debit 16:00 ET": "loan debit 16:00 ET",
  "DBS cover leaves": "DBS cover уходит",
  "funds usable": "funds usable",
  "weekend lock": "weekend lock",
  "no settlement": "нет settlement",
  "payout batch": "payout batch",
  "JPM bridge": "JPM bridge",
  "cash usable": "cash usable",

  "Forecast corridor": "Прогнозный коридор",
  "p05 below floor by USD 500k": "p05 ниже floor на USD 500k",
  "Forecast corridor crosses the survival floor before inbound cover is usable.":
    "Прогнозный коридор пересекает минимальный запас до того, как входящее покрытие становится доступным.",
  "The product does not look only at book cash; it forecasts usable liquidity before the payment window closes.":
    "Продукт смотрит не только на book cash; он прогнозирует usable liquidity до закрытия payment window.",
  "Highlights the New York point and feeds downside gap into every downstream model.":
    "Подсвечивает точку New York и передаёт дефицит ликвидности во все последующие модели.",
  "Model blend": "Смешение моделей",
  "91% ensemble confidence": "91% уверенность ансамбля",
  "LightGBM quantile, sklearn quantile, and EWMA baseline agree on downside pressure.":
    "LightGBM quantile, sklearn quantile и EWMA baseline сходятся на риске снижения ликвидности.",
  "Independent models vote on one forecast corridor instead of trusting a single estimator.":
    "Независимые модели голосуют за единый forecast corridor, а не доверяют одному estimator.",
  "Shows model votes and confidence cards after analysis.": "Показывает голоса моделей и confidence-карточки после анализа.",
  "Prepared signals": "Подготовленные сигналы",
  "12 active feature families": "12 активных семейств признаков",
  "Cyclical time, EWMA, lags, rolling statistics, calendar flags, and settlement flags are active.":
    "Активны циклы времени, EWMA, лаги, rolling statistics, календарные и settlement-флаги.",
  "The ML layer receives treasury-ready features, not raw payment rows.":
    "ML-слой получает treasury-ready features, а не сырые payment rows.",
  "Listed as detected features in the ensemble model explanations.":
    "Показано как detected features в объяснениях моделей ансамбля.",
  "MAD z-score": "MAD z-score",
  "MAD z-score 5.8": "MAD z-score 5.8",
  "Robust anomaly detection marks the scheduled movement as unusual but explainable.":
    "Устойчивая модель аномалий отмечает плановое движение как необычное, но объяснимое.",
  "Rare extreme movements do not poison training because they are flagged with robust statistics.":
    "Редкие extreme movements не портят обучение, потому что помечаются robust statistics.",
  "Turns the marker red before analysis and confirms the anomaly after analysis.":
    "Делает маркер красным до анализа и подтверждает аномалию после анализа.",
  "Calendar intelligence": "Календарная аналитика",
  "Payroll and credit repayment flags": "Флаги payroll и credit repayment",
  "The event calendar explains why the risk appears on this date.":
    "Календарь событий объясняет, почему риск появляется именно в эту дату.",
  "The system knows recurring merchant, payroll, holiday, and settlement events before they hit cash.":
    "Система знает повторяющиеся merchant, payroll, holiday и settlement events до их влияния на cash.",
  "Displayed in the incident evidence list and calendar strip.":
    "Показано в списке evidence инцидента и календарной ленте.",
  "Green/yellow/red": "Зелёный/жёлтый/красный",
  "Red: p05 below buffer": "Красный: p05 ниже buffer",
  "Risk color is derived from downside forecast, not manual operator judgment.":
    "Цвет риска рассчитывается из downside forecast, а не выставляется оператором вручную.",
  "Treasury sees a deterministic status tied to the forecast corridor.":
    "Treasury видит детерминированный статус, связанный с forecast corridor.",
  "Incident badge moves from awaiting analysis to analyzed high risk.":
    "Badge инцидента переходит из ожидания анализа в analyzed high risk.",
  "Bank concentration": "Концентрация банка",
  "HHI 0.312 > 0.25": "HHI 0.312 > 0.25",
  "Bank concentration remains above policy threshold after the stress case.":
    "Концентрация в одном банке остаётся выше порога политики после stress-сценария.",
  "The product sees dependence on one bank before it approves a transfer.":
    "Продукт видит зависимость от одного банка до approval перевода.",
  "Feeds the governance blocker and final verdict.": "Передаёт сигнал в governance blocker и итоговый verdict.",
  "Bank risk score": "Risk score банка",
  "Downgrade delta 25": "Downgrade delta 25",
  "A bank risk downgrade tightens exposure limits during optimization.":
    "Bank risk downgrade ужесточает exposure limits во время optimization.",
  "When a bank becomes riskier, the system automatically reduces safe exposure.":
    "Когда банк становится рискованнее, система автоматически снижает safe exposure.",
  "Displayed as a risk factor in the analytics report.": "Показано как risk factor в аналитическом отчёте.",
  "Constrained transfers": "Ограниченные переводы",
  "0 safe auto-transfer routes": "0 безопасных auto-transfer routes",
  "The optimizer cannot find a safe route that preserves survival floors and policy limits.":
    "Optimizer не находит безопасный маршрут, который сохраняет survival floors и policy limits.",
  "This is not a heuristic; it is constrained optimization with business rules.":
    "Это не эвристика, а constrained optimization с business rules.",
  "Produces the recommended hold and contingency path.": "Формирует рекомендуемый hold и contingency path.",
  "Do not drain weak accounts": "Не выкачивать слабые счета",
  "USD floor 3.0M": "USD floor 3.0M",
  "The system blocks transfers that would save one metric by creating another cash gap.":
    "Система блокирует переводы, которые спасают одну метрику, создавая другой cash gap.",
  "The optimizer cannot solve concentration by draining an already-breached account.":
    "Optimizer не решает concentration за счёт счёта, который уже в breach.",
  "Shown beside the selected account and model evidence.": "Показано рядом с выбранным счётом и model evidence.",
  "Bank run / TARGET2": "Bank run / TARGET2",
  "TARGET2 and bank-run scenarios": "Сценарии TARGET2 и bank-run",
  "Stress removes settlement flexibility and recomputes balances.":
    "Stress убирает settlement flexibility и пересчитывает balances.",
  "The demo can show how the system behaves under rail outage or bank run conditions.":
    "Демо показывает поведение системы при rail outage или bank run.",
  "Scenario cards repaint the route and incident panel.": "Карточки сценариев перерисовывают route и incident panel.",
  "Tail risk": "Tail risk",
  "ES99 USD 1.84M": "ES99 USD 1.84M",
  "Worst 1% outcomes imply a material liquidity tail loss.":
    "Худший 1% исходов означает существенный liquidity tail loss.",
  "The CFO gets one number for tail risk rather than a noisy chart.":
    "CFO получает одну цифру tail risk вместо шумного графика.",
  "Appears in the final ensemble risk explanation.": "Появляется в итоговом risk explanation ансамбля.",
  "Approve blocker": "Блокер approval",
  "Auto-approval blocked": "Auto-approval заблокирован",
  "Governance rejects unsafe automated release when blockers are still active.":
    "Governance отклоняет небезопасный automated release, пока blocker активны.",
  "Math can suggest action, but governance prevents unsafe approval.":
    "Математика может предложить действие, но governance предотвращает unsafe approval.",
  "Final verdict asks the user to hold and create a ticket.":
    "Итоговый verdict просит пользователя удержать операцию и создать тикет.",
  "Emergency playbook": "Emergency playbook",
  "Prefund + throttle + fallback rail": "Prefund + throttle + fallback rail",
  "When MIP is infeasible, the system proposes prefunding, throttling, fallback rails, and intraday credit sizing.":
    "Когда MIP infeasible, система предлагает prefunding, throttling, fallback rails и intraday credit sizing.",
  "The story does not end at alerting; it turns into an executable treasury playbook.":
    "Сценарий не заканчивается alerting; он превращается в исполняемый treasury playbook.",
  "Next actions become clickable after analysis.": "Next actions становятся кликабельными после анализа.",
  "Human approved action": "Human-approved action",
  "Mock audit receipt ready": "Mock audit receipt готов",
  "Approved actions update local demo state and write an audit-style receipt.":
    "Approved actions обновляют local demo state и пишут audit-style receipt.",
  "The MVP shows human-approved treasury action, not real money movement.":
    "MVP показывает human-approved treasury action, а не реальное движение денег.",
  "Accept recommendation changes the incident lifecycle state.":
    "Accept recommendation меняет lifecycle state инцидента.",
  "Why panel": "Why-панель",
  "5 evidence groups": "5 групп evidence",
  "Root causes include forecast breach, known event, anomaly flag, stress loss, HHI, and governance blocker.":
    "Root causes включают forecast breach, known event, anomaly flag, stress loss, HHI и governance blocker.",
  "The operator can open the why and defend the decision.":
    "Оператор может открыть why и защитить решение.",
  "Details modal contains root cause, evidence, and model cards.":
    "Details modal содержит root cause, evidence и карточки моделей.",
  "CFO economics": "Экономика для CFO",
  "Avoided gap and tail loss": "Avoided gap и tail loss",
  "At-risk liquidity, avoided gap, released reserve, transfer cost, and ES99 are summarized for CFO review.":
    "At-risk liquidity, avoided gap, released reserve, transfer cost и ES99 сведены для CFO review.",
  "The value story is financial impact, not just a dashboard visual.":
    "Value story — это финансовый эффект, а не просто dashboard visual.",
  "Download report includes CFO-readable metrics.": "Download report включает CFO-readable metrics.",
  "Five advisors": "Пять советников",
  "5 advisor critiques": "5 advisor critiques",
  "Advisors critique the calculated facts and chairman verdict, not raw bank data.":
    "Advisors критикуют рассчитанные факты и chairman verdict, а не raw bank data.",
  "LLMs are used for governance review over deterministic facts.":
    "LLM используются для governance review поверх deterministic facts.",
  "Model report mirrors a council-style decision stack.": "Model report отражает council-style decision stack.",
  "Multi-provider governance": "Multi-provider governance",
  "mock/openai/anthropic/mixed": "mock/openai/anthropic/mixed",
  "Provider routing supports mock, OpenAI, Anthropic, and mixed review modes.":
    "Provider routing поддерживает mock, OpenAI, Anthropic и mixed review modes.",
  "The demo can run safely in mock mode while preserving a production-like governance shape.":
    "Демо безопасно работает в mock mode, сохраняя production-like governance shape.",
  "Displayed in deep analytics as a provider routing capability.":
    "Показано в deep analytics как provider routing capability.",
  "One cockpit payload": "Единый cockpit payload",
  "Forecast + stress + optimizer + ROI": "Forecast + stress + optimizer + ROI",
  "One endpoint assembles the golden dashboard state.":
    "Один endpoint собирает golden dashboard state.",
  "Frontend and design can build from one stable payload.":
    "Frontend и design могут строиться от одного стабильного payload.",
  "This page uses deterministic local data shaped like the golden snapshot.":
    "Эта страница использует deterministic local data в форме golden snapshot.",
  "Typed API surface": "Типизированная API-поверхность",
  "FastAPI contract exported": "FastAPI contract exported",
  "Request and response schemas are documented and machine-readable.":
    "Request и response schemas документированы и machine-readable.",
  "The team is not integrating by guesswork.": "Команда интегрируется не наугад.",
  "Technical proof route links the jury to implementation evidence.":
    "Technical proof route связывает жюри с implementation evidence.",
  "Design handoff": "Design handoff",
  "Snapshot, metadata, OpenAPI": "Snapshot, metadata, OpenAPI",
  "Design and frontend receive stable demo state artifacts.":
    "Design и frontend получают стабильные demo state artifacts.",
  "The MVP is ready for productized UI iteration.": "MVP готов к productized UI iteration.",
  "The deep analytics matrix makes every artifact visible.":
    "Матрица deep analytics делает каждый artifact видимым.",
  "One sanity check": "Один sanity check",
  "Forecast + optimizer + demo + council + tests": "Forecast + optimizer + demo + council + tests",
  "A single command validates the full backend demonstration path.":
    "Одна команда валидирует весь backend demonstration path.",
  "Before the pitch, the team can run one command and know the demo is coherent.":
    "Перед питчем команда может выполнить одну команду и понять, что демо coherent.",
  "Verification status is represented in the final report actions.":
    "Verification status представлен в actions итогового отчёта.",

  GeoValidationModel: "GeoValidationModel",
  AnomalyDetectionModel: "AnomalyDetectionModel",
  RiskScoringModel: "RiskScoringModel",
  PatternRecognitionModel: "PatternRecognitionModel",
  ForecastModel: "ForecastModel",
  DecisionAggregator: "DecisionAggregator",
  "Incident is inside the New York Fedwire zone, but route usability depends on a foreign SWIFT cover leg.":
    "Инцидент находится внутри зоны New York Fedwire, но usable route зависит от внешнего SWIFT-cover leg.",
  "The coordinates are valid; the risk is not a wrong point, it is a settlement-zone timing mismatch.":
    "Координаты валидны; риск не в неверной точке, а в timing mismatch settlement-зоны.",
  "valid coordinates": "валидные координаты",
  "Fedwire zone": "зона Fedwire",
  "cross-zone cover leg": "cross-zone cover leg",
  "The movement is unusual enough to trigger review, but known-event features explain the source.":
    "Движение достаточно необычное для review, но known-event features объясняют источник.",
  "MAD z-score breach": "MAD z-score breach",
  "known credit repayment": "known credit repayment",
  "payroll-season buffer": "payroll-season buffer",
  "Downside gap, concentration, and expected shortfall combine into a high-risk operating state.":
    "Downside gap, concentration и expected shortfall складываются в high-risk operating state.",
  "p05 below floor": "p05 ниже floor",
  "HHI above policy": "HHI выше policy",
  "ES99 tail loss": "ES99 tail loss",
  "Pattern matches merchant/payroll seasonality plus delayed correspondent cover.":
    "Pattern совпадает с merchant/payroll seasonality плюс delayed correspondent cover.",
  "The event is not random noise; it follows a known recurring liquidity pattern.":
    "Событие не random noise; оно следует известному recurring liquidity pattern.",
  "seasonality spike": "seasonality spike",
  "T+1 cash availability": "T+1 cash availability",
  "settlement cut-off": "settlement cut-off",
  "The forecast corridor shows that book cash is not usable soon enough to approve the debit safely.":
    "Forecast corridor показывает, что book cash не становится usable достаточно быстро для safe approval debit.",
  "p05 breach": "p05 breach",
  "p50 watch zone": "p50 watch zone",
  "delayed inbound cover": "delayed inbound cover",
  "3 reject votes, 2 hold votes, 1 escalate vote; no model supports automatic approval.":
    "3 голоса reject, 2 hold, 1 escalate; ни одна модель не поддерживает automatic approval.",
  "The ensemble blocks auto-release and routes the case to contingency and human approval.":
    "Ансамбль блокирует auto-release и направляет кейс в contingency и human approval.",
  "governance blocker": "governance blocker",
  "contingency needed": "нужен contingency",
  "manual approval required": "требуется manual approval",
  "Hold automatic release until SWIFT cover is confirmed in the New York usability window.":
    "Удерживать автоматический выпуск до подтверждения SWIFT-cover в окне доступности New York.",
  "Prefund the New York account or throttle the last 20% of the payout batch.":
    "Пополнить счёт New York заранее или замедлить последние 20% payout batch.",
  "Create an incident ticket for treasury owner review before Fedwire cut-off.":
    "Создать тикет инцидента для review treasury owner до Fedwire cut-off.",
  "Keep the governance gate blocked until survival floor and HHI constraints pass.":
    "Оставить governance gate заблокированным, пока survival floor и HHI constraints не пройдут.",
  "Open incident details": "Открыть детали инцидента",
  "Close incident after confirmation": "Закрыть инцидент после подтверждения",

  "Forecast Engine": "Forecast Engine",
  "p05 breach found": "p05 breach найден",
  queued: "в очереди",
  "p05 usable gap": "p05 usable gap",
  locked: "заблокировано",
  "locked until decision click": "заблокировано до клика решения",
  "Breach day": "День breach",
  "Sends downside gap into stress and concentration risk.": "Передаёт downside gap в stress и concentration risk.",
  "Reads anomaly-aware cash features.": "Читает anomaly-aware cash features.",
  "Compares p05 corridor against survival floor.": "Сравнивает p05 corridor с survival floor.",
  "Marks the payout as unsafe when usable cash crosses below zero.": "Помечает payout как unsafe, когда usable cash падает ниже нуля.",
  Window: "Окно",
  Rows: "Строки",
  "Stress Runner": "Stress Runner",
  "TARGET2 outage applied": "TARGET2 outage применён",
  "waiting on forecast": "ожидает forecast",
  "stress loss": "stress loss",
  "Scenario target2_outage plus forecast corridor.": "Сценарий target2_outage плюс forecast corridor.",
  "Settlement flexibility removed from the rail plan.": "Settlement flexibility удалена из rail plan.",
  "Pushes stressed balances into HHI and optimizer constraints.": "Передаёт stressed balances в HHI и optimizer constraints.",
  "Applies rail outage haircut.": "Применяет rail outage haircut.",
  "Recalculates usable liquidity after stress.": "Пересчитывает usable liquidity после stress.",
  "Stores stress receipt for audit replay.": "Сохраняет stress receipt для audit replay.",
  Loss: "Потеря",
  "Concentration Risk": "Concentration Risk",
  "policy threshold crossed": "policy threshold превышен",
  "waiting on stress": "ожидает stress",
  "HHI after stress": "HHI after stress",
  "Stressed balances by bank and currency.": "Stressed balances по банкам и валютам.",
  "Concentration policy blocks automatic approval.": "Concentration policy блокирует automatic approval.",
  "Adds bank exposure blocker before optimizer can suggest transfers.": "Добавляет bank exposure blocker до рекомендаций optimizer.",
  "Calculates HHI on stressed liquidity distribution.": "Считает HHI на stressed liquidity distribution.",
  "Compares against governance threshold.": "Сравнивает с governance threshold.",
  "Emits concentration blocker into approval gate.": "Передаёт concentration blocker в approval gate.",
  Threshold: "Порог",
  "not started": "не запущено",
  "safe transfer routes": "безопасные маршруты переводов",
  "Survival floors, HHI blocker, stress losses, payout deadline.": "Survival floors, HHI blocker, stress losses, payout deadline.",
  "Returns infeasible status so governance refuses false-positive transfers.":
    "Возвращает infeasible status, чтобы governance отклонил false-positive transfers.",
  "Builds transfer constraints.": "Строит transfer constraints.",
  "Tests survival floors after each candidate route.": "Проверяет survival floors после каждого candidate route.",
  "Writes solver status into the decision receipt.": "Записывает solver status в decision receipt.",
  Solver: "Solver",
  Routes: "Маршруты",
  "0 safe transfers": "0 безопасных переводов",
  "reject recorded": "reject записан",
  "reject recommended": "reject рекомендован",
  "awaiting evidence": "ожидает evidence",
  decision: "решение",
  rejected: "отклонено",
  "Forecast gap, stress loss, HHI blocker, optimizer result.": "Forecast gap, stress loss, HHI blocker, optimizer result.",
  "Audit stamp written to decision trace.": "Audit stamp записан в decision trace.",
  "Approval blocked.": "Approval заблокирован.",
  "Sends the operator to contingency actions instead of approval.": "Направляет оператора к contingency actions вместо approval.",
  "Requires every blocker to be resolved before approval.": "Требует закрыть каждый blocker перед approval.",
  "Rejects when optimizer is infeasible.": "Отклоняет, когда optimizer infeasible.",
  "Preserves evidence IDs for judge review.": "Сохраняет evidence IDs для judge review.",
  Blockers: "Блокеры",
  Warnings: "Предупреждения",
  "actions ready": "actions готовы",
  "not requested": "не запрошено",
  "primary action": "основное действие",
  "action ready": "действие готово",
  "Rejected payout, treasury owner, cut-off, funding gap.": "Rejected payout, treasury owner, cut-off, funding gap.",
  "Prefund or throttle before cut-off.": "Prefund или throttle до cut-off.",
  "Moves the case from alerting into executable treasury work.": "Переводит кейс из alerting в executable treasury work.",
  "Assigns owner.": "Назначает owner.",
  "Sets deadline before payout cut-off.": "Ставит deadline до payout cut-off.",
  "Connects ROI story to the blocked unsafe approval.": "Связывает ROI story с blocked unsafe approval.",
  Actions: "Действия",
  Deadline: "Deadline",
  "Treasury Lead": "Treasury Lead",

  "Forecast Corridor": "Forecast Corridor",
  "Show forecast": "Показать forecast",
  "p05/p50/p95 response": "p05/p50/p95 response",
  "EUR 2.136M gap": "EUR 2.136M gap",
  "ML ensemble": "ML ensemble",
  "early warning": "early warning",
  "Run TARGET2": "Запустить TARGET2",
  "stress response": "stress response",
  "EUR 2.021M loss": "EUR 2.021M loss",
  "scenario engine": "scenario engine",
  "tail-risk visibility": "tail-risk visibility",
  "HHI / CCRI": "HHI / CCRI",
  "Show concentration": "Показать concentration",
  "HHI threshold": "HHI threshold",
  "risk scoring": "risk scoring",
  "avoids bank concentration": "избегает bank concentration",
  "Find safe transfer": "Найти безопасный transfer",
  "solver status": "solver status",
  infeasible: "infeasible",
  "PuLP MIP": "PuLP MIP",
  "avoids unsafe route": "избегает unsafe route",
  "Show decision": "Показать решение",
  "blocker list": "список blocker",
  "policy rules": "policy rules",
  "prevents bad approval": "предотвращает bad approval",
  "Show plan": "Показать план",
  "action list": "action list",
  "EUR 2.136M prefund": "EUR 2.136M prefund",
  "workflow logic": "workflow logic",
  "gives next action": "даёт следующее действие",
  ROI: "ROI",
  "Show value": "Показать value",
  "ROI summary": "ROI summary",
  "$6-7M released": "$6-7M released",
  "financial model": "financial model",
  "CFO case": "CFO case",
  "Show verdict": "Показать verdict",
  "advisor output": "advisor output",
  "decision review": "decision review",
  "LLM over facts": "LLM over facts",
  explainability: "explainability",
  OpenAPI: "OpenAPI",
  "View contract": "Показать contract",
  "openapi.json": "openapi.json",
  "11 endpoints": "11 endpoints",
  "FastAPI contracts": "FastAPI contracts",
  "integration readiness": "integration readiness",

  "Synthetic data": "Синтетические данные",
  "Feature engineering": "Feature engineering",
  "Forecast p05/p50/p95": "Forecast p05/p50/p95",
  "Stress engine": "Stress engine",
  "HHI / CCRI risk layer": "HHI / CCRI risk layer",
  "PuLP MIP optimizer": "PuLP MIP optimizer",
  "Governance gate": "Governance gate",
  "Contingency plan": "Contingency plan",
  "Audit / AI Council / ROI": "Audit / AI Council / ROI",
  "LightGBM Quantile": "LightGBM Quantile",
  "sklearn Gradient Boosting Quantile": "sklearn Gradient Boosting Quantile",
  "EWMA volatility fallback": "EWMA volatility fallback",
  "MAD anomaly filtering": "MAD anomaly filtering",
  "Known events calendar": "Known events calendar",
  "Survival floor constraints": "Survival floor constraints",
  "OpenAPI contract export": "OpenAPI contract export",

  "Usable cash, not book cash": "Usable cash, а не book cash",
  "Forecast when capital can actually be used after rail cut-offs, holidays, buffers, and settlement delays.":
    "Прогнозирует, когда капитал реально доступен после rail cut-offs, праздников, buffers и settlement delays.",
  "Risk before the breach": "Риск до breach",
  "Surface p05 liquidity pressure, bank concentration, and corridor drift before static balances expose the issue.":
    "Показывает p05 liquidity pressure, bank concentration и corridor drift до того, как static balances раскроют проблему.",
  "Governed action": "Управляемое действие",
  "Recommend prefund, hold, throttle, reject, or escalate actions with deterministic receipts and audit evidence.":
    "Рекомендует prefund, hold, throttle, reject или escalate с deterministic receipts и audit evidence.",
  "Product links": "Ссылки продукта",
  "Product signal": "Сигнал продукта",
  "Forecast - Stress - Optimize - Govern": "Forecast - Stress - Optimize - Govern",
  "TrueAvail live demo interface": "Интерфейс live demo TrueAvail",
  Problem: "Проблема",
  Product: "Продукт",
  Proof: "Доказательство",
  "Treasury sees balance. Operations need availability.": "Treasury видит balance. Operations нужна availability.",
  "TrueAvail separates account balance from usable liquidity by modeling banking days, settlement windows, rail status, floors, and risk concentration.":
    "TrueAvail отделяет account balance от usable liquidity через моделирование banking days, settlement windows, rail status, floors и risk concentration.",
  "A control room for cash decisions.": "Control room для cash decisions.",
  "The product turns fragmented bank data into a command surface: forecast corridor, stress scenarios, optimizer output, governance decision, and contingency plan.":
    "Продукт превращает фрагментированные bank data в command surface: forecast corridor, stress scenarios, optimizer output, governance decision и contingency plan.",
  "Every recommendation carries evidence.": "Каждая рекомендация несёт evidence.",
  "Each action is tied to function output, API contract, audit receipt, and a human-readable reason so treasury can defend the decision.":
    "Каждое действие связано с function output, API contract, audit receipt и понятной причиной, чтобы treasury мог защитить решение.",
  Forecast: "Forecast",
  Stress: "Stress",
  Optimizer: "Optimizer",
  Governance: "Governance",
  "p05 corridor and usable liquidity": "p05 corridor и usable liquidity",
  "rail shock, CCRI, concentration": "rail shock, CCRI, concentration",
  "survival floors before transfer cost": "survival floors перед transfer cost",
  "AI Council can reject automation": "AI Council может отклонить automation",
};

export function translateText(language: Language, value: string): string {
  if (language === "en") return value;
  return ruPhrases[value] ?? translateDynamicRu(value);
}

function translateDynamicRu(value: string): string {
  if (value.startsWith("MAD z-score ") && value.includes(" marks the movement as abnormal for this account window.")) {
    return value
      .replace(" marks the movement as abnormal for this account window.", " отмечает movement как abnormal для этого account window.");
  }

  if (value.startsWith("Risk score ") && value.includes(" with HHI ")) {
    return value.replace("Risk score", "Risk score").replace(" with HHI ", " при HHI ");
  }

  if (value.startsWith("p05 usable liquidity is USD ") && value.includes(" under the survival floor.")) {
    return value
      .replace("p05 usable liquidity is USD ", "p05 usable liquidity на USD ")
      .replace(" under the survival floor.", " ниже survival floor.");
  }

  if (value.startsWith("p05 balance ") && value.includes(" is below required buffer ")) {
    return value
      .replace("p05 balance ", "p05 balance ")
      .replace(" is below required buffer ", " ниже required buffer ");
  }

  if (value.startsWith("Scheduled debit ") && value.includes(" lands before inbound cover becomes usable.")) {
    return value
      .replace("Scheduled debit ", "Scheduled debit ")
      .replace(" lands before inbound cover becomes usable.", " проходит до того, как inbound cover становится usable.");
  }

  if (value.startsWith("MAD z-score ") && value.includes(" exceeds the anomaly threshold.")) {
    return value.replace(" exceeds the anomaly threshold.", " превышает anomaly threshold.");
  }

  if (value.startsWith("HHI ") && value.includes(" is above the 0.25 concentration threshold.")) {
    return value.replace(" is above the 0.25 concentration threshold.", " выше concentration threshold 0.25.");
  }

  if (value.startsWith("ES99 tail loss estimate is ")) {
    return value.replace("ES99 tail loss estimate is ", "Оценка ES99 tail loss: ");
  }

  if (value.startsWith("Breach day ")) {
    return value.replace("Breach day ", "День breach ");
  }

  if (value.includes(" to ") && /\b\d{4}\b/.test(value)) {
    return value.replace(" to ", " до ");
  }

  const replacements: Array<[string, string]> = [
    ["drilldown", "разбор"],
    ["pending", "ожидает"],
    ["queued", "в очереди"],
    ["locked", "заблокировано"],
    ["banking day", "банковский день"],
    ["banking days", "банковские дни"],
    ["selected on the map", "выбран на карте"],
    ["selected from the ledger", "выбран из ledger"],
    ["capital updated to", "капитал обновлён до"],
    ["condition edited locally", "условие изменено локально"],
  ];

  let nextValue = value;
  replacements.forEach(([from, to]) => {
    nextValue = nextValue.replaceAll(from, to);
  });

  return nextValue;
}

export function localizeMessage(language: Language, message: LocalizedMessage): string {
  return language === "ru" ? message.ru : message.en;
}
