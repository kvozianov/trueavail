import unittest

from fastapi.testclient import TestClient

from backend.liquidity_control_tower.ai_council import run_ai_council
from backend.liquidity_control_tower.api import app


class AICouncilTests(unittest.TestCase):
    def test_mock_ai_council_returns_five_advisors_peer_reviews_and_verdict(self) -> None:
        council = run_ai_council(
            scenario_id="target2_outage",
            downgrade_bank_id="atlas",
            mode="mock",
            peer_review=True,
        )

        self.assertEqual(council["mode"], "mock")
        self.assertEqual(council["provider_mode"], "mock")
        self.assertEqual(len(council["advisor_responses"]), 5)
        self.assertEqual(len(council["peer_reviews"]), 5)
        self.assertIn("## The Recommendation", council["verdict"])
        self.assertIn("expected_shortfall_99", council["formulas_used"])
        self.assertTrue(all(response["provider"] == "mock" for response in council["advisor_responses"]))

    def test_provider_mock_overrides_mixed_provider_for_fast_smoke_tests(self) -> None:
        council = run_ai_council(
            scenario_id="target2_outage",
            downgrade_bank_id="atlas",
            mode="mock",
            provider="mixed",
            peer_review=False,
        )

        self.assertEqual(council["mode"], "mock")
        self.assertEqual(council["provider_mode"], "mock")
        self.assertEqual(len(council["advisor_responses"]), 5)
        self.assertEqual(len(council["peer_reviews"]), 0)

    def test_ai_council_api_endpoint_mock_mode(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/ai-council/review",
            json={
                "scenario_id": "target2_outage",
                "downgrade_bank_id": "atlas",
                "mode": "mock",
                "peer_review": True,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["mode"], "mock")
        self.assertEqual(body["provider_mode"], "mock")
        self.assertEqual(len(body["advisor_responses"]), 5)
        self.assertEqual(len(body["peer_reviews"]), 5)
        self.assertIn("framed_question", body)

    def test_ai_council_api_accepts_provider_routing_fields(self) -> None:
        client = TestClient(app)

        response = client.post(
            "/api/ai-council/review",
            json={
                "scenario_id": "target2_outage",
                "downgrade_bank_id": "atlas",
                "mode": "mock",
                "provider": "mixed",
                "peer_review": False,
                "anthropic_model": "claude-sonnet-4-5-20250929",
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["mode"], "mock")
        self.assertEqual(body["provider_mode"], "mock")
        self.assertEqual(body["anthropic_model"], "claude-sonnet-4-5-20250929")

    def test_anthropic_model_alias_is_normalised(self) -> None:
        council = run_ai_council(
            scenario_id="target2_outage",
            downgrade_bank_id="atlas",
            mode="mock",
            peer_review=False,
            anthropic_model="claude-sonnet-4-5",
        )

        self.assertEqual(council["anthropic_model"], "claude-sonnet-4-5-20250929")


if __name__ == "__main__":
    unittest.main()
