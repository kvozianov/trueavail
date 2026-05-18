import math
import unittest

import pandas as pd

from backend.liquidity_control_tower.features import (
    add_cyclical_time_features,
    add_mad_zscore_flags,
    calculate_ewma,
)


class Phase1FeatureTests(unittest.TestCase):
    def test_cyclical_hour_encoding_wraps_midnight(self) -> None:
        frame = pd.DataFrame(
            {
                "timestamp": [
                    "2026-05-18T00:00:00Z",
                    "2026-05-18T23:00:00Z",
                ]
            }
        )

        encoded = add_cyclical_time_features(frame)

        midnight = encoded.iloc[0]
        hour_23 = encoded.iloc[1]

        self.assertTrue(math.isclose(midnight["hour_sin"], 0.0, abs_tol=1e-9))
        self.assertTrue(math.isclose(midnight["hour_cos"], 1.0, abs_tol=1e-9))
        self.assertLess(abs(midnight["hour_sin"] - hour_23["hour_sin"]), 0.27)
        self.assertLess(abs(midnight["hour_cos"] - hour_23["hour_cos"]), 0.04)

    def test_calculate_ewma_uses_recursive_formula(self) -> None:
        values = pd.Series([100.0, 200.0, 50.0])

        ewma = calculate_ewma(values, alpha=0.25)

        self.assertEqual(ewma.tolist(), [100.0, 125.0, 106.25])

    def test_mad_zscore_flags_large_robust_outlier(self) -> None:
        normal_values = [100.0, 102.0, 98.0, 101.0, 99.0, 103.0, 97.0, 100.0, 101.0, 99.0]
        frame = pd.DataFrame(
            {
                "account_id": ["a"] * 11,
                "currency": ["EUR"] * 11,
                "net_flow": normal_values + [1_000.0],
            }
        )

        result = add_mad_zscore_flags(frame, window=10, threshold=4)

        self.assertTrue(bool(result.iloc[-1]["is_anomaly_mad"]))
        self.assertGreater(result.iloc[-1]["mad_zscore"], 4)


if __name__ == "__main__":
    unittest.main()
