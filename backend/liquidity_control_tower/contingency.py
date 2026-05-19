from __future__ import annotations

import pandas as pd

from .config import DEMO_NOW
from .data_loader import load_demo_data
from .forecasting import run_phase1_forecast
from .settlement import to_timestamp
from .stress import run_stress_scenario


CONTINGENCY_FORMULAS = {
    "gap_p05": "gap_p05(account) = max(0, -min_t usable_liquidity_p05(t, account))",
    "deferrable_coverage": "deferrable_coverage = min(gap_p05, sum eligible_outflows_before_cutoff)",
    "credit_line_need": "credit_line_need = max(0, gap_p05 - deferrable_coverage)",
    "contingency_priority": "priority = fund breached account first, then throttle non-critical outflows, then request intraday credit",
}


def _pending_outflows_for_account(
    transactions: pd.DataFrame,
    account_id: str,
    currency: str,
    as_of: pd.Timestamp,
    horizon_days: int = 3,
) -> pd.DataFrame:
    tx = transactions.copy()
    tx["expected_at"] = pd.to_datetime(tx["expected_at"], utc=True)
    cutoff = as_of + pd.Timedelta(days=horizon_days)
    return tx.loc[
        (tx["account_id"] == account_id)
        & (tx["currency"] == currency)
        & (tx["direction"] == "outflow")
        & (tx["status"] == "pending")
        & (tx["expected_at"] >= as_of)
        & (tx["expected_at"] <= cutoff)
    ].copy()


def _deferrable_outflow_actions(
    transactions: pd.DataFrame,
    account_id: str,
    currency: str,
    gap: float,
    as_of: pd.Timestamp,
) -> tuple[list[dict[str, object]], float]:
    outflows = _pending_outflows_for_account(transactions, account_id, currency, as_of)
    if outflows.empty or gap <= 0:
        return [], 0.0

    priority = {
        "scheduled merchant payout": 1,
        "monthly processing fee": 2,
        "payroll reserve": 9,
    }
    outflows["priority"] = outflows["business_reason"].map(priority).fillna(5)
    outflows = outflows.sort_values(["priority", "expected_at"])

    remaining = gap
    actions: list[dict[str, object]] = []
    covered = 0.0
    for row in outflows.to_dict("records"):
        if remaining <= 0:
            break
        amount = min(float(row["amount"]), remaining)
        covered += amount
        remaining -= amount
        actions.append(
            {
                "action_type": "payment_throttle",
                "priority": "high" if row["business_reason"] != "payroll reserve" else "manual_review",
                "account_id": account_id,
                "currency": currency,
                "amount": float(amount),
                "transaction_id": str(row["transaction_id"]),
                "counterparty": str(row["counterparty"]),
                "business_reason": str(row["business_reason"]),
                "deadline": pd.Timestamp(row["expected_at"]).isoformat().replace("+00:00", "Z"),
                "description": (
                    f"Delay or partially throttle {currency} {amount:,.0f} pending outflow "
                    f"to preserve liquidity for the p05 breach."
                ),
                "formula": CONTINGENCY_FORMULAS["deferrable_coverage"],
            }
        )
    return actions, covered


def build_contingency_plan(
    scenario_id: str = "target2_outage",
    downgrade_bank_id: str | None = "atlas",
    as_of: str | pd.Timestamp = DEMO_NOW,
) -> dict[str, object]:
    data = load_demo_data()
    as_of_ts = to_timestamp(as_of)
    forecast = run_phase1_forecast(horizon_days=14, as_of=as_of_ts)
    stress = run_stress_scenario(
        scenario_id=scenario_id,
        run_optimizer=True,
        downgrade_bank_id=downgrade_bank_id,
    )
    optimizer = stress.get("optimizer_recommendation") or {}
    gate = stress.get("approval_gate") or {}
    forecast_gaps = gate.get("forecast_gaps_by_account") or {}

    breached_accounts = [
        point
        for point in forecast["forecast"]
        if float(point.get("usable_liquidity_p05", 0.0)) < 0
    ]
    first_by_account: dict[str, dict[str, object]] = {}
    for point in breached_accounts:
        first_by_account.setdefault(str(point["account_id"]), point)

    actions: list[dict[str, object]] = []
    total_gap = 0.0
    total_deferrable_coverage = 0.0
    for account_id, raw_gap in forecast_gaps.items():
        gap = float(raw_gap)
        if gap <= 0:
            continue
        point = first_by_account.get(account_id)
        if point is None:
            continue
        total_gap += gap
        currency = str(point["currency"])
        deadline = str(point["date"])

        actions.append(
            {
                "action_type": "prefund_breached_account",
                "priority": "critical",
                "account_id": account_id,
                "currency": currency,
                "amount": gap,
                "deadline": deadline,
                "description": (
                    f"Prefund {account_id} by at least {currency} {gap:,.0f} before {deadline} "
                    "to restore the p05 survival floor."
                ),
                "candidate_rails": (
                    ["on-us book transfer", "prefunded correspondent account", "intraday credit line"]
                    if scenario_id == "target2_outage"
                    else ["SEPA", "internal treasury transfer", "intraday credit line"]
                ),
                "formula": CONTINGENCY_FORMULAS["gap_p05"],
            }
        )

        throttle_actions, covered = _deferrable_outflow_actions(
            data["transactions"],
            account_id,
            currency,
            gap,
            as_of_ts,
        )
        actions.extend(throttle_actions)
        total_deferrable_coverage += covered

    credit_line_need = max(0.0, total_gap - total_deferrable_coverage)
    if credit_line_need > 0:
        actions.append(
            {
                "action_type": "request_intraday_credit",
                "priority": "critical",
                "account_id": None,
                "currency": "EUR",
                "amount": credit_line_need,
                "deadline": as_of_ts.normalize().date().isoformat(),
                "description": (
                    f"Request or draw intraday credit for EUR {credit_line_need:,.0f} "
                    "because eligible payment throttling does not fully cover the p05 gap."
                ),
                "candidate_rails": ["committed credit facility", "central treasury prefunding"],
                "formula": CONTINGENCY_FORMULAS["credit_line_need"],
            }
        )

    plan_status = "contingency_required" if optimizer.get("status") != "optimal" else "optimizer_plan_available"
    return {
        "scenario_id": scenario_id,
        "downgrade_bank_id": downgrade_bank_id,
        "plan_status": plan_status,
        "optimizer_status": optimizer.get("status"),
        "optimizer_infeasible_reason": optimizer.get("infeasible_reason"),
        "approval_gate_decision": gate.get("decision"),
        "total_p05_gap": total_gap,
        "deferrable_coverage": total_deferrable_coverage,
        "intraday_credit_need": credit_line_need,
        "actions": actions,
        "formulas": CONTINGENCY_FORMULAS,
    }
