"""Rolling-origin backtest of the balance forecast against a seasonal-naive baseline.

For fold k the model is trained on history up to ``train_end_k`` and forecasts the next
``horizon_days`` balances; the folds' test windows end at the last history date and are
spaced ``step_days`` apart. Scheduled flows are not used: historical net flows already contain
every movement, and we have no record of which of them were known in advance, so both the
model and the baseline forecast from history alone.

Baseline ``seasonal_naive_7d``: net_flow(t+h) = net_flow observed on the same weekday in the
last week before the origin, cumulated from the origin balance.

Metrics are in account-currency units, averaged over folds x accounts for each horizon h.
"""

from __future__ import annotations

import time

import numpy as np
import pandas as pd

from .config import MIN_HISTORY_DAYS_PER_ACCOUNT
from .data import Dataset
from .forecasting import (
    QUANTILES,
    balance_quantile_paths,
    predict_daily_flow_quantiles,
    train_forecaster,
)

MAX_FOLDS = 12
MAX_HORIZON = 30


def pinball_loss(actual: np.ndarray, predicted: np.ndarray, quantile: float) -> float:
    """Mean of L_q(y, y_hat) = max(q*(y-y_hat), (q-1)*(y-y_hat))."""
    diff = np.asarray(actual, dtype=float) - np.asarray(predicted, dtype=float)
    return float(np.mean(np.maximum(quantile * diff, (quantile - 1.0) * diff)))


def interval_coverage(actual: np.ndarray, lower: np.ndarray, upper: np.ndarray) -> float:
    actual = np.asarray(actual, dtype=float)
    if actual.size == 0:
        return float("nan")
    return float(np.mean((actual >= np.asarray(lower)) & (actual <= np.asarray(upper))))


def seasonal_naive_paths(history: pd.DataFrame, train_end: str, horizon_days: int) -> pd.DataFrame:
    """Seasonal-naive (7-day) balance path per account from the origin ``train_end``."""
    rows = []
    origin = pd.Timestamp(train_end)
    for account_id, group in history.loc[history["date"] <= train_end].groupby("account_id", sort=False):
        group = group.sort_values("date")
        last_week = group["net_flow"].astype(float).to_numpy()[-7:]
        if len(last_week) < 7:
            continue
        balance = float(group["ending_balance"].iloc[-1])
        for h in range(1, horizon_days + 1):
            balance += last_week[(h - 1) % 7]
            rows.append(
                {
                    "account_id": account_id,
                    "step": h,
                    "date": (origin + pd.Timedelta(days=h)).strftime("%Y-%m-%d"),
                    "baseline_balance": balance,
                }
            )
    return pd.DataFrame(rows)


def fold_origins(dataset: Dataset, horizon_days: int, folds: int, step_days: int) -> list[str]:
    last = pd.Timestamp(dataset.as_of)
    start = pd.Timestamp(dataset.history["date"].min())
    origins = [last - pd.Timedelta(days=horizon_days + step_days * (folds - 1 - k)) for k in range(folds)]
    earliest_allowed = start + pd.Timedelta(days=MIN_HISTORY_DAYS_PER_ACCOUNT - 1)
    if origins[0] < earliest_allowed:
        raise ValueError(
            f"not enough history for {folds} folds x step {step_days}d + horizon {horizon_days}d: first fold "
            f"would train on data up to {origins[0].date()}, but at least {MIN_HISTORY_DAYS_PER_ACCOUNT} days "
            f"are needed (history starts {start.date()})"
        )
    return [origin.strftime("%Y-%m-%d") for origin in origins]


def run_backtest(
    dataset: Dataset,
    horizon_days: int = 14,
    folds: int = 6,
    step_days: int = 7,
    profile: str = "full",
) -> dict[str, object]:
    if not 1 <= folds <= MAX_FOLDS:
        raise ValueError(f"folds must be between 1 and {MAX_FOLDS}")
    if not 1 <= horizon_days <= MAX_HORIZON:
        raise ValueError(f"horizon_days must be between 1 and {MAX_HORIZON}")
    if step_days < 1:
        raise ValueError("step_days must be >= 1")

    started = time.perf_counter()
    history = dataset.history
    actual = history[["account_id", "date", "ending_balance"]].rename(columns={"ending_balance": "actual"})
    scored: list[pd.DataFrame] = []
    folds_detail: list[dict[str, object]] = []
    bundle = None

    for fold, train_end in enumerate(fold_origins(dataset, horizon_days, folds, step_days), start=1):
        trained = train_forecaster(history, train_end, profile=profile)
        bundle = trained.bundle
        start_balances = (
            history.loc[history["date"] <= train_end]
            .sort_values("date")
            .groupby("account_id")
            .tail(1)
            .set_index("account_id")["ending_balance"]
            .astype(float)
            .to_dict()
        )
        daily = predict_daily_flow_quantiles(trained, horizon_days, scheduled=None)
        paths = balance_quantile_paths(daily, start_balances)
        baseline = seasonal_naive_paths(history, train_end, horizon_days)
        merged = paths.merge(baseline, on=["account_id", "step", "date"], how="inner").merge(
            actual, on=["account_id", "date"], how="inner"
        )
        merged["fold"] = fold
        scored.append(merged)
        test_start = (pd.Timestamp(train_end) + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
        test_end = (pd.Timestamp(train_end) + pd.Timedelta(days=horizon_days)).strftime("%Y-%m-%d")
        folds_detail.append({"fold": fold, "train_end": train_end, "test_start": test_start, "test_end": test_end})

    results = pd.concat(scored, ignore_index=True)
    per_horizon = []
    for h, group in results.groupby("step"):
        y = group["actual"].to_numpy()
        per_horizon.append(
            {
                "h": int(h),
                "pinball_p05": pinball_loss(y, group["balance_p05"], 0.05),
                "pinball_p50": pinball_loss(y, group["balance_p50"], 0.50),
                "pinball_p95": pinball_loss(y, group["balance_p95"], 0.95),
                "coverage_90": interval_coverage(y, group["balance_p05"], group["balance_p95"]),
                "mae_p50": float(np.mean(np.abs(y - group["balance_p50"]))),
                "baseline_mae": float(np.mean(np.abs(y - group["baseline_balance"]))),
                "baseline_pinball_p50": pinball_loss(y, group["baseline_balance"], 0.50),
                "n": int(len(group)),
            }
        )

    mean_p50 = float(np.mean([row["pinball_p50"] for row in per_horizon]))
    baseline_p50 = float(np.mean([row["baseline_pinball_p50"] for row in per_horizon]))
    improvement = (baseline_p50 - mean_p50) / baseline_p50 * 100.0 if baseline_p50 > 0 else 0.0

    return {
        "horizon_days": int(horizon_days),
        "folds": int(folds),
        "step_days": int(step_days),
        "rows_evaluated": int(len(results)),
        "per_horizon": per_horizon,
        "summary": {
            "mean_pinball_p50": mean_p50,
            "baseline_mean_pinball_p50": baseline_p50,
            "improvement_pct": float(improvement),
            "mean_coverage_90": float(np.mean([row["coverage_90"] for row in per_horizon])),
            "target_coverage": 0.9,
            "mean_mae_p50": float(np.mean([row["mae_p50"] for row in per_horizon])),
            "baseline_mean_mae": float(np.mean([row["baseline_mae"] for row in per_horizon])),
        },
        "baseline": "seasonal_naive_7d",
        "folds_detail": folds_detail,
        "model": {
            "type": bundle.model_type if bundle else None,
            "components": bundle.component_models if bundle else [],
            "weights": bundle.model_weights if bundle else {},
            "n_estimators": bundle.n_estimators if bundle else {},
            "profile": profile,
            "quantiles": list(QUANTILES),
            "uses_scheduled_flows": False,
            "note": (
                "Each fold retrains the same ensemble as /api/forecast/run "
                + ("with full-size models." if profile == "full" else "with reduced n_estimators for speed.")
                + " Scheduled flows are not used in backtest folds; metrics are in account-currency units."
            ),
        },
        "elapsed_seconds": round(time.perf_counter() - started, 2),
    }
