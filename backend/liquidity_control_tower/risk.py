from __future__ import annotations

import pandas as pd

from .config import HHI_ALERT_THRESHOLD


def calculate_hhi(
    balances: pd.DataFrame,
    balance_col: str = "settled_balance",
    threshold: float = HHI_ALERT_THRESHOLD,
) -> dict[str, object]:
    by_bank = balances.groupby("bank_id", as_index=False).agg(
        bank_name=("bank_name", "first"),
        balance=(balance_col, "sum"),
    )
    total = float(by_bank["balance"].sum())
    if total <= 0:
        contributions = {row["bank_id"]: 0.0 for row in by_bank.to_dict("records")}
        return {"value": 0.0, "threshold": threshold, "alert": False, "contributions": contributions}

    by_bank["share"] = by_bank["balance"] / total
    by_bank["hhi_contribution"] = by_bank["share"] ** 2
    value = float(by_bank["hhi_contribution"].sum())
    contributions = {
        row["bank_id"]: float(row["hhi_contribution"]) for row in by_bank.to_dict("records")
    }

    return {
        "value": value,
        "threshold": threshold,
        "alert": value > threshold,
        "contributions": contributions,
    }


def risk_status_from_quantiles(balance_p05: float, balance_p50: float, required_buffer: float) -> str:
    if balance_p50 < required_buffer:
        return "Red"
    if balance_p05 < required_buffer:
        return "Yellow"
    return "Green"
