from trueavail.data import STORE, load_reference_data
from trueavail.optimizer import apply_ccri_downgrade, solve_liquidity_rebalance
from trueavail.risk import calculate_hhi


def _balances():
    return STORE.get().accounts()


def test_default_balances_match_reference_profiles() -> None:
    profiles = load_reference_data()["account_profiles"].set_index("account_id")
    for row in _balances().to_dict("records"):
        assert row["settled_balance"] == float(profiles.loc[row["account_id"], "settled_balance"])


def test_hhi_alert_uses_balance_concentration_formula() -> None:
    hhi = calculate_hhi(_balances())

    assert hhi["value"] > 0.25
    assert hhi["alert"]
    assert "atlas" in hhi["contributions"]


def test_ccri_downgrade_reduces_max_exposure_share() -> None:
    adjusted, audit_events = apply_ccri_downgrade(load_reference_data()["bank_risk_scores"], "atlas", 25)

    atlas = adjusted.loc[adjusted["bank_id"] == "atlas"].iloc[0]
    assert float(atlas["ccri_score"]) == 57.0
    assert float(atlas["max_exposure_share"]) == 0.24
    assert audit_events[0]["event_type"] == "bank_rating_downgrade"


def test_optimizer_moves_funds_after_downgrade() -> None:
    result = solve_liquidity_rebalance(downgrade_bank_id="atlas")

    assert result["status"] == "optimal"
    assert result["solver_engine"] == "pulp-highs"
    assert len(result["transfers"]) > 0
    assert result["transfers"][0]["source_bank_id"] == "atlas"
    assert result["total_transfer_cost"] > 0
    for balance in result["post_transfer_balances"]:
        assert balance["settled_balance"] + 1e-6 >= balance["required_buffer"]


def test_optimizer_returns_infeasible_when_no_free_liquidity() -> None:
    balances = _balances()
    balances["settled_balance"] = balances["required_buffer"]

    result = solve_liquidity_rebalance(balances=balances, downgrade_bank_id="atlas")

    assert result["status"] == "infeasible"
    assert result["infeasible_reason"] is not None


def test_optimizer_survival_floor_blocks_draining_forecast_breach_account() -> None:
    balances = _balances()
    atlas_balance = float(balances.loc[balances["account_id"] == "atlas-eur-operating", "settled_balance"].iloc[0])

    result = solve_liquidity_rebalance(
        downgrade_bank_id="atlas",
        survival_min_balances={"atlas-eur-operating": atlas_balance + 2_000_000.0},
    )

    assert result["status"] == "infeasible"
    assert "atlas-eur-operating" in result["survival_min_balances"]
    assert result["infeasible_reason"] is not None


def test_optimizer_api_endpoint(client) -> None:
    response = client.post("/api/optimizer/rebalance", json={"downgrade_bank_id": "atlas", "downgrade_score_delta": 25})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "optimal"
    assert len(body["transfers"]) > 0


def test_optimizer_api_accepts_survival_min_balances(client) -> None:
    response = client.post(
        "/api/optimizer/rebalance",
        json={"downgrade_bank_id": "atlas", "survival_min_balances": {"atlas-eur-operating": 5_000_000.0}},
    )

    assert response.status_code == 200
    assert "atlas-eur-operating" in response.json()["survival_min_balances"]
