/**
 * Response/request shapes of the TrueAvail backend, mirrored from docs/SPEC.md
 * ("Backend API"). Dates are ISO `YYYY-MM-DD` strings.
 */

export type ISODate = string;
export type Direction = "inflow" | "outflow";
export type Severity = "red" | "amber";

/** `/health.dataset`: the active dataset; `accounts` is a count here. */
export interface DatasetInfo {
  source: DatasetSource;
  seed: number | null;
  rows: number;
  accounts: number;
  start: ISODate;
  end: ISODate;
}

export interface HealthResponse {
  status: "ok" | string;
  version: string;
  model_available: boolean;
  dataset: DatasetInfo;
  /** SQLAlchemy dialect of the backing store, e.g. "postgresql" or "sqlite". */
  database?: string;
}

export interface Account {
  account_id: string;
  bank_name: string;
  label: string;
  currency: string;
  settled_balance: number;
  required_buffer: number;
}

export type DatasetSource = "synthetic" | "upload";

export interface DatasetSummary {
  source: DatasetSource;
  rows: number;
  accounts: string[];
  start: ISODate;
  end: ISODate;
  seed?: number | null;
  scheduled_flows: number;
  warnings: string[];
}

export type UploadResponse = DatasetSummary;

export interface GenerateRequest {
  accounts?: number;
  history_days?: number;
  seed?: number;
}

export interface HistoryRow {
  date: ISODate;
  account_id: string;
  net_flow: number;
  ending_balance: number;
  required_buffer: number;
}

export interface ScheduledFlow {
  flow_id: string;
  account_id: string;
  currency: string;
  amount: number;
  direction: Direction;
  expected_date: ISODate;
  effective_date: ISODate;
  rail: string;
  description: string;
}

export interface KnownEvent {
  flow_id: string;
  amount: number;
  direction: Direction;
  description: string;
}

export interface ForecastPoint {
  date: ISODate;
  account_id: string;
  currency: string;
  balance_p05: number;
  balance_p50: number;
  balance_p95: number;
  scheduled_net_flow: number;
  required_buffer: number;
  breach: boolean;
  known_events: KnownEvent[];
}

export interface ModelInfo {
  type: string;
  components: string[];
  weights: Record<string, number>;
  available: boolean;
  fallback_reason?: string | null;
}

export interface FeatureQuality {
  rows_trainable: number;
  anomaly_rows: number;
  known_event_rows: number;
}

export interface ForecastResponse {
  as_of: ISODate;
  horizon_days: number;
  quantiles: number[];
  model: ModelInfo;
  feature_quality: FeatureQuality;
  points: ForecastPoint[];
  first_breach: ForecastPoint | null;
}

export interface ForecastRequest {
  horizon_days?: number;
  as_of?: ISODate;
}

export interface Alert {
  /** An account id, or the literal "consolidated". */
  account_id: string;
  /** Account currency; consolidated alerts are per currency (no FX conversion). */
  currency: string;
  date: ISODate;
  quantile_balance: number;
  required_buffer: number;
  gap_amount: number;
  severity: Severity;
  drivers: string[];
}

export interface AlertsResponse {
  per_account: Alert[];
  consolidated: Alert[];
  threshold_quantile: string;
}

export interface Adjustment {
  flow_id?: string;
  account_id: string;
  expected_date: ISODate;
  amount: number;
  direction: Direction;
  shift_days?: number;
  remove?: boolean;
}

export interface WhatIfRequest {
  horizon_days?: number;
  quantile?: "p05" | "p50" | "p95";
  adjustments: Adjustment[];
}

export interface WhatIfDelta {
  gaps_removed: number;
  gaps_added: number;
  worst_gap_before: number;
  worst_gap_after: number;
}

export interface WhatIfResponse {
  baseline: ForecastResponse;
  scenario: ForecastResponse;
  alerts_before: Alert[];
  alerts_after: Alert[];
  delta: WhatIfDelta;
}

export interface BacktestRequest {
  horizon_days?: number;
  folds?: number;
  step_days?: number;
}

export interface BacktestHorizon {
  h: number;
  pinball_p05: number;
  pinball_p50: number;
  pinball_p95: number;
  coverage_90: number;
  mae_p50: number;
  baseline_mae: number;
  baseline_pinball_p50: number;
}

export interface BacktestSummary {
  mean_pinball_p50: number;
  baseline_mean_pinball_p50: number;
  improvement_pct: number;
  mean_coverage_90: number;
  target_coverage: number;
}

export interface BacktestFold {
  fold: number;
  train_end: ISODate;
  test_start: ISODate;
  test_end: ISODate;
}

export interface BacktestResponse {
  horizon_days: number;
  folds: number;
  step_days: number;
  rows_evaluated: number;
  per_horizon: BacktestHorizon[];
  summary: BacktestSummary;
  baseline: string;
  folds_detail: BacktestFold[];
}
