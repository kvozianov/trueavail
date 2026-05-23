import type { LocalizedMessage } from "@/lib/i18n";
import {
  buildTreasuryConditionEvents,
  findTreasuryAccount,
  listTreasuryAccounts,
  type TreasuryAccount,
  type TreasuryConditionEvent,
  type TreasuryConditionStatus,
  type TreasuryCurrency,
} from "@/lib/treasury-ledger";

export type ConditionCurrency = TreasuryCurrency;
export type ConditionTone = TreasuryConditionStatus;

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

export const conditionAccountIds = listTreasuryAccounts().map((account) => account.id);

export function getAccountConditionDetail(accountId: string): AccountConditionDetail {
  const account = findTreasuryAccount(accountId) ?? listTreasuryAccounts()[0];
  return buildAccountConditionDetail(account);
}

export function buildAccountConditionDetail(account: TreasuryAccount): AccountConditionDetail {
  const events = buildTreasuryConditionEvents(account);
  const committedOutflow = events
    .filter((event) => event.status !== "ready")
    .reduce((sum, event) => sum + event.amount, 0);
  const p05Gap = Math.max(account.survivalFloor - account.usableBalance, 0);
  const hardEvents = events.filter((event) => event.status === "blocked" || event.status === "due").length;

  return {
    id: account.id,
    accountCode: account.accountCode,
    activityBars: buildActivityBars(events),
    bank: account.bank,
    capital: account.balance,
    city: { en: account.city, ru: account.city },
    committedOutflow,
    currency: account.currency,
    cutOff: account.cutOff,
    entity: account.legalEntity,
    externalObligations: buildExternalObligations(events, account.bank),
    hardEvents,
    headline: {
      en: `${account.city} account condition packet`,
      ru: `Пакет условий по счёту ${account.city}`,
    },
    intragroupTransfers: buildIntragroupTransfers(events, account.bank),
    liquidityFloor: account.survivalFloor,
    liquiditySeries: buildLiquiditySeries(account.usableBalance, account.survivalFloor, committedOutflow),
    p05Gap,
    policyFacts: [
      {
        label: { en: "Ledger source", ru: "Источник ledger" },
        value: { en: "Unified treasury ledger", ru: "Единый treasury ledger" },
        detail: {
          en: "The map, transfer console, API receipts, and this account packet read the same account record.",
          ru: "Карта, консоль переводов, API receipts и этот пакет счёта читают одну запись account.",
        },
      },
      {
        label: { en: "KYB", ru: "KYB" },
        value: { en: account.kybStatus, ru: account.kybStatus },
        detail: {
          en: "Blockchain transfers can settle only between approved same-company accounts.",
          ru: "Blockchain transfers могут settle только между approved счетами одной компании.",
        },
      },
      {
        label: { en: "Signer", ru: "Signer" },
        value: { en: "Required before commit", ru: "Нужен перед commit" },
        detail: {
          en: "SWIFT becomes a treasury command; blockchain settlement updates ledger balances immediately.",
          ru: "SWIFT становится treasury-командой; blockchain settlement сразу обновляет balances в ledger.",
        },
      },
    ],
    primaryRail: account.primaryRail,
    stabilityScore: account.stabilityScore,
    summary: {
      en: account.condition.en,
      ru: account.condition.ru,
    },
    usableNow: account.usableBalance,
  };
}

function buildIntragroupTransfers(events: TreasuryConditionEvent[], bank: string): ConditionTransfer[] {
  return events.slice(0, 3).map((event, index) => ({
    id: `${event.id}-movement`,
    amount: event.amount,
    counterparty: {
      en: `${bank} / shared ledger`,
      ru: `${bank} / shared ledger`,
    },
    currency: event.currency,
    date: index === 0 ? "2026-05-23 12:00" : "2026-05-24 09:00",
    direction: event.status === "ready" ? "in" : "out",
    note: event.impact,
    rail: event.rail,
    status: event.status === "ready" ? { en: "Eligible", ru: "Доступно" } : { en: "Governed", ru: "Под governance" },
    title: event.label,
  }));
}

function buildExternalObligations(events: TreasuryConditionEvent[], bank: string): ExternalObligation[] {
  return events.map((event) => ({
    id: `${event.id}-obligation`,
    amount: event.amount,
    category: event.rail === "Tax portal" ? { en: "Statutory cash", ru: "Statutory cash" } : { en: "Treasury control", ru: "Treasury control" },
    counterparty: { en: `${bank} obligation queue`, ru: `Очередь обязательств ${bank}` },
    currency: event.currency,
    due: event.due,
    evidence: event.proof,
    title: event.label,
    tone: event.status,
  }));
}

function buildLiquiditySeries(usableNow: number, floor: number, committedOutflow: number): LiquidityPoint[] {
  const dates = ["May 17", "May 18", "May 19", "May 20", "May 21", "May 22", "May 23"];
  return dates.map((date, index) => {
    const distance = dates.length - 1 - index;
    const usable = Math.max(usableNow + distance * Math.max(committedOutflow * 0.07, floor * 0.04), 0);
    return {
      date,
      floor,
      requirement: Math.max(floor + committedOutflow * (0.14 + index * 0.015), floor),
      usable: Math.round(usable),
    };
  });
}

function buildActivityBars(events: TreasuryConditionEvent[]): ActivityBar[] {
  return events.slice(0, 7).map((event, index) => ({
    date: `T+${index}`,
    driver: event.impact,
    label: event.label,
    tone: event.status,
    value: Math.min(96, 28 + index * 11 + (event.status === "blocked" ? 22 : event.status === "due" ? 14 : 0)),
  }));
}
