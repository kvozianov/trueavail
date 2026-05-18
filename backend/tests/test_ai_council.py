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
        self.assertEqual(len(council["advisor_responses"]), 5)
        self.assertEqual(len(council["peer_reviews"]), 5)
        self.assertIn("## The Recommendation", council["verdict"])
        self.assertIn("expected_shortfall_99", council["formulas_used"])

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
        self.assertEqual(len(body["advisor_responses"]), 5)
        self.assertEqual(len(body["peer_reviews"]), 5)
        self.assertIn("framed_question", body)


if __name__ == "__main__":
    unittest.main()
