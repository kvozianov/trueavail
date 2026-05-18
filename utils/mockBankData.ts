import type {
  BankAccount,
  BankCalendar,
  CashFlow,
  ObservedCashMovement,
  SettlementRule,
} from "@/types/finance";

export const DEMO_NOW = "2026-05-18T09:00:00.000Z";

export const DEMO_BANK_CALENDAR: BankCalendar = {
  holidays: ["2026-05-20", "2026-05-25"],
  cutoffHour: 15,
};

export const DEMO_SETTLEMENT_RULES: SettlementRule[] = [
  { rail: "Local Bank Transfer", delayBusinessDays: 0 },
  { rail: "SEPA", delayBusinessDays: 1 },
  { rail: "SWIFT", delayBusinessDays: 2 },
  { rail: "Card Clearing", delayBusinessDays: 2 },
];

export const DEMO_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "atlas-eur-operating",
    bankName: "Atlas Bank",
    label: "EUR Operating",
    currency: "EUR",
    bookBalance: 5_900_000,
    settledBalance: 3_000_000,
    requiredBuffer: 1_000_000,
  },
  {
    id: "nova-eur-reserve",
    bankName: "Nova Bank",
    label: "EUR Reserve",
    currency: "EUR",
    bookBalance: 4_800_000,
    settledBalance: 4_600_000,
    requiredBuffer: 1_200_000,
  },
  {
    id: "atlas-usd-operating",
    bankName: "Atlas Bank",
    label: "USD Operating",
    currency: "USD",
    bookBalance: 9_400_000,
    settledBalance: 8_900_000,
    requiredBuffer: 2_000_000,
  },
  {
    id: "meridian-gbp-operating",
    bankName: "Meridian Bank",
    label: "GBP Operating",
    currency: "GBP",
    bookBalance: 3_700_000,
    settledBalance: 3_300_000,
    requiredBuffer: 900_000,
  },
];

export const DEMO_CASH_FLOWS: CashFlow[] = [
  {
    id: "flow-eur-card-settlement",
    accountId: "atlas-eur-operating",
    amount: 3_200_000,
    currency: "EUR",
    direction: "inflow",
    rail: "Card Clearing",
    status: "pending",
    expectedAt: "2026-05-18T10:30:00.000Z",
    counterparty: "Card Acquirer Batch",
    businessReason: "card settlement from weekend merchant volume",
  },
  {
    id: "flow-eur-merchant-payout",
    accountId: "atlas-eur-operating",
    amount: 4_100_000,
    currency: "EUR",
    direction: "outflow",
    rail: "SEPA",
    status: "pending",
    expectedAt: "2026-05-19T18:00:00.000Z",
    counterparty: "Top merchants payout batch",
    businessReason: "scheduled merchant payout",
  },
  {
    id: "flow-eur-partner-payment",
    accountId: "atlas-eur-operating",
    amount: 850_000,
    currency: "EUR",
    direction: "outflow",
    rail: "SEPA",
    status: "pending",
    expectedAt: "2026-05-21T11:00:00.000Z",
    counterparty: "Processing partner",
    businessReason: "monthly processing fee",
  },
  {
    id: "flow-usd-platform-inflow",
    accountId: "atlas-usd-operating",
    amount: 1_600_000,
    currency: "USD",
    direction: "inflow",
    rail: "SWIFT",
    status: "pending",
    expectedAt: "2026-05-19T10:00:00.000Z",
    counterparty: "US PSP partner",
    businessReason: "platform settlement",
  },
  {
    id: "flow-gbp-payroll",
    accountId: "meridian-gbp-operating",
    amount: 900_000,
    currency: "GBP",
    direction: "outflow",
    rail: "Local Bank Transfer",
    status: "pending",
    expectedAt: "2026-05-22T09:00:00.000Z",
    counterparty: "UK payroll provider",
    businessReason: "payroll reserve",
  },
];

export const DEMO_OBSERVED_MOVEMENTS: ObservedCashMovement[] = [
  {
    id: "observed-eur-card-settlement-lower",
    cashFlowId: "flow-eur-card-settlement",
    accountId: "atlas-eur-operating",
    currency: "EUR",
    observedAt: "2026-05-18T11:00:00.000Z",
    settledAt: "2026-05-21T09:30:00.000Z",
    expectedAmount: 3_200_000,
    actualAmount: 2_550_000,
    source: "card clearing monitor",
  },
];
