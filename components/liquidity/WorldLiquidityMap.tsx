"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoGraticule, geoNaturalEarth1, geoPath } from "d3-geo";
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesAtlas from "world-atlas/countries-110m.json";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import {
  CloseIncidentDialog,
  DeepAnalyticsMatrix,
  FunctionProofDialog,
  IncidentAnalysisPanel,
  IncidentDetailsDialog,
  ModelReportDialog,
  TicketDialog,
} from "@/components/liquidity/IncidentAnalysisDemo";
import { DemoNav } from "@/components/liquidity/DemoNav";
import {
  buildAnalysisReport,
  createInitialAnalysisSteps,
  deepAnalyticsFunctions,
  defaultLiquidityIncident,
  runDeterministicLiquidityEnsemble,
} from "@/lib/liquidity-ml-ensemble";
import type { LocalizedMessage } from "@/lib/i18n";
import {
  buildTreasuryConditionEvents,
  listTreasuryAccounts,
  TREASURY_ACCOUNT_SEED,
  type TreasuryAccount,
  type TreasuryConditionEvent,
  type TreasuryCountry,
  type TreasuryCurrency,
  type TreasuryRail,
} from "@/lib/treasury-ledger";
import type {
  AnalysisStepState,
  DeepAnalyticsFunction,
  DeepAnalyticsGroup,
  EnsembleAnalysisResult,
  IncidentLifecycle,
  IncidentSeverity,
  LiquidityIncident,
} from "@/lib/liquidity-ml-ensemble";

type AccountCountry = TreasuryCountry;
type Currency = TreasuryCurrency;
type TransferSystem = TreasuryRail;
type ScenarioState = "clear" | "warning" | "blocked";
type MapLayerKey = "risk" | "rails" | "calendar" | "nodes";
type MapLayers = Record<MapLayerKey, boolean>;

const mapOperationalFunctionIds = new Set([
  "liquidity-forecast",
  "anomaly-filtering",
  "known-events",
  "risk-status",
  "hhi",
  "ccri",
  "mip-optimizer",
  "stress-testing",
  "contingency-plan",
  "recommendation-approval",
  "explainability",
  "demo-snapshot",
]);

const mapLayerCopy: Array<{
  key: MapLayerKey;
  label: LocalizedMessage;
  detail: LocalizedMessage;
}> = [
  {
    key: "risk",
    label: { en: "Risk zones", ru: "Зоны риска" },
    detail: { en: "Incident marker, anomaly radius, popup", ru: "Маркер инцидента, радиус аномалии, popup" },
  },
  {
    key: "rails",
    label: { en: "Transfer rails", ru: "Transfer rails" },
    detail: { en: "SWIFT/Fedwire/TARGET2 route paths", ru: "Маршруты SWIFT/Fedwire/TARGET2" },
  },
  {
    key: "calendar",
    label: { en: "Calendar pressure", ru: "Календарное давление" },
    detail: { en: "Banking-day and seasonality notices", ru: "Banking-day и seasonality notices" },
  },
  {
    key: "nodes",
    label: { en: "Bank nodes", ru: "Банковские узлы" },
    detail: { en: "Clickable accounts and selected balance card", ru: "Кликабельные счета и карточка баланса" },
  },
];
type BankingDayState = "open" | "cutoff" | "closed" | "usable";
type LabelSide = "left" | "right" | "above" | "below";
type IncidentModal = "details" | "models" | "ticket" | "close" | "function" | null;
type AccountConditionStatus = "due" | "watch" | "ready" | "blocked";

type AccountLocation = {
  country: AccountCountry;
  city: string;
  x: number;
  y: number;
  latitude: number;
  longitude: number;
  labelSide: LabelSide;
  currency: Currency;
  defaultBank: string;
  defaultCapital: number;
  floor: number;
  primaryRail: TransferSystem;
  generatedCondition: string;
};

type MapAccount = AccountLocation & {
  id: string;
  accountCode: string;
  bank: string;
  capital: number;
  condition: string;
  ledgerUpdatedAt: string;
  usableBalance: number;
};

type AccountConditionEvent = TreasuryConditionEvent;

type TransferLeg = {
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  system: TransferSystem;
  state: ScenarioState;
  label: string;
  eta: string;
  window: string;
  calendarNote: string;
};

type BankingDay = {
  label: string;
  region: string;
  state: BankingDayState;
  note: string;
};

type SeasonalityPoint = {
  label: string;
  value: number;
};

type CalendarInsight = {
  title: string;
  summary: string;
  effect: string;
  days: BankingDay[];
  seasonality: SeasonalityPoint[];
};

type SimulationScenario = {
  id: string;
  title: string;
  desk: string;
  accountId: string;
  debit: number;
  currency: Currency;
  condition: string;
  transferLegs: TransferLeg[];
  programResponse: string[];
  decision: string;
  calendar: CalendarInsight;
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

type WorldAtlasTopology = Topology<{ countries: GeometryCollection }>;
type ProjectedPoint = { x: number; y: number };

const worldTopology = countriesAtlas as unknown as WorldAtlasTopology;
const worldCountries = feature(
  worldTopology,
  worldTopology.objects.countries,
) as FeatureCollection<Geometry, { name?: string }>;
const worldGraticule = geoGraticule().step([20, 20])();
const sphere = { type: "Sphere" } as GeoPermissibleObjects;

const countryNameByAccountCountry: Record<AccountCountry, string> = {
  Germany: "Germany",
  Japan: "Japan",
  Kazakhstan: "Kazakhstan",
  "Saudi Arabia": "Saudi Arabia",
  Singapore: "Singapore",
  UAE: "United Arab Emirates",
  "United Kingdom": "United Kingdom",
  "United States": "United States of America",
};

function toMapAccount(account: TreasuryAccount): MapAccount {
  return {
    accountCode: account.accountCode,
    bank: account.bank,
    capital: account.balance,
    condition: account.condition.en,
    country: account.country,
    currency: account.currency,
    defaultBank: account.bank,
    defaultCapital: account.balance,
    floor: account.survivalFloor,
    generatedCondition: account.condition.en,
    id: account.id,
    labelSide: account.labelSide,
    latitude: account.latitude,
    ledgerUpdatedAt: account.updatedAt,
    longitude: account.longitude,
    primaryRail: account.primaryRail,
    city: account.city,
    usableBalance: account.usableBalance,
    x: account.x,
    y: account.y,
  };
}

const locations: AccountLocation[] = TREASURY_ACCOUNT_SEED.map((account) => toMapAccount(account));
const initialAccounts: MapAccount[] = TREASURY_ACCOUNT_SEED.map(toMapAccount);

const conditionStatusCopy: Record<AccountConditionStatus, LocalizedMessage> = {
  blocked: { en: "Breached", ru: "Нарушено" },
  due: { en: "Due", ru: "К оплате" },
  ready: { en: "Ready", ru: "Готово" },
  watch: { en: "Watch", ru: "Наблюдать" },
};

const accountConditionBooks: Record<string, AccountConditionEvent[]> = {
  Dubai: [
    {
      id: "dubai-correspondent-fee",
      label: { en: "Correspondent fee settlement", ru: "Комиссия correspondent bank" },
      due: { en: "Today 15:00 GST", ru: "Сегодня 15:00 GST" },
      amount: 410_000,
      currency: "USD",
      rail: "SWIFT",
      status: "watch",
      impact: { en: "Reserve must remain above USD floor until cover leg clears.", ru: "Резерв должен оставаться выше USD-floor до клиринга cover leg." },
      proof: { en: "Linked to delayed correspondent-bank route.", ru: "Связано с задержанным correspondent-bank route." },
    },
    {
      id: "dubai-vendor-payout",
      label: { en: "Regional vendor payout", ru: "Региональная оплата поставщикам" },
      due: { en: "Tomorrow 11:30 GST", ru: "Завтра 11:30 GST" },
      amount: 790_000,
      currency: "USD",
      rail: "SWIFT",
      status: "due",
      impact: { en: "Creates same-currency outflow pressure before next inbound sweep.", ru: "Создаёт давление USD-оттока до следующего входящего sweep." },
      proof: { en: "Matched against merchant payout calendar.", ru: "Сверено с календарём merchant payouts." },
    },
    {
      id: "dubai-tax-accrual",
      label: { en: "VAT accrual hold", ru: "Резерв под VAT accrual" },
      due: { en: "T+2 10:00 GST", ru: "T+2 10:00 GST" },
      amount: 260_000,
      currency: "USD",
      rail: "Tax portal",
      status: "ready",
      impact: { en: "Small but locked reserve; do not count as usable liquidity.", ru: "Небольшой, но заблокированный резерв; не считать доступной ликвидностью." },
      proof: { en: "Policy tags it as restricted cash.", ru: "Policy помечает это как restricted cash." },
    },
  ],
  Frankfurt: [
    {
      id: "frankfurt-supplier-settlement",
      label: { en: "EUR supplier settlement", ru: "EUR-расчёт с поставщиком" },
      due: { en: "Today 17:00 CET", ru: "Сегодня 17:00 CET" },
      amount: 3_600_000,
      currency: "EUR",
      rail: "TARGET2",
      status: "watch",
      impact: { en: "TARGET2 close can make the buffer unusable for New York support.", ru: "TARGET2 close может сделать буфер недоступным для поддержки New York." },
      proof: { en: "Scenario 02 route constraint.", ru: "Route constraint из сценария 02." },
    },
    {
      id: "frankfurt-tax-prepayment",
      label: { en: "Corporate tax prepayment", ru: "Авансовый корпоративный налог" },
      due: { en: "Tomorrow 09:00 CET", ru: "Завтра 09:00 CET" },
      amount: 860_000,
      currency: "EUR",
      rail: "Tax portal",
      status: "due",
      impact: { en: "Reduces EUR liquidity floor headroom.", ru: "Снижает запас над EUR liquidity floor." },
      proof: { en: "Known-events calendar lock.", ru: "Блокировка из календаря known events." },
    },
    {
      id: "frankfurt-cash-pool",
      label: { en: "Intragroup cash-pool sweep", ru: "Intragroup cash-pool sweep" },
      due: { en: "T+1 12:00 CET", ru: "T+1 12:00 CET" },
      amount: 1_100_000,
      currency: "EUR",
      rail: "Internal ledger",
      status: "ready",
      impact: { en: "Eligible internal liquidity, but still requires policy approval.", ru: "Разрешённая внутренняя ликвидность, но всё ещё требует policy approval." },
      proof: { en: "Entity and signer checks pass.", ru: "Entity и signer checks проходят." },
    },
  ],
  London: [
    {
      id: "london-fx-margin",
      label: { en: "FX margin call", ru: "FX margin call" },
      due: { en: "Today 14:30 GMT", ru: "Сегодня 14:30 GMT" },
      amount: 540_000,
      currency: "USD",
      rail: "SWIFT",
      status: "watch",
      impact: { en: "Consumes fallback USD while FX window is still open.", ru: "Съедает fallback USD, пока FX-window ещё открыт." },
      proof: { en: "Treasury desk request is active.", ru: "Запрос treasury desk активен." },
    },
    {
      id: "london-payroll",
      label: { en: "UK payroll reserve", ru: "Резерв под UK payroll" },
      due: { en: "Friday 09:00 GMT", ru: "Пятница 09:00 GMT" },
      amount: 470_000,
      currency: "USD",
      rail: "Internal ledger",
      status: "due",
      impact: { en: "Payroll cash is ring-fenced from rescue routing.", ru: "Payroll cash исключён из rescue routing." },
      proof: { en: "Payroll-season buffer rule.", ru: "Правило payroll-season buffer." },
    },
    {
      id: "london-card-settlement",
      label: { en: "Card scheme settlement", ru: "Расчёт card scheme" },
      due: { en: "T+1 16:00 GMT", ru: "T+1 16:00 GMT" },
      amount: 330_000,
      currency: "USD",
      rail: "SWIFT",
      status: "ready",
      impact: { en: "Low urgency, but adds batch outflow tail risk.", ru: "Низкая срочность, но добавляет batch outflow tail risk." },
      proof: { en: "Batch file already staged.", ru: "Batch file уже staged." },
    },
  ],
  "New York": [
    {
      id: "ny-credit-repayment",
      label: { en: "Corporate loan repayment", ru: "Погашение корпоративного кредита" },
      due: { en: "Today 16:00 ET", ru: "Сегодня 16:00 ET" },
      amount: 2_300_000,
      currency: "USD",
      rail: "Fedwire",
      status: "blocked",
      impact: { en: "Would breach the USD survival floor before cover is usable.", ru: "Пробивает USD survival floor до того, как cover станет доступным." },
      proof: { en: "Golden Incident driver.", ru: "Драйвер Golden Incident." },
    },
    {
      id: "ny-federal-tax",
      label: { en: "Federal tax escrow", ru: "Федеральный налоговый escrow" },
      due: { en: "Tomorrow 10:00 ET", ru: "Завтра 10:00 ET" },
      amount: 620_000,
      currency: "USD",
      rail: "Tax portal",
      status: "due",
      impact: { en: "Restricted reserve cannot fund the payout queue.", ru: "Restricted reserve не может финансировать очередь выплат." },
      proof: { en: "Tax calendar known event.", ru: "Known event из налогового календаря." },
    },
    {
      id: "ny-payroll-sweep",
      label: { en: "Payroll sweep", ru: "Payroll sweep" },
      due: { en: "Friday 09:30 ET", ru: "Пятница 09:30 ET" },
      amount: 1_100_000,
      currency: "USD",
      rail: "Fedwire",
      status: "watch",
      impact: { en: "Raises payroll-season buffer and worsens p05 gap.", ru: "Поднимает payroll-season buffer и ухудшает p05 gap." },
      proof: { en: "Seasonality model adds +1 banking day buffer.", ru: "Seasonality model добавляет +1 banking-day buffer." },
    },
    {
      id: "ny-card-reserve",
      label: { en: "Card settlement reserve", ru: "Резерв card settlement" },
      due: { en: "T+1 18:00 ET", ru: "T+1 18:00 ET" },
      amount: 480_000,
      currency: "USD",
      rail: "Internal ledger",
      status: "ready",
      impact: { en: "Can be throttled after governance approval.", ru: "Можно throttling после governance approval." },
      proof: { en: "Contingency plan: ledger move + residual throttle.", ru: "Contingency plan: ledger move + residual throttle." },
    },
  ],
  Riyadh: [
    {
      id: "riyadh-dollar-reserve",
      label: { en: "USD reserve hold", ru: "Резерв USD" },
      due: { en: "Today 18:00 AST", ru: "Сегодня 18:00 AST" },
      amount: 650_000,
      currency: "USD",
      rail: "SARIE",
      status: "ready",
      impact: { en: "Can support New York only inside the overlapping window.", ru: "Может поддержать New York только в пересекающееся окно." },
      proof: { en: "Standby sweep in NY credit scenario.", ru: "Standby sweep в NY credit scenario." },
    },
    {
      id: "riyadh-vendor-tax",
      label: { en: "Withholding tax reserve", ru: "Резерв withholding tax" },
      due: { en: "T+1 10:00 AST", ru: "T+1 10:00 AST" },
      amount: 280_000,
      currency: "USD",
      rail: "Tax portal",
      status: "due",
      impact: { en: "Keeps local reserve locked after oil revenue delay.", ru: "Держит локальный резерв заблокированным после задержки oil revenue." },
      proof: { en: "Known event from regional tax file.", ru: "Known event из regional tax file." },
    },
    {
      id: "riyadh-oil-sweep",
      label: { en: "Oil revenue sweep", ru: "Oil revenue sweep" },
      due: { en: "T+2 13:00 AST", ru: "T+2 13:00 AST" },
      amount: 900_000,
      currency: "USD",
      rail: "SWIFT",
      status: "watch",
      impact: { en: "Inbound timing is uncertain; do not use as hard collateral.", ru: "Время inbound неопределённо; не использовать как hard collateral." },
      proof: { en: "Telemetry marks delayed status.", ru: "Telemetry помечает delayed status." },
    },
  ],
  Singapore: [
    {
      id: "singapore-merchant-payout",
      label: { en: "Merchant payout batch", ru: "Merchant payout batch" },
      due: { en: "Today 17:30 SGT", ru: "Сегодня 17:30 SGT" },
      amount: 1_950_000,
      currency: "USD",
      rail: "MEPS+",
      status: "watch",
      impact: { en: "Payout lands before inbound cash and creates APAC pressure.", ru: "Payout проходит до входящего cash и создаёт APAC pressure." },
      proof: { en: "Scenario 03 condition.", ru: "Условие сценария 03." },
    },
    {
      id: "singapore-gst",
      label: { en: "GST tax payment", ru: "GST tax payment" },
      due: { en: "Tomorrow 12:00 SGT", ru: "Завтра 12:00 SGT" },
      amount: 310_000,
      currency: "USD",
      rail: "Tax portal",
      status: "due",
      impact: { en: "Tax reserve is not movable through treasury rails.", ru: "Налоговый резерв нельзя перемещать через treasury rails." },
      proof: { en: "Policy lock: statutory payment.", ru: "Policy lock: statutory payment." },
    },
    {
      id: "singapore-cover-to-ny",
      label: { en: "New York cover leg", ru: "Cover leg в New York" },
      due: { en: "T+1 bank day", ru: "T+1 банковский день" },
      amount: 1_250_000,
      currency: "USD",
      rail: "SWIFT",
      status: "blocked",
      impact: { en: "Book balance exists, but usable cash misses NY cut-off.", ru: "Book balance есть, но usable cash не успевает к NY cut-off." },
      proof: { en: "Golden Incident p05 gap remains.", ru: "P05 gap Golden Incident сохраняется." },
    },
  ],
  Tokyo: [
    {
      id: "tokyo-custody-fee",
      label: { en: "Custody fee settlement", ru: "Расчёт custody fee" },
      due: { en: "Today 18:00 JST", ru: "Сегодня 18:00 JST" },
      amount: 520_000,
      currency: "USD",
      rail: "SWIFT",
      status: "watch",
      impact: { en: "Overnight hold reduces support available to US corridor.", ru: "Overnight hold снижает поддержку US corridor." },
      proof: { en: "Custody event collides with liquidity hold.", ru: "Custody event конфликтует с liquidity hold." },
    },
    {
      id: "tokyo-tax-withhold",
      label: { en: "Local tax withholding", ru: "Локальный tax withholding" },
      due: { en: "T+1 10:00 JST", ru: "T+1 10:00 JST" },
      amount: 240_000,
      currency: "USD",
      rail: "Tax portal",
      status: "due",
      impact: { en: "Small statutory lock, excluded from optimizer pool.", ru: "Небольшой statutory lock, исключён из optimizer pool." },
      proof: { en: "Governance policy: statutory cash.", ru: "Governance policy: statutory cash." },
    },
    {
      id: "tokyo-usd-sweep",
      label: { en: "USD liquidity sweep", ru: "USD liquidity sweep" },
      due: { en: "T+2 09:00 JST", ru: "T+2 09:00 JST" },
      amount: 870_000,
      currency: "USD",
      rail: "Internal ledger",
      status: "ready",
      impact: { en: "Eligible after local sign-off; not useful for same-day rescue.", ru: "Доступно после local sign-off; не помогает same-day rescue." },
      proof: { en: "Signer approval pending local office hours.", ru: "Signer approval ждёт local office hours." },
    },
  ],
};

const scenarios: SimulationScenario[] = [
  {
    id: "ny-credit",
    title: "NY credit repayment",
    desk: "Treasury jury scenario 01",
    accountId: "new-york",
    debit: 2_300_000,
    currency: "USD",
    condition: "A corporate loan repayment hits the New York USD account at 16:00 ET.",
    transferLegs: [
      {
        from: "singapore",
        to: "new-york",
        amount: 1_250_000,
        currency: "USD",
        system: "SWIFT",
        state: "warning",
        label: "DBS to JPM cover",
        eta: "T+1 bank day",
        window: "after NY cut-off",
        calendarNote: "Singapore is open, but New York usability slips one banking day.",
      },
      {
        from: "riyadh",
        to: "new-york",
        amount: 650_000,
        currency: "USD",
        system: "SWIFT",
        state: "clear",
        label: "SNB standby sweep",
        eta: "6h 20m",
        window: "same-day cover",
        calendarNote: "Riyadh operating window overlaps the New York afternoon session.",
      },
    ],
    programResponse: [
      "Detects New York would fall below the USD survival floor after the repayment.",
      "Routes a SWIFT cover payment from Singapore and a smaller standby sweep from Riyadh.",
      "Keeps Frankfurt EUR untouched because currency mismatch would add FX and settlement risk.",
    ],
    decision: "Approve repayment only after SWIFT cover is confirmed; otherwise hold for treasurer approval.",
    calendar: {
      title: "NY cut-off turns cash into T+1 liquidity",
      summary: "The book balance exists today, but the DBS cover becomes usable after the New York credit window.",
      effect: "+1 banking day, payroll-season buffer raised",
      days: [
        { label: "Wed", region: "NY", state: "cutoff", note: "loan debit 16:00 ET" },
        { label: "Thu", region: "SG", state: "open", note: "DBS cover leaves" },
        { label: "Fri", region: "NY", state: "usable", note: "funds usable" },
        { label: "Sat", region: "US", state: "closed", note: "weekend lock" },
        { label: "Sun", region: "US", state: "closed", note: "no settlement" },
      ],
      seasonality: [
        { label: "Payroll", value: 72 },
        { label: "Tax", value: 46 },
        { label: "Month-end", value: 84 },
        { label: "Holiday", value: 31 },
      ],
    },
  },
  {
    id: "frankfurt-clearing",
    title: "Frankfurt EUR clearing",
    desk: "Treasury jury scenario 02",
    accountId: "frankfurt",
    debit: 3_600_000,
    currency: "EUR",
    condition: "A EUR supplier settlement is booked against Frankfurt during TARGET2 close.",
    transferLegs: [
      {
        from: "frankfurt",
        to: "frankfurt",
        amount: 3_600_000,
        currency: "EUR",
        system: "TARGET2",
        state: "blocked",
        label: "TARGET2 debit",
        eta: "blocked",
        window: "TARGET2 close",
        calendarNote: "The debit lands after the EUR settlement window and cannot be made usable today.",
      },
    ],
    programResponse: [
      "Flags Frankfurt as a policy breach because post-trade usable cash drops under the EUR floor.",
      "Blocks automatic release and asks for either partial settlement or extra EUR funding.",
      "Shows no USD route because cross-currency rescue is not pre-approved in the scenario.",
    ],
    decision: "Reject auto-release; split the settlement or require manual CFO override.",
    calendar: {
      title: "TARGET2 close blocks same-day usability",
      summary: "The EUR debit arrives during the closing window, so the optimizer treats book cash as unavailable.",
      effect: "auto-release rejected, manual split required",
      days: [
        { label: "Wed", region: "DE", state: "cutoff", note: "TARGET2 close" },
        { label: "Thu", region: "EU", state: "open", note: "next clear window" },
        { label: "Fri", region: "EU", state: "usable", note: "split settles" },
        { label: "Sat", region: "EU", state: "closed", note: "weekend lock" },
        { label: "Sun", region: "EU", state: "closed", note: "no settlement" },
      ],
      seasonality: [
        { label: "Supplier", value: 78 },
        { label: "Tax", value: 63 },
        { label: "Month-end", value: 91 },
        { label: "Holiday", value: 38 },
      ],
    },
  },
  {
    id: "singapore-payout",
    title: "Singapore merchant payout",
    desk: "Treasury jury scenario 03",
    accountId: "singapore",
    debit: 1_950_000,
    currency: "USD",
    condition: "APAC merchant payout batch lands on the Singapore account before inbound cash arrives.",
    transferLegs: [
      {
        from: "new-york",
        to: "singapore",
        amount: 900_000,
        currency: "USD",
        system: "SWIFT",
        state: "clear",
        label: "JPM liquidity bridge",
        eta: "4h 45m",
        window: "APAC same day",
        calendarNote: "New York sends before Singapore payout cut-off, so cash remains usable today.",
      },
      {
        from: "riyadh",
        to: "singapore",
        amount: 400_000,
        currency: "USD",
        system: "SARIE",
        state: "warning",
        label: "Saudi reserve release",
        eta: "T+1 bank day",
        window: "reserve fallback",
        calendarNote: "Reserve is modeled as fallback because local window overlap is thin.",
      },
    ],
    programResponse: [
      "Forecast sees the payout collide with missing inbound settlement.",
      "Uses New York as first rescue rail and Riyadh as reserve only if Singapore remains below floor.",
      "Leaves an audit trace showing amount, rail, source account, and residual buffer.",
    ],
    decision: "Proceed with payout after liquidity bridge; throttle last 20% if SWIFT confirmation is late.",
    calendar: {
      title: "APAC payout season raises the Singapore floor",
      summary: "The payout falls in a merchant settlement peak, so the model increases the reserve before approving release.",
      effect: "seasonal buffer +18%, fallback rail armed",
      days: [
        { label: "Wed", region: "SG", state: "open", note: "payout batch" },
        { label: "Thu", region: "US", state: "open", note: "JPM bridge" },
        { label: "Fri", region: "SG", state: "usable", note: "cash usable" },
        { label: "Sat", region: "SG", state: "closed", note: "weekend lock" },
        { label: "Sun", region: "SG", state: "closed", note: "no settlement" },
      ],
      seasonality: [
        { label: "Merchant", value: 88 },
        { label: "Payroll", value: 54 },
        { label: "Month-end", value: 76 },
        { label: "Holiday", value: 43 },
      ],
    },
  },
];

type RandomProblem = {
  conditionBooks: Record<string, AccountConditionEvent[]>;
  incident: LiquidityIncident;
  scenario: SimulationScenario;
};

const anomalyTemplates = [
  {
    type: "ML-detected payroll liquidity anomaly",
    event: "Payroll reserve spike",
    debitLabel: "payroll sweep",
    risk: "Payroll-season buffer rises before inbound cover is usable",
    impact: "Payroll reserve pressure can breach the survival floor before local cut-off.",
  },
  {
    type: "ML-detected tax reserve anomaly",
    event: "Statutory tax hold",
    debitLabel: "tax reserve",
    risk: "Statutory cash becomes restricted and leaves less usable liquidity",
    impact: "Restricted cash is visible in book balance but excluded from rescue liquidity.",
  },
  {
    type: "ML-detected merchant settlement anomaly",
    event: "Merchant settlement batch",
    debitLabel: "merchant payout batch",
    risk: "Merchant payout seasonality collides with delayed incoming settlement",
    impact: "Batch outflow lands before the cover rail becomes available.",
  },
  {
    type: "ML-detected correspondent rail anomaly",
    event: "Correspondent bank delay",
    debitLabel: "correspondent cover delay",
    risk: "Correspondent bank timing pushes liquidity into the next banking day",
    impact: "The route remains legal, but not usable before the selected account cut-off.",
  },
  {
    type: "ML-detected debt service anomaly",
    event: "Credit repayment collision",
    debitLabel: "debt service payment",
    risk: "Debt service debit overlaps with a weak p05 liquidity corridor",
    impact: "The payment can drain usable cash below the survival floor unless cover arrives first.",
  },
] as const;

function buildRandomProblem(accounts: MapAccount[], runIndex: number): RandomProblem {
  const activeAccounts = accounts.length ? accounts : initialAccounts;
  const target = randomItem(activeAccounts);
  const template = randomItem(anomalyTemplates);
  const sourceCandidates = activeAccounts.filter((account) => account.id !== target.id && account.currency === target.currency);
  const primarySource = randomItem(sourceCandidates.length ? sourceCandidates : activeAccounts.filter((account) => account.id !== target.id)) ?? target;
  const secondaryCandidates = sourceCandidates.filter((account) => account.id !== primarySource.id);
  const secondarySource = secondaryCandidates.length ? randomItem(secondaryCandidates) : null;
  const requiredBuffer = target.floor;
  const baseUsable = Math.max(target.usableBalance || target.capital - target.floor * 0.35, target.floor * 0.35);
  const scheduledDebit = roundMoney(randomBetween(target.floor * 0.42, Math.max(target.floor * 1.35, target.capital * 0.42)));
  const plannedInbound = roundMoney(randomBetween(target.floor * 0.18, target.floor * 0.62));
  const settlementDelayHours = Math.round(randomBetween(4, 48));
  const forceBreach = Math.random() > 0.22;
  const p05Balance = forceBreach
    ? roundMoney(randomBetween(Math.max(target.floor * 0.22, 80_000), target.floor * 0.92))
    : roundMoney(randomBetween(target.floor * 1.02, target.floor * 1.32));
  const p50Balance = roundMoney(Math.max(p05Balance + randomBetween(target.floor * 0.18, target.floor * 0.78), baseUsable * 0.72));
  const anomalyZScore = Number(randomBetween(3.2, 7.8).toFixed(1));
  const hhiAfterStress = Number(randomBetween(0.22, 0.43).toFixed(3));
  const es99Loss = roundMoney(Math.max(requiredBuffer - p05Balance, 0) + randomBetween(target.floor * 0.16, target.floor * 0.86));
  const ccriDowngradeDelta = Math.round(randomBetween(8, 34));
  const incidentId = `INC-${target.city.toUpperCase().replaceAll(" ", "-")}-${Date.now().toString().slice(-5)}-${String(runIndex).padStart(2, "0")}`;
  const severity: IncidentSeverity =
    p05Balance < target.floor * 0.45 ? "critical" : p05Balance < target.floor ? "high" : anomalyZScore > 5.3 ? "medium" : "low";
  const routeState: ScenarioState = p05Balance < target.floor * 0.55 ? "blocked" : p05Balance < target.floor ? "warning" : "clear";
  const transferLegs: TransferLeg[] = [
    {
      from: primarySource.id,
      to: target.id,
      amount: plannedInbound,
      currency: target.currency,
      system: primarySource.primaryRail,
      state: settlementDelayHours > 24 ? "warning" : "clear",
      label: `${primarySource.bank} cover`,
      eta: settlementDelayHours >= 24 ? "T+1 bank day" : `${settlementDelayHours}h cover`,
      window: settlementDelayHours >= 18 ? "after local cut-off" : "same-day window",
      calendarNote: `${primarySource.city} can fund ${target.city}, but delay is ${settlementDelayHours}h.`,
    },
  ];

  if (secondarySource) {
    transferLegs.push({
      from: secondarySource.id,
      to: target.id,
      amount: roundMoney(plannedInbound * randomBetween(0.28, 0.58)),
      currency: target.currency,
      system: secondarySource.primaryRail,
      state: Math.random() > 0.5 ? "warning" : "clear",
      label: `${secondarySource.bank} fallback`,
      eta: Math.random() > 0.5 ? "same-day fallback" : "T+1 fallback",
      window: "reserve fallback",
      calendarNote: `${secondarySource.city} is kept as fallback because optimizer protects its own floor.`,
    });
  }

  const incident: LiquidityIncident = {
    id: incidentId,
    accountId: target.id,
    affectedObjects: [target.accountCode, `${primarySource.bank} cover`, target.primaryRail, template.event],
    bank: target.bank,
    city: target.city,
    coordinates: {
      latitude: target.latitude,
      longitude: target.longitude,
    },
    description: `${template.event} appears on ${target.bank} / ${target.accountCode}; the model tests whether book cash is actually usable before ${target.primaryRail} cut-off.`,
    detectedAt: new Date().toISOString(),
    expectedBehavior: `${target.city} should stay above ${formatMoney(requiredBuffer, target.currency)} after scheduled debits and confirmed inbound liquidity.`,
    mapZone: `${target.city} ${target.primaryRail} liquidity zone`,
    observedBehavior: `Generated p05 usable liquidity is ${formatMoney(p05Balance, target.currency)} against a ${formatMoney(requiredBuffer, target.currency)} survival floor.`,
    riskFactors: [
      template.risk,
      `${settlementDelayHours}h settlement delay on cover rail`,
      `MAD z-score ${anomalyZScore.toFixed(1)} for the account window`,
      `HHI after stress ${hhiAfterStress.toFixed(3)}`,
    ],
    severity,
    source: "Randomized map generator / live ledger / settlement calendar",
    status: "Awaiting ML ensemble analysis",
    telemetry: {
      anomalyZScore,
      ccriDowngradeDelta,
      es99Loss,
      hhiAfterStress,
      p05Balance,
      p50Balance,
      requiredBuffer,
      scheduledDebit,
      settlementDelayHours,
    },
    title: `${target.city} ${template.event}`,
    type: template.type,
  };

  const scenario: SimulationScenario = {
    id: `generated-${target.id}-${incidentId.toLowerCase()}`,
    accountId: target.id,
    calendar: buildGeneratedCalendar(target, template.event, settlementDelayHours),
    condition: incident.description,
    currency: target.currency,
    debit: scheduledDebit,
    decision:
      routeState === "blocked"
        ? `Block auto-release for ${target.city}; create treasury review before ${target.primaryRail} cut-off.`
        : routeState === "warning"
          ? `Hold ${target.city} transfer until cover rail confirms usable liquidity.`
          : `Allow watch-listed routing for ${target.city} with refreshed p05 after cover.`,
    desk: `Generated ML scenario ${String(runIndex).padStart(2, "0")}`,
    programResponse: [
      `Generated anomaly on ${target.bank} / ${target.accountCode}.`,
      `Evaluated p05 ${formatMoney(p05Balance, target.currency)} vs floor ${formatMoney(requiredBuffer, target.currency)}.`,
      `Tested ${transferLegs.length} cover route${transferLegs.length === 1 ? "" : "s"} and settlement delay ${settlementDelayHours}h.`,
      `Created fresh model report from telemetry instead of replaying the New York incident.`,
    ],
    title: `${target.city} generated anomaly`,
    transferLegs,
  };

  return {
    conditionBooks: Object.fromEntries(
      activeAccounts.map((account) => [
        account.id,
        buildRandomConditionEvents(account, account.id === target.id ? template.event : randomItem(anomalyTemplates).event, account.id === target.id),
      ]),
    ),
    incident,
    scenario,
  };
}

function buildGeneratedCalendar(account: MapAccount, event: string, delayHours: number): CalendarInsight {
  const states: BankingDayState[] = ["open", "cutoff", "usable", "closed"];
  return {
    title: `${account.city} ${event} timing pressure`,
    summary: `${event} changes when ${account.currency} liquidity becomes usable for ${account.bank}.`,
    effect: `${delayHours}h settlement delay, ${account.primaryRail} cut-off pressure`,
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, index) => ({
      label,
      region: account.city,
      state: index === 1 ? "cutoff" : states[Math.floor(Math.random() * states.length)],
      note: index === 1 ? event : `${account.primaryRail} ${index < 2 ? "watch" : "usable"} window`,
    })),
    seasonality: ["Payroll", "Tax", "Merchant", "FX", "Holiday"].map((label) => ({
      label,
      value: Math.round(randomBetween(22, 96)),
    })),
  };
}

function buildRandomConditionEvents(account: MapAccount, eventName: string, isTarget: boolean): AccountConditionEvent[] {
  const statuses: AccountConditionStatus[] = isTarget ? ["blocked", "due", "watch", "ready"] : ["due", "watch", "ready"];
  const rails: Array<AccountConditionEvent["rail"]> = [account.primaryRail, "Tax portal", "Internal ledger", "SWIFT"];
  const labels = [
    eventName,
    "FX control reserve",
    "Tax and statutory hold",
    "Vendor payout queue",
    "Payroll liquidity buffer",
  ];

  return labels.slice(0, Math.floor(randomBetween(3, 6))).map((label, index) => {
    const status = isTarget && index === 0 ? "blocked" : randomItem(statuses);
    const amount = roundMoney(randomBetween(account.floor * 0.08, Math.max(account.floor * 0.55, account.capital * 0.18)));
    const rail = randomItem(rails);
    return {
      id: `${account.id}-generated-${Date.now().toString().slice(-5)}-${index}`,
      amount,
      currency: account.currency,
      due: {
        en: index === 0 ? `Today via ${account.primaryRail}` : `T+${index} banking window`,
        ru: index === 0 ? `Сегодня через ${account.primaryRail}` : `T+${index} banking window`,
      },
      impact: {
        en: `${label} changes usable liquidity on ${account.bank}; generated for this ML run.`,
        ru: `${label} меняет usable liquidity на ${account.bank}; сгенерировано для этого ML-run.`,
      },
      label: { en: label, ru: label },
      proof: {
        en: "Generated from randomized treasury ledger conditions, not a static fixture.",
        ru: "Сгенерировано из randomized treasury ledger conditions, не из статичной fixture.",
      },
      rail,
      status,
    };
  });
}

function summarizeConditionEvents(account: MapAccount, events: AccountConditionEvent[], scenarioCondition?: string) {
  if (scenarioCondition) return scenarioCondition;

  const committedOutflow = events
    .filter((event) => event.status !== "ready")
    .reduce((sum, event) => sum + event.amount, 0);
  const hardEvents = events.filter((event) => event.status === "blocked" || event.status === "due").length;
  const leadingEvent = events[0]?.label.en ?? "randomized treasury condition";

  return `${account.primaryRail} generated condition for ${account.bank}: ${leadingEvent}; ${hardEvents} hard event${hardEvents === 1 ? "" : "s"} and ${formatMoney(committedOutflow, account.currency)} committed outflow can change usable liquidity.`;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * Math.max(max - min, 1);
}

function roundMoney(value: number) {
  return Math.max(10_000, Math.round(value / 10_000) * 10_000);
}

type WorldLiquidityMapProps = {
  surface?: "demo" | "map";
};

export function WorldLiquidityMap({ surface = "demo" }: WorldLiquidityMapProps) {
  const { language, message, t, translate } = useLanguage();
  const isMapSurface = surface === "map";
  const addFormRef = useRef<HTMLDivElement>(null);
  const initialRandomProblemRef = useRef(false);
  const [accounts, setAccounts] = useState<MapAccount[]>(initialAccounts);
  const [selectedId, setSelectedId] = useState(initialAccounts[0].id);
  const [scenarioCatalog, setScenarioCatalog] = useState<SimulationScenario[]>(scenarios);
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [simulationRan, setSimulationRan] = useState(true);
  const [incident, setIncident] = useState<LiquidityIncident>(defaultLiquidityIncident);
  const [randomProblemRun, setRandomProblemRun] = useState(0);
  const [conditionOverrides, setConditionOverrides] = useState<Record<string, AccountConditionEvent[]>>({});
  const [draftCountry, setDraftCountry] = useState<AccountCountry>("United Kingdom");
  const [draftBank, setDraftBank] = useState("HSBC UK");
  const [draftAccountCode, setDraftAccountCode] = useState("GB-USD-9302");
  const [draftCapital, setDraftCapital] = useState("2850000");
  const [draftCondition, setDraftCondition] = useState("auto");
  const [mapNotice, setMapNotice] = useState<LocalizedMessage>(() =>
    isMapSurface
      ? {
          en: "Operational map mode. Select nodes, run scenarios, and inspect liquidity rails.",
          ru: "Режим операционной карты. Выбирайте узлы, запускайте сценарии и проверяйте liquidity rails.",
        }
      : {
          en: "Map error detected on New York. Run ML analysis to explain the anomaly.",
          ru: "На карте обнаружена ошибка в New York. Запустите ML-анализ, чтобы объяснить аномалию.",
        },
  );
  const [mapError, setMapError] = useState<LocalizedMessage | null>(null);
  const [incidentLifecycle, setIncidentLifecycle] = useState<IncidentLifecycle>("detected");
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStepState[]>(() => createInitialAnalysisSteps());
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<EnsembleAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisRunId, setAnalysisRunId] = useState(0);
  const [incidentPopupOpen, setIncidentPopupOpen] = useState(true);
  const [activeFunctionGroup, setActiveFunctionGroup] = useState<DeepAnalyticsGroup>("Forecast & Data Science");
  const [activeModal, setActiveModal] = useState<IncidentModal>(null);
  const [selectedFunction, setSelectedFunction] = useState<DeepAnalyticsFunction | null>(null);
  const [ticketTitle, setTicketTitle] = useState("Review New York usable liquidity breach");
  const [ticketOwner, setTicketOwner] = useState("Treasury Ops");
  const [ticketNote, setTicketNote] = useState("Hold automatic release until SWIFT cover is confirmed.");
  const [ticketError, setTicketError] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [conditionBookAccountId, setConditionBookAccountId] = useState<string | null>(null);
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    risk: true,
    rails: true,
    calendar: true,
    nodes: true,
  });
  const clearMapError = useCallback(() => setMapError(null), []);
  const showNotice = useCallback((en: string, ru: string) => setMapNotice({ en, ru }), []);
  const showError = useCallback((en: string, ru: string) => setMapError({ en, ru }), []);

  const refreshLedgerAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/treasury/accounts", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { accounts?: TreasuryAccount[] };
      if (Array.isArray(payload.accounts)) {
        const nextAccounts = payload.accounts.map(toMapAccount);
        setAccounts(nextAccounts);
        setSelectedId((current) => (nextAccounts.some((account) => account.id === current) ? current : nextAccounts[0]?.id ?? current));
      }
    } catch {
      setAccounts(listTreasuryAccounts().map(toMapAccount));
    }
  }, []);

  const persistAccountPatch = useCallback(async (accountId: string, patch: { balance?: number; conditionText?: string }) => {
    try {
      const response = await fetch(`/api/treasury/accounts/${encodeURIComponent(accountId)}`, {
        body: JSON.stringify(patch),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { account?: TreasuryAccount };
      if (payload.account) {
        const nextAccount = toMapAccount(payload.account);
        setAccounts((current) => current.map((account) => (account.id === nextAccount.id ? nextAccount : account)));
      }
    } catch {
      // Keep local editing responsive even when the demo API is not available.
    }
  }, []);

  const generateRandomProblem = useCallback((origin: "auto" | "manual" = "manual") => {
    const nextRun = randomProblemRun + 1;
    const problem = buildRandomProblem(accounts, nextRun);
    const conditionSummaries = Object.fromEntries(
      accounts.map((account) => [
        account.id,
        summarizeConditionEvents(
          account,
          problem.conditionBooks[account.id] ?? getAccountConditionBook(account),
          account.id === problem.scenario.accountId ? problem.scenario.condition : undefined,
        ),
      ]),
    );
    setRandomProblemRun(nextRun);
    setScenarioCatalog((current) => [
      problem.scenario,
      ...current.filter((item) => item.id !== problem.scenario.id).slice(0, 5),
    ]);
    setScenarioId(problem.scenario.id);
    setIncident(problem.incident);
    setSelectedId(problem.scenario.accountId);
    setConditionOverrides(problem.conditionBooks);
    setConditionBookAccountId(problem.scenario.accountId);
    setSimulationRan(true);
    setAnalysisResult(null);
    setAnalysisError("");
    setAnalysisProgress(0);
    setAnalysisSteps(createInitialAnalysisSteps());
    setIncidentLifecycle("detected");
    setIncidentPopupOpen(true);
    setTicketId("");
    setTicketTitle(`Review ${problem.incident.city} generated liquidity anomaly`);
    setTicketNote(problem.incident.observedBehavior);
    setAccounts((current) =>
      current.map((account) => ({
        ...account,
        condition: conditionSummaries[account.id] ?? account.condition,
      })),
    );
    void Promise.all(
      accounts.map((account) =>
        persistAccountPatch(account.id, {
          conditionText: conditionSummaries[account.id] ?? account.condition,
        }),
      ),
    );
    clearMapError();
    showNotice(
      `${origin === "auto" ? "Auto-generated" : "Generated"} ${problem.incident.title}: p05 ${formatMoney(problem.incident.telemetry.p05Balance, problem.scenario.currency)} vs floor ${formatMoney(problem.incident.telemetry.requiredBuffer, problem.scenario.currency)}.`,
      `${origin === "auto" ? "Автоматически создана" : "Создана"} аномалия ${problem.incident.title}: p05 ${formatMoney(problem.incident.telemetry.p05Balance, problem.scenario.currency)} vs floor ${formatMoney(problem.incident.telemetry.requiredBuffer, problem.scenario.currency)}.`,
    );
  }, [accounts, clearMapError, persistAccountPatch, randomProblemRun, showNotice]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLedgerAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshLedgerAccounts]);

  useEffect(() => {
    if (initialRandomProblemRef.current) return undefined;
    const timer = window.setTimeout(() => {
      initialRandomProblemRef.current = true;
      generateRandomProblem("auto");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [generateRandomProblem]);

  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0];
  const scenario = scenarioCatalog.find((item) => item.id === scenarioId) ?? scenarioCatalog[0] ?? scenarios[0];
  const scenarioAccount = accounts.find((account) => account.id === scenario.accountId);
  const selectedConditionEvents = useMemo(
    () => conditionOverrides[selected.id] ?? getAccountConditionBook(selected),
    [conditionOverrides, selected],
  );
  const conditionBookVisible = conditionBookAccountId === selected.id;

  const totals = useMemo(() => {
    const usd = accounts.filter((account) => account.currency === "USD").reduce((sum, account) => sum + account.capital, 0);
    const eur = accounts.filter((account) => account.currency === "EUR").reduce((sum, account) => sum + account.capital, 0);
    return { usd, eur };
  }, [accounts]);

  const visibleAnalyticsFunctions = useMemo(
    () =>
      isMapSurface
        ? deepAnalyticsFunctions.filter((item) => mapOperationalFunctionIds.has(item.id))
        : deepAnalyticsFunctions,
    [isMapSurface],
  );

  const activeLayerCount = Object.values(mapLayers).filter(Boolean).length;
  const ledgerSignature = useMemo(
    () => accounts.map((account) => `${account.id}:${account.capital}:${account.condition}`).join("|"),
    [accounts],
  );

  const toggleMapLayer = (key: MapLayerKey) => {
    const layer = mapLayerCopy.find((item) => item.key === key);
    const nextVisible = !mapLayers[key];
    setMapLayers((current) => ({ ...current, [key]: !current[key] }));
    if (layer) {
      showNotice(
        `${layer.label.en} layer ${nextVisible ? "enabled" : "hidden"}.`,
        `Слой ${layer.label.ru} ${nextVisible ? "включён" : "скрыт"}.`,
      );
    }
    clearMapError();
  };

  const simulation = useMemo(() => {
    const account = accounts.find((item) => item.id === scenario.accountId);
    const balanceAfterDebit = account ? account.capital - scenario.debit : 0;
    const plannedInbound = scenario.transferLegs
      .filter((leg) => leg.to === scenario.accountId && leg.from !== leg.to)
      .reduce((sum, leg) => sum + leg.amount, 0);
    const balanceAfterProgram = balanceAfterDebit + plannedInbound;
    const floor = account?.floor ?? 0;
    const state: ScenarioState =
      balanceAfterDebit < floor && balanceAfterProgram < floor
        ? "blocked"
        : balanceAfterDebit < floor
          ? "warning"
          : "clear";

    return {
      account,
      balanceAfterDebit,
      balanceAfterProgram,
      floor,
      plannedInbound,
      state,
    };
  }, [accounts, scenario]);

  const selectedActivity = useMemo(() => {
    const inbound = scenario.transferLegs
      .filter((leg) => leg.to === selected.id && leg.from !== leg.to)
      .reduce((sum, leg) => sum + leg.amount, 0);
    const outbound = scenario.accountId === selected.id ? scenario.debit : 0;
    const status: ScenarioState =
      selected.id === scenario.accountId
        ? simulation.state
        : selected.capital < selected.floor
          ? "warning"
          : "clear";
    const otherAccounts = accounts.filter((account) => account.city === selected.city && account.id !== selected.id).length;

    return {
      inbound,
      outbound,
      otherAccounts,
      status,
    };
  }, [accounts, scenario, selected, simulation.state]);

  useEffect(() => {
    if (!activeModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal]);

  useEffect(() => {
    if (incidentLifecycle !== "analysisRunning" || analysisRunId === 0) return;

    const steps = createInitialAnalysisSteps();
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    steps.forEach((step, index) => {
      timers.push(
        setTimeout(() => {
          setAnalysisSteps((current) =>
            current.map((item, itemIndex) => {
              if (itemIndex < index) return { ...item, status: "completed" };
              if (item.id === step.id) return { ...item, status: "running" };
              return item;
            }),
          );
          setAnalysisProgress(Math.round((index / steps.length) * 100));
        }, index * 620),
      );

      timers.push(
        setTimeout(() => {
          setAnalysisSteps((current) =>
            current.map((item, itemIndex) =>
              itemIndex <= index ? { ...item, status: "completed" } : item,
            ),
          );
          setAnalysisProgress(Math.round(((index + 1) / steps.length) * 100));
        }, index * 620 + 420),
      );
    });

    timers.push(
      setTimeout(() => {
        const result = runDeterministicLiquidityEnsemble(incident);
        setAnalysisResult(result);
        setIncidentLifecycle("analysisCompleted");
        setAnalysisProgress(100);
        setAnalysisSteps(createInitialAnalysisSteps().map((step) => ({ ...step, status: "completed" })));
        clearMapError();
        showNotice(
          `${result.finalVerdict}. Confidence ${result.confidence}%, risk score ${result.riskScore}/100.`,
          `ML-отчет готов: ${result.finalVerdict}. Confidence ${result.confidence}%, risk score ${result.riskScore}/100.`,
        );
      }, steps.length * 620 + 520),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [analysisRunId, clearMapError, incident, incidentLifecycle, showNotice]);

  const addAccount = async () => {
    const formValue = (name: string, fallback: string) =>
      addFormRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? fallback;
    const formCountry = formValue("account-country", draftCountry) as AccountCountry;
    const formBank = formValue("account-bank", draftBank);
    const formAccountCode = formValue("account-code", draftAccountCode);
    const formCapital = formValue("account-capital", draftCapital);
    const formCondition = formValue("account-condition", draftCondition);
    const location = locations.find((item) => item.country === formCountry) ?? locations[0];
    const capital = Number.parseFloat(formCapital);

    if (!formBank.trim()) {
      showError("Bank name is required before adding an account.", "Перед добавлением счёта укажите название банка.");
      return;
    }
    if (!Number.isFinite(capital) || capital <= 0) {
      showError("Starting capital must be a positive number.", "Начальный капитал должен быть положительным числом.");
      return;
    }

    const condition =
      formCondition === "auto"
        ? location.generatedCondition
        : formCondition.trim() || location.generatedCondition;
    try {
      const response = await fetch("/api/treasury/accounts", {
        body: JSON.stringify({
          accountCode: formAccountCode.trim(),
          balance: capital,
          bank: formBank.trim(),
          city: location.city,
          conditionText: condition,
          country: location.country,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("Could not add account");
      const payload = (await response.json()) as { account?: TreasuryAccount; accounts?: TreasuryAccount[] };
      const nextAccounts = Array.isArray(payload.accounts) ? payload.accounts.map(toMapAccount) : accounts;
      const account = payload.account ? toMapAccount(payload.account) : nextAccounts[nextAccounts.length - 1];
      setAccounts(nextAccounts);
      if (account) {
        setSelectedId(account.id);
        clearMapError();
        showNotice(
          `${account.bank} added in ${account.city}. The new node is selected on the map.`,
          `${account.bank} добавлен в ${translate(account.city)}. Новый узел выбран на карте.`,
        );
      }
    } catch {
      showError("Could not add the account to the shared ledger.", "Не удалось добавить счет в общий ledger.");
    }
  };

  const runScenario = (nextScenarioId = scenarioId) => {
    const nextScenario = scenarioCatalog.find((item) => item.id === nextScenarioId) ?? scenario;
    setScenarioId(nextScenario.id);
    setSelectedId(nextScenario.accountId);
    setSimulationRan(true);
    clearMapError();
    setAccounts((current) =>
      current.map((account) =>
        account.id === nextScenario.accountId
          ? { ...account, condition: nextScenario.condition }
          : account,
      ),
    );
    showNotice(
      `${nextScenario.title} is now driving the rail paths and decision output.`,
      `${translate(nextScenario.title)} теперь управляет rail-маршрутами и выводом решения.`,
    );
  };

  const generateCondition = () => {
    const linkedScenario = scenarioCatalog.find((item) => item.accountId === selected.id);
    const conditionEvents = buildRandomConditionEvents(
      selected,
      linkedScenario?.title ?? randomItem(anomalyTemplates).event,
      linkedScenario?.accountId === selected.id,
    );
    const conditionText = summarizeConditionEvents(selected, conditionEvents, linkedScenario?.condition);
    setConditionOverrides((current) => ({ ...current, [selected.id]: conditionEvents }));
    setAccounts((current) =>
      current.map((account) =>
        account.id === selected.id
          ? {
              ...account,
              condition: conditionText,
            }
          : account,
      ),
    );
    void persistAccountPatch(selected.id, {
      conditionText,
    });
    setConditionBookAccountId(selected.id);
    clearMapError();
    showNotice(
      `Generated ${conditionEvents.length} account conditions for ${selected.bank} / ${selected.city}.`,
      `Сгенерировано ${conditionEvents.length} условий по счёту ${selected.bank} / ${translate(selected.city)}.`,
    );
  };

  const updateSelectedCapital = (value: string) => {
    const capital = Number.parseFloat(value);
    setAccounts((current) =>
      current.map((account) =>
        account.id === selected.id && Number.isFinite(capital)
          ? { ...account, capital }
          : account,
      ),
    );
    if (Number.isFinite(capital)) {
      void persistAccountPatch(selected.id, { balance: capital });
      showNotice(
        `${selected.city} capital updated to ${formatMoney(capital, selected.currency)}.`,
        `Капитал ${translate(selected.city)} обновлён до ${formatMoney(capital, selected.currency)}.`,
      );
      clearMapError();
    }
  };

  const updateSelectedCondition = (value: string) => {
    setAccounts((current) =>
      current.map((account) => (account.id === selected.id ? { ...account, condition: value } : account)),
    );
    void persistAccountPatch(selected.id, { conditionText: value });
    showNotice(
      `${selected.city} condition edited locally.`,
      `Условие ${translate(selected.city)} изменено локально.`,
    );
  };

  const onDraftCountryChange = (nextCountry: AccountCountry) => {
    const nextLocation = locations.find((item) => item.country === nextCountry) ?? locations[0];
    setDraftCountry(nextCountry);
    setDraftBank(nextLocation.defaultBank);
    setDraftCapital(String(nextLocation.defaultCapital));
    setDraftAccountCode(`${nextLocation.country.slice(0, 2).toUpperCase()}-${nextLocation.currency}-${Math.floor(1000 + Math.random() * 8999)}`);
  };

  const selectIncident = () => {
    setSelectedId(incident.accountId);
    setScenarioId(scenario.id);
    setSimulationRan(true);
    setIncidentPopupOpen(true);
    clearMapError();
    showNotice(
      `Incident selected. ${incident.city} shows the detected usable-liquidity anomaly.`,
      `Инцидент выбран. ${translate(incident.city)} показывает обнаруженную аномалию доступной ликвидности.`,
    );
    setIncidentLifecycle((current) => (current === "detected" ? "incidentSelected" : current));
  };

  const startAnalysis = () => {
    setSelectedId(incident.accountId);
    setScenarioId(scenario.id);
    setSimulationRan(true);
    setIncidentPopupOpen(true);
    setAnalysisError("");
    setAnalysisResult(null);
    setAnalysisSteps(createInitialAnalysisSteps());
    setAnalysisProgress(0);
    setActiveModal(null);
    clearMapError();
    showNotice(
      "ML ensemble is analyzing map, telemetry, forecast, risk, and governance evidence.",
      "ML-ансамбль анализирует карту, телеметрию, прогноз, риск и governance evidence.",
    );
    setIncidentLifecycle("analysisRunning");
    setAnalysisRunId((current) => current + 1);
  };

  const simulateAnalysisFailure = () => {
    setAnalysisResult(null);
    setIncidentLifecycle("analysisFailed");
    setAnalysisProgress(43);
    setAnalysisError("Telemetry checksum mismatch in the synthetic correspondent-bank feed. Retry uses the stable demo snapshot.");
    setAnalysisSteps(
      createInitialAnalysisSteps().map((step, index) => ({
        ...step,
        status: index < 2 ? "completed" : index === 2 ? "failed" : "pending",
      })),
    );
    showNotice(
      "Mock failure path shown. The retry button is ready.",
      "Показан mock-сценарий ошибки. Кнопка повтора готова.",
    );
  };

  const downloadReport = () => {
    if (!analysisResult) {
      showError("Run ML analysis before downloading the report.", "Перед скачиванием отчёта запустите ML-анализ.");
      return;
    }

    const report = buildAnalysisReport(incident, analysisResult, language);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${incident.id}-ml-ensemble-report.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    clearMapError();
    showNotice(
      "Report downloaded locally as a deterministic ML ensemble incident report.",
      "Отчёт скачан локально как детерминированный отчёт ML-ансамбля по инциденту.",
    );
  };

  const submitTicket = () => {
    if (!ticketTitle.trim()) {
      setTicketError("Ticket title is required.");
      return;
    }
    if (!ticketOwner.trim()) {
      setTicketError("Ticket owner is required.");
      return;
    }

    setTicketSubmitting(true);
    setTicketError("");
    window.setTimeout(() => {
      const nextTicketId = "LCT-TKT-0917";
      setTicketId(nextTicketId);
      setTicketSubmitting(false);
      setIncidentLifecycle("ticketCreated");
      showNotice(
        `${nextTicketId} created and linked to ${incident.id}.`,
        `${nextTicketId} создан и привязан к ${incident.id}.`,
      );
    }, 650);
  };

  const acceptRecommendation = () => {
    if (!analysisResult) {
      showError("Run ML analysis before accepting the recommendation.", "Перед принятием рекомендации запустите ML-анализ.");
      return;
    }
    setIncidentLifecycle("recommendationAccepted");
    clearMapError();
    showNotice(
      "Recommendation accepted. Auto-release remains blocked until SWIFT cover is confirmed.",
      "Рекомендация принята. Auto-release остаётся заблокированным до подтверждения SWIFT-cover.",
    );
  };

  const confirmCloseIncident = () => {
    setIncidentLifecycle("incidentClosed");
    setActiveModal(null);
    setIncidentPopupOpen(false);
    clearMapError();
    showNotice(
      "Incident closed in local demo state. The marker is muted but remains auditable.",
      "Инцидент закрыт в локальном состоянии демо. Маркер приглушён, но остаётся аудируемым.",
    );
  };

  const openFunctionProof = (item: DeepAnalyticsFunction) => {
    setSelectedFunction(item);
    setActiveModal("function");
  };

  return (
    <main className={`demo-page map-dashboard map-dashboard--${surface}`} id="main-content">
      <DemoNav mode="replay" statusText={isMapSurface ? "Operational map cockpit" : "World liquidity simulation"} />

      <section className="map-dashboard__hero anchor-target" id="demo-dashboard" aria-labelledby="map-dashboard-title">
        <div className="map-dashboard__hero-copy">
          <p className="eyebrow">{isMapSurface ? t("Operational Map", "Операционная карта") : t("Liquidity Map Simulation")}</p>
          <h1 id="map-dashboard-title">
            {isMapSurface ? t("Global liquidity map cockpit", "Карта ликвидности в режиме cockpit") : t("Global liquidity control map")}
          </h1>
          <p>
            {isMapSurface
              ? t(
                  "Use this page as the control map: inspect bank nodes, adjust accounts, test settlement routes, and see how rails react to treasury scenarios.",
                  "Используйте эту страницу как control map: проверяйте банковские узлы, меняйте счета, тестируйте settlement routes и смотрите, как rails реагируют на treasury-сценарии.",
                )
              : t("Pick a treasury scenario, watch the affected account light up, and trace which SWIFT or local rail the system uses before it approves, throttles, or blocks the deal.")}
          </p>
          <div className="map-hero-signals" aria-label={t("Map state", "Состояние карты")}>
            {isMapSurface ? <span>{t("Map cockpit", "Map cockpit")}</span> : null}
            <span>{accounts.length} {t("bank nodes")}</span>
            <span>{scenario.transferLegs.length} {t("active rails")}</span>
            <span>{incidentLifecycle === "incidentClosed" ? t("Incident closed") : simulation.state === "clear" ? t("Program ready") : t("Anomaly detected")}</span>
          </div>
        </div>
        <div className="map-totals" aria-label={t("Capital totals", "Итоги капитала")} key={`totals-${ledgerSignature}`}>
          <div>
            <span>{t("USD capital")}</span>
            <strong>{formatMoney(totals.usd, "USD")}</strong>
          </div>
          <div>
            <span>{t("EUR capital")}</span>
            <strong>{formatMoney(totals.eur, "EUR")}</strong>
          </div>
        </div>
      </section>

      <div className="map-session-status" role="status" aria-live="polite">
        <strong>{mapError ? t("Action needed") : t("Session")}</strong>
        <span>{message(mapError ?? mapNotice)}</span>
      </div>

      <section className="scenario-board" aria-label={t("Jury simulation scenarios", "Сценарии симуляции для жюри")}>
        <div className="section-heading">
          <p className="eyebrow">{isMapSurface ? t("Map Control", "Управление картой") : t("Jury Control")}</p>
          <h2>{isMapSurface ? t("Choose a route to inspect", "Выберите маршрут для проверки") : t("Choose where the deal lands")}</h2>
          <p>
            {isMapSurface
              ? t(
                  "Generate a new anomaly or replay a saved scenario. Each generated run creates new account conditions, rail paths, telemetry, and ML report output.",
                  "Сгенерируйте новую аномалию или replay сохранённый сценарий. Каждый запуск создаёт новые условия счетов, rail-маршруты, telemetry и ML-отчёт.",
                )
              : t("The selected scenario paints transfer routes on the map and explains the program decision in treasury language.")}
          </p>
        </div>
        <div className="scenario-cards">
          <button
            className="scenario-card scenario-card--generator"
            onClick={() => generateRandomProblem("manual")}
            type="button"
          >
            <span>{t("Random generator", "Random generator")}</span>
            <strong>{t("Generate new anomaly", "Сгенерировать новую аномалию")}</strong>
            <small>{t("new conditions + fresh ML telemetry", "новые условия + свежая ML telemetry")}</small>
          </button>
          {scenarioCatalog.map((item) => (
            <button
              className={item.id === scenario.id ? "scenario-card scenario-card--active" : "scenario-card"}
              key={item.id}
              onClick={() => runScenario(item.id)}
              type="button"
            >
              <span>{translate(item.desk)}</span>
              <strong>{translate(item.title)}</strong>
              <small>{formatMoney(item.debit, item.currency)} {t("debit")}</small>
            </button>
          ))}
        </div>
      </section>

      {isMapSurface ? (
        <section className="map-layer-control" aria-label={t("Map layer control", "Управление слоями карты")}>
          <div>
            <p className="eyebrow">{t("Live Layer Stack", "Live Layer Stack")}</p>
            <h2>{t("Turn map intelligence on and off", "Включайте и выключайте интеллект карты")}</h2>
            <p>
              {t(
                "This block exists only on Map: it makes the page a control cockpit instead of a jury walkthrough.",
                "Этот блок есть только на Map: он превращает страницу в control cockpit, а не в walkthrough для жюри.",
              )}
            </p>
          </div>
          <div className="map-layer-control__meter" aria-label={t("Active layers", "Активные слои")}>
            <strong>{activeLayerCount}/4</strong>
            <span>{t("layers active", "активных слоя")}</span>
          </div>
          <div className="map-layer-control__grid">
            {mapLayerCopy.map((layer) => (
              <button
                aria-pressed={mapLayers[layer.key]}
                className={mapLayers[layer.key] ? "map-layer-toggle map-layer-toggle--active" : "map-layer-toggle"}
                key={layer.key}
                onClick={() => toggleMapLayer(layer.key)}
                type="button"
              >
                <span>{message(layer.label)}</span>
                <small>{message(layer.detail)}</small>
                <em>{mapLayers[layer.key] ? t("Active", "Активен") : t("Hidden", "Скрыт")}</em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="map-workspace" aria-label={t("World liquidity workspace", "Рабочая зона мировой ликвидности")}>
        <div className="world-map-panel">
          <div className="world-map-panel__topline">
            <span>{t("Global Rail Mesh")}</span>
            <strong>{translate(scenario.title)}</strong>
            <em>{scenario.transferLegs.length} {scenario.transferLegs.length === 1 ? t("live transfer path") : t("live transfer paths")}</em>
          </div>
          <WorldMap
            accounts={accounts}
            activity={selectedActivity}
            analysisResult={analysisResult}
            incident={incident}
            incidentLifecycle={incidentLifecycle}
            incidentPopupOpen={incidentPopupOpen}
            layers={mapLayers}
            selectedId={selected.id}
            selected={selected}
            scenario={simulationRan ? scenario : undefined}
            onIncidentSelect={selectIncident}
            onSelect={(id) => {
              const account = accounts.find((item) => item.id === id);
              setSelectedId(id);
              if (account) {
                showNotice(
                  `${account.bank} / ${account.city} selected on the map.`,
                  `${account.bank} / ${translate(account.city)} выбран на карте.`,
                );
              }
            }}
            onToggleIncidentPopup={() => setIncidentPopupOpen((open) => !open)}
            key={`world-map-${ledgerSignature}`}
          />
          <IncidentAnalysisPanel
            key={`incident-panel-${incident.id}`}
            incident={incident}
            lifecycle={incidentLifecycle}
            steps={analysisSteps}
            progress={analysisProgress}
            result={analysisResult}
            error={analysisError}
            ticketId={ticketId}
            onAnalyze={startAnalysis}
            onRetry={startAnalysis}
            onSimulateFailure={simulateAnalysisFailure}
            onOpenDetails={() => setActiveModal("details")}
            onDownloadReport={downloadReport}
            onCreateTicket={() => setActiveModal("ticket")}
            onAcceptRecommendation={acceptRecommendation}
            onCloseIncident={() => setActiveModal("close")}
            onViewModels={() => {
              if (analysisResult) {
                setActiveModal("models");
              } else {
                showError("Run ML analysis before opening model results.", "Перед открытием результатов моделей запустите ML-анализ.");
              }
            }}
          />
        </div>

        <aside className={`map-account-panel map-account-panel--${simulation.state}`} aria-label={t("Selected account")} key={`account-panel-${selected.id}-${selected.capital}-${selected.condition}`}>
          <div className="map-account-panel__header">
            <p className="eyebrow">{t("Selected Account")}</p>
            <h2>{translate(selected.city)}</h2>
            <span>{selected.bank} / {selected.accountCode}</span>
          </div>
          <div className="account-health-strip">
            <div>
              <span>{t("Liquidity floor")}</span>
              <strong>{formatMoney(selected.floor, selected.currency)}</strong>
            </div>
            <div>
              <span>{t("Primary rail")}</span>
              <strong>{selected.primaryRail}</strong>
            </div>
          </div>
          <label className="map-field">
            <span>{t("Capital")} ({selected.currency})</span>
            <input
              inputMode="decimal"
              name="selected-capital"
              onChange={(event) => updateSelectedCapital(event.target.value)}
              type="number"
              value={Math.round(selected.capital)}
            />
          </label>
          <label className="map-field">
            <span>{t("Condition")}</span>
            <textarea
              name="selected-condition"
              onChange={(event) => updateSelectedCondition(event.target.value)}
              rows={5}
              value={translate(selected.condition)}
            />
          </label>
          <button className="command-button command-button--primary" onClick={generateCondition} type="button">
            {conditionBookVisible ? t("Refresh Account Conditions", "Обновить условия счёта") : t("Generate Account Conditions", "Сгенерировать условия счёта")}
          </button>
          {conditionBookVisible ? (
            <section className="account-condition-book" id="account-condition-book" aria-label={t("Generated account conditions", "Сгенерированные условия счёта")}>
              <div className="account-condition-book__header">
                <div className="account-condition-book__title">
                  <span className="account-condition-book__mark" aria-hidden="true">CB</span>
                  <div>
                    <span>{t("Condition book", "Книга условий")}</span>
                    <strong>{selectedConditionEvents.length} {t("cash obligations", "денежных обязательства")}</strong>
                  </div>
                </div>
                <em>{selected.primaryRail}</em>
              </div>
              <div className="account-condition-book__summary">
                <div>
                  <span>{t("Committed outflow", "Обязательный отток")}</span>
                  <strong>
                    {formatMoney(
                      selectedConditionEvents
                        .filter((event) => event.status !== "ready")
                        .reduce((sum, event) => sum + event.amount, 0),
                      selected.currency,
                    )}
                  </strong>
                </div>
                <div>
                  <span>{t("Hard events", "Жёсткие события")}</span>
                  <strong>{selectedConditionEvents.filter((event) => event.status === "blocked" || event.status === "due").length}</strong>
                </div>
              </div>
              <div className="account-condition-book__list">
                {selectedConditionEvents.map((event) => (
                  <article className={`account-condition-event account-condition-event--${event.status}`} key={event.id}>
                    <div className="account-condition-event__top">
                      <div>
                        <span>{message(event.due)}</span>
                        <strong>{message(event.label)}</strong>
                      </div>
                      <em>{message(conditionStatusCopy[event.status])}</em>
                    </div>
                    <dl>
                      <div>
                        <dt>{t("Amount", "Сумма")}</dt>
                        <dd>{formatMoney(event.amount, event.currency)}</dd>
                      </div>
                      <div>
                        <dt>{t("Rail", "Rail")}</dt>
                        <dd>{event.rail}</dd>
                      </div>
                    </dl>
                    <p>{message(event.impact)}</p>
                    <small>{message(event.proof)}</small>
                  </article>
                ))}
              </div>
              <div className="account-condition-book__footer">
                <span>{t("Ledger packet", "Ledger packet")}</span>
                <Link
                  className="account-condition-book__details"
                  href={`/liquidity-control-tower/conditions/${selected.id}`}
                >
                  {t("View details", "View details")}
                </Link>
              </div>
            </section>
          ) : null}
        </aside>
      </section>

      {!isMapSurface ? (
        <>
          <section className="simulation-output" aria-label={t("Simulation output", "Результат симуляции")}>
            <article className={`simulation-verdict simulation-verdict--${simulation.state}`}>
              <p className="eyebrow">{t("Program Response")}</p>
              <h2>{translate(scenario.decision)}</h2>
              <dl>
                <div>
                  <dt>{t("Scenario account")}</dt>
                  <dd>{scenarioAccount ? `${scenarioAccount.bank} / ${translate(scenarioAccount.city)}` : scenario.accountId}</dd>
                </div>
                <div>
                  <dt>{t("After deal")}</dt>
                  <dd>{formatMoney(simulation.balanceAfterDebit, scenario.currency)}</dd>
                </div>
                <div>
                  <dt>{t("After program action")}</dt>
                  <dd>{formatMoney(simulation.balanceAfterProgram, scenario.currency)}</dd>
                </div>
              </dl>
            </article>

            <article className="transfer-ledger">
              <p className="eyebrow">{t("Transfer Rails")}</p>
              <h2>{t("Money movement shown on the map")}</h2>
              <div className="transfer-rows">
                {scenario.transferLegs.map((leg, index) => (
                  <div className={`transfer-row transfer-row--${leg.state}`} key={`${leg.from}-${leg.to}-${index}`}>
                    <span>{leg.system}</span>
                    <strong>{translate(leg.label)}</strong>
                    <small>{formatMoney(leg.amount, leg.currency)} · {translate(leg.eta)}</small>
                    <em>{translate(leg.calendarNote)}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="program-steps">
              <p className="eyebrow">{t("What The Program Does")}</p>
              <ol>
                {scenario.programResponse.map((step) => (
                  <li key={step}>{translate(step)}</li>
                ))}
              </ol>
            </article>
          </section>

          <section className="calendar-seasonality" aria-label={t("Banking days and seasonality")}>
            <div className="section-heading">
              <p className="eyebrow">{t("Calendar Engine")}</p>
              <h2>{t("Banking days and seasonality change usable cash")}</h2>
              <p>{translate(scenario.calendar.summary)}</p>
            </div>
            <div className="banking-day-strip">
              {scenario.calendar.days.map((day) => (
                <div className={`banking-day banking-day--${day.state}`} key={`${scenario.id}-${day.label}-${day.region}`}>
                  <span>{translate(day.label)}</span>
                  <strong>{day.region}</strong>
                  <small>{translate(day.note)}</small>
                </div>
              ))}
            </div>
            <div className="seasonality-panel">
              <div>
                <span>{t("Calendar-adjusted effect")}</span>
                <strong>{translate(scenario.calendar.effect)}</strong>
              </div>
              <div className="seasonality-bars" aria-label={t("Seasonality pressure")}>
                {scenario.calendar.seasonality.map((point) => (
                  <div className="seasonality-bar" key={`${scenario.id}-${point.label}`}>
                    <span style={{ height: `${point.value}%` }} />
                    <small>{translate(point.label)}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <DeepAnalyticsMatrix
        activeGroup={activeFunctionGroup}
        functions={visibleAnalyticsFunctions}
        result={analysisResult}
        onGroupChange={setActiveFunctionGroup}
        onOpenFunction={openFunctionProof}
        surface={surface}
      />

      <section className="map-control-grid" aria-label={t("Map controls", "Управление картой")}>
        <div className="map-add-account">
          <div className="section-heading">
            <p className="eyebrow">{t("Add Bank Or Account")}</p>
            <h2>{t("Add a new treasury node")}</h2>
            <p>{t("Choose a country, name the bank, enter account code and capital. It appears on the map immediately.")}</p>
          </div>
          <div className="map-add-account__form" ref={addFormRef}>
            <label className="map-field">
              <span>{t("Country")}</span>
              <select
                name="account-country"
                onChange={(event) => onDraftCountryChange(event.target.value as AccountCountry)}
                value={draftCountry}
              >
                {locations.map((location) => (
                  <option key={location.country} value={location.country}>
                    {translate(location.country)} ({translate(location.city)})
                  </option>
                ))}
              </select>
            </label>
            <label className="map-field">
              <span>{t("Bank")}</span>
              <input
                name="account-bank"
                onChange={(event) => setDraftBank(event.target.value)}
                type="text"
                value={draftBank}
              />
            </label>
            <label className="map-field">
              <span>{t("Account code")}</span>
              <input
                name="account-code"
                onChange={(event) => setDraftAccountCode(event.target.value)}
                type="text"
                value={draftAccountCode}
              />
            </label>
            <label className="map-field">
              <span>{t("Starting capital")}</span>
              <input
                inputMode="decimal"
                name="account-capital"
                onChange={(event) => setDraftCapital(event.target.value)}
                type="number"
                value={draftCapital}
              />
            </label>
            <label className="map-field map-field--wide">
              <span>{t("Condition")}</span>
              <input
                name="account-condition"
                onChange={(event) => setDraftCondition(event.target.value)}
                placeholder="auto"
                type="text"
                value={translate(draftCondition)}
              />
            </label>
            <button
              className="command-button command-button--primary"
              onClick={addAccount}
              type="button"
            >
              {t("Add Bank Account")}
            </button>
          </div>
        </div>

        <div className="map-account-table" role="table" aria-label={t("Mapped accounts")} key={`account-table-${ledgerSignature}`}>
          <div role="row">
            <span role="columnheader">{t("BANK / ACCOUNT")}</span>
            <span role="columnheader">{t("CURRENCY")}</span>
            <span role="columnheader">{t("CAPITAL")}</span>
            <span role="columnheader">{t("FLOOR")}</span>
            <span role="columnheader">{t("CONDITION")}</span>
          </div>
          {accounts.map((account) => (
            <button
              className={account.id === selected.id ? "map-account-row map-account-row--selected" : "map-account-row"}
              key={`${account.id}-${account.capital}-${account.condition}`}
              onClick={() => {
                setSelectedId(account.id);
                showNotice(
                  `${account.bank} / ${account.city} selected from the ledger.`,
                  `${account.bank} / ${translate(account.city)} выбран из ledger.`,
                );
              }}
              role="row"
              type="button"
            >
              <span role="cell">{account.bank} / {translate(account.city)}</span>
              <span role="cell">{account.currency}</span>
              <span role="cell">{formatMoney(account.capital, account.currency)}</span>
              <span role="cell">{formatMoney(account.floor, account.currency)}</span>
              <span role="cell">{translate(account.condition)}</span>
            </button>
          ))}
        </div>
      </section>

      {activeModal === "details" ? (
        <IncidentDetailsDialog
          incident={incident}
          lifecycle={incidentLifecycle}
          result={analysisResult}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === "models" && analysisResult ? (
        <ModelReportDialog result={analysisResult} onClose={() => setActiveModal(null)} />
      ) : null}
      {activeModal === "ticket" ? (
        <TicketDialog
          submitting={ticketSubmitting}
          ticketId={ticketId}
          title={ticketTitle}
          owner={ticketOwner}
          note={ticketNote}
          error={ticketError}
          onTitleChange={setTicketTitle}
          onOwnerChange={setTicketOwner}
          onNoteChange={setTicketNote}
          onSubmit={submitTicket}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === "close" ? (
        <CloseIncidentDialog onConfirm={confirmCloseIncident} onClose={() => setActiveModal(null)} />
      ) : null}
      {activeModal === "function" && selectedFunction ? (
        <FunctionProofDialog
          item={selectedFunction}
          result={analysisResult}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </main>
  );
}

function WorldMap({
  accounts,
  activity,
  analysisResult,
  incident,
  incidentLifecycle,
  incidentPopupOpen,
  layers,
  selectedId,
  selected,
  scenario,
  onIncidentSelect,
  onSelect,
  onToggleIncidentPopup,
}: {
  accounts: MapAccount[];
  activity: {
    inbound: number;
    outbound: number;
    otherAccounts: number;
    status: ScenarioState;
  };
  analysisResult: EnsembleAnalysisResult | null;
  incident: LiquidityIncident;
  incidentLifecycle: IncidentLifecycle;
  incidentPopupOpen: boolean;
  layers: MapLayers;
  selectedId: string;
  selected: MapAccount;
  scenario?: SimulationScenario;
  onIncidentSelect: () => void;
  onSelect: (id: string) => void;
  onToggleIncidentPopup: () => void;
}) {
  const { t, translate } = useLanguage();
  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .fitExtent(
          [
            [28, 24],
            [MAP_WIDTH - 28, MAP_HEIGHT - 24],
          ],
          worldCountries,
        )
        .precision(0.6),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const countryPaths = useMemo(
    () =>
      worldCountries.features.map((country, index) => ({
        d: path(country),
        id: String(country.id ?? country.properties?.name ?? `country-${index}`),
        name: country.properties?.name ?? "",
      })),
    [path],
  );
  const activeCountryNames = useMemo(
    () => new Set(accounts.map((account) => countryNameByAccountCountry[account.country])),
    [accounts],
  );
  const pointByAccountId = useMemo(() => {
    const points = new Map<string, ProjectedPoint>();
    accounts.forEach((account) => {
      points.set(account.id, projectAccount(account, projection));
    });
    return points;
  }, [accounts, projection]);
  const graticulePath = path(worldGraticule);
  const spherePath = path(sphere);

  return (
    <div className="world-map-frame" role="group" aria-label={t("Projected world liquidity map", "Проекционная карта мировой ликвидности")}>
      <svg className="world-map" viewBox="0 0 1000 520" aria-hidden="true">
        <defs>
          <radialGradient id="mapOceanGlow" cx="52%" cy="44%" r="74%">
            <stop offset="0%" stopColor="#1a2228" />
            <stop offset="58%" stopColor="#11181d" />
            <stop offset="100%" stopColor="#080b0f" />
          </radialGradient>
          <filter id="mapLandShadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="12" floodColor="#000000" floodOpacity="0.34" stdDeviation="10" />
          </filter>
          <linearGradient id="mapRouteFade" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#f06a1b" stopOpacity="0.18" />
            <stop offset="52%" stopColor="#ff735e" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#f06a1b" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect className="world-map__sea" width="1000" height="520" rx="18" />
        {spherePath ? <path className="world-map__sphere" d={spherePath} /> : null}
        {graticulePath ? <path className="world-map__graticule" d={graticulePath} /> : null}
        <g className="world-map__countries">
          {countryPaths.map((country) =>
            country.d ? (
              <path
                className={
                  activeCountryNames.has(country.name)
                    ? "world-map__country world-map__country--account"
                    : "world-map__country"
                }
                d={country.d}
                key={country.id}
              />
            ) : null,
          )}
        </g>
        {layers.rails ? <path className="world-map__route-belt" d="M 42 300 C 180 176 315 160 462 210 S 744 322 958 184" /> : null}
      </svg>
      {layers.rails ? <TransferLayer accounts={accounts} pointByAccountId={pointByAccountId} scenario={scenario} /> : null}
      {layers.risk ? (
        <IncidentMapOverlay
          analysisResult={analysisResult}
          incident={incident}
          lifecycle={incidentLifecycle}
          onOpen={onIncidentSelect}
          onTogglePopup={onToggleIncidentPopup}
          point={pointByAccountId.get(incident.accountId) ?? null}
          popupOpen={incidentPopupOpen}
        />
      ) : null}
      {layers.nodes ? accounts.map((account) => {
        const isScenarioAccount = scenario?.accountId === account.id;
        const point = pointByAccountId.get(account.id) ?? projectAccount(account, projection);
        const nodeClassName = [
          "map-node",
          account.id === selectedId ? "map-node--selected" : "",
          isScenarioAccount ? "map-node--scenario" : "",
          `map-node--label-${account.labelSide}`,
        ].filter(Boolean).join(" ");

        return (
          <button
            aria-label={`${translate(account.city)} ${t("account", "счёт")}, ${account.currency}`}
            className={nodeClassName}
            key={account.id}
            onClick={() => onSelect(account.id)}
            style={{ left: `${(point.x / MAP_WIDTH) * 100}%`, top: `${(point.y / MAP_HEIGHT) * 100}%` }}
            type="button"
          >
            <span className="map-node__dot" />
            <span className="map-node__label">
              {translate(account.city)}
              <small>{account.currency} {shortMoney(account.capital)}</small>
            </span>
          </button>
        );
      }) : null}
      {layers.nodes ? (
        <div className={`map-account-popover map-account-popover--${activity.status}`}>
          <div className="map-account-popover__head">
            <div>
              <span>{selected.currency} · {translate(selected.city).toUpperCase()}</span>
              <strong>{selected.bank}</strong>
            </div>
            <em>{activity.status === "clear" ? t("Healthy") : activity.status === "warning" ? t("Watch") : t("Blocked")}</em>
          </div>
          <strong className="map-account-popover__capital">{shortMoney(selected.capital)}</strong>
          <small>min {shortMoney(selected.floor)}</small>
          <div className="map-account-popover__activity">
            <span>{t("Activity (session)")}</span>
            <div>
              <b className="map-activity-in">↙ {formatCompact(activity.inbound, selected.currency)}</b>
              <b className="map-activity-out">↗ {formatCompact(activity.outbound, selected.currency)}</b>
            </div>
          </div>
          <p>+{activity.otherAccounts} {t("other accounts at this location")}</p>
        </div>
      ) : null}
      {scenario && layers.calendar ? (
        <div className="map-alert-stack" aria-hidden="true">
          <div className="map-alert map-alert--warning">
            <span>{t("Banking day delay")}</span>
            <strong>{translate(scenario.calendar.title)}</strong>
          </div>
          <div className="map-alert">
            <span>{t("Seasonality model")}</span>
            <strong>{translate(scenario.calendar.effect)}</strong>
          </div>
        </div>
      ) : null}
      <div className="world-map__legend" aria-hidden="true">
        <span><i /> {t("Selected account")}</span>
        <span><i className="world-map__legend-warning" /> {t("Risk route")}</span>
        <span><i className="world-map__legend-flow" /> {t("Transfer rail")}</span>
      </div>
    </div>
  );
}

function IncidentMapOverlay({
  analysisResult,
  incident,
  lifecycle,
  onOpen,
  onTogglePopup,
  point,
  popupOpen,
}: {
  analysisResult: EnsembleAnalysisResult | null;
  incident: LiquidityIncident;
  lifecycle: IncidentLifecycle;
  onOpen: () => void;
  onTogglePopup: () => void;
  point: ProjectedPoint | null;
  popupOpen: boolean;
}) {
  const { t, translate } = useLanguage();
  if (!point) return null;

  const left = `${(point.x / MAP_WIDTH) * 100}%`;
  const top = `${(point.y / MAP_HEIGHT) * 100}%`;
  const analyzed = Boolean(analysisResult);
  const closed = lifecycle === "incidentClosed";

  return (
    <>
      <div
        className={`incident-zone incident-zone--${closed ? "closed" : analyzed ? "analyzed" : "detected"}`}
        style={{ left, top }}
      />
      <button
        aria-label={`${t("Open incident", "Открыть инцидент")} ${incident.id}`}
        className={`incident-marker incident-marker--${closed ? "closed" : analyzed ? "analyzed" : "detected"}`}
        onClick={() => {
          onOpen();
          if (!popupOpen) onTogglePopup();
        }}
        style={{ left, top }}
        type="button"
      >
        <span />
        <strong>{closed ? t("Closed") : analyzed ? t("Analyzed") : t("Anomaly")}</strong>
      </button>
      {popupOpen ? (
        <aside className="incident-map-popup" style={{ left, top }} aria-label={t("Map incident popup", "Popup инцидента на карте")}>
          <div>
            <span>{incident.id}</span>
            <button aria-label={t("Hide incident popup", "Скрыть popup инцидента")} onClick={onTogglePopup} type="button">x</button>
          </div>
          <strong>{translate(analysisResult?.finalVerdict ?? incident.title)}</strong>
          <p>{translate(analysisResult?.rootCause ?? incident.observedBehavior)}</p>
          <dl>
            <div>
              <dt>{t("Risk")}</dt>
              <dd>{analysisResult ? `${analysisResult.riskScore}/100` : incident.severity.toUpperCase()}</dd>
            </div>
            <div>
              <dt>{t("Confidence")}</dt>
              <dd>{analysisResult ? `${analysisResult.confidence}%` : t("Awaiting analysis")}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </>
  );
}

function TransferLayer({
  accounts,
  pointByAccountId,
  scenario,
}: {
  accounts: MapAccount[];
  pointByAccountId: Map<string, ProjectedPoint>;
  scenario?: SimulationScenario;
}) {
  if (!scenario) return null;

  return (
    <svg className="transfer-layer" viewBox="0 0 1000 520" aria-hidden="true">
      {scenario.transferLegs.map((leg, index) => {
        const from = accounts.find((account) => account.id === leg.from);
        const to = accounts.find((account) => account.id === leg.to);
        if (!from || !to) return null;

        const fromPoint = pointByAccountId.get(from.id);
        const toPoint = pointByAccountId.get(to.id);
        if (!fromPoint || !toPoint) return null;

        const startX = fromPoint.x;
        const startY = fromPoint.y;
        const endX = toPoint.x;
        const endY = toPoint.y;
        const isSelfRoute = from.id === to.id;
        const lift = Math.abs(endX - startX) > 120 ? 92 : 46;
        const controlX = isSelfRoute ? startX + 96 : (startX + endX) / 2;
        const controlY = isSelfRoute ? startY - 88 : Math.min(startY, endY) - lift - index * 16;
        const routePath = isSelfRoute
          ? `M ${startX + 8} ${startY - 4} C ${startX + 112} ${startY - 92}, ${startX + 128} ${startY + 82}, ${startX + 10} ${startY + 42}`
          : `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

        return (
          <g className={`transfer-path transfer-path--${leg.state}`} key={`${leg.from}-${leg.to}-${index}`}>
            <path
              d={routePath}
              fill="none"
              id={`transfer-path-${scenario.id}-${index}`}
              stroke={leg.state === "clear" ? "rgba(245, 245, 240, 0.82)" : "#ff735e"}
            />
            <circle className="transfer-money-pulse" r="6">
              <animateMotion dur={leg.state === "blocked" ? "4s" : "2.7s"} repeatCount="indefinite">
                <mpath href={`#transfer-path-${scenario.id}-${index}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function getAccountConditionBook(account: MapAccount): AccountConditionEvent[] {
  const seed = TREASURY_ACCOUNT_SEED.find((item) => item.id === account.id);
  const legacyConditionBook = accountConditionBooks[account.city] ?? buildFallbackConditionBook(account);
  if (!seed) return legacyConditionBook;

  return buildTreasuryConditionEvents({
    ...seed,
    accountCode: account.accountCode,
    balance: account.capital,
    bank: account.bank,
    city: account.city,
    condition: { en: account.condition, ru: account.condition },
    country: account.country,
    currency: account.currency,
    labelSide: account.labelSide,
    latitude: account.latitude,
    longitude: account.longitude,
    primaryRail: account.primaryRail,
    survivalFloor: account.floor,
    updatedAt: account.ledgerUpdatedAt,
    usableBalance: account.usableBalance,
    x: account.x,
    y: account.y,
  });
}

function buildFallbackConditionBook(account: MapAccount): AccountConditionEvent[] {
  const reserveAmount = Math.max(Math.round(account.floor * 0.18), 120_000);
  const operatingAmount = Math.max(Math.round(account.capital * 0.12), 180_000);
  const statutoryAmount = Math.max(Math.round(account.floor * 0.11), 90_000);

  return [
    {
      id: `${account.id}-rail-cutoff`,
      label: { en: "Rail cut-off reserve", ru: "Резерв под rail cut-off" },
      due: { en: `Today via ${account.primaryRail}`, ru: `Сегодня через ${account.primaryRail}` },
      amount: reserveAmount,
      currency: account.currency,
      rail: account.primaryRail,
      status: "watch",
      impact: { en: "Keep this amount out of optimizer moves until local cut-off clears.", ru: "Не отдавать эту сумму в optimizer moves до прохождения локального cut-off." },
      proof: { en: "Generated from account rail, floor, and operating condition.", ru: "Сгенерировано из rail, floor и operating condition счёта." },
    },
    {
      id: `${account.id}-tax-hold`,
      label: { en: "Tax and statutory hold", ru: "Налоговый и statutory hold" },
      due: { en: "Next banking day 10:00", ru: "Следующий банковский день 10:00" },
      amount: statutoryAmount,
      currency: account.currency,
      rail: "Tax portal",
      status: "due",
      impact: { en: "Treat as restricted cash; it cannot be used as rescue liquidity.", ru: "Считать restricted cash; нельзя использовать как rescue liquidity." },
      proof: { en: "Default statutory reserve policy.", ru: "Default statutory reserve policy." },
    },
    {
      id: `${account.id}-operating-payment`,
      label: { en: "Operating payment queue", ru: "Очередь операционных платежей" },
      due: { en: "T+1 before market close", ru: "T+1 до закрытия рынка" },
      amount: operatingAmount,
      currency: account.currency,
      rail: "Internal ledger",
      status: "ready",
      impact: { en: "Can be throttled if governance rejects the higher-risk route.", ru: "Можно throttling, если governance отклонит более рискованный route." },
      proof: { en: "Fallback condition pack for newly added accounts.", ru: "Fallback condition pack для новых счетов." },
    },
  ];
}

function projectAccount(account: MapAccount, projection: GeoProjection): ProjectedPoint {
  const projected = projection([account.longitude, account.latitude]);

  return {
    x: projected?.[0] ?? account.x * 10,
    y: projected?.[1] ?? account.y * 5.2,
  };
}

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function shortMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number, currency: Currency) {
  if (value === 0) return "0";
  return new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    currency,
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);
}
