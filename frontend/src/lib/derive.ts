/**
 * Pure derivations from backend responses. Components never hard-code a number: every figure on
 * screen is computed here (or in place) from forecast / alerts / explain / backtest / scenario data.
 */
import { daysBetween } from "./format";
import type { Account, Alert, BacktestResponse, ForecastPoint, ForecastResponse, HistoryRow } from "./types";

export interface AccountState {
  account: Account;
  points: ForecastPoint[];
  breachDays: number;
  firstGap: ForecastPoint | null;
  /** Shortfall below the buffer on the first gap day (buffer − P5). */
  firstGapAmount: number | null;
  daysToGap: number | null;
  minP05: ForecastPoint | null;
}

export function accountStates(accounts: Account[], forecast: ForecastResponse | null): AccountState[] {
  return accounts.map((account) => {
    const points = (forecast?.points ?? []).filter((p) => p.account_id === account.account_id).sort((a, b) => a.date.localeCompare(b.date));
    const breaches = points.filter((p) => p.breach);
    const firstGap = breaches[0] ?? null;
    const minP05 = points.reduce<ForecastPoint | null>((m, p) => (!m || p.balance_p05 < m.balance_p05 ? p : m), null);
    return {
      account,
      points,
      breachDays: breaches.length,
      firstGap,
      firstGapAmount: firstGap ? firstGap.required_buffer - firstGap.balance_p05 : null,
      daysToGap: firstGap && forecast ? daysBetween(forecast.as_of, firstGap.date) : null,
      minP05,
    };
  });
}

/** Gap accounts first (soonest gap first), then clear accounts by currency, keeping input order otherwise. */
export function sortForRail(states: AccountState[]): AccountState[] {
  const order = new Map(states.map((s, i) => [s.account.account_id, i]));
  return [...states].sort((a, b) => {
    const ga = a.daysToGap ?? Infinity;
    const gb = b.daysToGap ?? Infinity;
    if (ga !== gb) return ga - gb;
    if (a.account.currency !== b.account.currency) return a.account.currency.localeCompare(b.account.currency);
    return order.get(a.account.account_id)! - order.get(b.account.account_id)!;
  });
}

export function worstAlert(alerts: Alert[]): Alert | null {
  return alerts.reduce<Alert | null>((w, a) => (!w || a.gap_amount > w.gap_amount ? a : w), null);
}

export function gapHeadline(forecast: ForecastResponse, perAccount: Alert[]): string {
  const first = forecast.first_breach;
  const accountsWithGap = new Set(perAccount.map((a) => a.account_id));
  if (!first || !perAccount.length) return `No cash gaps in the next ${forecast.horizon_days} days.`;
  const d = daysBetween(forecast.as_of, first.date);
  const start = d <= 1 ? "It starts tomorrow." : `It starts in ${d} days.`;
  const n = accountsWithGap.size;
  const what = n === 1 ? "One gap" : `Gaps on ${n} accounts`;
  return `${what} in ${forecast.horizon_days} days. ${start}`;
}

export function historyFor(history: HistoryRow[] | null, accountId: string | null): HistoryRow[] {
  if (!history || !accountId) return [];
  return history.filter((h) => h.account_id === accountId).sort((a, b) => a.date.localeCompare(b.date));
}

export interface BacktestFacts {
  better: number;
  total: number;
  worse: { h: number; model: number; baseline: number }[];
  under: { h: number; coverage: number }[];
  /** First horizon after the under-covered run from which every horizon is on target, if any. */
  onTargetFrom: number | null;
}

export function backtestFacts(bt: BacktestResponse): BacktestFacts {
  const s = bt.summary;
  const worse = bt.per_horizon
    .filter((h) => h.pinball_p50 > h.baseline_pinball_p50)
    .map((h) => ({ h: h.h, model: h.pinball_p50, baseline: h.baseline_pinball_p50 }));
  const under = bt.per_horizon.filter((h) => h.coverage_90 < s.target_coverage).map((h) => ({ h: h.h, coverage: h.coverage_90 }));
  const lastUnder = under.length ? Math.max(...under.map((u) => u.h)) : null;
  const after = lastUnder == null ? [] : bt.per_horizon.filter((h) => h.h > lastUnder);
  const onTargetFrom = after.length && after.every((h) => h.coverage_90 >= s.target_coverage) ? after[0].h : null;
  return { better: bt.per_horizon.length - worse.length, total: bt.per_horizon.length, worse, under, onTargetFrom };
}

/** Contiguous runs of indices where `flags[i]` is true → [start, end] pairs. */
export function runs(flags: boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if (!f && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, flags.length - 1]);
  return out;
}

/** Readable component names. */
export const COMPONENT_LABEL: Record<string, string> = {
  lightgbm_quantile: "LightGBM",
  sklearn_gbdt_quantile: "sklearn GBDT",
  ewma_volatility_baseline: "EWMA baseline",
  blend: "Weighted blend",
};
export const COMPONENT_SHORT: Record<string, string> = {
  lightgbm_quantile: "LightGBM",
  sklearn_gbdt_quantile: "GBDT",
  ewma_volatility_baseline: "EWMA",
  blend: "Blend",
};
export const COMPONENT_COLOR: Record<string, string> = {
  lightgbm_quantile: "var(--c-accent)",
  sklearn_gbdt_quantile: "var(--c-gbdt)",
  ewma_volatility_baseline: "var(--c-ewma)",
  blend: "var(--c-accent)",
};
export const GROUP_COLOR: Record<string, string> = {
  calendar: "var(--c-calendar)",
  history: "var(--c-history)",
  scheduled: "var(--c-scheduled)",
};
