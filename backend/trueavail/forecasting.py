"""14-day quantile balance forecast.

Model: per-day net-flow quantiles (q = 0.05 / 0.50 / 0.95) from a weighted ensemble of
LightGBM quantile regression, scikit-learn GBDT quantile regression and an EWMA + rolling
volatility baseline. Daily quantiles are accumulated into balance quantiles:

    balance_q(t) = B0 + sum_{k<=t} (scheduled(k) + flow_q(k)),  q in {0.05, 0.50, 0.95}

Summing daily quantiles is wider than the independent-residual band
(sqrt of summed squared half-widths). It was kept because in the rolling-origin backtest on the
default dataset the daily quantile models are too narrow out of sample: the sqrt band covered
~57 % of actuals versus ~88 % for the summed band (target 90 %).
Scheduled flows are deterministic and shift all three quantiles equally.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from .config import DEFAULT_FORECAST_HORIZON_DAYS, EWMA_ALPHA, MAD_ZSCORE_THRESHOLD
from .data import Dataset, load_reference_data
from .features import (
    BASE_FEATURE_COLUMNS,
    FEATURE_LABELS,
    add_calendar_features,
    add_cyclical_time_features,
    add_known_event_features,
    build_feature_matrix,
    latest_feature_state,
)

try:
    from lightgbm import LGBMRegressor

    LIGHTGBM_AVAILABLE = True
except Exception:  # pragma: no cover - depends on environment
    LGBMRegressor = None
    LIGHTGBM_AVAILABLE = False

try:
    from sklearn.ensemble import GradientBoostingRegressor

    SKLEARN_AVAILABLE = True
except Exception:  # pragma: no cover - depends on environment
    GradientBoostingRegressor = None
    SKLEARN_AVAILABLE = False


QUANTILES = (0.05, 0.50, 0.95)
EWMA_BASELINE_WEIGHT = 0.15
MODEL_FAMILY_WEIGHTS = {
    "lightgbm_quantile": 0.55,
    "sklearn_gbdt_quantile": 0.30,
}
# Full-size models for /api/forecast/run; backtest folds may use the "fast" profile.
N_ESTIMATORS = {
    "full": {"lightgbm_quantile": 120, "sklearn_gbdt_quantile": 90},
    "fast": {"lightgbm_quantile": 60, "sklearn_gbdt_quantile": 45},
}
MIN_TRAINABLE_ROWS = 60
Z_90 = 1.6449  # standard-normal 95th percentile, used by the EWMA fallback band


def model_available() -> bool:
    return LIGHTGBM_AVAILABLE or SKLEARN_AVAILABLE


@dataclass(frozen=True)
class WeightedModel:
    name: str
    weight: float
    model: object


class WeightedQuantileEnsemble:
    def __init__(self, components: list[WeightedModel]) -> None:
        self.components = components
        self.total_weight = sum(component.weight for component in components)

    def predict(self, features: pd.DataFrame) -> np.ndarray:
        if self.total_weight <= 0 or not self.components:
            raise ValueError("WeightedQuantileEnsemble needs at least one positive-weight component")
        blended = sum(
            np.asarray(component.model.predict(features), dtype=float) * component.weight
            for component in self.components
        )
        return blended / self.total_weight


@dataclass
class QuantileModelBundle:
    model_type: str
    available: bool
    fallback_reason: str | None
    models: dict[float, object]
    residual_scale_by_account: dict[str, float]
    component_models: list[str]
    model_weights: dict[str, float]
    n_estimators: dict[str, int]


def _residual_scale_by_account(trainable: pd.DataFrame) -> dict[str, float]:
    if trainable.empty:
        return {}
    scale = trainable.groupby("account_id")["net_flow"].std(ddof=0).fillna(0.0).clip(lower=25_000).to_dict()
    return {str(account_id): float(value) for account_id, value in scale.items()}


def _fallback_model_bundle(trainable: pd.DataFrame, reason: str) -> QuantileModelBundle:
    return QuantileModelBundle(
        model_type="ewma-volatility-fallback",
        available=False,
        fallback_reason=reason,
        models={},
        residual_scale_by_account=_residual_scale_by_account(trainable),
        component_models=["ewma_volatility_baseline"],
        model_weights={"ewma_volatility_baseline": 1.0},
        n_estimators={},
    )


def train_quantile_ensemble(trainable: pd.DataFrame, profile: str = "full") -> QuantileModelBundle:
    if not model_available():
        return _fallback_model_bundle(
            trainable,
            "lightgbm and scikit-learn are not installed; using EWMA plus rolling volatility quantile fallback",
        )
    if len(trainable) < MIN_TRAINABLE_ROWS:
        return _fallback_model_bundle(
            trainable,
            f"only {len(trainable)} trainable rows (< {MIN_TRAINABLE_ROWS}); using EWMA plus rolling volatility fallback",
        )

    sizes = N_ESTIMATORS[profile]
    X = trainable[BASE_FEATURE_COLUMNS].astype(float)
    y = trainable["target_next_net_flow"].astype(float)
    components_by_quantile: dict[float, list[WeightedModel]] = {quantile: [] for quantile in QUANTILES}
    trained: list[str] = []

    if LIGHTGBM_AVAILABLE:
        for quantile in QUANTILES:
            model = LGBMRegressor(
                objective="quantile",
                alpha=quantile,
                n_estimators=sizes["lightgbm_quantile"],
                learning_rate=0.045,
                num_leaves=15,
                min_child_samples=8,
                random_state=42,
                n_jobs=1,
                verbosity=-1,
            )
            model.fit(X, y)
            components_by_quantile[quantile].append(
                WeightedModel("lightgbm_quantile", MODEL_FAMILY_WEIGHTS["lightgbm_quantile"], model)
            )
        trained.append("lightgbm_quantile")

    if SKLEARN_AVAILABLE:
        for quantile in QUANTILES:
            model = GradientBoostingRegressor(
                loss="quantile",
                alpha=quantile,
                n_estimators=sizes["sklearn_gbdt_quantile"],
                learning_rate=0.055,
                max_depth=3,
                min_samples_leaf=6,
                random_state=42,
            )
            model.fit(X, y)
            components_by_quantile[quantile].append(
                WeightedModel("sklearn_gbdt_quantile", MODEL_FAMILY_WEIGHTS["sklearn_gbdt_quantile"], model)
            )
        trained.append("sklearn_gbdt_quantile")

    ml_raw_weight = sum(MODEL_FAMILY_WEIGHTS[name] for name in trained)
    model_weights = {
        name: (MODEL_FAMILY_WEIGHTS[name] / ml_raw_weight) * (1.0 - EWMA_BASELINE_WEIGHT) for name in trained
    }
    model_weights["ewma_volatility_baseline"] = EWMA_BASELINE_WEIGHT

    if len(trained) > 1:
        model_type = "ensemble-quantile"
    elif trained[0] == "lightgbm_quantile":  # pragma: no cover - depends on environment
        model_type = "lightgbm-quantile"
    else:  # pragma: no cover - depends on environment
        model_type = "sklearn-gbdt-quantile"

    return QuantileModelBundle(
        model_type=model_type,
        available=True,
        fallback_reason=None,
        models={quantile: WeightedQuantileEnsemble(components) for quantile, components in components_by_quantile.items()},
        residual_scale_by_account=_residual_scale_by_account(trainable),
        component_models=trained + ["ewma_volatility_baseline"],
        model_weights=model_weights,
        n_estimators={name: sizes[name] for name in trained},
    )


# ---------------------------------------------------------------------------
# Training on a history slice
# ---------------------------------------------------------------------------


@dataclass
class TrainedForecaster:
    as_of: str
    bundle: QuantileModelBundle
    latest_state: pd.DataFrame  # one feature row per account at as_of
    rows_trainable: int
    anomaly_rows: int
    anomaly_dates: dict[str, list[str]] = field(default_factory=dict)  # account -> dates flagged by MAD z


def history_with_timestamps(history: pd.DataFrame) -> pd.DataFrame:
    frame = history.copy()
    frame["timestamp"] = pd.to_datetime(frame["date"], utc=True) + pd.Timedelta(hours=12)
    return frame


def train_forecaster(history: pd.DataFrame, as_of: str, prefer_ml: bool = True, profile: str = "full") -> TrainedForecaster:
    """Fit the ensemble on history rows dated <= as_of. Targets are next-day net flows, so the
    last row per account (whose target lies after as_of) is never used for training."""
    sliced = history.loc[history["date"] <= as_of]
    if sliced.empty:
        raise ValueError(f"no history on or before {as_of}")
    holidays = load_reference_data()["holidays"]
    feature_frame, summary = build_feature_matrix(
        history_with_timestamps(sliced),
        holidays,
        known_events=None,
        alpha=EWMA_ALPHA,
        anomaly_threshold=MAD_ZSCORE_THRESHOLD,
    )
    trainable = feature_frame.dropna(subset=BASE_FEATURE_COLUMNS + ["target_next_net_flow"])
    trainable = trainable.loc[~trainable["is_anomaly_mad"]]
    bundle = (
        train_quantile_ensemble(trainable, profile=profile)
        if prefer_ml
        else _fallback_model_bundle(trainable, "prefer_ml=false")
    )
    flagged = feature_frame.loc[feature_frame["is_anomaly_mad"], ["account_id", "timestamp"]]
    anomaly_dates: dict[str, list[str]] = {}
    for account_id, stamp in zip(flagged["account_id"], pd.to_datetime(flagged["timestamp"], utc=True)):
        anomaly_dates.setdefault(str(account_id), []).append(stamp.strftime("%Y-%m-%d"))
    return TrainedForecaster(
        as_of=as_of,
        bundle=bundle,
        latest_state=latest_feature_state(feature_frame),
        rows_trainable=int(len(trainable)),
        anomaly_rows=int(summary["anomaly_rows"]),
        anomaly_dates={account: sorted(dates) for account, dates in anomaly_dates.items()},
    )


_CACHE: OrderedDict[tuple, TrainedForecaster] = OrderedDict()
_CACHE_LOCK = threading.Lock()
_CACHE_SIZE = 16


def cached_forecaster(dataset: Dataset, as_of: str, prefer_ml: bool = True, profile: str = "full") -> TrainedForecaster:
    """Training depends only on history, not on scheduled flows, so what-if runs reuse it."""
    key = (id(dataset), dataset.version, as_of, prefer_ml, profile)
    with _CACHE_LOCK:
        if key in _CACHE:
            _CACHE.move_to_end(key)
            return _CACHE[key]
    trained = train_forecaster(dataset.history, as_of, prefer_ml=prefer_ml, profile=profile)
    with _CACHE_LOCK:
        _CACHE[key] = trained
        while len(_CACHE) > _CACHE_SIZE:
            _CACHE.popitem(last=False)
    return trained


# ---------------------------------------------------------------------------
# Multi-step prediction
# ---------------------------------------------------------------------------


def _known_events_frame(scheduled: pd.DataFrame) -> pd.DataFrame:
    """Scheduled flows as calendar-event features (event date = settlement-adjusted date)."""
    if scheduled is None or scheduled.empty:
        return pd.DataFrame()
    return pd.DataFrame(
        {
            "event_date": scheduled["effective_date"],
            "event_type": "scheduled_flow",
            "account_id": scheduled["account_id"],
            "bank_id": "",
            "currency": scheduled["currency"],
            "impact_direction": scheduled["direction"],
            "expected_amount": scheduled["amount"].astype(float),
        }
    )


def _future_feature_rows(
    state: pd.DataFrame,
    as_of: str,
    horizon_days: int,
    scheduled: pd.DataFrame,
) -> pd.DataFrame:
    """Feature rows for every (account, step). Lag/rolling features are frozen at the as-of
    state (direct multi-horizon strategy); calendar and known-event features vary by date."""
    start = pd.Timestamp(as_of, tz="UTC")
    rows = []
    for account in state.to_dict("records"):
        for step in range(1, horizon_days + 1):
            rows.append(
                {
                    "step": step,
                    "timestamp": start + pd.Timedelta(days=step, hours=12),
                    "account_id": account["account_id"],
                    "bank_id": account.get("bank_id", ""),
                    "currency": account["currency"],
                    "net_flow_lag_1": float(account["net_flow"]),
                    "net_flow_lag_2": float(account["net_flow_lag_1"]),
                    "net_flow_lag_7": float(account["net_flow_lag_7"]),
                    "balance_lag_1": float(account["ending_balance"]),
                    "rolling_net_flow_mean_7": float(account["rolling_net_flow_mean_7"]),
                    "rolling_net_flow_volatility_7": float(account["rolling_net_flow_volatility_7"]),
                    "ewma_net_flow": float(account["ewma_net_flow"]),
                    "mad_zscore": float(account["mad_zscore"]),
                }
            )
    frame = pd.DataFrame(rows)
    holidays = load_reference_data()["holidays"]
    frame = add_cyclical_time_features(frame)
    frame = add_calendar_features(frame, holidays)
    frame = add_known_event_features(frame, _known_events_frame(scheduled))
    return frame


def _future_and_fallback(
    trained: TrainedForecaster,
    horizon_days: int,
    scheduled: pd.DataFrame | None,
) -> tuple[pd.DataFrame, dict[float, np.ndarray]]:
    """Future feature rows and the EWMA + rolling-volatility baseline quantiles for them."""
    state = trained.latest_state
    future = _future_feature_rows(state, trained.as_of, horizon_days, scheduled if scheduled is not None else pd.DataFrame())
    bundle = trained.bundle
    ewma = future["ewma_net_flow"].astype(float).to_numpy()
    center = ewma * (0.78 ** future["step"].to_numpy())
    scale = future["account_id"].map(lambda acc: bundle.residual_scale_by_account.get(acc, 75_000.0)).to_numpy()
    fallback = {0.05: center - Z_90 * scale, 0.50: center, 0.95: center + Z_90 * scale}
    return future, fallback


def _blend(bundle: QuantileModelBundle, future: pd.DataFrame, fallback: dict[float, np.ndarray]) -> dict[float, np.ndarray]:
    if bundle.available and bundle.models:
        X = future[BASE_FEATURE_COLUMNS].astype(float)
        w = bundle.model_weights.get("ewma_volatility_baseline", EWMA_BASELINE_WEIGHT)
        return {q: (1.0 - w) * bundle.models[q].predict(X) + w * fallback[q] for q in QUANTILES}
    return fallback


def _flow_frame(future: pd.DataFrame, quantiles: dict[float, np.ndarray]) -> pd.DataFrame:
    stacked = np.sort(np.vstack([quantiles[q] for q in QUANTILES]), axis=0)  # guard against quantile crossing
    return pd.DataFrame(
        {
            "account_id": future["account_id"].to_numpy(),
            "step": future["step"].to_numpy(),
            "date": future["timestamp"].dt.strftime("%Y-%m-%d").to_numpy(),
            "flow_p05": stacked[0],
            "flow_p50": stacked[1],
            "flow_p95": stacked[2],
        }
    )


def predict_daily_flow_quantiles(
    trained: TrainedForecaster,
    horizon_days: int,
    scheduled: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Return one row per (account_id, step) with flow_p05 / flow_p50 / flow_p95."""
    future, fallback = _future_and_fallback(trained, horizon_days, scheduled)
    return _flow_frame(future, _blend(trained.bundle, future, fallback))


def predict_component_flow_quantiles(
    trained: TrainedForecaster,
    horizon_days: int,
    scheduled: pd.DataFrame | None = None,
) -> tuple[dict[str, pd.DataFrame], dict[str, dict[float, np.ndarray]]]:
    """Daily flow quantiles of every ensemble component on its own, plus the weighted "blend".

    Returns (frames, raw): ``frames[name]`` has the same shape as predict_daily_flow_quantiles
    (each component's quantiles sorted, like the blend); ``frames["blend"]`` is exactly what the
    forecast uses. ``raw[name]`` holds the unsorted per-quantile predictions, so the blend can be
    checked as the weighted sum of the components."""
    future, fallback = _future_and_fallback(trained, horizon_days, scheduled)
    bundle = trained.bundle
    raw: dict[str, dict[float, np.ndarray]] = {}
    if bundle.available and bundle.models:
        X = future[BASE_FEATURE_COLUMNS].astype(float)
        for index, component in enumerate(bundle.models[0.50].components):
            raw[component.name] = {
                q: np.asarray(bundle.models[q].components[index].model.predict(X), dtype=float) for q in QUANTILES
            }
    raw["ewma_volatility_baseline"] = fallback
    raw["blend"] = _blend(bundle, future, fallback)
    return {name: _flow_frame(future, values) for name, values in raw.items()}, raw


def feature_importances(trained: TrainedForecaster) -> list[dict[str, object]]:
    """Gain importances of the LightGBM P50 model, largest first, with readable names.
    Empty when LightGBM was not trained (fallback or library missing)."""
    bundle = trained.bundle
    if not (bundle.available and bundle.models):
        return []
    lightgbm = next((c for c in bundle.models[0.50].components if c.name == "lightgbm_quantile"), None)
    if lightgbm is None:
        return []
    gains = np.asarray(lightgbm.model.booster_.feature_importance(importance_type="gain"), dtype=float)
    total = float(gains.sum()) or 1.0
    rows = []
    for name, gain in zip(BASE_FEATURE_COLUMNS, gains):
        label, group = FEATURE_LABELS.get(name, (name, "other"))
        rows.append({"feature": name, "label": label, "group": group, "gain": float(gain), "share": float(gain) / total})
    return sorted(rows, key=lambda row: (-row["gain"], BASE_FEATURE_COLUMNS.index(row["feature"])))


def balance_quantile_paths(
    daily: pd.DataFrame,
    start_balances: dict[str, float],
    scheduled_by_day: dict[tuple[str, str], float] | None = None,
) -> pd.DataFrame:
    """Accumulate daily flow quantiles (plus deterministic scheduled flows) into balance quantiles."""
    scheduled_by_day = scheduled_by_day or {}
    frames = []
    for account_id, group in daily.sort_values(["account_id", "step"]).groupby("account_id", sort=False):
        scheduled = np.array([scheduled_by_day.get((account_id, day), 0.0) for day in group["date"]])
        base = start_balances[account_id] + np.cumsum(scheduled)
        frames.append(
            group.assign(
                scheduled_net_flow=scheduled,
                balance_p05=base + np.cumsum(group["flow_p05"].to_numpy()),
                balance_p50=base + np.cumsum(group["flow_p50"].to_numpy()),
                balance_p95=base + np.cumsum(group["flow_p95"].to_numpy()),
            )
        )
    return pd.concat(frames, ignore_index=True)


# ---------------------------------------------------------------------------
# Public API: ForecastResponse
# ---------------------------------------------------------------------------


def resolve_as_of(dataset: Dataset, as_of: str | None) -> str:
    if as_of is None:
        return dataset.as_of
    value = pd.Timestamp(as_of)
    if value.tzinfo is not None:
        value = value.tz_convert("UTC")
    key = value.strftime("%Y-%m-%d")
    start = pd.Timestamp(dataset.history["date"].min())
    if key > dataset.as_of:
        raise ValueError(f"as_of {key} is after the last history date {dataset.as_of}")
    if (pd.Timestamp(key) - start).days < 30:
        raise ValueError(f"as_of {key} leaves fewer than 30 days of history (history starts {start.date()})")
    return key


def _forecast_inputs(
    dataset: Dataset, as_of_key: str, horizon_days: int, flows: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, float], dict[tuple[str, str], float], dict[tuple[str, str], list[dict[str, object]]]]:
    """Scheduled flows inside the horizon, last history row per account, start balances,
    signed scheduled amount per (account, day) and the known events behind it."""
    end_key = (pd.Timestamp(as_of_key) + pd.Timedelta(days=horizon_days)).strftime("%Y-%m-%d")
    in_window = flows.loc[(flows["effective_date"] > as_of_key) & (flows["effective_date"] <= end_key)] if not flows.empty else flows

    history = dataset.history.loc[dataset.history["date"] <= as_of_key]
    last = history.sort_values("date").groupby("account_id").tail(1).set_index("account_id")
    start_balances = last["ending_balance"].astype(float).to_dict()

    scheduled_by_day: dict[tuple[str, str], float] = {}
    events_by_day: dict[tuple[str, str], list[dict[str, object]]] = {}
    for flow in in_window.to_dict("records"):
        key = (flow["account_id"], flow["effective_date"])
        signed = float(flow["amount"]) if flow["direction"] == "inflow" else -float(flow["amount"])
        scheduled_by_day[key] = scheduled_by_day.get(key, 0.0) + signed
        events_by_day.setdefault(key, []).append(
            {
                "flow_id": str(flow["flow_id"]),
                "amount": float(flow["amount"]),
                "direction": str(flow["direction"]),
                "description": str(flow["description"]),
            }
        )
    return in_window, last, start_balances, scheduled_by_day, events_by_day


def run_forecast(
    dataset: Dataset,
    horizon_days: int = DEFAULT_FORECAST_HORIZON_DAYS,
    as_of: str | None = None,
    scheduled: pd.DataFrame | None = None,
    prefer_ml: bool = True,
) -> dict[str, object]:
    """Forecast every account of ``dataset`` for ``horizon_days`` after ``as_of``.

    ``scheduled`` overrides the dataset's scheduled flows (used by what-if)."""
    as_of_key = resolve_as_of(dataset, as_of)
    trained = cached_forecaster(dataset, as_of_key, prefer_ml=prefer_ml)
    flows = dataset.scheduled if scheduled is None else scheduled
    in_window, last, start_balances, scheduled_by_day, events_by_day = _forecast_inputs(
        dataset, as_of_key, horizon_days, flows
    )

    daily = predict_daily_flow_quantiles(trained, horizon_days, in_window)
    paths = balance_quantile_paths(daily, start_balances, scheduled_by_day)

    account_order = {account_id: idx for idx, account_id in enumerate(dataset.account_ids)}
    paths = paths.assign(_order=paths["account_id"].map(account_order)).sort_values(["step", "_order"])
    points = []
    for row in paths.to_dict("records"):
        account = last.loc[row["account_id"]]
        required_buffer = float(account["required_buffer"])
        points.append(
            {
                "date": row["date"],
                "account_id": row["account_id"],
                "currency": str(account["currency"]),
                "balance_p05": float(row["balance_p05"]),
                "balance_p50": float(row["balance_p50"]),
                "balance_p95": float(row["balance_p95"]),
                "scheduled_net_flow": float(row["scheduled_net_flow"]),
                "required_buffer": required_buffer,
                "breach": bool(row["balance_p05"] < required_buffer),
                "known_events": events_by_day.get((row["account_id"], row["date"]), []),
            }
        )

    bundle = trained.bundle
    return {
        "as_of": as_of_key,
        "horizon_days": int(horizon_days),
        "quantiles": list(QUANTILES),
        "model": {
            "type": bundle.model_type,
            "components": bundle.component_models,
            "weights": bundle.model_weights,
            "available": bundle.available,
            "fallback_reason": bundle.fallback_reason,
        },
        "feature_quality": {
            "rows_trainable": trained.rows_trainable,
            "anomaly_rows": trained.anomaly_rows,
            "known_event_rows": int(len(in_window)),
        },
        "points": points,
        "first_breach": next((point for point in points if point["breach"]), None),
    }


# ---------------------------------------------------------------------------
# Model explanation: per-component corridors and feature importances
# ---------------------------------------------------------------------------


def explain_forecast(
    dataset: Dataset,
    horizon_days: int = DEFAULT_FORECAST_HORIZON_DAYS,
    as_of: str | None = None,
) -> dict[str, object]:
    """What the forecast is made of: each ensemble component's own balance corridor per account,
    the weighted blend (identical to run_forecast), the LightGBM P50 gain importances and the
    latest feature vector per account. Uses the same cached training as run_forecast."""
    as_of_key = resolve_as_of(dataset, as_of)
    trained = cached_forecaster(dataset, as_of_key)
    in_window, last, start_balances, scheduled_by_day, _ = _forecast_inputs(
        dataset, as_of_key, horizon_days, dataset.scheduled
    )
    frames, _raw = predict_component_flow_quantiles(trained, horizon_days, in_window)
    paths = {name: balance_quantile_paths(frame, start_balances, scheduled_by_day) for name, frame in frames.items()}

    bundle = trained.bundle
    state = trained.latest_state.set_index("account_id")
    series = []
    for account_id in dataset.account_ids:
        components: dict[str, dict[str, dict[str, list[float]]]] = {}
        dates: list[str] = []
        scheduled_net: list[float] = []
        for name, frame in paths.items():
            rows = frame.loc[frame["account_id"] == account_id].sort_values("step")
            dates = rows["date"].tolist()
            scheduled_net = [float(v) for v in rows["scheduled_net_flow"]]
            components[name] = {
                "flow": {key: [float(v) for v in rows[f"flow_{key}"]] for key in ("p05", "p50", "p95")},
                "balance": {key: [float(v) for v in rows[f"balance_{key}"]] for key in ("p05", "p50", "p95")},
            }
        account = last.loc[account_id]
        series.append(
            {
                "account_id": account_id,
                "currency": str(account["currency"]),
                "start_balance": float(start_balances[account_id]),
                "required_buffer": float(account["required_buffer"]),
                "dates": dates,
                "scheduled_net_flow": scheduled_net,
                "components": components,
                "anomaly_dates": trained.anomaly_dates.get(account_id, []),
                "latest_features": {
                    name: float(state.loc[account_id, name]) if account_id in state.index else None
                    for name in BASE_FEATURE_COLUMNS
                    if name in state.columns
                },
            }
        )

    return {
        "as_of": as_of_key,
        "horizon_days": int(horizon_days),
        "quantiles": list(QUANTILES),
        "model": {
            "type": bundle.model_type,
            "available": bundle.available,
            "fallback_reason": bundle.fallback_reason,
            "weights": bundle.model_weights,
            "n_estimators": bundle.n_estimators,
        },
        "training": {
            "history_rows": int(len(dataset.history.loc[dataset.history["date"] <= as_of_key])),
            "accounts": len(dataset.account_ids),
            "rows_trainable": trained.rows_trainable,
            "anomaly_rows": trained.anomaly_rows,
            "known_event_rows": int(len(in_window)),
            "feature_columns": list(BASE_FEATURE_COLUMNS),
            "feature_labels": {name: FEATURE_LABELS.get(name, (name, "other"))[0] for name in BASE_FEATURE_COLUMNS},
        },
        "feature_importance": {
            "model": "lightgbm_quantile",
            "quantile": 0.5,
            "importance_type": "gain",
            "features": feature_importances(trained),
        },
        "components": [*bundle.component_models, "blend"],
        "series": series,
    }
