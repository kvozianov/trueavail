from __future__ import annotations

import numpy as np
import pandas as pd

from .config import DATA_DIR, DEFAULT_HISTORY_DAYS, DEMO_NOW
from .settlement import to_timestamp


def _read_csv(name: str, **kwargs) -> pd.DataFrame:
    path = DATA_DIR / name
    return pd.read_csv(path, **kwargs)


def load_demo_data() -> dict[str, pd.DataFrame]:
    transactions = _read_csv("transactions.csv", parse_dates=["expected_at"])
    observed = _read_csv("observed_movements.csv", parse_dates=["observed_at", "settled_at"])

    return {
        "balances": _read_csv("balances.csv"),
        "transactions": transactions,
        "settlement_rules": _read_csv("settlement_rules.csv"),
        "holidays": _read_csv("calendar_holidays.csv", parse_dates=["date"]),
        "bank_risk_scores": _read_csv("bank_risk_scores.csv"),
        "transfer_costs": _read_csv("transfer_costs.csv"),
        "observed_movements": observed,
        "stress_scenarios": _read_csv("stress_scenarios.csv"),
    }


def generate_synthetic_daily_history(
    balances: pd.DataFrame,
    as_of: str | pd.Timestamp = DEMO_NOW,
    history_days: int = DEFAULT_HISTORY_DAYS,
    seed: int = 42,
) -> pd.DataFrame:
    """Generate repeatable account-level history for model training.

    The CSV demo data contains the visible story. This generated history gives
    LightGBM and rolling feature calculations enough observations without
    bloating the repo with hundreds of rows.
    """

    rng = np.random.default_rng(seed)
    as_of_ts = to_timestamp(as_of).normalize()
    dates = pd.date_range(end=as_of_ts - pd.Timedelta(days=1), periods=history_days, freq="D")
    rows: list[dict[str, object]] = []

    for account in balances.to_dict("records"):
        settled_balance = float(account["settled_balance"])
        daily_scale = max(settled_balance * 0.045, 90_000.0)
        balance = settled_balance * 0.78

        for idx, day in enumerate(dates):
            weekday = day.weekday()
            hour = 10 if idx % 2 == 0 else 18
            seasonal = 1.0 + 0.22 * np.sin(2 * np.pi * weekday / 7)
            payout_cycle = 1.0 + (0.55 if weekday == 4 else 0.0)
            month_end = 1.0 + (0.35 if day.day >= 27 else 0.0)
            noise = rng.normal(0, daily_scale * 0.08)

            inflow = daily_scale * seasonal * (1.06 if account["currency"] == "EUR" else 0.92)
            outflow = daily_scale * 0.86 * payout_cycle * month_end
            net_flow = inflow - outflow + noise

            if account["account_id"] == "atlas-eur-operating" and idx in (38, 77, 104):
                net_flow -= daily_scale * 5.8

            balance = max(account["required_buffer"] * 0.55, balance + net_flow)
            timestamp = day + pd.Timedelta(hours=hour)

            rows.append(
                {
                    "date": day.date().isoformat(),
                    "timestamp": timestamp,
                    "account_id": account["account_id"],
                    "bank_id": account["bank_id"],
                    "bank_name": account["bank_name"],
                    "currency": account["currency"],
                    "net_flow": float(net_flow),
                    "ending_balance": float(balance),
                    "required_buffer": float(account["required_buffer"]),
                    "source": "synthetic_history",
                }
            )

    return pd.DataFrame(rows)
