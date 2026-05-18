from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from typing import Any

from .config import AI_COUNCIL_TIMEOUT_SECONDS, DEFAULT_OPENAI_MODEL
from .explainability import build_explanation
from .forecasting import run_phase1_forecast
from .roi import build_roi_summary
from .stress import run_stress_scenario

try:
    from openai import OpenAI

    OPENAI_SDK_AVAILABLE = True
except Exception:
    OpenAI = None
    OPENAI_SDK_AVAILABLE = False


ADVISORS = [
    {
        "advisor": "Contrarian Risk Officer",
        "lens": "Actively hunts for hidden failure modes, false confidence, operational blockers, and tail risks.",
    },
    {
        "advisor": "Quant/Data Scientist",
        "lens": "Checks whether the forecast band, anomaly logic, ES99, HHI, and optimizer constraints are mathematically coherent.",
    },
    {
        "advisor": "Treasury Operator",
        "lens": "Focuses on whether the action is executable before cut-off and whether the transfer plan fits real treasury workflow.",
    },
    {
        "advisor": "CFO Lens",
        "lens": "Converts the recommendation into business value, liquidity release, cost, and executive-level tradeoffs.",
    },
    {
        "advisor": "Regulatory/Bank Exposure Lens",
        "lens": "Reviews CCRI downgrade, concentration, exposure limits, auditability, and defensibility.",
    },
]


COUNCIL_FORMULAS = {
    "forecast_breach": "breach if balance_p05(t,b,c) < B_min(b,c)",
    "hhi": "HHI = sum_b (Balance_b / sum_b' Balance_b')^2",
    "expected_shortfall_99": "ES_99 = mean(losses in the worst 1% tail)",
    "optimizer_objective": "min sum variable_cost_i_j*x_i_j + fixed_fee_i_j*route_used_i_j",
    "approval": "source_balance -= x_i_j; destination_balance += x_i_j",
    "governance_gate": "approve only if optimizer is optimal, p05 breach is not worsened, HHI is within policy, and rails are feasible",
}


def build_council_facts(
    scenario_id: str = "target2_outage",
    downgrade_bank_id: str | None = "atlas",
) -> dict[str, Any]:
    forecast = run_phase1_forecast(horizon_days=14)
    stress = run_stress_scenario(
        scenario_id=scenario_id,
        run_optimizer=True,
        downgrade_bank_id=downgrade_bank_id,
    )
    explanation = build_explanation(scenario_id, downgrade_bank_id)
    roi = build_roi_summary(scenario_id, downgrade_bank_id)
    optimizer = stress.get("optimizer_recommendation") or {}

    return {
        "scenario": {
            "id": scenario_id,
            "name": stress["scenario_name"],
            "downgrade_bank_id": downgrade_bank_id,
        },
        "forecast": {
            "model_type": forecast["model_type"],
            "first_breach": forecast["first_breach"],
            "feature_quality": forecast["feature_quality"],
            "metrics": forecast["metrics"],
        },
        "risk": {
            "hhi_before": stress["hhi_before"],
            "hhi_after_stress": stress["hhi_after"],
            "accounts_below_buffer": stress["accounts_below_buffer"],
            "expected_shortfall_99": stress["expected_shortfall_99"]["value"],
            "total_stress_loss": stress["total_loss"],
        },
        "optimizer": {
            "status": optimizer.get("status"),
            "solver_engine": optimizer.get("solver_engine"),
            "transfers": optimizer.get("transfers", []),
            "total_transfer_cost": optimizer.get("total_transfer_cost", 0.0),
            "audit_events": optimizer.get("audit_events", []),
        },
        "approval_gate": stress.get("approval_gate"),
        "explanation": {
            "risk_status": explanation["risk_status"],
            "root_causes": explanation["root_causes"],
            "timeline": explanation["timeline"],
        },
        "roi": {
            "optimizer_cost": roi["optimizer_cost"],
            "avoided_liquidity_gap": roi["avoided_liquidity_gap"],
            "released_idle_reserve": roi["released_idle_reserve"],
            "expected_shortfall_99": roi["expected_shortfall_99"],
            "summary": roi["summary"],
        },
        "formulas": COUNCIL_FORMULAS,
    }


def frame_council_question(facts: dict[str, Any]) -> str:
    transfer_count = len(facts["optimizer"]["transfers"])
    return (
        "Evaluate whether the Liquidity Control Tower should recommend and approve the current "
        "treasury action. The mathematical engine has already produced forecast, stress, HHI, CCRI, "
        "ES99, and MIP optimizer outputs. Your job is not to recalculate the model, but to challenge "
        "and interpret the recommendation from your assigned lens.\n\n"
        f"Scenario: {facts['scenario']['name']} ({facts['scenario']['id']}); "
        f"downgraded bank: {facts['scenario']['downgrade_bank_id']}.\n"
        f"Forecast first breach: {facts['forecast']['first_breach']}.\n"
        f"HHI after stress: {facts['risk']['hhi_after_stress']['value']:.3f}; "
        f"ES99: {facts['risk']['expected_shortfall_99']:,.0f}; "
        f"stress loss: {facts['risk']['total_stress_loss']:,.0f}.\n"
        f"Optimizer status: {facts['optimizer']['status']} via {facts['optimizer']['solver_engine']}; "
        f"transfer routes: {transfer_count}; transfer cost: {facts['optimizer']['total_transfer_cost']:,.2f}.\n"
        f"Governance gate: {(facts.get('approval_gate') or {}).get('decision', 'not_checked')}.\n"
        f"ROI: avoided gap {facts['roi']['avoided_liquidity_gap']:,.0f}, "
        f"released reserve {facts['roi']['released_idle_reserve']:,.0f}.\n\n"
        "Return a direct assessment for a hackathon jury and treasury user."
    )


def _client() -> Any:
    if not OPENAI_SDK_AVAILABLE or OpenAI is None:
        return None
    if not os.getenv("OPENAI_API_KEY"):
        return None
    return OpenAI(timeout=AI_COUNCIL_TIMEOUT_SECONDS)


def _response_text(response: Any) -> str:
    text = getattr(response, "output_text", None)
    if text:
        return str(text).strip()
    return str(response).strip()


def _call_openai(prompt: str, model: str) -> str:
    client = _client()
    if client is None:
        raise RuntimeError("OpenAI SDK or OPENAI_API_KEY is not available.")
    response = client.responses.create(
        model=model,
        input=prompt,
    )
    return _response_text(response)


def _advisor_prompt(advisor: dict[str, str], framed_question: str, facts: dict[str, Any]) -> str:
    facts_json = json.dumps(facts, ensure_ascii=False, indent=2)[:12_000]
    return (
        f"You are {advisor['advisor']} on an AI Liquidity Council.\n"
        f"Your lens: {advisor['lens']}\n\n"
        "A fintech liquidity backend produced this decision context:\n"
        f"{framed_question}\n\n"
        "Key facts JSON:\n"
        f"{facts_json}\n\n"
        "Respond independently from your lens. Be direct and specific. "
        "Do not hedge. Keep it between 120 and 220 words. "
        "Mention at least one numerical fact and one risk/action."
    )


def _review_prompt(
    reviewer: dict[str, str],
    framed_question: str,
    advisor_responses: list[dict[str, str]],
) -> str:
    anonymized = "\n\n".join(
        f"Response {chr(65 + idx)}:\n{response['response']}"
        for idx, response in enumerate(advisor_responses)
    )
    return (
        f"You are {reviewer['advisor']} reviewing an anonymized AI Liquidity Council.\n"
        f"Question:\n{framed_question}\n\n"
        f"{anonymized}\n\n"
        "Answer under 180 words:\n"
        "1. Which response is strongest and why?\n"
        "2. Which response has the biggest blind spot?\n"
        "3. What did all responses miss?"
    )


def _chairman_prompt(
    framed_question: str,
    advisor_responses: list[dict[str, str]],
    peer_reviews: list[dict[str, str]],
) -> str:
    advisors = "\n\n".join(
        f"{response['advisor']}:\n{response['response']}" for response in advisor_responses
    )
    reviews = "\n\n".join(
        f"{review['reviewer']}:\n{review['response']}" for review in peer_reviews
    )
    return (
        "You are the Chairman of an AI Liquidity Council. Synthesize the five advisors and peer reviews.\n\n"
        f"Question:\n{framed_question}\n\n"
        f"Advisor responses:\n{advisors}\n\n"
        f"Peer reviews:\n{reviews}\n\n"
        "Produce this exact structure:\n"
        "## Where the Council Agrees\n"
        "## Where the Council Clashes\n"
        "## Blind Spots the Council Caught\n"
        "## The Recommendation\n"
        "## The One Thing to Do First\n"
        "Be direct and useful for a hackathon jury."
    )


def _mock_advisor_response(advisor: dict[str, str], facts: dict[str, Any]) -> str:
    hhi = facts["risk"]["hhi_after_stress"]["value"]
    es99 = facts["risk"]["expected_shortfall_99"]
    transfers = facts["optimizer"]["transfers"]
    gate = facts.get("approval_gate") or {}
    gate_decision = gate.get("decision", "not_checked")
    transfer_text = "no transfer is required" if not transfers else (
        f"move {transfers[0]['currency']} {transfers[0]['amount']:,.0f} "
        f"from {transfers[0]['source_bank_id']} to {transfers[0]['destination_bank_id']}"
    )
    name = advisor["advisor"]

    if "Contrarian" in name:
        return (
            f"The weak point is not the math; it is execution risk. HHI remains {hhi:.3f}, above 0.25, "
            f"and ES99 is {es99:,.0f}. The governance gate says {gate_decision}. Present the recommendation "
            f"to {transfer_text} only after blockers and warnings are visible with an audit trail."
        )
    if "Quant" in name:
        return (
            f"The numerical chain is coherent: p05 breach drives downside risk, MAD filtering protects "
            f"training data, ES99 is {es99:,.0f}, and HHI flags concentration. The MIP output is valid if "
            f"all post-transfer balances remain above B_min and the p05 breach is not worsened. I would emphasize that the LLM council is "
            "interpreting model outputs, not replacing LightGBM quantiles or PuLP constraints."
        )
    if "Treasury" in name:
        return (
            f"The action is operationally clean if it is executable before cut-off: {transfer_text}. "
            "The user needs source, destination, amount, cost, deadline, and post-balance in one card. "
            "The decision should stay human-approved, because treasury teams will trust a clear transfer "
            "instruction more than an autonomous money movement story."
        )
    if "CFO" in name:
        return (
            f"The CFO story is strong: avoided liquidity gap is "
            f"{facts['roi']['avoided_liquidity_gap']:,.0f}, released reserve is "
            f"{facts['roi']['released_idle_reserve']:,.0f}, while transfer cost is only "
            f"{facts['optimizer']['total_transfer_cost']:,.2f}. Lead with the economics, then show the math."
        )
    return (
        f"The exposure story is defensible because CCRI downgrade changes max exposure constraints and "
        f"the optimizer responds with {transfer_text}. Keep the audit events visible. A regulator or bank "
        "risk reviewer will care less about the AI verdict and more about reproducible inputs, formulas, "
        "solver status, and approval logs."
    )


def _mock_peer_review(reviewer: dict[str, str]) -> str:
    return (
        "Strongest response is the one tying numerical risk to a concrete human-approved action. "
        "The biggest blind spot is pretending the transfer removes all residual concentration risk. "
        "All responses should make clearer that AI is only a governance layer over deterministic math."
    )


def _mock_verdict(facts: dict[str, Any]) -> str:
    transfer_count = len(facts["optimizer"]["transfers"])
    gate = facts.get("approval_gate") or {}
    gate_decision = gate.get("decision", "not_checked")
    action = (
        "reject auto-approval and require manual treasury review"
        if gate_decision in {"reject", "manual_review"}
        else ("approve the optimizer recommendation" if transfer_count else "monitor without transfer")
    )
    return (
        "## Where the Council Agrees\n"
        "The council agrees the mathematical core should stay authoritative: quantile forecast, HHI, ES99, "
        "and PuLP constraints drive the decision. The AI layer should explain and challenge, not calculate.\n\n"
        "## Where the Council Clashes\n"
        "The CFO lens wants to lead with released reserve and avoided gap, while the risk lenses warn that "
        "HHI remains elevated and should not be oversold as fully solved.\n\n"
        "## Blind Spots the Council Caught\n"
        "Residual concentration risk and execution timing need to remain visible after the recommendation. "
        "The demo should show auditability, not just a polished verdict.\n\n"
        "## The Recommendation\n"
        f"Use the council as a governance and explanation layer. The deterministic gate decision is "
        f"{gate_decision}; for this scenario, {action}, while clearly showing remaining HHI, blockers, "
        "warnings, and the approval log.\n\n"
        "## The One Thing to Do First\n"
        "Add the AI Council panel after the optimizer card, with five advisor opinions and a chairman verdict."
    )


def _run_parallel(items: list[dict[str, str]], fn: Any) -> list[dict[str, str]]:
    results: list[dict[str, str] | None] = [None] * len(items)
    with ThreadPoolExecutor(max_workers=len(items)) as executor:
        future_map = {executor.submit(fn, idx, item): idx for idx, item in enumerate(items)}
        for future in as_completed(future_map):
            idx = future_map[future]
            results[idx] = future.result()
    return [result for result in results if result is not None]


def run_ai_council(
    scenario_id: str = "target2_outage",
    downgrade_bank_id: str | None = "atlas",
    mode: str = "auto",
    peer_review: bool = True,
    model: str | None = None,
) -> dict[str, Any]:
    selected_model = model or os.getenv("OPENAI_MODEL") or DEFAULT_OPENAI_MODEL
    facts = build_council_facts(scenario_id, downgrade_bank_id)
    framed_question = frame_council_question(facts)
    live_available = _client() is not None
    should_live = mode == "live" or (mode == "auto" and live_available)
    fallback_reason = None

    if mode == "mock":
        should_live = False
        fallback_reason = "mode=mock"
    elif mode == "live" and not live_available:
        should_live = False
        fallback_reason = "OpenAI SDK or OPENAI_API_KEY is not available."
    elif mode == "auto" and not live_available:
        fallback_reason = "OPENAI_API_KEY not set or OpenAI SDK unavailable; using deterministic council."

    if not should_live:
        advisor_responses = [
            {
                "advisor": advisor["advisor"],
                "lens": advisor["lens"],
                "response": _mock_advisor_response(advisor, facts),
            }
            for advisor in ADVISORS
        ]
        peer_reviews = (
            [
                {
                    "reviewer": advisor["advisor"],
                    "response": _mock_peer_review(advisor),
                }
                for advisor in ADVISORS
            ]
            if peer_review
            else []
        )
        verdict = _mock_verdict(facts)
        return {
            "mode": "mock",
            "model": selected_model,
            "live_available": live_available,
            "fallback_reason": fallback_reason,
            "framed_question": framed_question,
            "facts": facts,
            "advisor_responses": advisor_responses,
            "peer_reviews": peer_reviews,
            "verdict": verdict,
            "formulas_used": COUNCIL_FORMULAS,
        }

    try:
        def advisor_call(idx: int, advisor: dict[str, str]) -> dict[str, str]:
            return {
                "advisor": advisor["advisor"],
                "lens": advisor["lens"],
                "response": _call_openai(_advisor_prompt(advisor, framed_question, facts), selected_model),
            }

        advisor_responses = _run_parallel(ADVISORS, advisor_call)

        if peer_review:
            def review_call(idx: int, advisor: dict[str, str]) -> dict[str, str]:
                return {
                    "reviewer": advisor["advisor"],
                    "response": _call_openai(
                        _review_prompt(advisor, framed_question, advisor_responses),
                        selected_model,
                    ),
                }

            peer_reviews = _run_parallel(ADVISORS, review_call)
        else:
            peer_reviews = []

        verdict = _call_openai(
            _chairman_prompt(framed_question, advisor_responses, peer_reviews),
            selected_model,
        )
        return {
            "mode": "live",
            "model": selected_model,
            "live_available": True,
            "fallback_reason": None,
            "framed_question": framed_question,
            "facts": facts,
            "advisor_responses": advisor_responses,
            "peer_reviews": peer_reviews,
            "verdict": verdict,
            "formulas_used": COUNCIL_FORMULAS,
        }
    except Exception as exc:
        advisor_responses = [
            {
                "advisor": advisor["advisor"],
                "lens": advisor["lens"],
                "response": _mock_advisor_response(advisor, facts),
            }
            for advisor in ADVISORS
        ]
        return {
            "mode": "mock",
            "model": selected_model,
            "live_available": live_available,
            "fallback_reason": f"Live AI council failed: {exc.__class__.__name__}: {exc}",
            "framed_question": framed_question,
            "facts": facts,
            "advisor_responses": advisor_responses,
            "peer_reviews": [],
            "verdict": _mock_verdict(facts),
            "formulas_used": COUNCIL_FORMULAS,
        }
