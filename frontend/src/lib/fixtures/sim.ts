/**
 * Deterministic fixture "model": P50 = settled balance + mean drift + scheduled
 * flows; the P5–P95 band widens with the square root of the horizon. This only
 * exists so the UI (incl. what-if) can be exercised without the backend.
 */
import type {
  Adjustment,
  Alert,
  AlertsResponse,
  BacktestRequest,
  BacktestResponse,
  ForecastPoint,
  ForecastResponse,
  HistoryRow,
  ScheduledFlow,
  WhatIfRequest,
  WhatIfResponse,
} from "../types";
import {
  AS_OF,
  HISTORY_DAYS,
  HISTORY_START,
  HORIZON,
  SEED,
  accountProfiles,
  holidays,
  scheduledFlowsData,
} from "./data";
import { addDays, mulberry32, normal, round2 } from "./rng";

const Z = 1.645;

function isWeekend(iso: string): boolean {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function nextBusinessDay(iso: string): string {
  let d = iso;
  while (isWeekend(d) || holidays[d]) d = addDays(d, 1);
  return d;
}

const fmtM = (ccy: string, v: number) => `${ccy} ${(v / 1e6).toFixed(2)}M`;

export function buildForecast(flows: ScheduledFlow[], horizon = HORIZON): ForecastResponse {
  const points: ForecastPoint[] = [];
  for (const acc of accountProfiles) {
    let p50 = acc.settled_balance;
    let variance = 0;
    for (let h = 1; h <= horizon; h++) {
      const date = addDays(AS_OF, h);
      const weekend = isWeekend(date);
      const drift = weekend ? acc.drift * 0.3 : acc.drift;
      const sigma = weekend ? acc.sigma * 0.5 : acc.sigma;
      const todays = flows.filter((f) => f.account_id === acc.account_id && f.effective_date === date);
      const scheduled = todays.reduce((s, f) => s + (f.direction === "inflow" ? f.amount : -f.amount), 0);
      p50 += drift + scheduled;
      variance += sigma * sigma;
      const sd = Math.sqrt(variance);
      const p05 = p50 - Z * sd * 1.1;
      const p95 = p50 + Z * sd * 0.95;
      points.push({
        date,
        account_id: acc.account_id,
        currency: acc.currency,
        balance_p05: round2(p05),
        balance_p50: round2(p50),
        balance_p95: round2(p95),
        scheduled_net_flow: scheduled,
        required_buffer: acc.required_buffer,
        breach: p05 < acc.required_buffer,
        known_events: todays.map((f) => ({
          flow_id: f.flow_id,
          amount: f.amount,
          direction: f.direction,
          description: f.description,
        })),
      });
    }
  }
  const first = points.filter((p) => p.breach).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  return {
    as_of: AS_OF,
    horizon_days: horizon,
    quantiles: [0.05, 0.5, 0.95],
    model: {
      type: "weighted-quantile-ensemble",
      components: ["lightgbm_quantile", "sklearn_gbdt_quantile", "ewma_volatility_baseline"],
      weights: { lightgbm_quantile: 0.55, sklearn_gbdt_quantile: 0.3, ewma_volatility_baseline: 0.15 },
      available: true,
      fallback_reason: null,
    },
    feature_quality: { rows_trainable: 565, anomaly_rows: 7, known_event_rows: flows.length },
    points,
    first_breach: first,
  };
}

function driversFor(alertPoint: ForecastPoint, flows: ScheduledFlow[]): string[] {
  const acc = accountProfiles.find((a) => a.account_id === alertPoint.account_id)!;
  const drivers: string[] = [];
  for (const f of flows) {
    if (f.account_id !== acc.account_id || f.effective_date > alertPoint.date) continue;
    if (f.direction === "outflow") {
      drivers.push(
        `Scheduled outflow ${fmtM(acc.currency, f.amount)} (${f.description}, ${f.rail}) on ${f.effective_date}`,
      );
    } else if (f.effective_date !== f.expected_date) {
      drivers.push(`Inflow ${fmtM(acc.currency, f.amount)} settles ${f.effective_date} instead of ${f.expected_date}`);
    }
  }
  const spread = alertPoint.balance_p50 - alertPoint.balance_p05;
  drivers.push(`P05 is ${fmtM(acc.currency, spread)} below P50 (forecast uncertainty)`);
  return drivers;
}

/** One alert per contiguous breach window, placed on the worst (largest gap) day. */
export function buildAlerts(fc: ForecastResponse, flows: ScheduledFlow[]): Alert[] {
  const alerts: Alert[] = [];
  for (const acc of accountProfiles) {
    const pts = fc.points.filter((p) => p.account_id === acc.account_id);
    let window: ForecastPoint[] = [];
    const flush = () => {
      if (!window.length) return;
      const worst = window.reduce((w, p) => (p.balance_p05 < w.balance_p05 ? p : w));
      alerts.push({
        account_id: acc.account_id,
        currency: acc.currency,
        date: worst.date,
        quantile_balance: worst.balance_p05,
        required_buffer: worst.required_buffer,
        gap_amount: round2(worst.required_buffer - worst.balance_p05),
        severity: window.some((p) => p.balance_p50 < p.required_buffer) ? "red" : "amber",
        drivers: driversFor(worst, flows),
      });
      window = [];
    };
    for (const p of pts) {
      if (p.breach) window.push(p);
      else flush();
    }
    flush();
  }
  return alerts.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildAlertsResponse(fc: ForecastResponse, flows: ScheduledFlow[]): AlertsResponse {
  return { per_account: buildAlerts(fc, flows), consolidated: [], threshold_quantile: "p05" };
}

export function applyAdjustments(flows: ScheduledFlow[], adjustments: Adjustment[]): ScheduledFlow[] {
  const out: ScheduledFlow[] = [];
  for (const f of flows) {
    const adj = adjustments.find((a) => a.flow_id === f.flow_id);
    if (!adj) {
      out.push(f);
      continue;
    }
    if (adj.remove) continue;
    const shift = adj.shift_days ?? 0;
    const expected = addDays(f.expected_date, shift);
    out.push({
      ...f,
      amount: adj.amount,
      direction: adj.direction,
      expected_date: expected,
      effective_date: shift === 0 ? f.effective_date : nextBusinessDay(expected),
    });
  }
  return out;
}

export function runWhatIfFixture(req: WhatIfRequest): WhatIfResponse {
  const horizon = req.horizon_days ?? HORIZON;
  const scenarioFlows = applyAdjustments(scheduledFlowsData, req.adjustments);
  const baseline = buildForecast(scheduledFlowsData, horizon);
  const scenario = buildForecast(scenarioFlows, horizon);
  const before = buildAlerts(baseline, scheduledFlowsData);
  const after = buildAlerts(scenario, scenarioFlows);
  const key = (p: ForecastPoint) => `${p.account_id}|${p.date}`;
  const beforeSet = new Set(baseline.points.filter((p) => p.breach).map(key));
  const afterSet = new Set(scenario.points.filter((p) => p.breach).map(key));
  const worst = (a: Alert[]) => a.reduce((m, x) => Math.max(m, x.gap_amount), 0);
  return {
    baseline,
    scenario,
    alerts_before: before,
    alerts_after: after,
    delta: {
      gaps_removed: [...beforeSet].filter((k) => !afterSet.has(k)).length,
      gaps_added: [...afterSet].filter((k) => !beforeSet.has(k)).length,
      worst_gap_before: worst(before),
      worst_gap_after: worst(after),
    },
  };
}

/** 120 daily rows per account, generated backwards so the last row equals settled_balance. */
export function buildHistory(): HistoryRow[] {
  const rows: HistoryRow[] = [];
  accountProfiles.forEach((acc, i) => {
    const rand = mulberry32(SEED * 100 + i);
    const flowsNewestFirst: number[] = [];
    for (let k = 0; k < HISTORY_DAYS; k++) {
      const date = addDays(HISTORY_START, HISTORY_DAYS - 1 - k);
      const weekend = isWeekend(date);
      const weekly = new Date(`${date}T00:00:00Z`).getUTCDay() === 2 ? -1.6 * acc.sigma : 0.25 * acc.sigma;
      const flow =
        (weekend ? 0.3 : 1) * acc.drift + (weekend ? 0 : weekly) + normal(rand) * acc.sigma * (weekend ? 0.5 : 1);
      flowsNewestFirst.push(Math.round(flow * 100) / 100);
    }
    let balance = acc.settled_balance;
    const accRows: HistoryRow[] = [];
    for (let k = 0; k < HISTORY_DAYS; k++) {
      const date = addDays(HISTORY_START, HISTORY_DAYS - 1 - k);
      accRows.push({
        date,
        account_id: acc.account_id,
        net_flow: flowsNewestFirst[k],
        ending_balance: round2(balance),
        required_buffer: acc.required_buffer,
      });
      balance -= flowsNewestFirst[k];
    }
    rows.push(...accRows.reverse());
  });
  return rows;
}

export function buildBacktest(req: BacktestRequest): BacktestResponse {
  const horizon = req.horizon_days ?? 14;
  const folds = req.folds ?? 6;
  const step = req.step_days ?? 7;
  const rand = mulberry32(SEED + horizon * 7 + folds * 13 + step);
  const per_horizon = Array.from({ length: horizon }, (_, i) => {
    const h = i + 1;
    const s = Math.sqrt(h);
    const jitter = () => 1 + (rand() - 0.5) * 0.06;
    const p50 = 41_000 * s * jitter();
    const base = 47_000 * s * (1 + 0.008 * h) * jitter();
    return {
      h,
      pinball_p05: round2(p50 * 0.42 * jitter()),
      pinball_p50: round2(p50),
      pinball_p95: round2(p50 * 0.47 * jitter()),
      coverage_90: Math.round((0.94 - 0.0075 * h + (rand() - 0.5) * 0.02) * 1000) / 1000,
      mae_p50: round2(p50 * 2),
      baseline_mae: round2(base * 2),
      baseline_pinball_p50: round2(base),
    };
  });
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const m = mean(per_horizon.map((r) => r.pinball_p50));
  const b = mean(per_horizon.map((r) => r.baseline_pinball_p50));
  const lastTrainEnd = addDays(AS_OF, -horizon);
  return {
    horizon_days: horizon,
    folds,
    step_days: step,
    rows_evaluated: folds * horizon * accountProfiles.length,
    per_horizon,
    summary: {
      mean_pinball_p50: round2(m),
      baseline_mean_pinball_p50: round2(b),
      improvement_pct: Math.round(((b - m) / b) * 1000) / 10,
      mean_coverage_90: Math.round(mean(per_horizon.map((r) => r.coverage_90)) * 1000) / 1000,
      target_coverage: 0.9,
    },
    baseline: "seasonal_naive_7d",
    folds_detail: Array.from({ length: folds }, (_, i) => {
      const trainEnd = addDays(lastTrainEnd, -(folds - 1 - i) * step);
      return {
        fold: i + 1,
        train_end: trainEnd,
        test_start: addDays(trainEnd, 1),
        test_end: addDays(trainEnd, horizon),
      };
    }),
  };
}
