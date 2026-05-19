from __future__ import annotations

from fastapi import FastAPI

from .ai_council import run_ai_council
from .config import (
    DEFAULT_FORECAST_HORIZON_DAYS,
    DEFAULT_HISTORY_DAYS,
    DEMO_HISTORY_SEED,
    DEMO_NOW,
    EWMA_ALPHA,
    HHI_ALERT_THRESHOLD,
    MAD_ZSCORE_THRESHOLD,
)
from .contingency import build_contingency_plan
from .explainability import build_explanation
from .forecasting import run_phase1_forecast
from .optimizer import solve_liquidity_rebalance
from .roi import build_roi_summary
from .schemas import (
    ApprovalRequest,
    ApprovalResponse,
    AICouncilRequest,
    AICouncilResponse,
    ContingencyPlanRequest,
    ContingencyPlanResponse,
    ExplanationRequest,
    ExplanationResponse,
    ForecastRequest,
    ForecastRunResponse,
    OptimizerRequest,
    OptimizerResponse,
    RoiRequest,
    RoiResponse,
    StressScenarioRequest,
    StressScenarioResponse,
)
from .stress import apply_transfer_approval, run_stress_scenario

app = FastAPI(
    title="Liquidity Control Tower Backend",
    version="0.1.0",
    description="Predictive liquidity backend with forecasting, stress testing, and MIP optimization.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/demo/metadata")
def demo_metadata() -> dict[str, object]:
    return {
        "product": "Liquidity Control Tower",
        "version": app.version,
        "demo_clock": DEMO_NOW,
        "demo_history_seed": DEMO_HISTORY_SEED,
        "default_forecast_horizon_days": DEFAULT_FORECAST_HORIZON_DAYS,
        "default_history_days": DEFAULT_HISTORY_DAYS,
        "math_parameters": {
            "ewma_alpha": EWMA_ALPHA,
            "mad_zscore_threshold": MAD_ZSCORE_THRESHOLD,
            "hhi_alert_threshold": HHI_ALERT_THRESHOLD,
            "forecast_quantiles": [0.05, 0.50, 0.95],
            "ensemble_weights": {
                "lightgbm_quantile": 0.55,
                "sklearn_gbdt_quantile": 0.30,
                "ewma_volatility_baseline": 0.15,
            },
        },
        "ui_ready_endpoints": [
            "GET /api/demo/snapshot",
            "GET /api/demo/metadata",
            "POST /api/forecast/run",
            "POST /api/stress/run",
            "POST /api/optimizer/rebalance",
            "POST /api/explainability/summary",
            "POST /api/roi/summary",
            "POST /api/contingency/plan",
            "POST /api/ai-council/review",
        ],
    }


@app.post("/api/forecast/run", response_model=ForecastRunResponse)
def run_forecast(request: ForecastRequest) -> dict[str, object]:
    return run_phase1_forecast(
        horizon_days=request.horizon_days,
        as_of=request.as_of,
        prefer_lightgbm=request.prefer_lightgbm,
    )


@app.post("/api/optimizer/rebalance", response_model=OptimizerResponse)
def rebalance(request: OptimizerRequest) -> dict[str, object]:
    balances = None
    if request.balances is not None:
        import pandas as pd

        balances = pd.DataFrame([balance.model_dump() for balance in request.balances])

    return solve_liquidity_rebalance(
        balances=balances,
        downgrade_bank_id=request.downgrade_bank_id,
        downgrade_score_delta=request.downgrade_score_delta,
        survival_min_balances=request.survival_min_balances,
    )


@app.post("/api/stress/run", response_model=StressScenarioResponse)
def stress_run(request: StressScenarioRequest) -> dict[str, object]:
    return run_stress_scenario(
        scenario_id=request.scenario_id,
        run_optimizer=request.run_optimizer,
        downgrade_bank_id=request.downgrade_bank_id,
    )


@app.post("/api/recommendation/approve", response_model=ApprovalResponse)
def approve_recommendation(request: ApprovalRequest) -> dict[str, object]:
    import pandas as pd

    balances = pd.DataFrame([balance.model_dump() for balance in request.balances])
    transfers = [transfer.model_dump() for transfer in request.transfers]
    return apply_transfer_approval(
        balances=balances,
        transfers=transfers,
        approved_by=request.approved_by,
        reason=request.reason,
    )


@app.post("/api/explainability/summary", response_model=ExplanationResponse)
def explainability_summary(request: ExplanationRequest) -> dict[str, object]:
    return build_explanation(
        scenario_id=request.scenario_id,
        downgrade_bank_id=request.downgrade_bank_id,
    )


@app.post("/api/roi/summary", response_model=RoiResponse)
def roi_summary(request: RoiRequest) -> dict[str, object]:
    return build_roi_summary(
        scenario_id=request.scenario_id,
        downgrade_bank_id=request.downgrade_bank_id,
    )


@app.post("/api/contingency/plan", response_model=ContingencyPlanResponse)
def contingency_plan(request: ContingencyPlanRequest) -> dict[str, object]:
    return build_contingency_plan(
        scenario_id=request.scenario_id,
        downgrade_bank_id=request.downgrade_bank_id,
    )


@app.post("/api/ai-council/review", response_model=AICouncilResponse)
def ai_council_review(request: AICouncilRequest) -> dict[str, object]:
    return run_ai_council(
        scenario_id=request.scenario_id,
        downgrade_bank_id=request.downgrade_bank_id,
        mode=request.mode,
        provider=request.provider,
        peer_review=request.peer_review,
        model=request.model,
        anthropic_model=request.anthropic_model,
    )


@app.get("/api/demo/snapshot")
def demo_snapshot() -> dict[str, object]:
    forecast = run_phase1_forecast(horizon_days=14)
    bank_run = run_stress_scenario(
        scenario_id="bank_run",
        run_optimizer=True,
        downgrade_bank_id="atlas",
    )
    target2 = run_stress_scenario(
        scenario_id="target2_outage",
        run_optimizer=True,
        downgrade_bank_id=None,
    )
    explanation = build_explanation(
        scenario_id="target2_outage",
        downgrade_bank_id="atlas",
    )
    roi = build_roi_summary(
        scenario_id="target2_outage",
        downgrade_bank_id="atlas",
    )
    contingency = build_contingency_plan(
        scenario_id="target2_outage",
        downgrade_bank_id="atlas",
    )
    ai_council = run_ai_council(
        scenario_id="target2_outage",
        downgrade_bank_id="atlas",
        mode="mock",
        peer_review=True,
    )

    return {
        "forecast": forecast,
        "stress_scenarios": {
            "bank_run": bank_run,
            "target2_outage": target2,
        },
        "primary_recommendation": bank_run["optimizer_recommendation"],
        "explanation": explanation,
        "roi": roi,
        "contingency": contingency,
        "ai_council": ai_council,
    }
