import pytest

from trueavail.data import STORE
from trueavail.forecasting import run_forecast

POINT_FIELDS = {
    "date",
    "account_id",
    "currency",
    "balance_p05",
    "balance_p50",
    "balance_p95",
    "scheduled_net_flow",
    "required_buffer",
    "breach",
    "known_events",
}


def test_forecast_returns_quantile_corridor_and_first_breach() -> None:
    result = run_forecast(STORE.get(), horizon_days=14)

    assert result["as_of"] == "2026-05-18"
    assert result["quantiles"] == [0.05, 0.5, 0.95]
    assert result["model"]["available"]
    assert result["model"]["type"] == "ensemble-quantile"
    assert "ewma_volatility_baseline" in result["model"]["components"]
    assert sum(result["model"]["weights"].values()) == pytest.approx(1.0)
    assert result["feature_quality"]["rows_trainable"] > 100
    assert result["feature_quality"]["anomaly_rows"] > 0
    assert result["feature_quality"]["known_event_rows"] == 7
    assert len(result["points"]) == 14 * 5
    for point in result["points"]:
        assert set(point) == POINT_FIELDS
        assert point["balance_p05"] <= point["balance_p50"] <= point["balance_p95"]
        assert point["breach"] == (point["balance_p05"] < point["required_buffer"])

    first = result["first_breach"]
    assert first["account_id"] == "atlas-eur-operating"
    assert first["date"] == "2026-05-19"
    assert first["scheduled_net_flow"] == -4_100_000.0
    assert first["known_events"][0]["flow_id"] == "payout-2026-05-19"


def test_scheduled_flows_shift_all_quantiles_equally() -> None:
    dataset = STORE.get()
    base = run_forecast(dataset, horizon_days=3)
    no_flows = run_forecast(dataset, horizon_days=3, scheduled=dataset.scheduled.iloc[0:0])

    def atlas(points):
        return [p for p in points if p["account_id"] == "atlas-eur-operating"][0]

    a, b = atlas(base["points"]), atlas(no_flows["points"])
    for key in ("balance_p05", "balance_p50", "balance_p95"):
        assert a[key] - b[key] == pytest.approx(-4_100_000.0)


def test_forecast_can_force_ewma_fallback() -> None:
    result = run_forecast(STORE.get(), horizon_days=3, prefer_ml=False)

    assert result["model"]["type"] == "ewma-volatility-fallback"
    assert not result["model"]["available"]
    assert result["model"]["fallback_reason"] == "prefer_ml=false"
    assert result["model"]["weights"] == {"ewma_volatility_baseline": 1.0}


def test_forecast_as_of_in_the_past_starts_from_that_balance() -> None:
    dataset = STORE.get()
    result = run_forecast(dataset, horizon_days=5, as_of="2026-04-30")
    history = dataset.history.set_index(["account_id", "date"])

    assert result["as_of"] == "2026-04-30"
    assert result["points"][0]["date"] == "2026-05-01"
    assert result["feature_quality"]["known_event_rows"] == 0
    with pytest.raises(ValueError):
        run_forecast(dataset, as_of="2026-06-30")
    with pytest.raises(ValueError):
        run_forecast(dataset, as_of="2026-01-25")
    assert history.loc[("atlas-eur-operating", "2026-04-30"), "ending_balance"] > 0


def test_forecast_endpoint_matches_spec_and_records_run(client) -> None:
    response = client.post("/api/forecast/run", json={"horizon_days": 14})

    assert response.status_code == 200
    body = response.json()
    assert set(body) >= {"as_of", "horizon_days", "quantiles", "model", "feature_quality", "points", "first_breach"}
    assert set(body["model"]) == {"type", "components", "weights", "available", "fallback_reason"}
    assert set(body["feature_quality"]) == {"rows_trainable", "anomaly_rows", "known_event_rows"}
    assert body["run_id"] is not None

    runs = client.get("/api/forecast/runs", params={"limit": 5}).json()
    assert runs[0]["id"] == body["run_id"]
    assert runs[0]["kind"] == "forecast"
    assert runs[0]["summary"]["first_breach"]["account_id"] == "atlas-eur-operating"


def test_forecast_endpoint_rejects_bad_as_of(client) -> None:
    response = client.post("/api/forecast/run", json={"as_of": "2027-01-01"})
    assert response.status_code == 422
    assert "after the last history date" in response.json()["detail"]["message"]
