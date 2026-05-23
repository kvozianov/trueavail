import type { LocalizedMessage } from "@/lib/i18n";

export type ConditionCurrency = "USD" | "EUR";
export type ConditionTone = "blocked" | "due" | "watch" | "ready";

export type ConditionTransfer = {
  id: string;
  date: string;
  title: LocalizedMessage;
  counterparty: LocalizedMessage;
  amount: number;
  currency: ConditionCurrency;
  direction: "in" | "out";
  rail: string;
  status: LocalizedMessage;
  note: LocalizedMessage;
};

export type ExternalObligation = {
  id: string;
  due: LocalizedMessage;
  title: LocalizedMessage;
  counterparty: LocalizedMessage;
  amount: number;
  currency: ConditionCurrency;
  tone: ConditionTone;
  category: LocalizedMessage;
  evidence: LocalizedMessage;
};

export type LiquidityPoint = {
  date: string;
  usable: number;
  floor: number;
  requirement: number;
};

export type ActivityBar = {
  date: string;
  label: LocalizedMessage;
  value: number;
  tone: ConditionTone;
  driver: LocalizedMessage;
};

export type AccountConditionDetail = {
  id: string;
  city: LocalizedMessage;
  bank: string;
  accountCode: string;
  entity: string;
  currency: ConditionCurrency;
  capital: number;
  liquidityFloor: number;
  usableNow: number;
  p05Gap: number;
  committedOutflow: number;
  hardEvents: number;
  primaryRail: string;
  cutOff: LocalizedMessage;
  headline: LocalizedMessage;
  summary: LocalizedMessage;
  stabilityScore: number;
  intragroupTransfers: ConditionTransfer[];
  externalObligations: ExternalObligation[];
  liquiditySeries: LiquidityPoint[];
  activityBars: ActivityBar[];
  policyFacts: Array<{ label: LocalizedMessage; value: LocalizedMessage; detail: LocalizedMessage }>;
};

export const conditionAccountIds = [
  "new-york",
  "singapore",
  "riyadh",
  "frankfurt",
  "london",
  "tokyo",
  "dubai",
];

const detailsByAccountId: Record<string, AccountConditionDetail> = {
  "new-york": {
    id: "new-york",
    city: { en: "New York", ru: "Нью-Йорк" },
    bank: "JPMorgan Chase",
    accountCode: "US-USD-1042",
    entity: "TrueAvail US Operating LLC",
    currency: "USD",
    capital: 4_800_000,
    liquidityFloor: 3_000_000,
    usableNow: 1_900_000,
    p05Gap: 2_136_774,
    committedOutflow: 4_020_000,
    hardEvents: 2,
    primaryRail: "Fedwire",
    cutOff: { en: "16:00 ET same-day cut-off", ru: "16:00 ET same-day cut-off" },
    headline: {
      en: "New York account condition packet",
      ru: "Пакет условий по счёту New York",
    },
    summary: {
      en: "This drilldown explains why book cash looks available while usable liquidity is below the survival floor. It separates intragroup cash movement from external obligations that permanently leave the company perimeter.",
      ru: "Этот drilldown объясняет, почему book cash выглядит доступным, а usable liquidity падает ниже survival floor. Он разделяет внутригрупповые перемещения денег и внешние обязательства, где деньги уходят за периметр компании.",
    },
    stabilityScore: 62,
    intragroupTransfers: [
      {
        id: "ny-sg-cover",
        date: "2026-05-18 09:40",
        title: { en: "Singapore cover leg to New York", ru: "Cover leg из Singapore в New York" },
        counterparty: { en: "DBS Bank / SG-USD-7781", ru: "DBS Bank / SG-USD-7781" },
        amount: 1_250_000,
        currency: "USD",
        direction: "in",
        rail: "SWIFT",
        status: { en: "Late for NY cut-off", ru: "Поздно для NY cut-off" },
        note: {
          en: "Cash exists inside the group, but it becomes usable after the New York approval window.",
          ru: "Деньги есть внутри группы, но становятся доступными после approval-window в New York.",
        },
      },
      {
        id: "ny-riyadh-standby",
        date: "2026-05-18 10:15",
        title: { en: "Riyadh standby sweep", ru: "Standby sweep из Riyadh" },
        counterparty: { en: "Saudi National Bank / SA-USD-4408", ru: "Saudi National Bank / SA-USD-4408" },
        amount: 650_000,
        currency: "USD",
        direction: "in",
        rail: "Internal ledger",
        status: { en: "Eligible with signer", ru: "Доступно при signer approval" },
        note: {
          en: "Internal liquidity can reduce residual throttle if signer approval arrives before cut-off.",
          ru: "Внутренняя ликвидность снижает residual throttle, если signer approval придёт до cut-off.",
        },
      },
      {
        id: "ny-london-fx",
        date: "2026-05-17 15:20",
        title: { en: "London FX desk fallback", ru: "Fallback от London FX desk" },
        counterparty: { en: "HSBC UK / GB-USD-9302", ru: "HSBC UK / GB-USD-9302" },
        amount: 540_000,
        currency: "USD",
        direction: "in",
        rail: "SWIFT",
        status: { en: "Watch", ru: "Наблюдать" },
        note: {
          en: "Marked as fallback cash because the FX desk has its own margin call later in the day.",
          ru: "Помечено как fallback cash, потому что у FX desk позже в этот день есть margin call.",
        },
      },
      {
        id: "ny-sg-return",
        date: "2026-05-16 18:00",
        title: { en: "Return reserve to APAC pool", ru: "Возврат резерва в APAC pool" },
        counterparty: { en: "DBS Bank / SG-USD-7781", ru: "DBS Bank / SG-USD-7781" },
        amount: 480_000,
        currency: "USD",
        direction: "out",
        rail: "Internal ledger",
        status: { en: "Throttled", ru: "Throttled" },
        note: {
          en: "Governance can defer this internal return to protect the New York survival floor.",
          ru: "Governance может отложить этот внутренний возврат, чтобы защитить survival floor New York.",
        },
      },
    ],
    externalObligations: [
      {
        id: "ny-loan",
        due: { en: "Today 16:00 ET", ru: "Сегодня 16:00 ET" },
        title: { en: "Corporate loan repayment", ru: "Погашение корпоративного кредита" },
        counterparty: { en: "Central bank clearing account", ru: "Клиринговый счёт центрального банка" },
        amount: 2_300_000,
        currency: "USD",
        tone: "blocked",
        category: { en: "Debt service", ru: "Debt service" },
        evidence: {
          en: "This is the Golden Incident driver: paying it before cover arrives breaches the USD survival floor.",
          ru: "Это драйвер Golden Incident: оплата до прихода cover пробивает USD survival floor.",
        },
      },
      {
        id: "ny-tax",
        due: { en: "Tomorrow 10:00 ET", ru: "Завтра 10:00 ET" },
        title: { en: "Federal tax escrow", ru: "Федеральный налоговый escrow" },
        counterparty: { en: "US tax portal", ru: "US tax portal" },
        amount: 620_000,
        currency: "USD",
        tone: "due",
        category: { en: "Statutory cash", ru: "Statutory cash" },
        evidence: {
          en: "Restricted reserve: visible in balance, excluded from usable liquidity.",
          ru: "Restricted reserve: виден в balance, но исключён из usable liquidity.",
        },
      },
      {
        id: "ny-cloud",
        due: { en: "May 20, 13:00 ET", ru: "20 мая, 13:00 ET" },
        title: { en: "Cloud infrastructure and server invoice", ru: "Оплата cloud infrastructure и серверов" },
        counterparty: { en: "Enterprise hosting provider", ru: "Enterprise hosting provider" },
        amount: 185_000,
        currency: "USD",
        tone: "watch",
        category: { en: "Operating vendor", ru: "Операционный поставщик" },
        evidence: {
          en: "Small amount, but it sits before the payroll reserve in the operating queue.",
          ru: "Сумма небольшая, но стоит в operating queue перед payroll reserve.",
        },
      },
      {
        id: "ny-payroll",
        due: { en: "Friday 09:30 ET", ru: "Пятница 09:30 ET" },
        title: { en: "Payroll sweep", ru: "Payroll sweep" },
        counterparty: { en: "US payroll bank file", ru: "US payroll bank file" },
        amount: 1_100_000,
        currency: "USD",
        tone: "watch",
        category: { en: "Payroll reserve", ru: "Payroll reserve" },
        evidence: {
          en: "Seasonality model adds one banking day of buffer pressure.",
          ru: "Seasonality model добавляет один банковский день buffer pressure.",
        },
      },
    ],
    liquiditySeries: [
      { date: "May 10", usable: 4_900_000, floor: 3_000_000, requirement: 2_700_000 },
      { date: "May 11", usable: 4_650_000, floor: 3_000_000, requirement: 2_900_000 },
      { date: "May 12", usable: 4_420_000, floor: 3_000_000, requirement: 3_050_000 },
      { date: "May 13", usable: 4_720_000, floor: 3_000_000, requirement: 2_860_000 },
      { date: "May 14", usable: 4_180_000, floor: 3_000_000, requirement: 3_300_000 },
      { date: "May 15", usable: 3_760_000, floor: 3_000_000, requirement: 3_480_000 },
      { date: "May 16", usable: 3_420_000, floor: 3_000_000, requirement: 3_720_000 },
      { date: "May 17", usable: 2_980_000, floor: 3_000_000, requirement: 3_960_000 },
      { date: "May 18", usable: 1_900_000, floor: 3_000_000, requirement: 4_020_000 },
    ],
    activityBars: [
      { date: "May 12", label: { en: "Normal ops", ru: "Normal ops" }, value: 28, tone: "ready", driver: { en: "Low invoice queue", ru: "Низкая очередь invoices" } },
      { date: "May 13", label: { en: "Tax prep", ru: "Tax prep" }, value: 42, tone: "watch", driver: { en: "Statutory cash locked", ru: "Statutory cash locked" } },
      { date: "May 14", label: { en: "Payroll model", ru: "Payroll model" }, value: 57, tone: "watch", driver: { en: "Payroll buffer increases", ru: "Payroll buffer increases" } },
      { date: "May 15", label: { en: "Bank holiday", ru: "Bank holiday" }, value: 74, tone: "due", driver: { en: "Cover slides by one bank day", ru: "Cover сдвигается на один bank day" } },
      { date: "May 16", label: { en: "Server invoice", ru: "Server invoice" }, value: 38, tone: "watch", driver: { en: "Operating vendor payment", ru: "Operating vendor payment" } },
      { date: "May 17", label: { en: "Card reserve", ru: "Card reserve" }, value: 61, tone: "watch", driver: { en: "Settlement reserve locked", ru: "Settlement reserve locked" } },
      { date: "May 18", label: { en: "Loan cut-off", ru: "Loan cut-off" }, value: 96, tone: "blocked", driver: { en: "Credit repayment due", ru: "Погашение кредита" } },
    ],
    policyFacts: [
      {
        label: { en: "Eligibility", ru: "Eligibility" },
        value: { en: "Entity approved", ru: "Entity approved" },
        detail: { en: "Intragroup moves can be proposed, but external debt payment remains governed.", ru: "Intragroup moves можно предлагать, но внешний debt payment остаётся под governance." },
      },
      {
        label: { en: "Signer", ru: "Signer" },
        value: { en: "Required before commit", ru: "Нужен перед commit" },
        detail: { en: "No liquidity mobility action commits without the authorised signer.", ru: "Ни одно liquidity mobility action не committed без authorised signer." },
      },
      {
        label: { en: "Residual risk", ru: "Residual risk" },
        value: { en: "Throttle still needed", ru: "Throttle всё ещё нужен" },
        detail: { en: "The overlay accelerates approved liquidity; it does not create cash.", ru: "Overlay ускоряет доступ к разрешённой ликвидности; он не создаёт деньги." },
      },
    ],
  },
};

export function getAccountConditionDetail(accountId: string): AccountConditionDetail {
  return detailsByAccountId[accountId] ?? buildFallbackAccountDetail(accountId);
}

function buildFallbackAccountDetail(accountId: string): AccountConditionDetail {
  const city = accountId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Treasury Node";

  const capital = 3_200_000;
  const floor = 1_400_000;

  return {
    ...detailsByAccountId["new-york"],
    id: accountId,
    city: { en: city, ru: city },
    bank: "Treasury Bank",
    accountCode: "AUTO-USD-0001",
    entity: "TrueAvail Treasury Entity",
    capital,
    liquidityFloor: floor,
    usableNow: 2_050_000,
    p05Gap: 420_000,
    committedOutflow: 1_180_000,
    hardEvents: 1,
    headline: { en: `${city} account condition packet`, ru: `Пакет условий по счёту ${city}` },
    summary: {
      en: "Generated deterministic fallback packet for a newly added treasury node.",
      ru: "Детерминированный fallback packet для нового treasury node.",
    },
  };
}
