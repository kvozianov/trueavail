from __future__ import annotations

import json

from backend.liquidity_control_tower.optimizer import solve_liquidity_rebalance


def main() -> None:
    snapshot = solve_liquidity_rebalance(downgrade_bank_id="atlas")
    print(
        json.dumps(
            {
                "status": snapshot["status"],
                "solver_engine": snapshot["solver_engine"],
                "total_transfer_cost": snapshot["total_transfer_cost"],
                "hhi_before": snapshot["hhi_before"],
                "hhi_after": snapshot["hhi_after"],
                "bank_exposure_limits": snapshot["bank_exposure_limits"],
                "audit_events": snapshot["audit_events"],
                "transfers": snapshot["transfers"],
                "infeasible_reason": snapshot["infeasible_reason"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
