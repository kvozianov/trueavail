import unittest

from backend.liquidity_control_tower.forecasting import run_phase1_forecast


class Phase1ForecastTests(unittest.TestCase):
    def test_phase1_forecast_returns_quantile_corridor_and_risk(self) -> None:
        snapshot = run_phase1_forecast(horizon_days=7)

        self.assertTrue(snapshot["model_available"])
        self.assertIn("ewma_volatility_baseline", snapshot["model_components"])
        self.assertAlmostEqual(sum(snapshot["model_weights"].values()), 1.0, places=6)
        self.assertGreater(snapshot["feature_quality"]["rows_trainable"], 100)
        self.assertGreater(snapshot["feature_quality"]["anomaly_rows"], 0)
        self.assertGreater(snapshot["feature_quality"]["known_event_rows"], 0)
        self.assertGreater(len(snapshot["known_events"]), 0)
        self.assertGreater(len(snapshot["anomaly_flags"]), 0)
        self.assertGreater(snapshot["metrics"]["backtest_windows"], 100)
        self.assertGreaterEqual(snapshot["metrics"]["band_coverage"], 0)
        self.assertLessEqual(snapshot["metrics"]["band_coverage"], 1)
        self.assertTrue(snapshot["hhi"]["alert"])
        self.assertIsNotNone(snapshot["first_breach"])

        first_point = snapshot["forecast"][0]

        self.assertIn("balance_p05", first_point)
        self.assertIn("balance_p50", first_point)
        self.assertIn("balance_p95", first_point)
        self.assertIn("known_events", first_point)
        self.assertLessEqual(first_point["balance_p05"], first_point["balance_p50"])
        self.assertLessEqual(first_point["balance_p50"], first_point["balance_p95"])

        first_breach = snapshot["first_breach"]
        self.assertTrue(first_breach["known_events"])
        self.assertTrue(
            any(event["event_type"] == "merchant_payout_cycle" for event in first_breach["known_events"])
        )

    def test_phase1_forecast_can_force_non_lightgbm_fallback(self) -> None:
        snapshot = run_phase1_forecast(horizon_days=3, prefer_lightgbm=False)

        self.assertEqual(snapshot["model_type"], "ewma-volatility-fallback")
        self.assertFalse(snapshot["model_available"])
        self.assertEqual(snapshot["fallback_reason"], "prefer_lightgbm=false")
        self.assertEqual(snapshot["model_components"], ["ewma_volatility_baseline"])
        self.assertEqual(snapshot["model_weights"], {"ewma_volatility_baseline": 1.0})


if __name__ == "__main__":
    unittest.main()
