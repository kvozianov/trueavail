export type ScenarioId = "bank_run" | "target2_outage";

export type CouncilMode =
  | "auto"
  | "live"
  | "mock"
  | "openai"
  | "anthropic"
  | "mixed";

export type HealthResponse = {
  status: "ok" | string;
};

export type FormulaDictionary = Record<string, string>;

export type FormulaLike = {
  id?: string;
  key?: string;
  title?: string;
  formula?: string;
  description?: string;
  interpretation?: string;
  source?: string;
  [key: string]: unknown;
};

export type HHIResult = {
  value?: number;
  hhi?: number;
  threshold?: number;
  alert?: boolean;
  status?: string;
  contributions?: Record<string, number> | unknown[];
  [key: string]: unknown;
};

export type FeatureQualitySummary = {
  rows_total?: number;
  rows_trainable?: number;
  anomaly_rows?: number;
  anomaly_threshold?: number;
  ewma_alpha?: number;
  feature_columns?: string[];
  known_event_rows?: number | null;
  model_components?: string[];
  model_weights?: Record<string, number>;
};

export type ForecastMetricSummary = {
  median_wape?: number;
  band_coverage?: number;
  alert_lead_time_days?: number | null;
  backtest_windows?: number;
  model_version?: string;
};

export type KnownEventSummary = {
  event_id?: string;
  event_date?: string;
  event_type?: string;
  currency?: string;
  impact_direction?: string;
  expected_amount?: number;
  description?: string;
  account_id?: string | null;
  bank_id?: string | null;
  [key: string]: unknown;
};

export type AnomalyFlagSummary = {
  date?: string;
  account_id?: string;
  bank_id?: string;
  currency?: string;
  net_flow?: number;
  mad_zscore?: number;
  threshold?: number;
  formula?: string;
  rolling_median?: number | null;
  rolling_mad?: number | null;
  [key: string]: unknown;
};

export type ForecastPoint = {
  account_id?: string;
  bank_id?: string;
  bank_name?: string;
  currency?: string;
  date?: string;
  balance_p05?: number;
  balance_p50?: number;
  balance_p95?: number;
  usable_liquidity?: number;
  usable_liquidity_p05?: number;
  usable_liquidity_p50?: number;
  usable_liquidity_p95?: number;
  scheduled_net_flow?: number;
  required_buffer?: number;
  known_events?: KnownEventSummary[] | unknown[];
  risk_status?: string;
  breach?: boolean;
  breach_flag?: boolean;
  [key: string]: unknown;
};

export type ForecastRequest = {
  horizon_days?: number;
  as_of?: string;
  prefer_lightgbm?: boolean;
};

export type ForecastRunResponse = {
  generated_at?: string;
  model_type?: string;
  model_available?: boolean;
  fallback_reason?: string | null;
  model_components?: string[];
  model_weights?: Record<string, number>;
  feature_quality?: FeatureQualitySummary;
  known_events?: KnownEventSummary[];
  anomaly_flags?: AnomalyFlagSummary[];
  metrics?: ForecastMetricSummary;
  hhi?: HHIResult;
  forecast?: ForecastPoint[];
  first_breach?: ForecastPoint | null;
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type OptimizerBalanceInput = {
  account_id?: string;
  bank_id?: string;
  bank_name?: string;
  currency?: string;
  settled_balance?: number;
  required_buffer?: number;
  [key: string]: unknown;
};

export type TransferPlanItem = {
  source_account_id?: string;
  destination_account_id?: string;
  source_bank_id?: string;
  destination_bank_id?: string;
  from_account_id?: string;
  to_account_id?: string;
  from_bank_id?: string;
  to_bank_id?: string;
  currency?: string;
  amount?: number;
  rail?: string;
  cost?: number;
  total_cost?: number;
  fixed_cost?: number;
  fixed_fee?: number;
  variable_cost?: number;
  settlement_time?: string;
  [key: string]: unknown;
};

export type OptimizerAuditEvent = {
  event_type?: string;
  message?: string;
  timestamp?: string;
  severity?: string;
  bank_id?: string | null;
  old_ccri_score?: number | null;
  new_ccri_score?: number | null;
  old_max_exposure_share?: number | null;
  new_max_exposure_share?: number | null;
  [key: string]: unknown;
};

export type OptimizerRequest = {
  balances?: OptimizerBalanceInput[] | null;
  downgrade_bank_id?: string | null;
  downgrade_score_delta?: number;
  survival_min_balances?: Record<string, number> | null;
};

export type OptimizerResponse = {
  status?: string;
  solver_engine?: string;
  objective_value?: number;
  total_transfer_cost?: number;
  hhi_before?: HHIResult;
  hhi_after?: HHIResult;
  transfers?: TransferPlanItem[];
  post_transfer_balances?: OptimizerBalanceInput[];
  bank_exposure_limits?: Record<string, number>;
  survival_min_balances?: Record<string, number>;
  audit_events?: OptimizerAuditEvent[];
  infeasible_reason?: string | null;
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type StressBalancePoint = {
  account_id?: string;
  bank_id?: string;
  bank_name?: string;
  currency?: string;
  required_buffer?: number;
  balance_before?: number;
  balance_after?: number;
  loss_amount?: number;
  loss_percent?: number;
  below_buffer?: boolean;
  [key: string]: unknown;
};

export type StressCoefficient = {
  bank_id?: string;
  currency?: string;
  balance_multiplier?: number;
  inflow_delay_days?: number;
  description?: string;
  [key: string]: unknown;
};

export type ExpectedShortfallSummary = {
  confidence_level?: number;
  value?: number;
  tail_count?: number;
  losses?: number[];
  formula?: string;
  [key: string]: unknown;
};

export type StressScenarioRequest = {
  scenario_id: ScenarioId;
  run_optimizer?: boolean;
  downgrade_bank_id?: string | null;
};

export type StressScenarioResponse = {
  scenario_id?: string;
  scenario_name?: string;
  coefficients?: StressCoefficient[];
  stress_coefficients?: StressCoefficient[] | unknown[];
  balances?: StressBalancePoint[];
  stressed_balances?: StressBalancePoint[] | unknown[];
  total_balance_before?: number;
  total_balance_after?: number;
  total_loss?: number;
  expected_shortfall_99?: ExpectedShortfallSummary;
  es99?: ExpectedShortfallSummary | number | unknown;
  hhi_before?: HHIResult;
  hhi_after?: HHIResult;
  accounts_below_buffer?: string[] | unknown[];
  optimizer_recommendation?: OptimizerResponse | null;
  approval_gate?: Record<string, unknown> | null;
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type ApprovalRequest = {
  balances: OptimizerBalanceInput[];
  transfers: TransferPlanItem[];
  approved_by: string;
  reason: string;
};

export type ApprovalResponse = {
  approved?: boolean;
  approved_by?: string;
  reason?: string;
  approval_summary?: unknown;
  transfer_totals?: unknown;
  total_transfer_amount?: number;
  total_transfer_cost?: number;
  post_transfer_balances?: OptimizerBalanceInput[];
  hhi?: HHIResult;
  hhi_after_approval?: HHIResult;
  accounts_below_buffer?: string[] | unknown[];
  audit_log?: unknown[];
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type ExplanationRequest = {
  scenario_id: ScenarioId;
  downgrade_bank_id?: string | null;
};

export type ExplanationRootCause = {
  type?: string;
  title?: string;
  detail?: string;
  amount?: number | null;
  formula_key?: string | null;
  [key: string]: unknown;
};

export type ExplanationTimelineEvent = {
  date?: string;
  label?: string;
  detail?: string;
  [key: string]: unknown;
};

export type ExplanationResponse = {
  summary?: string;
  risk_status?: string;
  affected_account_id?: string | null;
  affected_account?: string | null;
  affected_currency?: string | null;
  root_causes?: ExplanationRootCause[] | unknown[];
  timeline?: ExplanationTimelineEvent[] | unknown[];
  formula_cards?: FormulaLike[];
  data_quality_notes?: string[] | unknown[];
  [key: string]: unknown;
};

export type RoiRequest = {
  scenario_id: ScenarioId;
  downgrade_bank_id?: string | null;
};

export type RoiMetric = {
  label?: string;
  before?: number | string;
  after?: number | string;
  unit?: string;
  explanation?: string;
  [key: string]: unknown;
};

export type RoiResponse = {
  summary?: string;
  metrics?: RoiMetric[] | unknown;
  optimizer_cost?: number;
  expected_shortfall_99?: number;
  es99?: unknown;
  avoided_liquidity_gap?: number;
  avoided_gap?: number;
  released_idle_reserve?: number;
  released_reserve?: number;
  approval_gate?: Record<string, unknown> | null;
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type ContingencyPlanRequest = {
  scenario_id: ScenarioId;
  downgrade_bank_id?: string | null;
};

export type ContingencyAction = {
  action_type?: string;
  priority?: string;
  currency?: string;
  amount?: number;
  deadline?: string;
  description?: string;
  formula?: string;
  account_id?: string | null;
  transaction_id?: string | null;
  counterparty?: string | null;
  business_reason?: string | null;
  candidate_rails?: string[] | null;
  [key: string]: unknown;
};

export type ContingencyPlanResponse = {
  scenario_id?: string;
  plan_status?: string;
  optimizer_status?: string | null;
  optimizer_reason?: string;
  optimizer_infeasible_reason?: string | null;
  approval_gate_decision?: string | null;
  gate_decision?: string;
  total_p05_gap?: number;
  p05_gap?: number;
  deferrable_coverage?: number;
  intraday_credit_need?: number;
  downgrade_bank_id?: string | null;
  actions?: ContingencyAction[] | unknown[];
  formulas?: FormulaDictionary | FormulaLike[];
  [key: string]: unknown;
};

export type AICouncilRequest = {
  scenario_id: ScenarioId;
  downgrade_bank_id?: string | null;
  mode?: CouncilMode;
  provider?: "auto" | "openai" | "anthropic" | "mixed" | "mock" | null;
  peer_review?: boolean;
  model?: string | null;
  anthropic_model?: string | null;
};

export type AICouncilAdvisorResponse = {
  advisor?: string;
  lens?: string;
  provider?: string | null;
  response?: string;
  [key: string]: unknown;
};

export type AICouncilPeerReview = {
  reviewer?: string;
  provider?: string | null;
  response?: string;
  [key: string]: unknown;
};

export type AICouncilResponse = {
  resolved_mode?: string;
  mode?: string;
  provider?: string;
  provider_mode?: string | null;
  provider_availability?: unknown;
  provider_status?: Record<string, boolean> | null;
  live_available?: boolean;
  fallback_reason?: string | null;
  framed_question?: string;
  mathematical_facts?: unknown;
  facts?: Record<string, unknown>;
  advisor_responses?: AICouncilAdvisorResponse[] | unknown[];
  peer_reviews?: AICouncilPeerReview[] | unknown[];
  chairman_verdict?: unknown;
  verdict?: string;
  formulas_used?: FormulaDictionary | FormulaLike[];
  model?: string;
  openai_model?: string | null;
  anthropic_model?: string | null;
  [key: string]: unknown;
};

export type DemoMetadataResponse = {
  product?: string;
  version?: string;
  demo_clock?: string;
  demo_history_seed?: number;
  default_forecast_horizon_days?: number;
  default_history_days?: number;
  math_parameters?: {
    ewma_alpha?: number;
    mad_zscore_threshold?: number;
    hhi_alert_threshold?: number;
    forecast_quantiles?: number[];
    ensemble_weights?: Record<string, number>;
    [key: string]: unknown;
  };
  ui_ready_endpoints?: string[];
  [key: string]: unknown;
};

export type DemoSnapshotResponse = {
  forecast?: ForecastRunResponse;
  stress_scenarios?: Partial<Record<ScenarioId, StressScenarioResponse>>;
  stress?: StressScenarioResponse;
  optimizer?: OptimizerResponse;
  primary_recommendation?: OptimizerResponse;
  explanation?: ExplanationResponse;
  roi?: RoiResponse;
  contingency?: ContingencyPlanResponse;
  ai_council?: AICouncilResponse;
  generated_at?: string;
  [key: string]: unknown;
};

export type MetricTone = "positive" | "warning" | "danger" | "neutral" | "info";

export type MetricCardModel = {
  id: string;
  title: string;
  value: string;
  rawValue?: number | string | null;
  subtitle?: string;
  status?: MetricTone;
  tooltip?: string;
};

export type DashboardViewModel = {
  generatedAt?: string;
  health?: string;
  topMetrics: MetricCardModel[];
  forecast?: ForecastRunResponse;
  stress?: StressScenarioResponse;
  optimizer?: OptimizerResponse;
  explanation?: ExplanationResponse;
  roi?: RoiResponse;
  contingency?: ContingencyPlanResponse;
  council?: AICouncilResponse;
  warnings: string[];
};
