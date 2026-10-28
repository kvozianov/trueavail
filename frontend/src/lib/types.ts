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
  /** Id of the stored forecast run (live and demo). */
  run_id?: number | null;
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
  /** Wall-clock time of the run on the backend. */
  elapsed_seconds?: number;
}

/** Demo mode (NEXT_PUBLIC_DEMO=1): a what-if scenario precomputed by backend/scripts/export_demo.py. */
export interface DemoScenarioSummary {
  id: string;
  title: string;
  description: string;
  /** Path relative to /demo/. */
  file: string;
  delta: WhatIfDelta;
  /** Accounts touched by the scenario's adjustments. */
  accounts?: string[];
  worst_before?: WorstGap | null;
  worst_after?: WorstGap | null;
}

export interface WorstGap {
  account_id: string;
  currency: string;
  date: ISODate;
  gap_amount: number;
}

/** The full `/api/whatif/run` response plus the scenario definition that produced it. */
export interface DemoScenario extends WhatIfResponse {
  id: string;
  title: string;
  description: string;
  adjustments: Adjustment[];
}

export interface DemoManifest {
  generated_at: string;
  backend_version: string;
  git_commit: { sha: string | null; backend_dirty: boolean | null };
  generator: string;
  dataset: DatasetInfo;
  model_available: boolean;
  files: { path: string; bytes: number }[];
}

/** `GET /api/forecast/explain` (demo: explain.json): what one forecast is made of. */
export type ComponentName = "lightgbm_quantile" | "sklearn_gbdt_quantile" | "ewma_volatility_baseline" | "blend";

export interface QuantileSeries {
  p05: number[];
  p50: number[];
  p95: number[];
}

export interface ComponentPaths {
  /** Daily net flow quantiles of this component alone. */
  flow: QuantileSeries;
  /** Start balance + scheduled flows + this component's cumulated daily quantiles. */
  balance: QuantileSeries;
}

export interface ExplainSeries {
  account_id: string;
  currency: string;
  start_balance: number;
  required_buffer: number;
  dates: ISODate[];
  scheduled_net_flow: number[];
  components: Partial<Record<ComponentName, ComponentPaths>>;
  /** History days flagged by the MAD anomaly score (excluded from training). */
  anomaly_dates?: ISODate[];
  latest_features: Record<string, number | null>;
}

export interface FeatureImportanceRow {
  feature: string;
  label: string;
  group: "calendar" | "history" | "scheduled" | string;
  gain: number;
  share: number;
}

export interface ExplainResponse {
  as_of: ISODate;
  horizon_days: number;
  quantiles: number[];
  model: {
    type: string;
    available: boolean;
    fallback_reason?: string | null;
    weights: Record<string, number>;
    n_estimators: Record<string, number>;
  };
  training: {
    history_rows: number;
    accounts: number;
    rows_trainable: number;
    anomaly_rows: number;
    known_event_rows: number;
    feature_columns: string[];
    feature_labels: Record<string, string>;
  };
  feature_importance: {
    model: string;
    quantile: number;
    importance_type: string;
    features: FeatureImportanceRow[];
  };
  components: ComponentName[];
  series: ExplainSeries[];
}
