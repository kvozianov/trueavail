from __future__ import annotations

import numpy as np
import pandas as pd

from .config import EWMA_ALPHA, MAD_ZSCORE_THRESHOLD
from .settlement import calculate_cash_availability_timestamp, date_key, to_timestamp


BASE_FEATURE_COLUMNS = [
    "day_of_week",
    "is_weekend",
    "is_holiday",
    "is_month_end",
    "is_payroll_day",
    "known_event_count",
    "known_event_expected_net_flow",
    "event_payroll_day",
    "event_merchant_payout_cycle",
    "event_bank_holiday",
    "event_shopping_peak",
    "hour_sin",
    "hour_cos",
    "net_flow_lag_1",
    "net_flow_lag_2",
    "net_flow_lag_7",
    "balance_lag_1",
    "rolling_net_flow_mean_7",
    "rolling_net_flow_volatility_7",
    "ewma_net_flow",
    "mad_zscore",
]


def add_cyclical_time_features(
    frame: pd.DataFrame,
    timestamp_col: str = "timestamp",
) -> pd.DataFrame:
    result = frame.copy()
    hours = pd.to_datetime(result[timestamp_col], utc=True).dt.hour.astype(float)
    result["hour_sin"] = np.sin(2 * np.pi * hours / 24)
    result["hour_cos"] = np.cos(2 * np.pi * hours / 24)
    return result


def calculate_ewma(series: pd.Series, alpha: float = EWMA_ALPHA) -> pd.Series:
    values = series.astype(float).tolist()
    if not values:
        return pd.Series(dtype=float, index=series.index)

    ewma_values = [values[0]]
    for value in values[1:]:
        ewma_values.append(alpha * value + (1 - alpha) * ewma_values[-1])

    return pd.Series(ewma_values, index=series.index, dtype=float)


def add_calendar_features(frame: pd.DataFrame, holidays: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    timestamps = pd.to_datetime(result["timestamp"], utc=True)
    holiday_keys = {pd.Timestamp(value).strftime("%Y-%m-%d") for value in holidays["date"]}
    result["day_of_week"] = timestamps.dt.weekday
    result["is_weekend"] = result["day_of_week"].isin([5, 6]).astype(int)
    result["is_holiday"] = timestamps.dt.strftime("%Y-%m-%d").isin(holiday_keys).astype(int)
    result["is_month_end"] = timestamps.dt.is_month_end.astype(int)
    result["is_payroll_day"] = timestamps.dt.day.isin([15, 25, 28]).astype(int)
    return result


def _empty_known_event_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    result["known_event_count"] = 0
    result["known_event_expected_net_flow"] = 0.0
    result["event_payroll_day"] = 0
    result["event_merchant_payout_cycle"] = 0
    result["event_bank_holiday"] = 0
    result["event_shopping_peak"] = 0
    return result


def add_known_event_features(
    frame: pd.DataFrame,
    known_events: pd.DataFrame | None = None,
) -> pd.DataFrame:
    result = _empty_known_event_features(frame)
    if known_events is None or known_events.empty:
        return result

    events = known_events.copy()
    events["event_date_key"] = pd.to_datetime(events["event_date"], utc=True).dt.strftime("%Y-%m-%d")
    result["event_date_key"] = pd.to_datetime(result["timestamp"], utc=True).dt.strftime("%Y-%m-%d")

    for idx, row in result.iterrows():
        matches = events.loc[events["event_date_key"] == row["event_date_key"]].copy()
        if matches.empty:
            continue

        for col in ("account_id", "bank_id", "currency"):
            if col not in result.columns:
                continue
            values = matches[col].fillna("").astype(str)
            matches = matches.loc[(values == "") | (values == str(row[col]))]

        if matches.empty:
            continue

        signed_amounts = []
        for event in matches.to_dict("records"):
            amount = float(event.get("expected_amount", 0.0) or 0.0)
            direction = str(event.get("impact_direction", "neutral"))
            signed_amounts.append(amount if direction == "inflow" else (-amount if direction == "outflow" else 0.0))

        event_types = set(matches["event_type"].astype(str).tolist())
        result.at[idx, "known_event_count"] = int(len(matches))
        result.at[idx, "known_event_expected_net_flow"] = float(sum(signed_amounts))
        result.at[idx, "event_payroll_day"] = int("payroll_day" in event_types)
        result.at[idx, "event_merchant_payout_cycle"] = int("merchant_payout_cycle" in event_types)
        result.at[idx, "event_bank_holiday"] = int("bank_holiday" in event_types)
        result.at[idx, "event_shopping_peak"] = int("shopping_peak" in event_types)

    return result.drop(columns=["event_date_key"])


def add_mad_zscore_flags(
    frame: pd.DataFrame,
    group_cols: list[str] | None = None,
    value_col: str = "net_flow",
    window: int = 21,
    threshold: float = MAD_ZSCORE_THRESHOLD,
) -> pd.DataFrame:
    result = frame.copy()
    group_cols = group_cols or ["account_id", "currency"]
    result["rolling_median"] = np.nan
    result["rolling_mad"] = np.nan
    result["mad_zscore"] = 0.0

    for _, idx in result.groupby(group_cols, sort=False).groups.items():
        group = result.loc[idx, value_col].astype(float)
        median = group.rolling(window=window, min_periods=5).median()
        absolute_deviation = (group - median).abs()
        mad = absolute_deviation.rolling(window=window, min_periods=5).median()
        denominator = 1.4826 * mad
        zscore = (group - median).abs() / denominator.replace(0, np.nan)
        zscore = zscore.replace([np.inf, -np.inf], np.nan).fillna(0.0)

        result.loc[idx, "rolling_median"] = median
        result.loc[idx, "rolling_mad"] = mad
        result.loc[idx, "mad_zscore"] = zscore

    result["is_anomaly_mad"] = result["mad_zscore"] > threshold
    return result


def add_rolling_features(frame: pd.DataFrame, alpha: float = EWMA_ALPHA) -> pd.DataFrame:
    result = frame.sort_values(["account_id", "currency", "timestamp"]).copy()

    grouped = result.groupby(["account_id", "currency"], sort=False)
    result["net_flow_lag_1"] = grouped["net_flow"].shift(1)
    result["net_flow_lag_2"] = grouped["net_flow"].shift(2)
    result["net_flow_lag_7"] = grouped["net_flow"].shift(7)
    result["balance_lag_1"] = grouped["ending_balance"].shift(1)
    result["rolling_net_flow_mean_7"] = grouped["net_flow"].transform(
        lambda values: values.shift(1).rolling(window=7, min_periods=2).mean()
    )
    result["rolling_net_flow_volatility_7"] = grouped["net_flow"].transform(
        lambda values: values.shift(1).rolling(window=7, min_periods=2).std(ddof=0)
    )
    result["ewma_net_flow"] = grouped["net_flow"].transform(lambda values: calculate_ewma(values, alpha))
    result["target_next_net_flow"] = grouped["net_flow"].shift(-1)
    result["target_next_balance"] = grouped["ending_balance"].shift(-1)

    return result


def build_scheduled_cashflow_frame(
    transactions: pd.DataFrame,
    settlement_rules: pd.DataFrame,
    holidays: pd.DataFrame,
) -> pd.DataFrame:
    rows: list[dict[str, object]] = []
    tx = transactions.copy()
    tx["expected_at"] = pd.to_datetime(tx["expected_at"], utc=True)

    for transaction in tx.to_dict("records"):
        row = pd.Series(transaction)
        availability_at = calculate_cash_availability_timestamp(row, settlement_rules, holidays)
        amount = float(transaction["amount"])
        signed_amount = amount if transaction["direction"] == "inflow" else -amount

        rows.append(
            {
                "transaction_id": transaction["transaction_id"],
                "account_id": transaction["account_id"],
                "currency": transaction["currency"],
                "date": date_key(availability_at),
                "timestamp": availability_at,
                "signed_amount": signed_amount,
                "direction": transaction["direction"],
                "status": transaction["status"],
                "rail": transaction["rail"],
                "business_reason": transaction["business_reason"],
            }
        )

    return pd.DataFrame(rows)


def build_feature_matrix(
    history: pd.DataFrame,
    holidays: pd.DataFrame,
    known_events: pd.DataFrame | None = None,
    alpha: float = EWMA_ALPHA,
    anomaly_threshold: float = MAD_ZSCORE_THRESHOLD,
) -> tuple[pd.DataFrame, dict[str, object]]:
    frame = history.copy()
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    frame = add_cyclical_time_features(frame)
    frame = add_calendar_features(frame, holidays)
    frame = add_known_event_features(frame, known_events)
    frame = add_mad_zscore_flags(frame, threshold=anomaly_threshold)
    frame = add_rolling_features(frame, alpha=alpha)

    trainable = frame.dropna(subset=BASE_FEATURE_COLUMNS + ["target_next_net_flow"]).copy()
    trainable = trainable.loc[~trainable["is_anomaly_mad"]].copy()

    summary = {
        "rows_total": int(len(frame)),
        "rows_trainable": int(len(trainable)),
        "anomaly_rows": int(frame["is_anomaly_mad"].sum()),
        "anomaly_threshold": float(anomaly_threshold),
        "ewma_alpha": float(alpha),
        "known_event_rows": int(0 if known_events is None else len(known_events)),
        "feature_columns": BASE_FEATURE_COLUMNS,
    }

    return frame, summary


def summarize_anomaly_flags(
    feature_frame: pd.DataFrame,
    limit: int = 8,
    threshold: float = MAD_ZSCORE_THRESHOLD,
) -> list[dict[str, object]]:
    anomalies = feature_frame.loc[feature_frame["is_anomaly_mad"]].copy()
    if anomalies.empty:
        return []

    anomalies = anomalies.sort_values("mad_zscore", ascending=False).head(limit)
    return [
        {
            "date": pd.Timestamp(row["timestamp"]).strftime("%Y-%m-%d"),
            "account_id": str(row["account_id"]),
            "bank_id": str(row.get("bank_id", "")),
            "currency": str(row["currency"]),
            "net_flow": float(row["net_flow"]),
            "rolling_median": float(row["rolling_median"]) if pd.notna(row["rolling_median"]) else None,
            "rolling_mad": float(row["rolling_mad"]) if pd.notna(row["rolling_mad"]) else None,
            "mad_zscore": float(row["mad_zscore"]),
            "threshold": float(threshold),
            "formula": "z_t = |y_t - median_W| / (1.4826*MAD_W), anomaly if z_t > 4",
        }
        for row in anomalies.to_dict("records")
    ]


def latest_feature_state(feature_frame: pd.DataFrame) -> pd.DataFrame:
    sorted_frame = feature_frame.sort_values(["account_id", "currency", "timestamp"])
    return sorted_frame.groupby(["account_id", "currency"], as_index=False).tail(1).copy()
