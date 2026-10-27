import pytest

from trueavail.alerts import build_alerts, severity_for
from trueavail.data import STORE
from trueavail.forecasting import run_forecast


def _point(date, account_id, currency, p05, buffer, events=()):
    return {
        "date": date,
        "account_id": account_id,
        "currency": currency,
        "balance_p05": p05,
        "balance_p50": p05 + 100,
        "balance_p95": p05 + 200,
        "scheduled_net_flow": 0.0,
        "required_buffer": buffer,
        "breach": p05 < buffer,
        "known_events": list(events),
    }


def test_severity_threshold_is_ten_percent_of_buffer() -> None:
    assert severity_for(100.1, 1000.0) == "red"
    assert severity_for(100.0, 1000.0) == "amber"
    assert severity_for(1.0, 1000.0) == "amber"


def test_per_account_and_consolidated_alerts_from_synthetic_forecast() -> None:
    payout = {"flow_id": "pay-1", "amount": 500.0, "direction": "outflow", "description": "supplier"}
    forecast = {
        "points": [
            _point("2026-05-19", "a", "EUR", 950.0, 1000.0, [payout]),  # gap 50 -> amber
            _point("2026-05-19", "b", "EUR", 1500.0, 1000.0),  # no gap; pool 2450 >= 2000
            _point("2026-05-20", "a", "EUR", 500.0, 1000.0),  # gap 500 -> red
            _point("2026-05-20", "b", "EUR", 1200.0, 1000.0),  # pool 1700 < 2000 -> consolidated gap 300
            _point("2026-05-20", "c", "USD", 5000.0, 1000.0),
        ]
    }

    alerts = build_alerts(forecast, "p05")

    assert alerts["threshold_quantile"] == "p05"
    per_account = {(a["account_id"], a["date"]): a for a in alerts["per_account"]}
    assert set(per_account) == {("a", "2026-05-19"), ("a", "2026-05-20")}
    assert per_account[("a", "2026-05-19")]["severity"] == "amber"
    assert per_account[("a", "2026-05-20")]["severity"] == "red"
    assert per_account[("a", "2026-05-20")]["gap_amount"] == pytest.approx(500.0)
    assert "pay-1" in per_account[("a", "2026-05-20")]["drivers"][0]

    assert len(alerts["consolidated"]) == 1
    consolidated = alerts["consolidated"][0]
    assert consolidated["account_id"] == "consolidated"
    assert consolidated["currency"] == "EUR"
    assert consolidated["gap_amount"] == pytest.approx(300.0)
    assert consolidated["severity"] == "red"


def test_alerts_on_default_dataset_flag_atlas_payout() -> None:
    alerts = build_alerts(run_forecast(STORE.get()), "p05")

    first = alerts["per_account"][0]
    assert first["account_id"] == "atlas-eur-operating"
    assert first["date"] == "2026-05-19"
    assert first["severity"] == "red"
    assert any("payout-2026-05-19" in driver for driver in first["drivers"])
    # EUR pool (Atlas + Nova + Orion) stays above the summed buffers despite the payout
    assert all(a["currency"] != "EUR" for a in alerts["consolidated"])


def test_p95_threshold_yields_no_more_alerts_than_p05() -> None:
    forecast = run_forecast(STORE.get())
    assert len(build_alerts(forecast, "p95")["per_account"]) <= len(build_alerts(forecast, "p05")["per_account"])
    with pytest.raises(ValueError):
        build_alerts(forecast, "p42")


def test_alerts_endpoint(client) -> None:
    response = client.get("/api/alerts", params={"quantile": "p05", "horizon_days": 14})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"per_account", "consolidated", "threshold_quantile"}
    alert = body["per_account"][0]
    assert set(alert) == {
        "account_id",
        "currency",
        "date",
        "quantile_balance",
        "required_buffer",
        "gap_amount",
        "severity",
        "drivers",
    }
    assert client.get("/api/alerts", params={"quantile": "p01"}).status_code == 422
