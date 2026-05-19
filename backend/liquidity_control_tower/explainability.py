from __future__ import annotations

from .forecasting import FORMULAS as FORECAST_FORMULAS
from .forecasting import run_phase1_forecast
from .optimizer import OPTIMIZER_FORMULAS
from .stress import STRESS_FORMULAS, run_stress_scenario


def _formula_cards() -> list[dict[str, str]]:
    return [
        {
            "key": "cyclical_hour",
            "title": "Cyclical transaction hour",
            "formula": FORECAST_FORMULAS["cyclical_hour"],
            "interpretation": "Encodes hour of day so 23:00 and 00:00 are close in feature space.",
        },
        {
            "key": "ewma",
            "title": "EWMA liquidity momentum",
            "formula": FORECAST_FORMULAS["ewma"],
            "interpretation": "Weights recent cash-flow history more heavily than older observations.",
        },
        {
            "key": "mad_zscore",
            "title": "Robust anomaly score",
            "formula": FORECAST_FORMULAS["mad_zscore"],
            "interpretation": "Uses median and MAD to flag outliers without being distorted by the outlier itself.",
        },
        {
            "key": "known_events",
            "title": "Known event calendar",
            "formula": FORECAST_FORMULAS["known_events"],
            "interpretation": "Turns payroll, payout cycles, bank holidays, and special events into model features.",
        },
        {
            "key": "pinball_loss",
            "title": "Quantile forecast band",
            "formula": FORECAST_FORMULAS["pinball_loss"],
            "interpretation": "Trains p05, p50, and p95 forecasts so treasury sees downside and upside corridors.",
        },
        {
            "key": "hhi",
            "title": "Bank concentration",
            "formula": FORECAST_FORMULAS["hhi"],
            "interpretation": "Squares bank balance shares, so one oversized bank exposure raises risk quickly.",
        },
        {
            "key": "optimizer",
            "title": "Minimum-cost rebalance",
            "formula": OPTIMIZER_FORMULAS["objective"],
            "interpretation": "Chooses transfer routes that satisfy limits while minimizing variable and fixed costs.",
        },
        {
            "key": "expected_shortfall_99",
            "title": "Expected Shortfall 99%",
            "formula": STRESS_FORMULAS["expected_shortfall_99"],
            "interpretation": "Reports the average loss in the worst 1% of deterministic demo stress outcomes.",
        },
    ]


def _forecast_root_causes(forecast: dict[str, object]) -> list[dict[str, object]]:
    causes: list[dict[str, object]] = []
    first_breach = forecast.get("first_breach")
    if first_breach:
        causes.append(
            {
                "type": "forecast_breach",
                "title": "Downside forecast breaches buffer",
                "detail": (
                    f"{first_breach['account_id']} reaches {first_breach['currency']} "
                    f"p05 usable liquidity of {first_breach['usable_liquidity_p05']:,.0f}, "
                    f"below required buffer on {first_breach['date']}."
                ),
                "amount": float(first_breach["usable_liquidity_p05"]),
                "formula_key": "risk_constraint",
            }
        )

        known_events = first_breach.get("known_events", [])
        if known_events:
            event = known_events[0]
            causes.append(
                {
                    "type": "known_event",
                    "title": f"Known event: {event['event_type']}",
                    "detail": str(event["description"]),
                    "amount": float(event["expected_amount"]),
                    "formula_key": "known_events",
                }
            )

    feature_quality = forecast["feature_quality"]
    causes.append(
        {
            "type": "feature_quality",
            "title": "Anomaly-aware feature pipeline",
            "detail": (
                f"{feature_quality['anomaly_rows']} historical rows were flagged with MAD Z-Score "
                f"before training/forecasting."
            ),
            "amount": float(feature_quality["anomaly_rows"]),
            "formula_key": "mad_zscore",
        }
    )
    return causes


def _stress_root_causes(stress: dict[str, object]) -> list[dict[str, object]]:
    causes: list[dict[str, object]] = [
        {
            "type": "stress_loss",
            "title": f"{stress['scenario_name']} balance haircut",
            "detail": (
                f"Stress coefficients reduced total settled liquidity by "
                f"{stress['total_loss']:,.0f}."
            ),
            "amount": float(stress["total_loss"]),
            "formula_key": "stress_balance",
        },
        {
            "type": "expected_shortfall",
            "title": "Tail-loss estimate",
            "detail": (
                f"ES 99% is {stress['expected_shortfall_99']['value']:,.0f}, "
                "the mean of the worst 1% stress losses."
            ),
            "amount": float(stress["expected_shortfall_99"]["value"]),
            "formula_key": "expected_shortfall_99",
        },
    ]

    if stress["hhi_after"]["alert"]:
        causes.append(
            {
                "type": "concentration",
                "title": "HHI concentration remains elevated",
                "detail": (
                    f"HHI after stress is {stress['hhi_after']['value']:.3f}, "
                    f"above threshold {stress['hhi_after']['threshold']:.2f}."
                ),
                "amount": float(stress["hhi_after"]["value"]),
                "formula_key": "hhi",
            }
        )

    optimizer = stress.get("optimizer_recommendation")
    if optimizer and optimizer["transfers"]:
        transfer = optimizer["transfers"][0]
        causes.append(
            {
                "type": "optimizer_action",
                "title": "MIP optimizer found a compliant transfer",
                "detail": (
                    f"Move {transfer['currency']} {transfer['amount']:,.0f} from "
                    f"{transfer['source_bank_id']} to {transfer['destination_bank_id']} "
                    f"at total cost {transfer['total_cost']:,.2f}."
                ),
                "amount": float(transfer["amount"]),
                "formula_key": "optimizer",
            }
        )

    gate = stress.get("approval_gate") or {}
    if gate and gate.get("decision") != "approve":
        blockers = gate.get("blockers") or gate.get("warnings") or []
        causes.append(
            {
                "type": "governance_gate",
                "title": f"Decision gate: {gate['decision']}",
                "detail": str(blockers[0]) if blockers else "Manual review is required before approval.",
                "amount": None,
                "formula_key": "approval_gate",
            }
        )

    return causes


def build_explanation(
    scenario_id: str = "target2_outage",
    downgrade_bank_id: str | None = "atlas",
) -> dict[str, object]:
    forecast = run_phase1_forecast(horizon_days=14)
    stress = run_stress_scenario(
        scenario_id=scenario_id,
        run_optimizer=True,
        downgrade_bank_id=downgrade_bank_id,
    )
    first_breach = forecast.get("first_breach")
    optimizer = stress.get("optimizer_recommendation")
    risk_status = "Red" if first_breach else ("Yellow" if stress["hhi_after"]["alert"] else "Green")

    timeline = [
        {
            "date": forecast["generated_at"][:10],
            "label": "Forecast generated",
            "detail": "Feature pipeline produced quantile balance corridor and HHI concentration signal.",
        },
        {
            "date": first_breach["date"] if first_breach else forecast["generated_at"][:10],
            "label": "First liquidity breach",
            "detail": (
                f"{first_breach['account_id']} breaches required buffer under p05/p50 corridor."
                if first_breach
                else "No forecast breach found in the selected horizon."
            ),
        },
        {
            "date": forecast["generated_at"][:10],
            "label": stress["scenario_name"],
            "detail": f"Stress test applies deterministic coefficients and ES 99% of {stress['expected_shortfall_99']['value']:,.0f}.",
        },
    ]
    if optimizer:
        gate = stress.get("approval_gate") or {}
        timeline.append(
            {
                "date": forecast["generated_at"][:10],
                "label": "Optimizer recommendation",
                "detail": (
                    f"Solver status {optimizer['status']} via {optimizer['solver_engine']}; "
                    f"{len(optimizer['transfers'])} transfer route(s) selected; "
                    f"governance gate {gate.get('decision', 'not_checked')}."
                ),
            }
        )

    root_causes = _forecast_root_causes(forecast) + _stress_root_causes(stress)
    data_quality_notes = [
        f"Feature rows: {forecast['feature_quality']['rows_total']}; trainable rows: {forecast['feature_quality']['rows_trainable']}.",
        f"Known calendar events loaded: {forecast['feature_quality'].get('known_event_rows', 0)}.",
        f"MAD anomaly examples exposed: {len(forecast.get('anomaly_flags', []))}.",
        f"Forecast model path: {forecast['model_type']}.",
        f"Stress scenario: {stress['scenario_name']} with {len(stress['coefficients'])} bank/currency coefficients.",
    ]

    return {
        "summary": (
            "Liquidity risk is driven by a downside forecast breach, elevated bank concentration, "
            "and stress-adjusted balance haircuts. The optimizer converts those signals into a "
            "transfer plan, then the governance gate checks whether the plan can be safely approved."
        ),
        "risk_status": risk_status,
        "affected_account_id": first_breach["account_id"] if first_breach else None,
        "affected_currency": first_breach["currency"] if first_breach else None,
        "root_causes": root_causes,
        "timeline": timeline,
        "formula_cards": _formula_cards(),
        "data_quality_notes": data_quality_notes,
    }
