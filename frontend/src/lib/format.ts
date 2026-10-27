import type { Alert, ForecastPoint } from "./types";

const compactCache = new Map<string, Intl.NumberFormat>();

/** "€3.04M"; falls back to a plain compact number for unknown currency codes. */
export function money(value: number | null | undefined, currency?: string, opts: { compact?: boolean } = {}): string {
  if (value == null || Number.isNaN(value)) return "—";
  const compact = opts.compact ?? true;
  const key = `${currency ?? ""}|${compact}`;
  let f = compactCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat("en-US", {
        style: currency ? "currency" : "decimal",
        currency: currency || undefined,
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: compact ? 2 : 0,
        minimumFractionDigits: compact ? 2 : 0,
      });
    } catch {
      f = new Intl.NumberFormat("en-US", { notation: compact ? "compact" : "standard", maximumFractionDigits: 2 });
    }
    compactCache.set(key, f);
  }
  return f.format(value);
}

/** Axis ticks: "3.0M", "-500K". */
export function axisNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** "Tue 19 May" from an ISO date, timezone-independent. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function dayMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Days from as_of to the first breaching point of an account, or null if none in the horizon. */
export function daysToFirstGap(points: ForecastPoint[], accountId: string, asOf: string): number | null {
  const first = points
    .filter((p) => p.account_id === accountId && p.breach)
    .sort((x, y) => x.date.localeCompare(y.date))[0];
  return first ? daysBetween(asOf, first.date) : null;
}

export function countAccounts(accounts: number | string[] | undefined): number | null {
  if (accounts == null) return null;
  return Array.isArray(accounts) ? accounts.length : accounts;
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  const rank = { red: 0, amber: 1 } as const;
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity] || a.date.localeCompare(b.date));
}
