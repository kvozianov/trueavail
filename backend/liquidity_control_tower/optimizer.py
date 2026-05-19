from __future__ import annotations

from dataclasses import dataclass
import warnings

import pandas as pd

from .config import DOWNGRADE_SCORE_DELTA, OPTIMIZER_EPSILON
from .data_loader import load_demo_data
from .risk import calculate_hhi

try:
    import pulp

    PULP_AVAILABLE = True
except Exception:
    pulp = None
    PULP_AVAILABLE = False


OPTIMIZER_FORMULAS = {
    "objective": "min sum_i sum_j variable_cost_i_j*x_i_j + fixed_fee_i_j*route_used_i_j",
    "balance_floor": "Balance_b + inflow_transfers_b - outflow_transfers_b >= B_min_b",
    "survival_floor": "Balance_after_a >= max(B_min_a, Balance_now_a + gap_p05_a)",
    "source_liquidity": "sum_j x_b_j <= max(0, Balance_b - B_min_b)",
    "route_binary": "x_i_j <= M * route_used_i_j",
    "ccri_exposure": "sum_accounts Balance_bank_after <= MaxExposure(CCRI_bank)",
    "hhi": "HHI = sum_b (Balance_b / sum_b' Balance_b')^2",
}


@dataclass(frozen=True)
class Route:
    source_account_id: str
    destination_account_id: str
    source_bank_id: str
    destination_bank_id: str
    currency: str
    variable_cost_bps: float
    fixed_fee: float

    @property
    def key(self) -> tuple[str, str, str]:
        return (self.source_account_id, self.destination_account_id, self.currency)

    def variable_cost_for(self, amount: float) -> float:
        return amount * self.variable_cost_bps / 10_000

    def total_cost_for(self, amount: float) -> float:
        return self.variable_cost_for(amount) + (self.fixed_fee if amount > OPTIMIZER_EPSILON else 0.0)


def max_exposure_share_by_ccri(score: float) -> float:
    if score >= 80:
        return 0.45
    if score >= 70:
        return 0.38
    if score >= 60:
        return 0.30
    if score >= 50:
        return 0.24
    return 0.18


def _normalise_balances(balances: pd.DataFrame) -> pd.DataFrame:
    required = {
        "account_id",
        "bank_id",
        "bank_name",
        "currency",
        "settled_balance",
        "required_buffer",
    }
    missing = required - set(balances.columns)
    if missing:
        raise ValueError(f"Missing balance columns: {sorted(missing)}")

    result = balances[list(required)].copy()
    result["settled_balance"] = result["settled_balance"].astype(float)
    result["required_buffer"] = result["required_buffer"].astype(float)
    return result


def apply_ccri_downgrade(
    bank_risk_scores: pd.DataFrame,
    downgrade_bank_id: str | None,
    score_delta: int = DOWNGRADE_SCORE_DELTA,
) -> tuple[pd.DataFrame, list[dict[str, object]]]:
    risk = bank_risk_scores.copy()
    audit_events: list[dict[str, object]] = []

    if not downgrade_bank_id:
        return risk, audit_events

    match = risk["bank_id"] == downgrade_bank_id
    if not match.any():
        audit_events.append(
            {
                "event_type": "downgrade_ignored",
                "bank_id": downgrade_bank_id,
                "message": f"No bank risk score exists for bank_id={downgrade_bank_id}.",
            }
        )
        return risk, audit_events

    old_score = float(risk.loc[match, "ccri_score"].iloc[0])
    old_share = float(risk.loc[match, "max_exposure_share"].iloc[0])
    new_score = max(0.0, old_score - score_delta)
    new_share = max_exposure_share_by_ccri(new_score)

    risk.loc[match, "ccri_score"] = new_score
    risk.loc[match, "max_exposure_share"] = new_share
    audit_events.append(
        {
            "event_type": "bank_rating_downgrade",
            "bank_id": downgrade_bank_id,
            "old_ccri_score": old_score,
            "new_ccri_score": new_score,
            "old_max_exposure_share": old_share,
            "new_max_exposure_share": new_share,
            "message": (
                f"CCRI for {downgrade_bank_id} dropped from {old_score:.0f} to {new_score:.0f}; "
                f"max exposure share changed from {old_share:.2f} to {new_share:.2f}."
            ),
        }
    )

    return risk, audit_events


def calculate_bank_exposure_limits(
    balances: pd.DataFrame,
    bank_risk_scores: pd.DataFrame,
    transfer_costs: pd.DataFrame | None = None,
) -> dict[str, float]:
    movable_pairs: set[tuple[str, str]] | None = None
    if transfer_costs is not None:
        movable_pairs = {
            (str(row["source_bank_id"]), str(row["currency"]))
            for row in transfer_costs.to_dict("records")
        }

    limits: dict[str, float] = {}
    risk_by_bank = {
        str(row["bank_id"]): float(row["max_exposure_share"])
        for row in bank_risk_scores.to_dict("records")
    }

    for currency, currency_balances in balances.groupby("currency", sort=False):
        total_currency_balance = float(currency_balances["settled_balance"].sum())
        for bank_id in currency_balances["bank_id"].unique():
            pair = (str(bank_id), str(currency))
            if movable_pairs is not None and pair not in movable_pairs:
                continue
            share = risk_by_bank.get(str(bank_id), 1.0)
            limits[f"{bank_id}:{currency}"] = share * total_currency_balance

    return limits


def _limit_key(bank_id: str, currency: str) -> str:
    return f"{bank_id}:{currency}"


def _build_routes(balances: pd.DataFrame, transfer_costs: pd.DataFrame) -> list[Route]:
    routes: list[Route] = []
    accounts = balances.to_dict("records")

    for source in accounts:
        for destination in accounts:
            if source["account_id"] == destination["account_id"]:
                continue
            if source["currency"] != destination["currency"]:
                continue
            cost = transfer_costs.loc[
                (transfer_costs["source_bank_id"] == source["bank_id"])
                & (transfer_costs["destination_bank_id"] == destination["bank_id"])
                & (transfer_costs["currency"] == source["currency"])
            ]
            if cost.empty:
                continue

            cost_row = cost.iloc[0]
            routes.append(
                Route(
                    source_account_id=str(source["account_id"]),
                    destination_account_id=str(destination["account_id"]),
                    source_bank_id=str(source["bank_id"]),
                    destination_bank_id=str(destination["bank_id"]),
                    currency=str(source["currency"]),
                    variable_cost_bps=float(cost_row["variable_cost_bps"]),
                    fixed_fee=float(cost_row["fixed_fee"]),
                )
            )

    return routes


def _post_balances_from_transfers(
    balances: pd.DataFrame,
    transfers: list[dict[str, object]],
) -> pd.DataFrame:
    result = balances.copy()
    result["settled_balance"] = result["settled_balance"].astype(float)

    for transfer in transfers:
        amount = float(transfer["amount"])
        source_id = transfer["source_account_id"]
        destination_id = transfer["destination_account_id"]
        result.loc[result["account_id"] == source_id, "settled_balance"] -= amount
        result.loc[result["account_id"] == destination_id, "settled_balance"] += amount

    return result


def _transfer_payload(route: Route, amount: float) -> dict[str, object]:
    variable_cost = route.variable_cost_for(amount)
    fixed_fee = route.fixed_fee if amount > OPTIMIZER_EPSILON else 0.0
    return {
        "source_account_id": route.source_account_id,
        "destination_account_id": route.destination_account_id,
        "source_bank_id": route.source_bank_id,
        "destination_bank_id": route.destination_bank_id,
        "currency": route.currency,
        "amount": float(amount),
        "variable_cost": float(variable_cost),
        "fixed_fee": float(fixed_fee),
        "total_cost": float(variable_cost + fixed_fee),
    }


def _bank_exposures(balances: pd.DataFrame) -> dict[str, float]:
    grouped = balances.groupby(["bank_id", "currency"])["settled_balance"].sum().astype(float)
    return {f"{bank_id}:{currency}": float(value) for (bank_id, currency), value in grouped.items()}


def _validate_solution(
    balances: pd.DataFrame,
    exposure_limits: dict[str, float],
    survival_min_balances: dict[str, float] | None = None,
) -> str | None:
    survival_min_balances = survival_min_balances or {}
    working = balances.copy()
    working["effective_required_buffer"] = working.apply(
        lambda row: max(
            float(row["required_buffer"]),
            float(survival_min_balances.get(str(row["account_id"]), float(row["required_buffer"]))),
        ),
        axis=1,
    )
    floor_breaches = working.loc[
        working["settled_balance"] + OPTIMIZER_EPSILON < working["effective_required_buffer"]
    ]
    if not floor_breaches.empty:
        account_ids = ", ".join(
            f"{row['account_id']} needs {float(row['effective_required_buffer']):,.0f}"
            for row in floor_breaches.to_dict("records")
        )
        return f"Balance survival floor breached for accounts: {account_ids}."

    exposures = _bank_exposures(balances)
    over_limit = [
        exposure_key
        for exposure_key, exposure in exposures.items()
        if exposure_key in exposure_limits
        and exposure > exposure_limits.get(exposure_key, float("inf")) + OPTIMIZER_EPSILON
    ]
    if over_limit:
        return f"Exposure limit breached for banks: {', '.join(over_limit)}."

    return None


def _solve_with_pulp(
    balances: pd.DataFrame,
    routes: list[Route],
    exposure_limits: dict[str, float],
    survival_min_balances: dict[str, float] | None = None,
) -> tuple[str, list[dict[str, object]], str | None]:
    if not PULP_AVAILABLE:
        return "error", [], "PuLP is not installed."
    if not routes:
        return "infeasible", [], "No transfer routes are available."

    problem = pulp.LpProblem("liquidity_rebalance", pulp.LpMinimize)
    big_m = max(float(balances["settled_balance"].sum()), 1.0)
    survival_min_balances = survival_min_balances or {}
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="Constructing LpVariable", category=DeprecationWarning)
        route_vars = {
            route.key: pulp.LpVariable(
                f"x_{route.source_account_id}_{route.destination_account_id}_{route.currency}",
                lowBound=0,
                cat="Continuous",
            )
            for route in routes
        }
        route_used = {
            route.key: pulp.LpVariable(
                f"route_used_{route.source_account_id}_{route.destination_account_id}_{route.currency}",
                lowBound=0,
                upBound=1,
                cat="Binary",
            )
            for route in routes
        }

    problem += pulp.lpSum(
        route.variable_cost_bps / 10_000 * route_vars[route.key] + route.fixed_fee * route_used[route.key]
        for route in routes
    )

    for route in routes:
        problem += route_vars[route.key] <= big_m * route_used[route.key]

    for account in balances.to_dict("records"):
        account_id = account["account_id"]
        incoming = pulp.lpSum(
            route_vars[route.key] for route in routes if route.destination_account_id == account_id
        )
        outgoing = pulp.lpSum(route_vars[route.key] for route in routes if route.source_account_id == account_id)
        final_balance = float(account["settled_balance"]) + incoming - outgoing
        effective_floor = max(
            float(account["required_buffer"]),
            float(survival_min_balances.get(str(account_id), float(account["required_buffer"]))),
        )
        problem += final_balance >= effective_floor
        problem += outgoing <= max(0.0, float(account["settled_balance"]) - effective_floor)

    for exposure_key, limit in exposure_limits.items():
        bank_id, currency = exposure_key.split(":", 1)
        bank_accounts = balances.loc[(balances["bank_id"] == bank_id) & (balances["currency"] == currency)]
        if bank_accounts.empty:
            continue
        bank_final_terms = []
        for account in bank_accounts.to_dict("records"):
            account_id = account["account_id"]
            incoming = pulp.lpSum(
                route_vars[route.key] for route in routes if route.destination_account_id == account_id
            )
            outgoing = pulp.lpSum(
                route_vars[route.key] for route in routes if route.source_account_id == account_id
            )
            bank_final_terms.append(float(account["settled_balance"]) + incoming - outgoing)
        problem += pulp.lpSum(bank_final_terms) <= float(limit)

    problem.solve(pulp.PULP_CBC_CMD(msg=False))
    status_name = pulp.LpStatus[problem.status]
    if status_name != "Optimal":
        return "infeasible", [], f"PuLP solver status: {status_name}."

    transfers = [
        _transfer_payload(route, float(route_vars[route.key].value()))
        for route in routes
        if float(route_vars[route.key].value() or 0.0) > OPTIMIZER_EPSILON
    ]
    return "optimal", transfers, None


def _solve_with_greedy_fallback(
    balances: pd.DataFrame,
    routes: list[Route],
    exposure_limits: dict[str, float],
    survival_min_balances: dict[str, float] | None = None,
) -> tuple[str, list[dict[str, object]], str | None]:
    if not routes:
        return "infeasible", [], "No transfer routes are available."

    working = balances.copy()
    transfers: list[dict[str, object]] = []
    survival_min_balances = survival_min_balances or {}

    def account_row(account_id: str) -> pd.Series:
        return working.loc[working["account_id"] == account_id].iloc[0]

    def current_exposure(bank_id: str, currency: str) -> float:
        return float(
            working.loc[
                (working["bank_id"] == bank_id) & (working["currency"] == currency),
                "settled_balance",
            ].sum()
        )

    def free_liquidity(account_id: str) -> float:
        row = account_row(account_id)
        effective_floor = max(
            float(row["required_buffer"]),
            float(survival_min_balances.get(str(account_id), float(row["required_buffer"]))),
        )
        return max(0.0, float(row["settled_balance"]) - effective_floor)

    def destination_capacity(account_id: str) -> float:
        row = account_row(account_id)
        bank_id = str(row["bank_id"])
        currency = str(row["currency"])
        key = _limit_key(bank_id, currency)
        return max(0.0, exposure_limits.get(key, float("inf")) - current_exposure(bank_id, currency))

    def apply(route: Route, amount: float) -> None:
        if amount <= OPTIMIZER_EPSILON:
            return
        working.loc[working["account_id"] == route.source_account_id, "settled_balance"] -= amount
        working.loc[working["account_id"] == route.destination_account_id, "settled_balance"] += amount
        transfers.append(_transfer_payload(route, amount))

    sorted_routes = sorted(routes, key=lambda route: (route.variable_cost_bps, route.fixed_fee))

    for exposure_key, limit in exposure_limits.items():
        bank_id, currency = exposure_key.split(":", 1)
        excess = current_exposure(bank_id, currency) - limit
        while excess > OPTIMIZER_EPSILON:
            candidate_routes = [
                route
                for route in sorted_routes
                if route.source_bank_id == bank_id
                and route.currency == currency
                and free_liquidity(route.source_account_id) > OPTIMIZER_EPSILON
                and destination_capacity(route.destination_account_id) > OPTIMIZER_EPSILON
            ]
            if not candidate_routes:
                return "infeasible", transfers, f"No route can reduce over-limit exposure for {exposure_key}."

            route = candidate_routes[0]
            amount = min(excess, free_liquidity(route.source_account_id), destination_capacity(route.destination_account_id))
            apply(route, amount)
            excess = current_exposure(bank_id, currency) - limit

    working["effective_required_buffer"] = working.apply(
        lambda row: max(
            float(row["required_buffer"]),
            float(survival_min_balances.get(str(row["account_id"]), float(row["required_buffer"]))),
        ),
        axis=1,
    )
    deficit_accounts = working.loc[working["settled_balance"] < working["effective_required_buffer"]]
    for deficit_account in deficit_accounts.to_dict("records"):
        account_id = deficit_account["account_id"]
        deficit = float(deficit_account["effective_required_buffer"]) - float(deficit_account["settled_balance"])
        while deficit > OPTIMIZER_EPSILON:
            candidate_routes = [
                route
                for route in sorted_routes
                if route.destination_account_id == account_id
                and free_liquidity(route.source_account_id) > OPTIMIZER_EPSILON
            ]
            if not candidate_routes:
                return "infeasible", transfers, f"No source liquidity can cover deficit for account {account_id}."

            route = candidate_routes[0]
            amount = min(deficit, free_liquidity(route.source_account_id))
            apply(route, amount)
            deficit = (
                float(account_row(account_id)["effective_required_buffer"])
                - float(account_row(account_id)["settled_balance"])
            )

    validation_error = _validate_solution(working, exposure_limits, survival_min_balances)
    if validation_error:
        return "infeasible", transfers, validation_error

    return "optimal", transfers, None


def solve_liquidity_rebalance(
    balances: pd.DataFrame | None = None,
    bank_risk_scores: pd.DataFrame | None = None,
    transfer_costs: pd.DataFrame | None = None,
    downgrade_bank_id: str | None = None,
    downgrade_score_delta: int = DOWNGRADE_SCORE_DELTA,
    survival_min_balances: dict[str, float] | None = None,
) -> dict[str, object]:
    data = load_demo_data()
    balances_df = _normalise_balances(balances if balances is not None else data["balances"])
    risk_scores_df = bank_risk_scores.copy() if bank_risk_scores is not None else data["bank_risk_scores"]
    transfer_costs_df = transfer_costs.copy() if transfer_costs is not None else data["transfer_costs"]

    adjusted_risk_scores, audit_events = apply_ccri_downgrade(
        risk_scores_df,
        downgrade_bank_id=downgrade_bank_id,
        score_delta=downgrade_score_delta,
    )
    routes = _build_routes(balances_df, transfer_costs_df)
    exposure_limits = calculate_bank_exposure_limits(
        balances_df,
        adjusted_risk_scores,
        transfer_costs_df,
    )
    movable_route_keys = {_limit_key(route.source_bank_id, route.currency) for route in routes}
    exposure_limits = {
        key: value for key, value in exposure_limits.items() if key in movable_route_keys
    }
    hhi_before = calculate_hhi(balances_df)
    survival_min_balances = {
        str(account_id): float(value)
        for account_id, value in (survival_min_balances or {}).items()
        if float(value) > 0
    }
    if survival_min_balances:
        audit_events.append(
            {
                "event_type": "survival_floor_constraints",
                "message": (
                    "Applied forecast p05 survival floors: "
                    + ", ".join(
                        f"{account_id}>={value:,.0f}"
                        for account_id, value in sorted(survival_min_balances.items())
                    )
                    + "."
                ),
            }
        )

    if PULP_AVAILABLE:
        status, transfers, infeasible_reason = _solve_with_pulp(
            balances_df,
            routes,
            exposure_limits,
            survival_min_balances,
        )
        solver_engine = "pulp-cbc"
    else:
        status, transfers, infeasible_reason = _solve_with_greedy_fallback(
            balances_df,
            routes,
            exposure_limits,
            survival_min_balances,
        )
        solver_engine = "greedy-fallback-no-pulp"
        if status == "optimal":
            audit_events.append(
                {
                    "event_type": "solver_fallback",
                    "message": "PuLP is not installed; used deterministic greedy fallback for demo continuity.",
                }
            )

    post_balances = _post_balances_from_transfers(balances_df, transfers)
    validation_error = _validate_solution(post_balances, exposure_limits, survival_min_balances)
    if status == "optimal" and validation_error:
        status = "infeasible"
        infeasible_reason = validation_error

    total_cost = float(sum(float(transfer["total_cost"]) for transfer in transfers))
    hhi_after = calculate_hhi(post_balances)

    return {
        "status": status,
        "solver_engine": solver_engine,
        "objective_value": total_cost,
        "total_transfer_cost": total_cost,
        "hhi_before": hhi_before,
        "hhi_after": hhi_after,
        "transfers": transfers if status == "optimal" else [],
        "post_transfer_balances": post_balances.to_dict("records"),
        "bank_exposure_limits": {key: float(value) for key, value in exposure_limits.items()},
        "survival_min_balances": survival_min_balances,
        "audit_events": audit_events,
        "infeasible_reason": infeasible_reason if status != "optimal" else None,
        "formulas": OPTIMIZER_FORMULAS,
    }
