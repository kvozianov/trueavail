import math

import pandas as pd

from trueavail.features import (
    add_cyclical_time_features,
    add_known_event_features,
    add_mad_zscore_flags,
    calculate_ewma,
)


def test_cyclical_hour_encoding_wraps_midnight() -> None:
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

    assert math.isclose(midnight["hour_sin"], 0.0, abs_tol=1e-9)
    assert math.isclose(midnight["hour_cos"], 1.0, abs_tol=1e-9)
    assert abs(midnight["hour_sin"] - hour_23["hour_sin"]) < 0.27
    assert abs(midnight["hour_cos"] - hour_23["hour_cos"]) < 0.04


def test_calculate_ewma_uses_recursive_formula() -> None:
    values = pd.Series([100.0, 200.0, 50.0])

    ewma = calculate_ewma(values, alpha=0.25)

    assert ewma.tolist() == [100.0, 125.0, 106.25]


def test_mad_zscore_flags_large_robust_outlier() -> None:
    normal_values = [100.0, 102.0, 98.0, 101.0, 99.0, 103.0, 97.0, 100.0, 101.0, 99.0]
    frame = pd.DataFrame(
        {
            "account_id": ["a"] * 11,
            "currency": ["EUR"] * 11,
            "net_flow": normal_values + [1_000.0],
        }
    )

    result = add_mad_zscore_flags(frame, window=10, threshold=4)

    assert bool(result.iloc[-1]["is_anomaly_mad"])
    assert result.iloc[-1]["mad_zscore"] > 4


def test_known_event_features_attach_calendar_events_to_matching_account() -> None:
    frame = pd.DataFrame(
        [
            {
                "timestamp": "2026-05-19T12:00:00Z",
                "account_id": "atlas-eur-operating",
                "bank_id": "atlas",
                "currency": "EUR",
            }
        ]
    )
    events = pd.DataFrame(
        [
            {
                "event_date": "2026-05-19",
                "event_type": "merchant_payout_cycle",
                "account_id": "atlas-eur-operating",
                "bank_id": "atlas",
                "currency": "EUR",
                "impact_direction": "outflow",
                "expected_amount": 4_100_000.0,
            }
        ]
    )

    result = add_known_event_features(frame, events)

    assert int(result.iloc[0]["known_event_count"]) == 1
    assert float(result.iloc[0]["known_event_expected_net_flow"]) == -4_100_000.0
    assert int(result.iloc[0]["event_merchant_payout_cycle"]) == 1

