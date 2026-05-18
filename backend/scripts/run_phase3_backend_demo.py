from __future__ import annotations

import json

import pandas as pd

from backend.liquidity_control_tower.explainability import build_explanation
from backend.liquidity_control_tower.roi import build_roi_summary
from backend.liquidity_control_tower.stress import apply_transfer_approval, run_stress_scenario


def _approval_balances_from_stress(stress_response: dict[str, object]) -> list[dict[str, object]]:
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


def main() -> None:
    stress = run_stress_scenario(
        scenario_id="target2_outage",
        run_optimizer=True,
        downgrade_bank_id="atlas",
    )
    optimizer = stress["optimizer_recommendation"]
    gate = stress.get("approval_gate") or {}
    approval = None
    if optimizer and optimizer["status"] == "optimal" and gate.get("decision") == "approve":
        approval = apply_transfer_approval(
            balances=pd.DataFrame(_approval_balances_from_stress(stress)),
            transfers=optimizer["transfers"],
            approved_by="demo.treasury@fintech.local",
            reason="Approve TARGET2 outage rebalance recommendation",
        )
    explanation = build_explanation("target2_outage", "atlas")
    roi = build_roi_summary("target2_outage", "atlas")

    print(
        json.dumps(
            {
                "scenario_id": stress["scenario_id"],
                "scenario_name": stress["scenario_name"],
                "total_loss": stress["total_loss"],
                "expected_shortfall_99": stress["expected_shortfall_99"],
                "accounts_below_buffer": stress["accounts_below_buffer"],
                "optimizer_status": optimizer["status"] if optimizer else None,
                "optimizer_engine": optimizer["solver_engine"] if optimizer else None,
                "transfers": optimizer["transfers"] if optimizer else [],
                "approval_gate": gate,
                "approval": approval,
                "explanation_summary": explanation["summary"],
                "root_causes": explanation["root_causes"],
                "roi": roi,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
