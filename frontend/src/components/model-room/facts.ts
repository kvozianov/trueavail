/** Every number the model room says, derived from explain / history / scheduled / alerts. */
import { daysBetween } from "@/lib/format";
import type { Account, Alert, ExplainResponse, ExplainSeries, HistoryRow, ScheduledFlow } from "@/lib/types";

export const ML_COMPONENTS = ["lightgbm_quantile", "sklearn_gbdt_quantile", "ewma_volatility_baseline"] as const;

export interface RoomFacts {
  series: ExplainSeries;
  account: Account;
  days: number;
  accounts: number;
  rows: number;
  trainable: number;
  anomalies: number;
  features: number;
  trees: Record<string, number>;
  weights: Record<string, number>;
  day1P05: Record<string, number>;
  day1Spread: number;
  widest: string;
  blendP05: number[];
  gapDays: number[];
  firstGap: { i: number; date: string; p05: number; gap: number } | null;
  laterGaps: { count: number; from: string } | null;
  minP05: { i: number; date: string; value: number };
  flows: ScheduledFlow[];
  driverOut: ScheduledFlow | null;
  lateIn: ScheduledFlow | null;
  firstAlert: Alert | null;
}

export function roomFacts(
  explain: ExplainResponse,
  accountId: string,
  accounts: Account[],
  scheduled: ScheduledFlow[],
  alerts: Alert[],
): RoomFacts | null {
  const series = explain.series.find((s) => s.account_id === accountId);
  const account = accounts.find((a) => a.account_id === accountId);
  const blend = series?.components.blend;
  if (!series || !account || !blend) return null;
  const t = explain.training;
  const ml = ML_COMPONENTS.filter((c) => series.components[c]);
  const day1P05 = Object.fromEntries(ml.map((c) => [c, series.components[c]!.balance.p05[0]]));
  const d1 = Object.values(day1P05);
  const last = series.dates.length - 1;
  const widest = ml.reduce((w, c) => {
    const width = (k: string) => series.components[k as (typeof ml)[number]]!.balance.p95[last] - series.components[k as (typeof ml)[number]]!.balance.p05[last];
    return width(c) > width(w) ? c : w;
  }, ml[0]);
  const p05 = blend.balance.p05;
  const gapDays = p05.map((v, i) => (v < series.required_buffer ? i : -1)).filter((i) => i >= 0);
  const fi = gapDays[0];
  const firstRunEnd = (() => {
    let j = 0;
    while (j + 1 < gapDays.length && gapDays[j + 1] === gapDays[j] + 1) j++;
    return j;
  })();
  const later = gapDays.slice(firstRunEnd + 1);
  const minI = p05.reduce((m, v, i) => (v < p05[m] ? i : m), 0);
  const flows = scheduled.filter((f) => f.account_id === accountId && series.dates.includes(f.effective_date));
  const gapDate = fi != null ? series.dates[fi] : null;
  const driverOut = gapDate
    ? (flows.filter((f) => f.direction === "outflow" && f.effective_date <= gapDate).sort((a, b) => b.amount - a.amount)[0] ?? null)
    : null;
  const lateIn = flows.filter((f) => f.direction === "inflow" && f.effective_date > f.expected_date).sort((a, b) => b.amount - a.amount)[0] ?? null;
  const firstAlert = alerts.filter((a) => a.account_id === accountId).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  return {
    series,
    account,
    days: t.accounts ? Math.round(t.history_rows / t.accounts) : t.history_rows,
    accounts: t.accounts,
    rows: t.history_rows,
    trainable: t.rows_trainable,
    anomalies: t.anomaly_rows,
    features: t.feature_columns.length,
    trees: explain.model.n_estimators,
    weights: explain.model.weights,
    day1P05,
    day1Spread: d1.length ? Math.max(...d1) - Math.min(...d1) : 0,
    widest,
    blendP05: p05,
    gapDays,
    firstGap: fi != null ? { i: fi, date: series.dates[fi], p05: p05[fi], gap: series.required_buffer - p05[fi] } : null,
    laterGaps: later.length ? { count: later.length, from: series.dates[later[0]] } : null,
    minP05: { i: minI, date: series.dates[minI], value: p05[minI] },
    flows,
    driverOut,
    lateIn,
    firstAlert,
  };
}

/** Per-account normalised balances for the observation strips (0..1), oldest first. */
export function strips(history: HistoryRow[], accounts: Account[], anomalies: Map<string, Set<string>>) {
  return accounts.map((a) => {
    const rows = history.filter((h) => h.account_id === a.account_id).sort((x, y) => x.date.localeCompare(y.date));
    const vals = rows.map((r) => r.ending_balance);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const flagged = anomalies.get(a.account_id) ?? new Set<string>();
    return { account: a, bars: rows.map((r) => ({ date: r.date, v: hi > lo ? (r.ending_balance - lo) / (hi - lo) : 0.5, anomaly: flagged.has(r.date) })) };
  });
}

export const daysAfter = (asOf: string, date: string) => daysBetween(asOf, date);
