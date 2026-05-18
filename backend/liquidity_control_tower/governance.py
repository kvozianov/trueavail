from __future__ import annotations

from typing import Any


GOVERNANCE_FORMULAS = {
    "net_transfer_impact": "net_impact(account) = inflows_to_account - outflows_from_account",
    "forecast_gap": "gap_p05(account) = max(0, -min_t usable_liquidity_p05(t, account))",
    "approval_gate": "approve only if optimizer is optimal, p05 breach is not worsened, HHI is within policy, and rails are feasible",
    "target2_feasibility": "TARGET2 outage blocks automatic approval for interbank EUR routes without fallback rail confirmation",
}


def _forecast_gaps_by_account(forecast: dict[str, Any] | None) -> dict[str, float]:
    if not forecast:
        return {}

    gaps: dict[str, float] = {}
    for point in forecast.get("forecast", []):
        account_id = str(point["account_id"])
        usable = float(point.get("usable_liquidity_p05", 0.0))
        gaps[account_id] = max(gaps.get(account_id, 0.0), max(0.0, -usable))
    return gaps


def _net_transfer_impact(transfers: list[dict[str, Any]]) -> dict[str, float]:
    impact: dict[str, float] = {}
    for transfer in transfers:
        amount = float(transfer["amount"])
        source = str(transfer["source_account_id"])
        destination = str(transfer["destination_account_id"])
        impact[source] = impact.get(source, 0.0) - amount
        impact[destination] = impact.get(destination, 0.0) + amount
    return impact


def validate_recommendation_gate(
    *,
    scenario_id: str,
    optimizer_response: dict[str, Any] | None,
    forecast: dict[str, Any] | None,
    hhi_after_stress: dict[str, Any],
    accounts_below_buffer: list[str],
) -> dict[str, Any]:
    """Governance layer that decides whether the MIP output is safe to auto-recommend."""

    warnings: list[str] = []
    blockers: list[str] = []
    required_next_actions: list[str] = []

    if not optimizer_response:
        blockers.append("No optimizer output is available for governance validation.")
        required_next_actions.append("Run the optimizer before approving a treasury action.")
        return {
            "decision": "reject",
            "can_auto_approve": False,
            "severity": "red",
            "blockers": blockers,
            "warnings": warnings,
            "required_next_actions": required_next_actions,
            "checked_formulas": GOVERNANCE_FORMULAS,
        }

    status = str(optimizer_response.get("status"))
    transfers = list(optimizer_response.get("transfers", []))
    impact = _net_transfer_impact(transfers)
    forecast_gaps = _forecast_gaps_by_account(forecast)

    if status != "optimal":
        blockers.append(f"Optimizer status is {status}, not optimal.")
        required_next_actions.append("Resolve infeasibility or switch to contingency liquidity actions.")

    if accounts_below_buffer:
        warnings.append(
            "Stress test has accounts below static required buffer: "
            + ", ".join(sorted(accounts_below_buffer))
            + "."
        )

    drained_breaches: list[dict[str, float | str]] = []
    unfunded_breaches: list[dict[str, float | str]] = []
    for account_id, gap in forecast_gaps.items():
        if gap <= 0:
            continue
        net = float(impact.get(account_id, 0.0))
        if net < 0:
            drained_breaches.append(
                {"account_id": account_id, "forecast_gap_p05": gap, "net_transfer_impact": net}
            )
        elif net <= 0:
            unfunded_breaches.append(
                {"account_id": account_id, "forecast_gap_p05": gap, "net_transfer_impact": net}
            )

    if drained_breaches:
        formatted = ", ".join(
            f"{item['account_id']} gap {float(item['forecast_gap_p05']):,.0f}, "
            f"net impact {float(item['net_transfer_impact']):,.0f}"
            for item in drained_breaches
        )
        blockers.append(
            "Optimizer transfer drains an account with a p05 forecast breach: " + formatted + "."
        )
        required_next_actions.append(
            "Reverse the liquidity direction, fund the breached account, or mark the plan as infeasible."
        )
    elif unfunded_breaches:
        formatted = ", ".join(
            f"{item['account_id']} gap {float(item['forecast_gap_p05']):,.0f}"
            for item in unfunded_breaches
        )
        warnings.append(
            "Forecast breach is not directly funded by the selected transfers: " + formatted + "."
        )
        required_next_actions.append("Attach a funding or payment-throttling plan for the p05 breach.")

    if bool(hhi_after_stress.get("alert")):
        warnings.append(
            f"HHI after stress is {float(hhi_after_stress['value']):.3f}, above "
            f"threshold {float(hhi_after_stress['threshold']):.2f}."
        )
        required_next_actions.append("Show residual concentration risk and do not claim full de-risking.")

    interbank_eur_routes = [
        transfer
        for transfer in transfers
        if str(transfer.get("currency")) == "EUR"
        and str(transfer.get("source_bank_id")) != str(transfer.get("destination_bank_id"))
    ]
    if scenario_id == "target2_outage" and interbank_eur_routes:
        warnings.append(
            "TARGET2 outage scenario contains interbank EUR routes; settlement feasibility needs fallback rail confirmation."
        )
        required_next_actions.append(
            "Require treasury confirmation of on-us movement, prefunding, intraday credit, or fallback rail before approval."
        )

    if blockers:
        decision = "reject"
        severity = "red"
    elif warnings:
        decision = "manual_review"
        severity = "yellow"
    else:
        decision = "approve"
        severity = "green"

    return {
        "decision": decision,
        "can_auto_approve": decision == "approve",
        "severity": severity,
        "blockers": blockers,
        "warnings": warnings,
        "required_next_actions": list(dict.fromkeys(required_next_actions)),
        "forecast_gaps_by_account": forecast_gaps,
        "net_transfer_impact_by_account": impact,
        "checked_formulas": GOVERNANCE_FORMULAS,
    }
