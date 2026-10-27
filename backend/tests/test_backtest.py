import numpy as np
import pandas as pd
import pytest

from trueavail.backtest import fold_origins, interval_coverage, pinball_loss, run_backtest, seasonal_naive_paths
from trueavail.data import STORE, generate_synthetic_dataset


def test_pinball_loss_sanity() -> None:
    y = np.array([10.0, 20.0, 30.0])

    assert pinball_loss(y, y, 0.05) == 0.0
    # q=0.5 is half the absolute error
    assert pinball_loss(y, y + 4, 0.5) == pytest.approx(2.0)
    # q=0.05: under-prediction costs 0.05 per unit, over-prediction 0.95 per unit
    assert pinball_loss(np.array([10.0]), np.array([0.0]), 0.05) == pytest.approx(0.5)
    assert pinball_loss(np.array([10.0]), np.array([20.0]), 0.05) == pytest.approx(9.5)
    assert pinball_loss(np.array([10.0]), np.array([20.0]), 0.95) == pytest.approx(0.5)


def test_interval_coverage_bounds() -> None:
    y = np.array([1.0, 2.0, 3.0, 4.0])
    assert interval_coverage(y, y - 1, y + 1) == 1.0
    assert interval_coverage(y, y + 1, y + 2) == 0.0
    assert interval_coverage(y, np.array([0, 0, 5, 5]), np.array([9, 9, 9, 9])) == 0.5


def test_seasonal_naive_repeats_last_week_cumulatively() -> None:
    dates = pd.date_range("2026-01-01", periods=14, freq="D").strftime("%Y-%m-%d")
    flows = np.arange(14, dtype=float)
    history = pd.DataFrame(
        {"date": dates, "account_id": "a", "net_flow": flows, "ending_balance": 1000 + np.cumsum(flows)}
    )

    paths = seasonal_naive_paths(history, dates[-1], horizon_days=9)

    last_balance = float(history["ending_balance"].iloc[-1])
    last_week = flows[-7:]
    expected = last_balance + np.cumsum([last_week[(h - 1) % 7] for h in range(1, 10)])
    assert np.allclose(paths["baseline_balance"].to_numpy(), expected)
    assert paths["date"].iloc[0] == "2026-01-15"


def test_fold_origins_and_insufficient_history() -> None:
    dataset = generate_synthetic_dataset()
    origins = fold_origins(dataset, horizon_days=14, folds=6, step_days=7)

    assert origins[-1] == "2026-05-04"
    assert origins[0] == "2026-03-30"
    with pytest.raises(ValueError):
        fold_origins(generate_synthetic_dataset(history_days=40), horizon_days=14, folds=6, step_days=7)


def test_backtest_on_default_dataset() -> None:
    result = run_backtest(STORE.get(), horizon_days=14, folds=6, step_days=7)

    assert result["baseline"] == "seasonal_naive_7d"
    assert result["rows_evaluated"] == 6 * 5 * 14
    assert len(result["per_horizon"]) == 14
    assert [f["test_end"] for f in result["folds_detail"]][-1] == "2026-05-18"
    for row in result["per_horizon"]:
        assert 0.0 <= row["coverage_90"] <= 1.0
        assert row["pinball_p50"] == pytest.approx(row["mae_p50"] / 2)
        assert row["baseline_pinball_p50"] == pytest.approx(row["baseline_mae"] / 2)
        assert row["baseline_mae"] > 0
    summary = result["summary"]
    expected_improvement = (
        (summary["baseline_mean_pinball_p50"] - summary["mean_pinball_p50"]) / summary["baseline_mean_pinball_p50"] * 100
    )
    assert summary["improvement_pct"] == pytest.approx(expected_improvement)
    assert summary["target_coverage"] == 0.9
    assert result["model"]["profile"] == "full"
    assert result["elapsed_seconds"] < 60


def test_backtest_endpoint(client) -> None:
    response = client.post("/api/backtest/run", json={"horizon_days": 7, "folds": 2, "step_days": 7})

    assert response.status_code == 200
    body = response.json()
    assert body["folds"] == 2
    assert len(body["per_horizon"]) == 7
    assert set(body["summary"]) >= {
        "mean_pinball_p50",
        "baseline_mean_pinball_p50",
        "improvement_pct",
        "mean_coverage_90",
        "target_coverage",
    }
    assert client.post("/api/backtest/run", json={"folds": 12, "step_days": 30}).status_code == 422
