from trueavail.governance import validate_recommendation_gate
from trueavail.stress import (
    apply_transfer_approval,
    calculate_expected_shortfall_99,
    run_stress_scenario,
)
from trueavail.data import STORE
from trueavail.optimizer import solve_liquidity_rebalance


def test_expected_shortfall_uses_worst_one_percent_tail() -> None:
    es99 = calculate_expected_shortfall_99([float(value) for value in range(1, 101)])

    assert es99["tail_count"] == 1
    assert es99["value"] == 100.0


def test_bank_run_stress_applies_coefficients_and_es99() -> None:
    stress = run_stress_scenario("bank_run", run_optimizer=False)

    assert stress["scenario_id"] == "bank_run"
    assert stress["total_loss"] > 0
    assert stress["expected_shortfall_99"]["value"] > stress["total_loss"]
    assert len(stress["coefficients"]) == 5


def test_target2_stress_with_downgrade_returns_infeasible_survival_conflict() -> None:
    stress = run_stress_scenario("target2_outage", run_optimizer=True, downgrade_bank_id="atlas")
    optimizer = stress["optimizer_recommendation"]

    assert optimizer is not None
    assert optimizer["status"] == "infeasible"
    assert optimizer["transfers"] == []
    assert "atlas-eur-operating" in optimizer["survival_min_balances"]
    assert stress["approval_gate"]["decision"] == "reject"
    assert stress["approval_gate"]["blockers"]


def test_governance_gate_rejects_transfer_that_drains_breached_account() -> None:
    forecast = {"forecast": [{"account_id": "atlas-eur-operating", "usable_liquidity_p05": -2_000_000.0}]}
    optimizer = {
        "status": "optimal",
        "transfers": [
            {
                "source_account_id": "atlas-eur-operating",
                "destination_account_id": "nova-eur-reserve",
                "source_bank_id": "atlas",
                "destination_bank_id": "nova",
                "currency": "EUR",
                "amount": 100_000.0,
            }
        ],
    }

    gate = validate_recommendation_gate(
        scenario_id="target2_outage",
        optimizer_response=optimizer,
        forecast=forecast,
        hhi_after_stress={"value": 0.35, "threshold": 0.25, "alert": True},
        accounts_below_buffer=[],
    )

    assert gate["decision"] == "reject"
    assert gate["net_transfer_impact_by_account"]["atlas-eur-operating"] < 0


def test_transfer_application_updates_balances_and_audit_log() -> None:
    optimizer = solve_liquidity_rebalance(downgrade_bank_id="atlas")

    applied = apply_transfer_approval(
        balances=STORE.get().accounts(),
        transfers=optimizer["transfers"],
        approved_by="unit-test",
        reason="simulation only",
    )

    assert applied["total_transfer_amount"] > 0
    assert len(applied["audit_log"]) == len(optimizer["transfers"])


def test_stress_api_endpoint(client) -> None:
    response = client.post(
        "/api/stress/run",
        json={"scenario_id": "target2_outage", "run_optimizer": True, "downgrade_bank_id": "atlas"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["scenario_id"] == "target2_outage"
    assert body["optimizer_recommendation"]["status"] == "infeasible"
    assert body["approval_gate"]["decision"] == "reject"


def test_openapi_lists_spec_endpoints(client) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    for path in (
        "/health",
        "/api/accounts",
        "/api/data/generate",
        "/api/data/upload",
        "/api/data/history",
        "/api/data/scheduled",
        "/api/forecast/run",
        "/api/alerts",
        "/api/backtest/run",
        "/api/whatif/run",
        "/api/stress/run",
        "/api/optimizer/rebalance",
    ):
        assert path in paths
