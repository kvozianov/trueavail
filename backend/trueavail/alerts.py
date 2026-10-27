"""Cash-gap alerts derived from a ForecastResponse.

Per-account alert: a forecast day on which the chosen quantile balance is below the account's
required buffer. Consolidated alert: the same test on the sum of all accounts in one currency
(no FX conversion is applied, so consolidation is per currency). Summing per-account P05
balances is conservative: it assumes the pessimistic outcomes coincide across accounts.

Severity: red if gap_amount > 10 % of the required buffer, otherwise amber.
Drivers: the largest scheduled outflows settling between the as-of date and the alert date.
"""

from __future__ import annotations

from collections import defaultdict

from .config import RED_GAP_SHARE_OF_BUFFER

QUANTILE_FIELDS = {"p05": "balance_p05", "p50": "balance_p50", "p95": "balance_p95"}
MAX_DRIVERS = 3


def severity_for(gap_amount: float, required_buffer: float) -> str:
    return "red" if gap_amount > RED_GAP_SHARE_OF_BUFFER * required_buffer else "amber"


def _fmt_amount(value: float) -> str:
    return f"{value:,.0f}"


def _drivers(events: list[tuple[str, str, dict[str, object]]], until: str, currency: str) -> list[str]:
    """events: (date, account_id, event). Top scheduled outflows dated <= until."""
    outflows = [
        (date, account_id, event)
        for date, account_id, event in events
        if date <= until and event["direction"] == "outflow"
    ]
    outflows.sort(key=lambda item: -float(item[2]["amount"]))
    drivers = [
        f"{event['flow_id']}: outflow {_fmt_amount(float(event['amount']))} {currency} on {date}"
        + (f" ({event['description']})" if event.get("description") else "")
        + f" [{account_id}]"
        for date, account_id, event in outflows[:MAX_DRIVERS]
    ]
    return drivers or ["no scheduled outflows before this date: model-projected net outflows and buffer level"]


def build_alerts(forecast: dict[str, object], quantile: str = "p05") -> dict[str, object]:
    if quantile not in QUANTILE_FIELDS:
        raise ValueError(f"quantile must be one of {', '.join(QUANTILE_FIELDS)}")
    field = QUANTILE_FIELDS[quantile]
    points = forecast["points"]

    events_by_account: dict[str, list[tuple[str, str, dict[str, object]]]] = defaultdict(list)
    events_by_currency: dict[str, list[tuple[str, str, dict[str, object]]]] = defaultdict(list)
    for point in points:
        for event in point["known_events"]:
            item = (point["date"], point["account_id"], event)
            events_by_account[point["account_id"]].append(item)
            events_by_currency[point["currency"]].append(item)

    per_account = []
    for point in points:
        balance = float(point[field])
        buffer = float(point["required_buffer"])
        if balance < buffer:
            gap = buffer - balance
            per_account.append(
                {
                    "account_id": point["account_id"],
                    "currency": point["currency"],
                    "date": point["date"],
                    "quantile_balance": balance,
                    "required_buffer": buffer,
                    "gap_amount": gap,
                    "severity": severity_for(gap, buffer),
                    "drivers": _drivers(events_by_account[point["account_id"]], point["date"], point["currency"]),
                }
            )

    pooled: dict[tuple[str, str], dict[str, float]] = defaultdict(lambda: {"balance": 0.0, "buffer": 0.0})
    for point in points:
        pool = pooled[(point["date"], point["currency"])]
        pool["balance"] += float(point[field])
        pool["buffer"] += float(point["required_buffer"])

    consolidated = []
    for (date, currency), pool in sorted(pooled.items()):
        if pool["balance"] < pool["buffer"]:
            gap = pool["buffer"] - pool["balance"]
            consolidated.append(
                {
                    "account_id": "consolidated",
                    "currency": currency,
                    "date": date,
                    "quantile_balance": pool["balance"],
                    "required_buffer": pool["buffer"],
                    "gap_amount": gap,
                    "severity": severity_for(gap, pool["buffer"]),
                    "drivers": _drivers(events_by_currency[currency], date, currency),
                }
            )

    return {"per_account": per_account, "consolidated": consolidated, "threshold_quantile": quantile}


def flat_alerts(alerts: dict[str, object]) -> list[dict[str, object]]:
    return list(alerts["per_account"]) + list(alerts["consolidated"])
