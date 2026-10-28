"""Per-component corridors and feature importances behind the forecast (/api/forecast/explain)."""

import numpy as np
import pytest

from trueavail.data import STORE
from trueavail.features import BASE_FEATURE_COLUMNS, FEATURE_LABELS
from trueavail.forecasting import (
    QUANTILES,
    cached_forecaster,
    explain_forecast,
    feature_importances,
    predict_component_flow_quantiles,
    predict_daily_flow_quantiles,
    run_forecast,
)

COMPONENTS = ["lightgbm_quantile", "sklearn_gbdt_quantile", "ewma_volatility_baseline", "blend"]


def test_blend_is_the_weighted_sum_of_the_components() -> None:
    dataset = STORE.get()
    trained = cached_forecaster(dataset, dataset.as_of)
    frames, raw = predict_component_flow_quantiles(trained, 14, dataset.scheduled)
    weights = trained.bundle.model_weights

    assert list(frames) == COMPONENTS
    assert sum(weights.values()) == pytest.approx(1.0)
    for q in QUANTILES:
        weighted = sum(weights[name] * raw[name][q] for name in COMPONENTS[:-1])
        np.testing.assert_allclose(weighted, raw["blend"][q], rtol=1e-9, atol=1e-6)

    daily = predict_daily_flow_quantiles(trained, 14, dataset.scheduled)
    for key in ("flow_p05", "flow_p50", "flow_p95"):
        np.testing.assert_allclose(frames["blend"][key].to_numpy(), daily[key].to_numpy())
    for frame in frames.values():
        assert (frame["flow_p05"] <= frame["flow_p50"]).all() and (frame["flow_p50"] <= frame["flow_p95"]).all()


def test_explain_blend_matches_the_forecast_corridor() -> None:
    dataset = STORE.get()
    explain = explain_forecast(dataset, horizon_days=14)
    forecast = run_forecast(dataset, horizon_days=14)

    assert explain["as_of"] == forecast["as_of"]
    assert explain["components"] == COMPONENTS
    assert explain["model"]["weights"] == forecast["model"]["weights"]
    assert explain["training"]["history_rows"] == 600
    assert explain["training"]["rows_trainable"] == forecast["feature_quality"]["rows_trainable"]
    assert explain["training"]["feature_columns"] == BASE_FEATURE_COLUMNS

    by_account = {s["account_id"]: s for s in explain["series"]}
    assert list(by_account) == dataset.account_ids
    for point in forecast["points"]:
        series = by_account[point["account_id"]]
        step = series["dates"].index(point["date"])
        blend = series["components"]["blend"]["balance"]
        for key in ("p05", "p50", "p95"):
            assert blend[key][step] == pytest.approx(point[f"balance_{key}"])
        assert series["scheduled_net_flow"][step] == pytest.approx(point["scheduled_net_flow"])

    flagged = [d for s in explain["series"] for d in s["anomaly_dates"]]
    assert len(flagged) == explain["training"]["anomaly_rows"] == forecast["feature_quality"]["anomaly_rows"]
    assert all(d <= explain["as_of"] for d in flagged)

    atlas = by_account["atlas-eur-operating"]
    assert len(atlas["dates"]) == 14
    assert set(atlas["latest_features"]) == set(BASE_FEATURE_COLUMNS)
    # Every component sees the same scheduled payout, so every corridor drops below the buffer on day 1.
    for name in COMPONENTS:
        assert atlas["components"][name]["balance"]["p05"][0] < atlas["required_buffer"]


def test_feature_importances_are_lightgbm_p50_gain_shares() -> None:
    dataset = STORE.get()
    rows = feature_importances(cached_forecaster(dataset, dataset.as_of))

    assert [r["feature"] for r in rows] != BASE_FEATURE_COLUMNS  # sorted by gain, not by column order
    assert {r["feature"] for r in rows} == set(BASE_FEATURE_COLUMNS)
    assert sum(r["share"] for r in rows) == pytest.approx(1.0)
    assert all(a["gain"] >= b["gain"] for a, b in zip(rows, rows[1:]))
    assert all(r["label"] == FEATURE_LABELS[r["feature"]][0] for r in rows)
    assert rows[0]["gain"] > 0
    # Known-event features are all zero in the training history, so the trees never split on them.
    assert next(r for r in rows if r["feature"] == "known_event_count")["gain"] == 0


def test_feature_importances_empty_on_fallback() -> None:
    dataset = STORE.get()
    trained = cached_forecaster(dataset, dataset.as_of, prefer_ml=False)
    assert feature_importances(trained) == []
    frames, _ = predict_component_flow_quantiles(trained, 3, dataset.scheduled)
    assert list(frames) == ["ewma_volatility_baseline", "blend"]


def test_explain_endpoint(client) -> None:
    response = client.get("/api/forecast/explain", params={"horizon_days": 7})

    assert response.status_code == 200
    body = response.json()
    assert body["horizon_days"] == 7
    assert body["feature_importance"]["importance_type"] == "gain"
    assert len(body["feature_importance"]["features"]) == len(BASE_FEATURE_COLUMNS)
    assert all(len(s["dates"]) == 7 for s in body["series"])
    assert client.get("/api/forecast/explain", params={"horizon_days": 0}).status_code == 422
