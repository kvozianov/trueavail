import type { Alert, ForecastPoint } from "./types";

/** True minus sign (U+2212), used for every negative number on screen. */
export const MINUS = "−";
const THIN = " ";

const symbolCache = new Map<string, string>();
/** "€", "$", "£"; an unknown code falls back to "CHF " style. */
export function currencySymbol(currency?: string): string {
  if (!currency) return "";
  let s = symbolCache.get(currency);
  if (s === undefined) {
    try {
      s =
        new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
          .formatToParts(0)
          .find((p) => p.type === "currency")?.value ?? `${currency} `;
      if (/^[A-Z]{3}$/.test(s)) s = `${s} `;
    } catch {
      s = `${currency} `;
    }
    symbolCache.set(currency, s);
  }
  return s;
}

/** Compact magnitude without sign or symbol: 2.13M, 850K, 29.4K, 640. */
function compactAbs(abs: number): string {
  if (abs >= 1e9) return `${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6 || Math.round(abs / 1e3) >= 1000) return `${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e5) return `${Math.round(abs / 1e3)}K`;
  if (abs >= 1e3) return `${(abs / 1e3).toFixed(1)}K`;
  return `${Math.round(abs)}`;
}

/** €2.13M, −€1.13M, £900K, $29.4K (DESIGN_SYSTEM.md § 9.4). */
export function money(value: number | null | undefined, currency?: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value < 0 && Math.abs(value) >= 0.5 ? MINUS : "";
  return `${sign}${currencySymbol(currency)}${compactAbs(Math.abs(value))}`;
}

/** Same as money() without the currency symbol: −1.13M. */
export function compact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value < 0 && Math.abs(value) >= 0.5 ? MINUS : "";
  return `${sign}${compactAbs(Math.abs(value))}`;
}

/** Full precision for tooltips and tables: −€1,131,273. */
export function moneyFull(value: number | null | undefined, currency?: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value < 0 && Math.abs(value) >= 0.5 ? MINUS : "";
  return `${sign}${currencySymbol(currency)}${num(Math.abs(value))}`;
}

/** Axis ticks: −1.5M, 0, 3M, 4.5M, 50K. */
export function axisTick(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : "";
  const trim = (x: number) => String(Number(x.toFixed(2)));
  if (abs >= 1e6) return `${sign}${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${trim(abs / 1e3)}K`;
  return `${sign}${trim(abs)}`;
}

/** Grouped integer (or fixed digits): 82,024. Negative numbers use the true minus. */
export function num(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  const s = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(
    Math.abs(value),
  );
  return value < 0 && Number(s.replace(/,/g, "")) !== 0 ? `${MINUS}${s}` : s;
}

/** 29.2 % from 29.216 (already a percentage). */
export function pctValue(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value < 0 ? MINUS : ""}${Math.abs(value).toFixed(digits)}${THIN}%`;
}

/** 87.9 % from 0.879. */
export function pct(value: number | null | undefined, digits = 1): string {
  return value == null ? "—" : pctValue(value * 100, digits);
}

/** 0.879 */
export function ratio(value: number | null | undefined, digits = 3): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

const utc = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

/** "Tue 19 May". */
export function shortDate(iso: string): string {
  const d = utc(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const wd = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return `${wd} ${dayMonth(iso)}`;
}

/** "19 May". */
export function dayMonth(iso: string): string {
  const d = utc(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "Mon 18 May 2026". */
export function longDate(iso: string): string {
  const d = utc(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${shortDate(iso)} ${d.getUTCFullYear()}`;
}

/** "28 Oct 2026" from an ISO timestamp. */
export function dateOfTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "28 Oct 05:35 UTC". */
export function stampOfTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const hm = d.toISOString().slice(11, 16);
  return `${day} ${hm} UTC`;
}

export function addDays(iso: string, days: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000);
}

/** "in 1 day", "in 7 days", "today". */
export function inDays(n: number): string {
  if (n === 0) return "today";
  return `in ${n} ${n === 1 ? "day" : "days"}`;
}

/** Days from as_of to the first breaching point of an account, or null if none in the horizon. */
export function daysToFirstGap(points: ForecastPoint[], accountId: string, asOf: string): number | null {
  const first = points
    .filter((p) => p.account_id === accountId && p.breach)
    .sort((x, y) => x.date.localeCompare(y.date))[0];
  return first ? daysBetween(asOf, first.date) : null;
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => a.date.localeCompare(b.date) || b.gap_amount - a.gap_amount);
}

/** "1–3, 5" from [1, 2, 3, 5]. */
export function ranges(xs: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    let j = i;
    while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
    out.push(i === j ? `${xs[i]}` : `${xs[i]}–${xs[j]}`);
    i = j;
  }
  return out.join(", ");
}

/** Short account name for tight spaces: "Atlas EUR" from bank "Atlas Bank", currency EUR. */
export function shortAccount(a: { bank_name: string; currency: string }): string {
  return `${a.bank_name.replace(/\s+Bank$/i, "")} ${a.currency}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** "nine" for 9; digits above ten. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}
