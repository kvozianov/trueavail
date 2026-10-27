import pytest

from trueavail.data import STORE
from trueavail.whatif import AdjustmentError, apply_adjustments, run_whatif

PAYOUT = {
    "flow_id": "payout-2026-05-19",
    "account_id": "atlas-eur-operating",
    "expected_date": "2026-05-19",
    "amount": 4_100_000.0,
    "direction": "outflow",
}


def _atlas_gaps(alerts):
    return [a for a in alerts if a["account_id"] == "atlas-eur-operating"]


def test_removing_the_payout_removes_atlas_gaps() -> None:
    result = run_whatif(STORE.get(), [{**PAYOUT, "remove": True}])

    assert _atlas_gaps(result["alerts_before"])
    assert not _atlas_gaps(result["alerts_after"])
    assert result["delta"]["gaps_removed"] >= 2
    assert result["delta"]["worst_gap_after"] < result["delta"]["worst_gap_before"]
    assert result["baseline"]["first_breach"]["date"] == "2026-05-19"


def test_shifting_the_payout_after_card_settlement_moves_the_flow() -> None:
    flows = apply_adjustments(STORE.get(), [{**PAYOUT, "shift_days": 3}]).set_index("flow_id")

    assert flows.loc["payout-2026-05-19", "expected_date"] == "2026-05-22"
    assert flows.loc["payout-2026-05-19", "effective_date"] == "2026-05-22"
    result = run_whatif(STORE.get(), [{**PAYOUT, "shift_days": 3}])
    dates_after = {a["date"] for a in _atlas_gaps(result["alerts_after"])}
    assert "2026-05-19" not in dates_after


def test_adding_a_large_outflow_adds_gaps() -> None:
    new_flow = {
        "account_id": "orion-eur-safeguard",
        "expected_date": "2026-05-26",
        "amount": 3_000_000.0,
        "direction": "outflow",
    }
    result = run_whatif(STORE.get(), [new_flow])

    assert result["delta"]["gaps_added"] > 0
    orion = [a for a in result["alerts_after"] if a["account_id"] == "orion-eur-safeguard"]
    assert orion and orion[0]["date"] == "2026-05-26"
    assert any("whatif-1" in d for d in orion[0]["drivers"])


def test_invalid_adjustments_are_rejected() -> None:
    with pytest.raises(AdjustmentError):
        apply_adjustments(STORE.get(), [{**PAYOUT, "flow_id": "nope", "remove": True}])
    with pytest.raises(AdjustmentError):
        apply_adjustments(STORE.get(), [{**PAYOUT, "account_id": "ghost"}])


def test_whatif_endpoint(client) -> None:
    response = client.post("/api/whatif/run", json={"horizon_days": 14, "adjustments": [{**PAYOUT, "remove": True}]})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"baseline", "scenario", "alerts_before", "alerts_after", "delta"}
    assert set(body["delta"]) == {"gaps_removed", "gaps_added", "worst_gap_before", "worst_gap_after"}
    assert body["scenario"]["feature_quality"]["known_event_rows"] == 6

    bad = client.post("/api/whatif/run", json={"adjustments": [{**PAYOUT, "flow_id": "nope", "remove": True}]})
    assert bad.status_code == 422
