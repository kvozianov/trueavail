"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type {
  AnalysisStepState,
  DeepAnalyticsFunction,
  DeepAnalyticsGroup,
  EnsembleAnalysisResult,
  IncidentLifecycle,
  LiquidityIncident,
} from "@/lib/liquidity-ml-ensemble";

type AccountCountry = "United States" | "Singapore" | "Saudi Arabia" | "Germany" | "United Kingdom" | "Japan" | "UAE";
type Currency = "USD" | "EUR";
type TransferSystem = "SWIFT" | "Fedwire" | "TARGET2" | "SEPA" | "MEPS+" | "SARIE";
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
};

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
  "Saudi Arabia": "Saudi Arabia",
  Singapore: "Singapore",
  UAE: "United Arab Emirates",
  "United Kingdom": "United Kingdom",
  "United States": "United States of America",
};

const locations: AccountLocation[] = [
  {
    country: "United States",
    city: "New York",
    x: 28.6,
    y: 39.8,
    latitude: 40.7128,
    longitude: -74.006,
    labelSide: "right",
    currency: "USD",
    defaultBank: "JPMorgan Chase",
    defaultCapital: 4_800_000,
    floor: 3_000_000,
    primaryRail: "Fedwire",
    generatedCondition: "Credit repayment due from the New York account before 16:00 ET.",
  },
  {
    country: "Singapore",
    city: "Singapore",
    x: 75.4,
    y: 63.5,
    latitude: 1.3521,
    longitude: 103.8198,
    labelSide: "right",
    currency: "USD",
    defaultBank: "DBS Bank",
    defaultCapital: 3_150_000,
    floor: 1_500_000,
    primaryRail: "MEPS+",
    generatedCondition: "Merchant settlement batch requires prefunding before APAC cut-off.",
  },
  {
    country: "Saudi Arabia",
    city: "Riyadh",
    x: 57.9,
    y: 53.8,
    latitude: 24.7136,
    longitude: 46.6753,
    labelSide: "left",
    currency: "USD",
    defaultBank: "Saudi National Bank",
    defaultCapital: 2_400_000,
    floor: 1_350_000,
    primaryRail: "SARIE",
    generatedCondition: "Oil revenue sweep is delayed; keep reserve for dollar liquidity.",
  },
  {
    country: "Germany",
    city: "Frankfurt",
    x: 50.5,
    y: 39.2,
    latitude: 50.1109,
    longitude: 8.6821,
    labelSide: "right",
    currency: "EUR",
    defaultBank: "Deutsche Bank",
    defaultCapital: 5_200_000,
    floor: 2_200_000,
    primaryRail: "TARGET2",
    generatedCondition: "TARGET2 clearing pressure: preserve EUR buffer through market close.",
  },
  {
    country: "United Kingdom",
    city: "London",
    x: 47.8,
    y: 38.1,
    latitude: 51.5072,
    longitude: -0.1276,
    labelSide: "left",
    currency: "USD",
    defaultBank: "HSBC UK",
    defaultCapital: 2_850_000,
    floor: 1_100_000,
    primaryRail: "SWIFT",
    generatedCondition: "Sterling desk requests USD fallback rail while FX window is open.",
  },
  {
    country: "Japan",
    city: "Tokyo",
    x: 82.9,
    y: 43.7,
    latitude: 35.6895,
    longitude: 139.6917,
    labelSide: "left",
    currency: "USD",
    defaultBank: "MUFG Bank",
    defaultCapital: 3_700_000,
    floor: 1_700_000,
    primaryRail: "SWIFT",
    generatedCondition: "Custody fee settlement collides with overnight liquidity hold.",
  },
  {
    country: "UAE",
    city: "Dubai",
    x: 59.6,
    y: 52.4,
    latitude: 25.2048,
    longitude: 55.2708,
    labelSide: "right",
    currency: "USD",
    defaultBank: "Emirates NBD",
    defaultCapital: 3_300_000,
    floor: 1_250_000,
    primaryRail: "SWIFT",
    generatedCondition: "Regional payout rail needs reserve after correspondent bank delay.",
  },
];

const initialAccountCodes = [
  "US-USD-1042",
  "SG-USD-7781",
  "SA-USD-4408",
  "DE-EUR-2217",
  "GB-USD-9302",
  "JP-USD-5516",
  "AE-USD-6209",
];

const initialAccounts: MapAccount[] = locations.map((location, index) => ({
  ...location,
  id: location.city.toLowerCase().replaceAll(" ", "-"),
  accountCode: initialAccountCodes[index],
  bank: location.defaultBank,
  capital: location.defaultCapital,
  condition: location.generatedCondition,
}));

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

type WorldLiquidityMapProps = {
  surface?: "demo" | "map";
};

export function WorldLiquidityMap({ surface = "demo" }: WorldLiquidityMapProps) {
  const { language, message, t, translate } = useLanguage();
  const isMapSurface = surface === "map";
  const addFormRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<MapAccount[]>(initialAccounts);
  const [selectedId, setSelectedId] = useState(initialAccounts[0].id);
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [simulationRan, setSimulationRan] = useState(true);
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
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    risk: true,
    rails: true,
    calendar: true,
    nodes: true,
  });

  const selected = accounts.find((account) => account.id === selectedId) ?? accounts[0];
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const scenarioAccount = accounts.find((account) => account.id === scenario.accountId);
  const incident = defaultLiquidityIncident;
  const clearMapError = () => setMapError(null);
  const showNotice = (en: string, ru: string) => setMapNotice({ en, ru });
  const showError = (en: string, ru: string) => setMapError({ en, ru });

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
        clearMapError();
        showNotice(
          `${result.finalVerdict}. Confidence ${result.confidence}%, risk score ${result.riskScore}/100.`,
          `${translate(result.finalVerdict)}. ${t("Confidence")} ${result.confidence}%, ${t("Risk score")} ${result.riskScore}/100.`,
        );
      }, steps.length * 620 + 520),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [analysisRunId, incident, incidentLifecycle, t, translate]);

  const addAccount = () => {
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
    const account: MapAccount = {
      ...location,
      id: `${location.city.toLowerCase().replaceAll(" ", "-")}-${Date.now()}`,
      accountCode: formAccountCode.trim() || `${location.country.slice(0, 2).toUpperCase()}-${location.currency}-${Date.now().toString().slice(-4)}`,
      bank: formBank.trim() || location.defaultBank,
      capital,
      condition,
    };

    setAccounts((current) => current.concat(account));
    setSelectedId(account.id);
    clearMapError();
    showNotice(
      `${account.bank} added in ${account.city}. The new node is selected on the map.`,
      `${account.bank} добавлен в ${translate(account.city)}. Новый узел выбран на карте.`,
    );
  };

  const runScenario = (nextScenarioId = scenarioId) => {
    const nextScenario = scenarios.find((item) => item.id === nextScenarioId) ?? scenario;
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
    const linkedScenario = scenarios.find((item) => item.accountId === selected.id);
    setAccounts((current) =>
      current.map((account) =>
        account.id === selected.id
          ? {
              ...account,
              condition: linkedScenario
                ? linkedScenario.condition
                : `${account.primaryRail} event generated for ${account.bank}: settlement delay can push the account below its liquidity floor.`,
            }
          : account,
      ),
    );
    clearMapError();
    showNotice(
      `Generated a fresh condition for ${selected.bank} / ${selected.city}.`,
      `Сгенерировано новое условие для ${selected.bank} / ${translate(selected.city)}.`,
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
    setScenarioId("ny-credit");
    setSimulationRan(true);
    setIncidentPopupOpen(true);
    clearMapError();
    showNotice(
      "Incident selected. New York shows the detected usable-liquidity anomaly.",
      "Инцидент выбран. New York показывает обнаруженную аномалию доступной ликвидности.",
    );
    setIncidentLifecycle((current) => (current === "detected" ? "incidentSelected" : current));
  };

  const startAnalysis = () => {
    setSelectedId(incident.accountId);
    setScenarioId("ny-credit");
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
        <div className="map-totals" aria-label={t("Capital totals", "Итоги капитала")}>
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
                  "The selected scenario updates the map layer, rail paths, account panel, and calendar pressure without leaving the cockpit.",
                  "Выбранный сценарий обновляет карту, rail-маршруты, панель счёта и календарное давление без выхода из cockpit.",
                )
              : t("The selected scenario paints transfer routes on the map and explains the program decision in treasury language.")}
          </p>
        </div>
        <div className="scenario-cards">
          {scenarios.map((item) => (
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
          />
          <IncidentAnalysisPanel
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

        <aside className={`map-account-panel map-account-panel--${simulation.state}`} aria-label={t("Selected account")}>
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
            {t("Generate Account Condition")}
          </button>
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

        <div className="map-account-table" role="table" aria-label={t("Mapped accounts")}>
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
              key={account.id}
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
            <stop offset="0%" stopColor="#fbfaf5" />
            <stop offset="58%" stopColor="#ede8d9" />
            <stop offset="100%" stopColor="#d9d0b8" />
          </radialGradient>
          <filter id="mapLandShadow" x="-8%" y="-8%" width="116%" height="116%">
            <feDropShadow dx="0" dy="12" floodColor="#111111" floodOpacity="0.1" stdDeviation="10" />
          </filter>
          <linearGradient id="mapRouteFade" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#111111" stopOpacity="0.12" />
            <stop offset="52%" stopColor="#111111" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#111111" stopOpacity="0.12" />
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
  const { translate } = useLanguage();

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
              stroke={leg.state === "clear" ? "#151515" : "#b42318"}
            />
            <circle className="transfer-money-pulse" r="6">
              <animateMotion dur={leg.state === "blocked" ? "4s" : "2.7s"} repeatCount="indefinite">
                <mpath href={`#transfer-path-${scenario.id}-${index}`} />
              </animateMotion>
            </circle>
            <text fill={leg.state === "clear" ? "#151515" : "#b42318"} x={controlX} y={controlY - 8}>{leg.system}</text>
            <text className="transfer-eta" x={controlX} y={controlY + 15}>{translate(leg.eta)}</text>
          </g>
        );
      })}
    </svg>
  );
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
