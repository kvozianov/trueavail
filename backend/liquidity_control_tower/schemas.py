from typing import Literal

from pydantic import BaseModel, Field


RiskStatus = Literal["Green", "Yellow", "Red"]


class ForecastRequest(BaseModel):
    horizon_days: int = Field(default=14, ge=1, le=60)
    as_of: str = "2026-05-18T09:00:00Z"
    prefer_lightgbm: bool = True


class ForecastPoint(BaseModel):
    date: str
    account_id: str
    bank_id: str
    bank_name: str
    currency: str
    required_buffer: float
    scheduled_net_flow: float
    balance_p05: float
    balance_p50: float
    balance_p95: float
    usable_liquidity_p05: float
    usable_liquidity_p50: float
    usable_liquidity_p95: float
    risk_status: RiskStatus
    breach: bool


class FeatureQualitySummary(BaseModel):
    rows_total: int
    rows_trainable: int
    anomaly_rows: int
    anomaly_threshold: float
    ewma_alpha: float
    feature_columns: list[str]


class HHIResult(BaseModel):
    value: float
    threshold: float
    alert: bool
    contributions: dict[str, float]


class ForecastMetricSummary(BaseModel):
    median_wape: float
    band_coverage: float
    alert_lead_time_days: int | None
    backtest_windows: int
    model_version: str


class ForecastRunResponse(BaseModel):
    generated_at: str
    model_type: str
    model_available: bool
    fallback_reason: str | None
    feature_quality: FeatureQualitySummary
    metrics: ForecastMetricSummary
    hhi: HHIResult
    forecast: list[ForecastPoint]
    first_breach: ForecastPoint | None
    formulas: dict[str, str]


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


class ApprovalRequest(BaseModel):
    balances: list[OptimizerBalanceInput]
    transfers: list[TransferPlanItem]
    approved_by: str = "demo.treasury@fintech.local"
    reason: str = "Approved optimizer recommendation"


class ApprovalResponse(BaseModel):
    approved: bool
    approved_by: str
    reason: str
    total_transfer_amount: float
    total_transfer_cost: float
    post_transfer_balances: list[OptimizerBalanceInput]
    hhi_after_approval: HHIResult
    accounts_below_buffer: list[str]
    audit_log: list[dict[str, object]]
    formulas: dict[str, str]


class ExplanationRequest(BaseModel):
    scenario_id: Literal["bank_run", "target2_outage"] = "target2_outage"
    downgrade_bank_id: str | None = "atlas"


class ExplanationRootCause(BaseModel):
    type: str
    title: str
    detail: str
    amount: float | None = None
    formula_key: str | None = None


class ExplanationTimelineEvent(BaseModel):
    date: str
    label: str
    detail: str


class FormulaCard(BaseModel):
    key: str
    title: str
    formula: str
    interpretation: str


class ExplanationResponse(BaseModel):
    summary: str
    risk_status: RiskStatus
    affected_account_id: str | None
    affected_currency: str | None
    root_causes: list[ExplanationRootCause]
    timeline: list[ExplanationTimelineEvent]
    formula_cards: list[FormulaCard]
    data_quality_notes: list[str]


class RoiRequest(BaseModel):
    scenario_id: Literal["bank_run", "target2_outage"] = "target2_outage"
    downgrade_bank_id: str | None = "atlas"


class RoiMetric(BaseModel):
    label: str
    before: float | str
    after: float | str
    unit: str
    explanation: str


class RoiResponse(BaseModel):
    summary: str
    metrics: list[RoiMetric]
    optimizer_cost: float
    expected_shortfall_99: float
    avoided_liquidity_gap: float
    released_idle_reserve: float
    approval_gate: dict[str, object] | None = None
    formulas: dict[str, str]


class AICouncilRequest(BaseModel):
    scenario_id: Literal["bank_run", "target2_outage"] = "target2_outage"
    downgrade_bank_id: str | None = "atlas"
    mode: Literal["auto", "live", "mock"] = "auto"
    peer_review: bool = True
    model: str | None = None


class AICouncilAdvisorResponse(BaseModel):
    advisor: str
    lens: str
    response: str


class AICouncilPeerReview(BaseModel):
    reviewer: str
    response: str


class AICouncilResponse(BaseModel):
    mode: Literal["live", "mock"]
    model: str
    live_available: bool
    fallback_reason: str | None = None
    framed_question: str
    facts: dict[str, object]
    advisor_responses: list[AICouncilAdvisorResponse]
    peer_reviews: list[AICouncilPeerReview]
    verdict: str
    formulas_used: dict[str, str]
