import unittest
import warnings

import pandas as pd
from fastapi.testclient import TestClient

from backend.liquidity_control_tower.api import app
from backend.liquidity_control_tower.contingency import build_contingency_plan
from backend.liquidity_control_tower.data_loader import load_demo_data
from backend.liquidity_control_tower.explainability import build_explanation
from backend.liquidity_control_tower.governance import validate_recommendation_gate
from backend.liquidity_control_tower.optimizer import solve_liquidity_rebalance
from backend.liquidity_control_tower.roi import build_roi_summary
from backend.liquidity_control_tower.stress import (
    apply_transfer_approval,
    calculate_expected_shortfall_99,
    run_stress_scenario,
)

warnings.filterwarnings("ignore", message="Constructing LpVariable", category=DeprecationWarning)


def approval_balances_from_stress(stress_response: dict[str, object]) -> list[dict[str, object]]:
    return [
        {
            "account_id": row["account_id"],
            "bank_id": row["bank_id"],
            "bank_name": row["bank_name"],
            "currency": row["currency"],
            "settled_balance": row["balance_after"],
            "required_buffer": row["required_buffer"],
        }
        for row in stress_response["balances"]
    ]


class Phase3BackendFlowTests(unittest.TestCase):
    def test_expected_shortfall_uses_worst_one_percent_tail(self) -> None:
        losses = [float(value) for value in range(1, 101)]

        es99 = calculate_expected_shortfall_99(losses)

        self.assertEqual(es99["tail_count"], 1)
        self.assertEqual(es99["value"], 100.0)

    def test_bank_run_stress_applies_coefficients_and_es99(self) -> None:
        stress = run_stress_scenario("bank_run", run_optimizer=False)

        self.assertEqual(stress["scenario_id"], "bank_run")
        self.assertGreater(stress["total_loss"], 0)
        self.assertGreater(stress["expected_shortfall_99"]["value"], stress["total_loss"])
        self.assertEqual(len(stress["coefficients"]), 5)

    def test_target2_stress_with_downgrade_returns_infeasible_survival_conflict(self) -> None:
        stress = run_stress_scenario(
            "target2_outage",
            run_optimizer=True,
            downgrade_bank_id="atlas",
        )
        optimizer = stress["optimizer_recommendation"]

        self.assertIsNotNone(optimizer)
        self.assertEqual(optimizer["status"], "infeasible")
        self.assertEqual(len(optimizer["transfers"]), 0)
        self.assertIn("atlas-eur-operating", optimizer["survival_min_balances"])
        self.assertEqual(stress["approval_gate"]["decision"], "reject")
        self.assertTrue(stress["approval_gate"]["blockers"])

    def test_governance_gate_rejects_transfer_that_drains_breached_account(self) -> None:
        forecast = {
            "forecast": [
                {
                    "account_id": "atlas-eur-operating",
                    "usable_liquidity_p05": -2_000_000.0,
                }
            ]
        }
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

        self.assertEqual(gate["decision"], "reject")
        self.assertLess(gate["net_transfer_impact_by_account"]["atlas-eur-operating"], 0)

    def test_approval_applies_transfer_and_creates_audit_log(self) -> None:
        data = load_demo_data()
        optimizer = solve_liquidity_rebalance(downgrade_bank_id="atlas")

        approval = apply_transfer_approval(
            balances=data["balances"],
            transfers=optimizer["transfers"],
            approved_by="treasury@example.com",
            reason="unit test approval",
        )

        self.assertTrue(approval["approved"])
        self.assertGreater(approval["total_transfer_amount"], 0)
        self.assertEqual(len(approval["audit_log"]), len(optimizer["transfers"]))

    def test_stress_api_endpoint(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/stress/run",
            json={
                "scenario_id": "target2_outage",
                "run_optimizer": True,
                "downgrade_bank_id": "atlas",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["scenario_id"], "target2_outage")
        self.assertEqual(body["optimizer_recommendation"]["status"], "infeasible")
        self.assertEqual(body["approval_gate"]["decision"], "reject")

    def test_approval_api_endpoint(self) -> None:
        data = load_demo_data()
        optimizer = solve_liquidity_rebalance(downgrade_bank_id="atlas")
        client = TestClient(app)

        response = client.post(
            "/api/recommendation/approve",
            json={
                "balances": data["balances"].to_dict("records"),
                "transfers": optimizer["transfers"],
                "approved_by": "treasury@example.com",
                "reason": "API approval test",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["approved"])
        self.assertGreater(body["total_transfer_amount"], 0)
        self.assertEqual(len(body["audit_log"]), len(optimizer["transfers"]))

    def test_demo_snapshot_endpoint(self) -> None:
        client = TestClient(app)

        response = client.get("/api/demo/snapshot")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("forecast", body)
        self.assertIn("bank_run", body["stress_scenarios"])
        self.assertIn("target2_outage", body["stress_scenarios"])
        self.assertIn("explanation", body)
        self.assertIn("roi", body)
        self.assertIn("contingency", body)

    def test_demo_metadata_endpoint(self) -> None:
        client = TestClient(app)

        response = client.get("/api/demo/metadata")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["product"], "Liquidity Control Tower")
        self.assertEqual(body["demo_history_seed"], 42)
        self.assertEqual(body["math_parameters"]["forecast_quantiles"], [0.05, 0.5, 0.95])
        self.assertIn("GET /api/demo/snapshot", body["ui_ready_endpoints"])

    def test_openapi_contract_contains_ui_handoff_endpoints(self) -> None:
        client = TestClient(app)

        response = client.get("/openapi.json")

        self.assertEqual(response.status_code, 200)
        paths = response.json()["paths"]
        for path in (
            "/api/demo/snapshot",
            "/api/demo/metadata",
            "/api/forecast/run",
            "/api/stress/run",
            "/api/optimizer/rebalance",
            "/api/explainability/summary",
            "/api/roi/summary",
            "/api/contingency/plan",
            "/api/ai-council/review",
        ):
            self.assertIn(path, paths)

    def test_contingency_plan_returns_actions_when_optimizer_is_infeasible(self) -> None:
        plan = build_contingency_plan("target2_outage", "atlas")

        self.assertEqual(plan["plan_status"], "contingency_required")
        self.assertEqual(plan["optimizer_status"], "infeasible")
        self.assertGreater(plan["total_p05_gap"], 0)
        self.assertGreater(len(plan["actions"]), 0)
        self.assertTrue(
            any(action["action_type"] == "prefund_breached_account" for action in plan["actions"])
        )
        self.assertTrue(any(action["action_type"] == "payment_throttle" for action in plan["actions"]))
        self.assertIn("credit_line_need", plan["formulas"])

    def test_contingency_api_endpoint(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/contingency/plan",
            json={"scenario_id": "target2_outage", "downgrade_bank_id": "atlas"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["plan_status"], "contingency_required")
        self.assertGreater(body["total_p05_gap"], 0)
        self.assertGreater(len(body["actions"]), 0)

    def test_explainability_summary_contains_root_causes_and_formulas(self) -> None:
        explanation = build_explanation("target2_outage", "atlas")

        self.assertEqual(explanation["risk_status"], "Red")
        self.assertGreaterEqual(len(explanation["root_causes"]), 4)
        self.assertGreaterEqual(len(explanation["timeline"]), 4)
        self.assertTrue(
            any(card["key"] == "expected_shortfall_99" for card in explanation["formula_cards"])
        )

    def test_explainability_api_endpoint(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/explainability/summary",
            json={"scenario_id": "target2_outage", "downgrade_bank_id": "atlas"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["risk_status"], "Red")
        self.assertGreater(len(body["formula_cards"]), 0)

    def test_roi_summary_contains_cfo_metrics(self) -> None:
        roi = build_roi_summary("target2_outage", "atlas")

        self.assertGreater(roi["expected_shortfall_99"], 0)
        self.assertGreater(roi["avoided_liquidity_gap"], 0)
        self.assertGreater(roi["released_idle_reserve"], 0)
        self.assertEqual(roi["approval_gate"]["decision"], "reject")
        self.assertTrue(any(metric["label"] == "Optimizer transfer cost" for metric in roi["metrics"]))

    def test_roi_api_endpoint(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/roi/summary",
            json={"scenario_id": "target2_outage", "downgrade_bank_id": "atlas"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreaterEqual(body["optimizer_cost"], 0)
        self.assertIn("released_idle_reserve", body)
        self.assertEqual(body["approval_gate"]["decision"], "reject")


if __name__ == "__main__":
    unittest.main()
