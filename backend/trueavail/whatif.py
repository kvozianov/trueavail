"""What-if: edit scheduled flows, rerun forecast + alerts, compare before/after.

Adjustment semantics (applied in order):
- ``flow_id`` of an existing flow + ``remove: true``  -> the flow is dropped;
- ``flow_id`` of an existing flow                    -> its account/date/amount/direction are
  replaced by the adjustment's values, then ``shift_days`` moves the expected date;
- no ``flow_id`` (or an unknown one)                 -> a new flow is added.
Effective (settlement) dates are recomputed with the rail rules. The trained model is reused:
it depends on history only, so the scenario differs from the baseline only through flows.
"""

from __future__ import annotations

import pandas as pd

from .alerts import build_alerts, flat_alerts
from .data import Dataset, effective_date_for, load_reference_data
from .forecasting import run_forecast


class AdjustmentError(ValueError):
    pass


def apply_adjustments(dataset: Dataset, adjustments: list[dict[str, object]]) -> pd.DataFrame:
    ref = load_reference_data()
    accounts = dataset.accounts().set_index("account_id")
    flows = {row["flow_id"]: dict(row) for row in dataset.scheduled.to_dict("records")}
    default_rail = {"EUR": "SEPA", "USD": "SWIFT", "GBP": "Local Bank Transfer"}

    for index, adj in enumerate(adjustments):
        flow_id = adj.get("flow_id")
        account_id = str(adj["account_id"])
        if account_id not in accounts.index:
            raise AdjustmentError(f"adjustment {index}: unknown account_id {account_id!r}")
        if adj.get("remove"):
            if not flow_id or flow_id not in flows:
                raise AdjustmentError(f"adjustment {index}: cannot remove unknown flow_id {flow_id!r}")
            del flows[flow_id]
            continue
        amount = float(adj["amount"])
        if amount <= 0:
            raise AdjustmentError(f"adjustment {index}: amount must be positive")
        direction = str(adj["direction"])
        if direction not in ("inflow", "outflow"):
            raise AdjustmentError(f"adjustment {index}: direction must be inflow or outflow")
        expected = pd.Timestamp(str(adj["expected_date"])) + pd.Timedelta(days=int(adj.get("shift_days") or 0))
        currency = str(accounts.loc[account_id, "currency"])
        existing = flows.get(flow_id) if flow_id else None
        rail = str(existing["rail"]) if existing else default_rail.get(currency, "SEPA")
        new_id = flow_id or f"whatif-{index + 1}"
        flows[new_id] = {
            "flow_id": new_id,
            "account_id": account_id,
            "currency": currency,
            "amount": amount,
            "direction": direction,
            "expected_date": expected.strftime("%Y-%m-%d"),
            "rail": rail,
            "description": str(existing["description"]) if existing else "what-if flow",
        }
        flows[new_id]["effective_date"] = effective_date_for(
            flows[new_id]["expected_date"], direction, rail, ref["settlement_rules"], ref["holidays"]
        )

    columns = list(dataset.scheduled.columns)
    frame = pd.DataFrame(list(flows.values()), columns=columns)
    frame["amount"] = frame["amount"].astype(float)
    return frame


def _alert_key(alert: dict[str, object]) -> tuple[str, str, str]:
    return (str(alert["account_id"]), str(alert["currency"]), str(alert["date"]))


def run_whatif(
    dataset: Dataset,
    adjustments: list[dict[str, object]],
    horizon_days: int = 14,
    quantile: str = "p05",
) -> dict[str, object]:
    scenario_flows = apply_adjustments(dataset, adjustments)
    baseline = run_forecast(dataset, horizon_days=horizon_days)
    scenario = run_forecast(dataset, horizon_days=horizon_days, scheduled=scenario_flows)
    before = flat_alerts(build_alerts(baseline, quantile))
    after = flat_alerts(build_alerts(scenario, quantile))
    before_keys = {_alert_key(alert) for alert in before}
    after_keys = {_alert_key(alert) for alert in after}
    return {
        "baseline": baseline,
        "scenario": scenario,
        "alerts_before": before,
        "alerts_after": after,
        "delta": {
            "gaps_removed": len(before_keys - after_keys),
            "gaps_added": len(after_keys - before_keys),
            "worst_gap_before": max((float(a["gap_amount"]) for a in before), default=0.0),
            "worst_gap_after": max((float(a["gap_amount"]) for a in after), default=0.0),
        },
    }
