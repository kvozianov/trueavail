import unittest
import warnings

from fastapi.testclient import TestClient

from backend.liquidity_control_tower.api import app
from backend.liquidity_control_tower.data_loader import load_demo_data
from backend.liquidity_control_tower.optimizer import (
    apply_ccri_downgrade,
    solve_liquidity_rebalance,
)
from backend.liquidity_control_tower.risk import calculate_hhi

warnings.filterwarnings("ignore", message="Constructing LpVariable", category=DeprecationWarning)


class Phase2OptimizerTests(unittest.TestCase):
    def test_hhi_alert_uses_balance_concentration_formula(self) -> None:
        data = load_demo_data()

        hhi = calculate_hhi(data["balances"])

        self.assertGreater(hhi["value"], 0.25)
        self.assertTrue(hhi["alert"])
        self.assertIn("atlas", hhi["contributions"])

    def test_ccri_downgrade_reduces_max_exposure_share(self) -> None:
        data = load_demo_data()

        adjusted, audit_events = apply_ccri_downgrade(data["bank_risk_scores"], "atlas", 25)

        atlas = adjusted.loc[adjusted["bank_id"] == "atlas"].iloc[0]
        self.assertEqual(float(atlas["ccri_score"]), 57.0)
        self.assertEqual(float(atlas["max_exposure_share"]), 0.24)
        self.assertEqual(audit_events[0]["event_type"], "bank_rating_downgrade")

    def test_optimizer_moves_funds_after_downgrade(self) -> None:
        result = solve_liquidity_rebalance(downgrade_bank_id="atlas")

        self.assertEqual(result["status"], "optimal")
        self.assertGreater(len(result["transfers"]), 0)
        self.assertEqual(result["transfers"][0]["source_bank_id"], "atlas")
        self.assertGreater(result["total_transfer_cost"], 0)

        for balance in result["post_transfer_balances"]:
            self.assertGreaterEqual(
                balance["settled_balance"] + 1e-6,
                balance["required_buffer"],
            )

    def test_optimizer_returns_infeasible_when_no_free_liquidity(self) -> None:
        data = load_demo_data()
        balances = data["balances"].copy()
        balances["settled_balance"] = balances["required_buffer"]

        result = solve_liquidity_rebalance(
            balances=balances,
            downgrade_bank_id="atlas",
        )

        self.assertEqual(result["status"], "infeasible")
        self.assertIsNotNone(result["infeasible_reason"])

    def test_optimizer_survival_floor_blocks_draining_forecast_breach_account(self) -> None:
        data = load_demo_data()
        atlas_balance = float(
            data["balances"].loc[
                data["balances"]["account_id"] == "atlas-eur-operating",
                "settled_balance",
            ].iloc[0]
        )

        result = solve_liquidity_rebalance(
            downgrade_bank_id="atlas",
            survival_min_balances={"atlas-eur-operating": atlas_balance + 2_000_000.0},
        )

        self.assertEqual(result["status"], "infeasible")
        self.assertIn("atlas-eur-operating", result["survival_min_balances"])
        self.assertIsNotNone(result["infeasible_reason"])

    def test_optimizer_api_endpoint(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/optimizer/rebalance",
            json={"downgrade_bank_id": "atlas", "downgrade_score_delta": 25},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "optimal")
        self.assertGreater(len(body["transfers"]), 0)

    def test_optimizer_api_accepts_survival_min_balances(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/optimizer/rebalance",
            json={
                "downgrade_bank_id": "atlas",
                "survival_min_balances": {"atlas-eur-operating": 5_000_000.0},
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("atlas-eur-operating", body["survival_min_balances"])


if __name__ == "__main__":
    unittest.main()
