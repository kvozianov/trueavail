"""Run the rolling-origin backtest on the default synthetic dataset and print the summary.

Run from backend/:  python -m scripts.run_backtest
"""

from __future__ import annotations

import json

from trueavail.backtest import run_backtest
from trueavail.data import generate_synthetic_dataset


def main() -> None:
    result = run_backtest(generate_synthetic_dataset())
    print(json.dumps({k: result[k] for k in ("summary", "rows_evaluated", "folds_detail", "elapsed_seconds")}, indent=2))
    print("h  pinball_p50  baseline_p50  coverage_90")
    for row in result["per_horizon"]:
        print(f"{row['h']:>2} {row['pinball_p50']:>12,.0f} {row['baseline_pinball_p50']:>13,.0f} {row['coverage_90']:>11.2f}")


if __name__ == "__main__":
    main()
