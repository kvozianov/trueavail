/**
 * Illustrative map positions for accounts. Banks in the dataset are synthetic, so locations are
 * assigned by currency and order (first EUR account → Frankfurt, second → Amsterdam, …) and the UI
 * always labels them "illustrative locations".
 */
import type { Account } from "./types";

export interface City {
  name: string;
  lon: number;
  lat: number;
}

const BY_CURRENCY: Record<string, City[]> = {
  EUR: [
    { name: "Frankfurt", lon: 8.68, lat: 50.11 },
    { name: "Amsterdam", lon: 4.9, lat: 52.37 },
    { name: "Luxembourg", lon: 6.13, lat: 49.61 },
    { name: "Paris", lon: 2.35, lat: 48.86 },
    { name: "Milan", lon: 9.19, lat: 45.46 },
    { name: "Madrid", lon: -3.7, lat: 40.42 },
  ],
  USD: [
    { name: "New York", lon: -74.0, lat: 40.71 },
    { name: "Chicago", lon: -87.63, lat: 41.88 },
    { name: "Toronto", lon: -79.38, lat: 43.65 },
  ],
  GBP: [
    { name: "London", lon: -0.13, lat: 51.51 },
    { name: "Edinburgh", lon: -3.19, lat: 55.95 },
  ],
  CHF: [{ name: "Zurich", lon: 8.54, lat: 47.37 }],
};
const OTHER: City[] = [
  { name: "Dublin", lon: -6.26, lat: 53.35 },
  { name: "Stockholm", lon: 18.07, lat: 59.33 },
  { name: "Warsaw", lon: 21.01, lat: 52.23 },
  { name: "Lisbon", lon: -9.14, lat: 38.72 },
];

export function cityFor(accounts: Account[]): Map<string, City> {
  const used = new Map<string, number>();
  let other = 0;
  const out = new Map<string, City>();
  for (const a of accounts) {
    const list = BY_CURRENCY[a.currency] ?? [];
    const i = used.get(a.currency) ?? 0;
    used.set(a.currency, i + 1);
    out.set(a.account_id, list[i] ?? OTHER[other++ % OTHER.length]);
  }
  return out;
}

/**
 * Illustrative counterparty for a scheduled flow, by payment rail: the dataset says which account
 * a payment hits and on which rail, not where the other side is.
 */
const RAIL_COUNTERPARTY: Record<string, City[]> = {
  SEPA: [
    { name: "Paris", lon: 2.35, lat: 48.86 },
    { name: "Milan", lon: 9.19, lat: 45.46 },
    { name: "Madrid", lon: -3.7, lat: 40.42 },
  ],
  "Card Clearing": [{ name: "Dublin", lon: -6.26, lat: 53.35 }],
  SWIFT: [
    { name: "San Francisco", lon: -122.42, lat: 37.77 },
    { name: "Chicago", lon: -87.63, lat: 41.88 },
  ],
  "Local Bank Transfer": [{ name: "Manchester", lon: -2.24, lat: 53.48 }],
};

export function counterpartyFor(rail: string, index: number, home: City): City {
  const list = RAIL_COUNTERPARTY[rail] ?? OTHER;
  const pick = list[index % list.length];
  if (pick.name === home.name) return list[(index + 1) % list.length] ?? OTHER[0];
  return pick;
}
