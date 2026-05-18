from __future__ import annotations

import json

from backend.liquidity_control_tower.forecasting import run_phase1_forecast


def main() -> None:
    snapshot = run_phase1_forecast(horizon_days=14)
    first_breach = snapshot["first_breach"]
    print(json.dumps(
        {
            "generated_at": snapshot["generated_at"],
            "model_type": snapshot["model_type"],
            "model_available": snapshot["model_available"],
            "fallback_reason": snapshot["fallback_reason"],
            "feature_quality": snapshot["feature_quality"],
            "metrics": snapshot["metrics"],
            "hhi": snapshot["hhi"],
            "first_breach": first_breach,
            "forecast_points": len(snapshot["forecast"]),
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
