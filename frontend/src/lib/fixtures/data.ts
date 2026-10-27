import type { Account, ScheduledFlow } from "../types";

/** Default synthetic dataset: 5 accounts x 120 daily rows, seed 42. */
export const SEED = 42;
export const HISTORY_START = "2026-01-19";
export const HISTORY_DAYS = 120;
export const AS_OF = "2026-05-18"; // last history date
export const HORIZON = 14;

export interface AccountProfile extends Account {
  /** mean daily net flow excluding scheduled events */
  drift: number;
  /** daily std-dev of unscheduled net flow */
  sigma: number;
}

export const accountProfiles: AccountProfile[] = [
  {
    account_id: "atlas-eur-operating",
    bank_name: "Atlas Bank",
    label: "EUR Operating",
    currency: "EUR",
    settled_balance: 3_000_000,
    required_buffer: 1_000_000,
    drift: 60_000,
    sigma: 140_000,
  },
  {
    account_id: "nova-eur-reserve",
    bank_name: "Nova Bank",
    label: "EUR Reserve",
    currency: "EUR",
    settled_balance: 4_600_000,
    required_buffer: 1_200_000,
    drift: -20_000,
    sigma: 90_000,
  },
  {
    account_id: "orion-eur-safeguard",
    bank_name: "Orion Bank",
    label: "EUR Safeguarding",
    currency: "EUR",
    settled_balance: 3_400_000,
    required_buffer: 900_000,
    drift: -35_000,
    sigma: 150_000,
  },
  {
    account_id: "atlas-usd-operating",
    bank_name: "Atlas Bank",
    label: "USD Operating",
    currency: "USD",
    settled_balance: 8_900_000,
    required_buffer: 2_000_000,
    drift: 15_000,
    sigma: 250_000,
  },
  {
    account_id: "meridian-gbp-operating",
    bank_name: "Meridian Bank",
    label: "GBP Operating",
    currency: "GBP",
    settled_balance: 3_300_000,
    required_buffer: 900_000,
    drift: -10_000,
    sigma: 120_000,
  },
];

/** Known future cash flows. effective_date includes holiday / rail settlement shifts. */
export const scheduledFlowsData: ScheduledFlow[] = [
  {
    flow_id: "payout-2026-05-19",
    account_id: "atlas-eur-operating",
    currency: "EUR",
    amount: 2_600_000,
    direction: "outflow",
    expected_date: "2026-05-19",
    effective_date: "2026-05-19",
    rail: "SEPA",
    description: "merchant payout",
  },
  {
    flow_id: "card-clearing-2026-05-20",
    account_id: "atlas-eur-operating",
    currency: "EUR",
    amount: 1_850_000,
    direction: "inflow",
    expected_date: "2026-05-20",
    effective_date: "2026-05-21",
    rail: "Card Clearing",
    description: "card acquirer settlement (bank holiday, +1 business day)",
  },
  {
    flow_id: "usd-supplier-2026-05-22",
    account_id: "atlas-usd-operating",
    currency: "USD",
    amount: 1_200_000,
    direction: "outflow",
    expected_date: "2026-05-22",
    effective_date: "2026-05-22",
    rail: "SWIFT",
    description: "supplier payment",
  },
  {
    flow_id: "client-withdrawal-2026-05-25",
    account_id: "orion-eur-safeguard",
    currency: "EUR",
    amount: 900_000,
    direction: "outflow",
    expected_date: "2026-05-25",
    effective_date: "2026-05-25",
    rail: "SEPA Instant",
    description: "client fund withdrawals",
  },
  {
    flow_id: "gbp-settlement-2026-05-25",
    account_id: "meridian-gbp-operating",
    currency: "GBP",
    amount: 400_000,
    direction: "inflow",
    expected_date: "2026-05-25",
    effective_date: "2026-05-26",
    rail: "Faster Payments",
    description: "merchant settlement (UK bank holiday, +1 business day)",
  },
  {
    flow_id: "hmrc-vat-2026-05-26",
    account_id: "meridian-gbp-operating",
    currency: "GBP",
    amount: 1_100_000,
    direction: "outflow",
    expected_date: "2026-05-26",
    effective_date: "2026-05-26",
    rail: "CHAPS",
    description: "VAT payment",
  },
  {
    flow_id: "payout-2026-05-27",
    account_id: "atlas-eur-operating",
    currency: "EUR",
    amount: 1_200_000,
    direction: "outflow",
    expected_date: "2026-05-27",
    effective_date: "2026-05-27",
    rail: "SEPA",
    description: "merchant payout",
  },
  {
    flow_id: "client-withdrawal-2026-05-28",
    account_id: "orion-eur-safeguard",
    currency: "EUR",
    amount: 600_000,
    direction: "outflow",
    expected_date: "2026-05-28",
    effective_date: "2026-05-28",
    rail: "SEPA",
    description: "client fund withdrawals",
  },
  {
    flow_id: "payroll-2026-05-29",
    account_id: "nova-eur-reserve",
    currency: "EUR",
    amount: 1_400_000,
    direction: "outflow",
    expected_date: "2026-05-29",
    effective_date: "2026-05-29",
    rail: "SEPA",
    description: "payroll",
  },
];

export const holidays: Record<string, string> = {
  "2026-05-20": "EU bank holiday (synthetic calendar)",
  "2026-05-25": "UK Spring bank holiday",
};
