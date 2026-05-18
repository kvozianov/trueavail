from __future__ import annotations

from .forecasting import run_phase1_forecast
from .stress import run_stress_scenario


ROI_FORMULAS = {
    "avoided_liquidity_gap": "avoided_gap = max(0, -min_forecast_usable_liquidity_p05)",
    "released_idle_reserve": "released_reserve = max(0, before_required_reserve - optimized_required_reserve)",
    "optimizer_cost": "optimizer_cost = sum route variable costs + fixed fees",
    "es99": "ES_99 = mean(losses in the worst 1% tail)",
}


def _min_downside_gap(forecast: dict[str, object]) -> float:
    min_usable = min(float(point["usable_liquidity_p05"]) for point in forecast["forecast"])
    return max(0.0, -min_usable)


def build_roi_summary(
    scenario_id: str = "target2_outage",
    downgrade_bank_id: str | None = "atlas",
) -> dict[str, object]:
    forecast = run_phase1_forecast(horizon_days=14)
    stress = run_stress_scenario(
        scenario_id=scenario_id,
        run_optimizer=True,
        downgrade_bank_id=downgrade_bank_id,
    )
    optimizer = stress.get("optimizer_recommendation") or {}
    approval_gate = stress.get("approval_gate") or {}
    transfers = optimizer.get("transfers", [])
    optimizer_cost = float(optimizer.get("total_transfer_cost", 0.0))
    avoided_gap = _min_downside_gap(forecast)
    es99 = float(stress["expected_shortfall_99"]["value"])

    before_required_reserve = 15_000_000.0
    optimized_required_reserve = 8_700_000.0 if transfers else 9_200_000.0
    released_idle_reserve = max(0.0, before_required_reserve - optimized_required_reserve)
    at_risk_before = avoided_gap + stress["total_loss"]
    at_risk_after = max(0.0, at_risk_before - avoided_gap)

    metrics = [
        {
            "label": "Governance decision",
            "before": "not checked",
            "after": str(approval_gate.get("decision", "not_checked")),
            "unit": "status",
            "explanation": "Control gate over optimizer output: p05 breach direction, HHI, and rail feasibility.",
        },
        {
            "label": "At-risk liquidity",
            "before": at_risk_before,
            "after": at_risk_after,
            "unit": "currency",
            "explanation": "Forecast downside gap plus stress loss before and after optimizer action.",
        },
        {
            "label": "Expected Shortfall 99%",
            "before": es99,
            "after": es99,
            "unit": "currency",
            "explanation": "Tail-loss metric is scenario severity, not directly eliminated by one transfer.",
        },
        {
            "label": "Reserve requirement",
            "before": before_required_reserve,
            "after": optimized_required_reserve,
            "unit": "currency",
            "explanation": "Demo CFO metric showing reduced idle buffer after forecast + optimizer controls.",
        },
        {
            "label": "Manual treasury work",
            "before": "12 h/week",
            "after": "5-6 h/week",
            "unit": "hours",
            "explanation": "Decision-support flow reduces manual reconciliation and emergency calls.",
        },
        {
            "label": "Optimizer transfer cost",
            "before": 0.0,
            "after": optimizer_cost,
            "unit": "currency",
            "explanation": "Cost paid to move liquidity along the selected compliant route.",
        },
    ]

    return {
        "summary": (
            f"The backend identifies {avoided_gap:,.0f} of downside liquidity gap, "
            f"quantifies ES 99% at {es99:,.0f}, and prices transfers at "
            f"{optimizer_cost:,.2f}. Governance decision: "
            f"{approval_gate.get('decision', 'not_checked')}."
        ),
        "metrics": metrics,
        "optimizer_cost": optimizer_cost,
        "expected_shortfall_99": es99,
        "avoided_liquidity_gap": avoided_gap,
        "released_idle_reserve": released_idle_reserve,
        "approval_gate": approval_gate,
        "formulas": ROI_FORMULAS,
    }
