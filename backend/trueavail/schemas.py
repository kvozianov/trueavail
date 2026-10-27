"""Pydantic request/response models. Field names follow docs/SPEC.md (the frontend contract)."""

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health, accounts, data
# ---------------------------------------------------------------------------


class DatasetInfo(BaseModel):
    source: Literal["synthetic", "upload"]
    seed: int | None = None
    rows: int
    accounts: int
    start: str
    end: str


class HealthResponse(BaseModel):
    status: str
    version: str
    model_available: bool
    dataset: DatasetInfo
    database: str


class AccountOut(BaseModel):
    account_id: str
    bank_name: str
    label: str
    currency: str
    settled_balance: float
    required_buffer: float


class GenerateRequest(BaseModel):
    accounts: int = Field(default=5, ge=1, le=12)
    history_days: int = Field(default=120, ge=30, le=730)
    seed: int = Field(default=42, ge=0, le=2**31 - 1)


class DatasetSummary(BaseModel):
    source: Literal["synthetic", "upload"]
    rows: int
    accounts: list[str]
    start: str
    end: str
    seed: int | None = None
    scheduled_flows: int
    warnings: list[str] = []


class HistoryRowOut(BaseModel):
    date: str
    account_id: str
    net_flow: float
    ending_balance: float
    required_buffer: float


class ScheduledFlowOut(BaseModel):
    flow_id: str
    account_id: str
    currency: str
    amount: float
    direction: Literal["inflow", "outflow"]
    expected_date: str
    effective_date: str
    rail: str
    description: str


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------


class ForecastRequest(BaseModel):
    horizon_days: int = Field(default=14, ge=1, le=30)
    as_of: str | None = Field(default=None, description="YYYY-MM-DD; defaults to the last history date")


class KnownEventOut(BaseModel):
    flow_id: str
    amount: float
    direction: Literal["inflow", "outflow"]
    description: str


class ForecastPoint(BaseModel):
    date: str
    account_id: str
    currency: str
    balance_p05: float
    balance_p50: float
    balance_p95: float
    scheduled_net_flow: float
    required_buffer: float
    breach: bool
    known_events: list[KnownEventOut]


class ModelInfo(BaseModel):
    type: str
    components: list[str]
    weights: dict[str, float]
    available: bool
    fallback_reason: str | None = None


class FeatureQuality(BaseModel):
    rows_trainable: int
    anomaly_rows: int
    known_event_rows: int


class ForecastResponse(BaseModel):
    as_of: str
    horizon_days: int
    quantiles: list[float]
    model: ModelInfo
    feature_quality: FeatureQuality
    points: list[ForecastPoint]
    first_breach: ForecastPoint | None
    run_id: int | None = None


class ForecastRunOut(BaseModel):
    id: int
    dataset_id: int
    created_at: str | None
    kind: str
    horizon_days: int
    as_of: str | None
    model_type: str | None
    summary: dict[str, object]


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------


class Alert(BaseModel):
    account_id: str  # account id or "consolidated"
    currency: str
    date: str
    quantile_balance: float
    required_buffer: float
    gap_amount: float
    severity: Literal["red", "amber"]
    drivers: list[str]


class AlertsResponse(BaseModel):
    per_account: list[Alert]
    consolidated: list[Alert]
    threshold_quantile: Literal["p05", "p50", "p95"]


# ---------------------------------------------------------------------------
# Backtest
# ---------------------------------------------------------------------------


class BacktestRequest(BaseModel):
    horizon_days: int = Field(default=14, ge=1, le=30)
    folds: int = Field(default=6, ge=1, le=12)
    step_days: int = Field(default=7, ge=1, le=30)


class BacktestHorizonRow(BaseModel):
    h: int
    pinball_p05: float
    pinball_p50: float
    pinball_p95: float
    coverage_90: float
    mae_p50: float
    baseline_mae: float
    baseline_pinball_p50: float
    n: int


class BacktestSummary(BaseModel):
    mean_pinball_p50: float
    baseline_mean_pinball_p50: float
    improvement_pct: float
    mean_coverage_90: float
    target_coverage: float
    mean_mae_p50: float
    baseline_mean_mae: float


class BacktestFold(BaseModel):
    fold: int
    train_end: str
    test_start: str
    test_end: str


class BacktestModelInfo(BaseModel):
    type: str | None
    components: list[str]
    weights: dict[str, float]
    n_estimators: dict[str, int]
    profile: str
    quantiles: list[float]
    uses_scheduled_flows: bool
    note: str


class BacktestResponse(BaseModel):
    horizon_days: int
    folds: int
    step_days: int
    rows_evaluated: int
    per_horizon: list[BacktestHorizonRow]
    summary: BacktestSummary
    baseline: Literal["seasonal_naive_7d"]
    folds_detail: list[BacktestFold]
    model: BacktestModelInfo
    elapsed_seconds: float


# ---------------------------------------------------------------------------
# What-if
# ---------------------------------------------------------------------------


class Adjustment(BaseModel):
    flow_id: str | None = None
    account_id: str
    expected_date: str
    amount: float = Field(gt=0)
    direction: Literal["inflow", "outflow"]
    shift_days: int = Field(default=0, ge=-60, le=60)
    remove: bool = False


class WhatIfRequest(BaseModel):
    horizon_days: int = Field(default=14, ge=1, le=30)
    quantile: Literal["p05", "p50", "p95"] = "p05"
    adjustments: list[Adjustment] = []


class WhatIfDelta(BaseModel):
    gaps_removed: int
    gaps_added: int
    worst_gap_before: float
    worst_gap_after: float


class WhatIfResponse(BaseModel):
    baseline: ForecastResponse
    scenario: ForecastResponse
    alerts_before: list[Alert]
    alerts_after: list[Alert]
    delta: WhatIfDelta


# ---------------------------------------------------------------------------
# Stress and optimizer (secondary, kept from the earlier prototype)
# ---------------------------------------------------------------------------


class HHIResult(BaseModel):
    value: float
    threshold: float
    alert: bool
    contributions: dict[str, float]


class OptimizerBalanceInput(BaseModel):
    account_id: str
    bank_id: str
    bank_name: str
    currency: str
    settled_balance: float
    required_buffer: float


class OptimizerRequest(BaseModel):
    balances: list[OptimizerBalanceInput] | None = None
    downgrade_bank_id: str | None = None
    downgrade_score_delta: int = Field(default=25, ge=0, le=100)
    survival_min_balances: dict[str, float] | None = None


class TransferPlanItem(BaseModel):
    source_account_id: str
    destination_account_id: str
    source_bank_id: str
    destination_bank_id: str
    currency: str
    amount: float
    variable_cost: float
    fixed_fee: float
    total_cost: float


class OptimizerAuditEvent(BaseModel):
    event_type: str
    bank_id: str | None = None
    old_ccri_score: float | None = None
    new_ccri_score: float | None = None
    old_max_exposure_share: float | None = None
    new_max_exposure_share: float | None = None
    message: str


class OptimizerResponse(BaseModel):
    status: Literal["optimal", "infeasible", "error"]
    solver_engine: str
    objective_value: float
    total_transfer_cost: float
    hhi_before: HHIResult
    hhi_after: HHIResult
    transfers: list[TransferPlanItem]
    post_transfer_balances: list[OptimizerBalanceInput]
    bank_exposure_limits: dict[str, float]
    survival_min_balances: dict[str, float] = {}
    audit_events: list[OptimizerAuditEvent]
    infeasible_reason: str | None = None
    formulas: dict[str, str]


class StressScenarioRequest(BaseModel):
    scenario_id: Literal["bank_run", "target2_outage"] = "bank_run"
    run_optimizer: bool = True
    downgrade_bank_id: str | None = None


class StressCoefficient(BaseModel):
    bank_id: str
    currency: str
    balance_multiplier: float
    inflow_delay_days: int
    description: str


class StressBalancePoint(BaseModel):
    account_id: str
    bank_id: str
    bank_name: str
    currency: str
    required_buffer: float
    balance_before: float
    balance_after: float
    loss_amount: float
    loss_percent: float
    below_buffer: bool


class ExpectedShortfallSummary(BaseModel):
    confidence_level: float
    value: float
    tail_count: int
    losses: list[float]
    formula: str


class StressScenarioResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    coefficients: list[StressCoefficient]
    balances: list[StressBalancePoint]
    total_balance_before: float
    total_balance_after: float
    total_loss: float
    expected_shortfall_99: ExpectedShortfallSummary
    hhi_before: HHIResult
    hhi_after: HHIResult
    accounts_below_buffer: list[str]
    optimizer_recommendation: OptimizerResponse | None
    approval_gate: dict[str, object] | None = None
    formulas: dict[str, str]


