from __future__ import annotations

from fastapi import FastAPI

from .ai_council import run_ai_council
from .explainability import build_explanation
from .forecasting import run_phase1_forecast
from .optimizer import solve_liquidity_rebalance
from .roi import build_roi_summary
from .schemas import (
    ApprovalRequest,
    ApprovalResponse,
    AICouncilRequest,
    AICouncilResponse,
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


@app.post("/api/ai-council/review", response_model=AICouncilResponse)
def ai_council_review(request: AICouncilRequest) -> dict[str, object]:
    return run_ai_council(
        scenario_id=request.scenario_id,
        downgrade_bank_id=request.downgrade_bank_id,
        mode=request.mode,
        peer_review=request.peer_review,
        model=request.model,
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
        "ai_council": ai_council,
    }
