from __future__ import annotations

import math

import pandas as pd

from .data_loader import load_demo_data
from .governance import GOVERNANCE_FORMULAS, validate_recommendation_gate
from .optimizer import OPTIMIZER_FORMULAS, solve_liquidity_rebalance
from .risk import calculate_hhi


STRESS_FORMULAS = {
    "stress_balance": "Balance_after(b,c) = Balance_before(b,c) * stress_multiplier(s,b,c)",
    "stress_loss": "Loss = max(0, Balance_before - Balance_after)",
    "expected_shortfall_99": "ES_99 = mean(losses in the worst 1% tail)",
    "buffer_breach": "breach if stressed_balance(account) < B_min(account)",
    "hhi": "HHI = sum_b (Balance_b / sum_b' Balance_b')^2",
    "optimizer": OPTIMIZER_FORMULAS["objective"],
    "approval_gate": GOVERNANCE_FORMULAS["approval_gate"],
    "survival_floor": OPTIMIZER_FORMULAS["survival_floor"],
}


def _normalise_balance_input(balances: pd.DataFrame | None) -> pd.DataFrame:
    data = load_demo_data()
    if balances is None:
        return data["balances"].copy()
    return balances.copy()


def _scenario_rows(scenario_id: str, stress_scenarios: pd.DataFrame) -> pd.DataFrame:
    rows = stress_scenarios.loc[stress_scenarios["scenario_id"] == scenario_id].copy()
    if rows.empty:
        available = ", ".join(sorted(stress_scenarios["scenario_id"].unique()))
        raise ValueError(f"Unknown stress scenario {scenario_id!r}. Available: {available}")
    return rows


def _coefficient_for(account: dict[str, object], scenario_rows: pd.DataFrame) -> pd.Series | None:
    match = scenario_rows.loc[
        (scenario_rows["bank_id"] == account["bank_id"])
        & (scenario_rows["currency"] == account["currency"])
    ]
    if match.empty:
        return None
    return match.iloc[0]


def apply_stress_scenario(
    scenario_id: str,
    balances: pd.DataFrame | None = None,
    stress_scenarios: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, list[dict[str, object]], str]:
    data = load_demo_data()
    balances_df = _normalise_balance_input(balances)
    scenarios_df = stress_scenarios if stress_scenarios is not None else data["stress_scenarios"]
    rows = _scenario_rows(scenario_id, scenarios_df)
    scenario_name = str(rows.iloc[0]["scenario_name"])

    stressed = balances_df.copy()
    stressed["balance_before"] = stressed["settled_balance"].astype(float)
    stressed["settled_balance"] = stressed["settled_balance"].astype(float)

    coefficients: list[dict[str, object]] = []
    seen_coefficients: set[tuple[str, str]] = set()

    for idx, account in stressed.to_dict("index").items():
        coefficient = _coefficient_for(account, rows)
        if coefficient is None:
            multiplier = 1.0
        else:
            multiplier = float(coefficient["balance_multiplier"])
            key = (str(coefficient["bank_id"]), str(coefficient["currency"]))
            if key not in seen_coefficients:
                coefficients.append(
                    {
                        "bank_id": str(coefficient["bank_id"]),
                        "currency": str(coefficient["currency"]),
                        "balance_multiplier": multiplier,
                        "inflow_delay_days": int(coefficient["inflow_delay_days"]),
                        "description": str(coefficient["description"]),
                    }
                )
                seen_coefficients.add(key)

        stressed.at[idx, "settled_balance"] = float(account["settled_balance"]) * multiplier

    stressed["loss_amount"] = (stressed["balance_before"] - stressed["settled_balance"]).clip(lower=0)
    stressed["loss_percent"] = stressed["loss_amount"] / stressed["balance_before"].replace(0, math.nan)
    stressed["loss_percent"] = stressed["loss_percent"].fillna(0.0)
    stressed["below_buffer"] = stressed["settled_balance"] < stressed["required_buffer"]

    return stressed, coefficients, scenario_name


def deterministic_loss_distribution(total_loss: float, scenario_id: str, points: int = 100) -> list[float]:
    if total_loss <= 0:
        return [0.0 for _ in range(points)]

    scenario_multiplier = 1.15 if scenario_id == "bank_run" else 1.05
    losses: list[float] = []
    for idx in range(1, points + 1):
        severity = idx / points
        tail_lift = 0.42 + 0.58 * (severity**2)
        cyclical_noise = ((idx * 17) % 11) / 1000
        losses.append(float(total_loss * scenario_multiplier * (tail_lift + cyclical_noise)))
    return sorted(losses)


def calculate_expected_shortfall_99(losses: list[float]) -> dict[str, object]:
    if not losses:
        return {
            "confidence_level": 0.99,
            "value": 0.0,
            "tail_count": 0,
            "losses": [],
            "formula": STRESS_FORMULAS["expected_shortfall_99"],
        }

    sorted_losses = sorted(float(loss) for loss in losses)
    tail_count = max(1, math.ceil(len(sorted_losses) * 0.01))
    tail_losses = sorted_losses[-tail_count:]
    return {
        "confidence_level": 0.99,
        "value": float(sum(tail_losses) / len(tail_losses)),
        "tail_count": tail_count,
        "losses": tail_losses,
        "formula": STRESS_FORMULAS["expected_shortfall_99"],
    }


def survival_min_balances_from_forecast(
    forecast: dict[str, object],
    balances: pd.DataFrame,
) -> dict[str, float]:
    current_by_account = {
        str(row["account_id"]): float(row["settled_balance"])
        for row in balances.to_dict("records")
    }
    floors: dict[str, float] = {}
    for point in forecast.get("forecast", []):
        gap = max(0.0, -float(point.get("usable_liquidity_p05", 0.0)))
        if gap <= 0:
            continue
        account_id = str(point["account_id"])
        current_balance = current_by_account.get(account_id)
        if current_balance is None:
            continue
        floors[account_id] = max(floors.get(account_id, 0.0), current_balance + gap)
    return floors


def run_stress_scenario(
    scenario_id: str,
    run_optimizer: bool = True,
    downgrade_bank_id: str | None = None,
    balances: pd.DataFrame | None = None,
) -> dict[str, object]:
    stressed, coefficients, scenario_name = apply_stress_scenario(scenario_id, balances=balances)
    data = load_demo_data()
    before = _normalise_balance_input(balances)
    total_before = float(before["settled_balance"].sum())
    total_after = float(stressed["settled_balance"].sum())
    total_loss = max(0.0, total_before - total_after)
    loss_distribution = deterministic_loss_distribution(total_loss, scenario_id)
    es99 = calculate_expected_shortfall_99(loss_distribution)

    optimizer_response = None
    approval_gate = None
    forecast = None
    if run_optimizer:
        from .forecasting import run_phase1_forecast

        forecast = run_phase1_forecast(horizon_days=14)
        survival_min_balances = survival_min_balances_from_forecast(forecast, stressed)
        optimizer_response = solve_liquidity_rebalance(
            balances=stressed[
                [
                    "account_id",
                    "bank_id",
                    "bank_name",
                    "currency",
                    "settled_balance",
                    "required_buffer",
                ]
            ],
            bank_risk_scores=data["bank_risk_scores"],
            transfer_costs=data["transfer_costs"],
            downgrade_bank_id=downgrade_bank_id,
            survival_min_balances=survival_min_balances,
        )

    balance_points = [
        {
            "account_id": str(row["account_id"]),
            "bank_id": str(row["bank_id"]),
            "bank_name": str(row["bank_name"]),
            "currency": str(row["currency"]),
            "required_buffer": float(row["required_buffer"]),
            "balance_before": float(row["balance_before"]),
            "balance_after": float(row["settled_balance"]),
            "loss_amount": float(row["loss_amount"]),
            "loss_percent": float(row["loss_percent"]),
            "below_buffer": bool(row["below_buffer"]),
        }
        for row in stressed.to_dict("records")
    ]
    accounts_below_buffer = [
        str(row["account_id"]) for row in stressed.loc[stressed["below_buffer"]].to_dict("records")
    ]

    if optimizer_response is not None:
        approval_gate = validate_recommendation_gate(
            scenario_id=scenario_id,
            optimizer_response=optimizer_response,
            forecast=forecast,
            hhi_after_stress=calculate_hhi(stressed),
            accounts_below_buffer=accounts_below_buffer,
        )

    return {
        "scenario_id": scenario_id,
        "scenario_name": scenario_name,
        "coefficients": coefficients,
        "balances": balance_points,
        "total_balance_before": total_before,
        "total_balance_after": total_after,
        "total_loss": total_loss,
        "expected_shortfall_99": es99,
        "hhi_before": calculate_hhi(before),
        "hhi_after": calculate_hhi(stressed),
        "accounts_below_buffer": accounts_below_buffer,
        "optimizer_recommendation": optimizer_response,
        "approval_gate": approval_gate,
        "formulas": STRESS_FORMULAS,
    }


def apply_transfer_approval(
    balances: pd.DataFrame,
    transfers: list[dict[str, object]],
    approved_by: str,
    reason: str,
) -> dict[str, object]:
    working = balances.copy()
    working["settled_balance"] = working["settled_balance"].astype(float)

    audit_log: list[dict[str, object]] = []
    for transfer in transfers:
        amount = float(transfer["amount"])
        source = str(transfer["source_account_id"])
        destination = str(transfer["destination_account_id"])
        working.loc[working["account_id"] == source, "settled_balance"] -= amount
        working.loc[working["account_id"] == destination, "settled_balance"] += amount
        audit_log.append(
            {
                "event_type": "transfer_approved",
                "approved_by": approved_by,
                "reason": reason,
                "source_account_id": source,
                "destination_account_id": destination,
                "currency": transfer["currency"],
                "amount": amount,
                "total_cost": float(transfer["total_cost"]),
            }
        )

    total_transfer_amount = float(sum(float(transfer["amount"]) for transfer in transfers))
    total_transfer_cost = float(sum(float(transfer["total_cost"]) for transfer in transfers))
    below_buffer = working.loc[working["settled_balance"] < working["required_buffer"], "account_id"]

    return {
        "approved": True,
        "approved_by": approved_by,
        "reason": reason,
        "total_transfer_amount": total_transfer_amount,
        "total_transfer_cost": total_transfer_cost,
        "post_transfer_balances": working.to_dict("records"),
        "hhi_after_approval": calculate_hhi(working),
        "accounts_below_buffer": [str(account_id) for account_id in below_buffer.tolist()],
        "audit_log": audit_log,
        "formulas": {
            "approval_balance_update": "source_balance -= x_i_j; destination_balance += x_i_j",
            "hhi": STRESS_FORMULAS["hhi"],
            "buffer_breach": STRESS_FORMULAS["buffer_breach"],
        },
    }
