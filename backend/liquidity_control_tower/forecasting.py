from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import (
    DEFAULT_FORECAST_HORIZON_DAYS,
    DEFAULT_HISTORY_DAYS,
    DEMO_NOW,
    EWMA_ALPHA,
    MAD_ZSCORE_THRESHOLD,
)
from .data_loader import generate_synthetic_daily_history, load_demo_data
from .features import (
    BASE_FEATURE_COLUMNS,
    add_calendar_features,
    add_cyclical_time_features,
    build_feature_matrix,
    build_scheduled_cashflow_frame,
    latest_feature_state,
)
from .risk import calculate_hhi, risk_status_from_quantiles
from .settlement import to_timestamp

try:
    from lightgbm import LGBMRegressor

    LIGHTGBM_AVAILABLE = True
except Exception:
    LGBMRegressor = None
    LIGHTGBM_AVAILABLE = False


FORMULAS = {
    "cyclical_hour": "hour_sin = sin(2*pi*h/24), hour_cos = cos(2*pi*h/24)",
    "ewma": "EWMA_t = alpha*y_t + (1-alpha)*EWMA_{t-1}",
    "mad_zscore": "z_t = |y_t - median_W| / (1.4826*MAD_W), anomaly if z_t > 4",
    "pinball_loss": "L_q(y, y_hat) = max(q*(y-y_hat), (q-1)*(y-y_hat))",
    "risk_constraint": "breach if balance_p05(t,b,c) < B_min(b,c)",
    "hhi": "HHI = sum_b (Balance_b / sum_b' Balance_b')^2",
}


@dataclass
class QuantileModelBundle:
    model_type: str
    available: bool
    fallback_reason: str | None
    models: dict[float, object]
    residual_scale_by_account: dict[str, float]


def _train_lightgbm_quantile_models(trainable: pd.DataFrame) -> QuantileModelBundle:
    if not LIGHTGBM_AVAILABLE:
        return QuantileModelBundle(
            model_type="ewma-volatility-fallback",
            available=False,
            fallback_reason="lightgbm is not installed; using EWMA plus rolling volatility quantile fallback",
            models={},
            residual_scale_by_account=_residual_scale_by_account(trainable),
        )

    if len(trainable) < 60:
        return QuantileModelBundle(
            model_type="ewma-volatility-fallback",
            available=False,
            fallback_reason="not enough trainable rows for LightGBM; using EWMA plus rolling volatility quantile fallback",
            models={},
            residual_scale_by_account=_residual_scale_by_account(trainable),
        )

    X = trainable[BASE_FEATURE_COLUMNS].astype(float)
    y = trainable["target_next_net_flow"].astype(float)
    models: dict[float, object] = {}

    for quantile in (0.05, 0.50, 0.95):
        model = LGBMRegressor(
            objective="quantile",
            alpha=quantile,
            n_estimators=160,
            learning_rate=0.045,
            num_leaves=15,
            min_child_samples=8,
            random_state=42,
            verbosity=-1,
        )
        model.fit(X, y)
        models[quantile] = model

    return QuantileModelBundle(
        model_type="lightgbm-quantile",
        available=True,
        fallback_reason=None,
        models=models,
        residual_scale_by_account=_residual_scale_by_account(trainable),
    )


def _residual_scale_by_account(trainable: pd.DataFrame) -> dict[str, float]:
    if trainable.empty:
        return {}

    scale = (
        trainable.groupby("account_id")["net_flow"]
        .std(ddof=0)
        .fillna(0.0)
        .clip(lower=25_000)
        .to_dict()
    )
    return {str(account_id): float(value) for account_id, value in scale.items()}


def _scheduled_flows_by_day(
    transactions: pd.DataFrame,
    settlement_rules: pd.DataFrame,
    holidays: pd.DataFrame,
    as_of: pd.Timestamp,
) -> pd.DataFrame:
    scheduled = build_scheduled_cashflow_frame(transactions, settlement_rules, holidays)
    scheduled = scheduled.loc[pd.to_datetime(scheduled["timestamp"], utc=True) >= as_of].copy()
    if scheduled.empty:
        return pd.DataFrame(columns=["date", "account_id", "currency", "scheduled_net_flow"])

    return (
        scheduled.groupby(["date", "account_id", "currency"], as_index=False)["signed_amount"]
        .sum()
        .rename(columns={"signed_amount": "scheduled_net_flow"})
    )


def _future_feature_row(
    account_state: pd.Series,
    forecast_date: pd.Timestamp,
    holidays: pd.DataFrame,
    synthetic_net_flow: float,
) -> pd.DataFrame:
    row = pd.DataFrame(
        [
            {
                "timestamp": forecast_date + pd.Timedelta(hours=12),
                "net_flow": synthetic_net_flow,
                "ending_balance": float(account_state["ending_balance"]),
                "account_id": account_state["account_id"],
                "bank_id": account_state["bank_id"],
                "currency": account_state["currency"],
                "required_buffer": float(account_state["required_buffer"]),
                "net_flow_lag_1": float(account_state["net_flow"]),
                "net_flow_lag_2": float(account_state["net_flow_lag_1"]),
                "net_flow_lag_7": float(account_state["net_flow_lag_7"]),
                "balance_lag_1": float(account_state["ending_balance"]),
                "rolling_net_flow_mean_7": float(account_state["rolling_net_flow_mean_7"]),
                "rolling_net_flow_volatility_7": float(account_state["rolling_net_flow_volatility_7"]),
                "ewma_net_flow": float(account_state["ewma_net_flow"]),
                "mad_zscore": float(account_state["mad_zscore"]),
            }
        ]
    )
    row = add_cyclical_time_features(row)
    row = add_calendar_features(row, holidays)
    return row


def _predict_model_flows(
    bundle: QuantileModelBundle,
    feature_row: pd.DataFrame,
    fallback_center: float,
    fallback_scale: float,
    horizon_step: int,
) -> tuple[float, float, float]:
    if bundle.available and bundle.models:
        X = feature_row[BASE_FEATURE_COLUMNS].astype(float)
        predictions = {q: float(model.predict(X)[0]) for q, model in bundle.models.items()}
        return predictions[0.05], predictions[0.50], predictions[0.95]

    uncertainty = 1.64 * fallback_scale * np.sqrt(max(1, horizon_step))
    return fallback_center - uncertainty, fallback_center, fallback_center + uncertainty


def _build_forecast_points(
    data: dict[str, pd.DataFrame],
    feature_frame: pd.DataFrame,
    bundle: QuantileModelBundle,
    as_of: pd.Timestamp,
    horizon_days: int,
) -> list[dict[str, object]]:
    balances = data["balances"]
    scheduled = _scheduled_flows_by_day(
        data["transactions"],
        data["settlement_rules"],
        data["holidays"],
        as_of,
    )
    latest = latest_feature_state(feature_frame)
    latest_by_account = {row["account_id"]: row for row in latest.to_dict("records")}
    current_balances = {
        row["account_id"]: {
            "p05": float(row["settled_balance"]),
            "p50": float(row["settled_balance"]),
            "p95": float(row["settled_balance"]),
        }
        for row in balances.to_dict("records")
    }

    points: list[dict[str, object]] = []
    start_date = as_of.normalize()

    for step in range(1, horizon_days + 1):
        forecast_date = start_date + pd.Timedelta(days=step)
        forecast_key = forecast_date.strftime("%Y-%m-%d")

        for account in balances.to_dict("records"):
            account_id = account["account_id"]
            scheduled_match = scheduled.loc[
                (scheduled["date"] == forecast_key)
                & (scheduled["account_id"] == account_id)
                & (scheduled["currency"] == account["currency"])
            ]
            scheduled_net_flow = (
                float(scheduled_match["scheduled_net_flow"].sum()) if not scheduled_match.empty else 0.0
            )
            state = pd.Series(latest_by_account[account_id])
            fallback_center = float(state["ewma_net_flow"]) * (0.78 ** step)
            fallback_scale = bundle.residual_scale_by_account.get(account_id, 75_000.0)
            future_row = _future_feature_row(
                state,
                forecast_date,
                data["holidays"],
                synthetic_net_flow=fallback_center,
            )
            flow_p05, flow_p50, flow_p95 = _predict_model_flows(
                bundle,
                future_row,
                fallback_center=fallback_center,
                fallback_scale=fallback_scale,
                horizon_step=step,
            )

            current_balances[account_id]["p05"] += scheduled_net_flow + flow_p05
            current_balances[account_id]["p50"] += scheduled_net_flow + flow_p50
            current_balances[account_id]["p95"] += scheduled_net_flow + flow_p95

            required_buffer = float(account["required_buffer"])
            balance_p05 = float(current_balances[account_id]["p05"])
            balance_p50 = float(current_balances[account_id]["p50"])
            balance_p95 = float(current_balances[account_id]["p95"])
            status = risk_status_from_quantiles(balance_p05, balance_p50, required_buffer)

            points.append(
                {
                    "date": forecast_key,
                    "account_id": account_id,
                    "bank_id": account["bank_id"],
                    "bank_name": account["bank_name"],
                    "currency": account["currency"],
                    "required_buffer": required_buffer,
                    "scheduled_net_flow": scheduled_net_flow,
                    "balance_p05": balance_p05,
                    "balance_p50": balance_p50,
                    "balance_p95": balance_p95,
                    "usable_liquidity_p05": balance_p05 - required_buffer,
                    "usable_liquidity_p50": balance_p50 - required_buffer,
                    "usable_liquidity_p95": balance_p95 - required_buffer,
                    "risk_status": status,
                    "breach": status != "Green",
                }
            )

    return points


def _calculate_demo_metrics(
    trainable: pd.DataFrame,
    forecast: list[dict[str, object]],
    as_of: pd.Timestamp,
    model_type: str,
) -> dict[str, object]:
    if trainable.empty:
        return {
            "median_wape": 0.0,
            "band_coverage": 0.0,
            "alert_lead_time_days": None,
            "backtest_windows": 0,
            "model_version": f"{model_type}:phase1-demo-v1",
        }

    actual = trainable["target_next_net_flow"].astype(float)
    median_prediction = trainable["ewma_net_flow"].astype(float)
    denominator = max(float(actual.abs().sum()), 1.0)
    median_wape = float((actual - median_prediction).abs().sum() / denominator)

    scale = trainable["rolling_net_flow_volatility_7"].fillna(0).astype(float).clip(lower=25_000)
    lower = median_prediction - 1.64 * scale
    upper = median_prediction + 1.64 * scale
    band_coverage = float(((actual >= lower) & (actual <= upper)).mean())

    first_breach = next((point for point in forecast if point["breach"]), None)
    if first_breach is None:
        lead_time_days = None
    else:
        breach_date = pd.Timestamp(first_breach["date"], tz="UTC")
        lead_time_days = max(0, int((breach_date.normalize() - as_of.normalize()).days))

    return {
        "median_wape": median_wape,
        "band_coverage": band_coverage,
        "alert_lead_time_days": lead_time_days,
        "backtest_windows": int(len(trainable)),
        "model_version": f"{model_type}:phase1-demo-v1",
    }


def run_phase1_forecast(
    horizon_days: int = DEFAULT_FORECAST_HORIZON_DAYS,
    as_of: str | pd.Timestamp = DEMO_NOW,
    prefer_lightgbm: bool = True,
) -> dict[str, object]:
    data = load_demo_data()
    as_of_ts = to_timestamp(as_of)
    history = generate_synthetic_daily_history(
        data["balances"],
        as_of=as_of_ts,
        history_days=DEFAULT_HISTORY_DAYS,
    )
    feature_frame, feature_summary = build_feature_matrix(
        history,
        data["holidays"],
        alpha=EWMA_ALPHA,
        anomaly_threshold=MAD_ZSCORE_THRESHOLD,
    )
    trainable = feature_frame.dropna(subset=BASE_FEATURE_COLUMNS + ["target_next_net_flow"]).copy()
    trainable = trainable.loc[~trainable["is_anomaly_mad"]].copy()

    bundle = _train_lightgbm_quantile_models(trainable) if prefer_lightgbm else QuantileModelBundle(
        model_type="ewma-volatility-fallback",
        available=False,
        fallback_reason="prefer_lightgbm=false",
        models={},
        residual_scale_by_account=_residual_scale_by_account(trainable),
    )

    forecast = _build_forecast_points(data, feature_frame, bundle, as_of_ts, horizon_days)
    first_breach = next((point for point in forecast if point["breach"]), None)
    metrics = _calculate_demo_metrics(trainable, forecast, as_of_ts, bundle.model_type)

    return {
        "generated_at": as_of_ts.isoformat().replace("+00:00", "Z"),
        "model_type": bundle.model_type,
        "model_available": bundle.available,
        "fallback_reason": bundle.fallback_reason,
        "feature_quality": feature_summary,
        "metrics": metrics,
        "hhi": calculate_hhi(data["balances"]),
        "forecast": forecast,
        "first_breach": first_breach,
        "formulas": FORMULAS,
    }
