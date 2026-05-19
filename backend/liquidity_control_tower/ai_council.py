from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from typing import Any

from .config import AI_COUNCIL_TIMEOUT_SECONDS, DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL
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

try:
    from anthropic import Anthropic

    ANTHROPIC_SDK_AVAILABLE = True
except Exception:
    Anthropic = None
    ANTHROPIC_SDK_AVAILABLE = False


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


MIXED_PROVIDER_BY_ADVISOR = {
    "Contrarian Risk Officer": "anthropic",
    "Quant/Data Scientist": "openai",
    "Treasury Operator": "openai",
    "CFO Lens": "anthropic",
    "Regulatory/Bank Exposure Lens": "anthropic",
}

ANTHROPIC_MODEL_ALIASES = {
    "claude-sonnet-4-5": DEFAULT_ANTHROPIC_MODEL,
}


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
            "infeasible_reason": optimizer.get("infeasible_reason"),
            "survival_min_balances": optimizer.get("survival_min_balances", {}),
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


def _openai_client() -> Any:
    if not OPENAI_SDK_AVAILABLE or OpenAI is None:
        return None
    if not os.getenv("OPENAI_API_KEY"):
        return None
    return OpenAI(timeout=AI_COUNCIL_TIMEOUT_SECONDS)


def _client() -> Any:
    return _openai_client()


def _anthropic_client() -> Any:
    if not ANTHROPIC_SDK_AVAILABLE or Anthropic is None:
        return None
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    return Anthropic(timeout=AI_COUNCIL_TIMEOUT_SECONDS)


def _openai_response_text(response: Any) -> str:
    text = getattr(response, "output_text", None)
    if text:
        return str(text).strip()
    return str(response).strip()


def _anthropic_response_text(response: Any) -> str:
    blocks = getattr(response, "content", [])
    parts: list[str] = []
    for block in blocks:
        text = getattr(block, "text", None)
        if text:
            parts.append(str(text))
    if parts:
        return "\n".join(parts).strip()
    return str(response).strip()


def _call_openai(prompt: str, model: str) -> str:
    client = _openai_client()
    if client is None:
        raise RuntimeError("OpenAI SDK or OPENAI_API_KEY is not available.")
    response = client.responses.create(
        model=model,
        input=prompt,
    )
    return _openai_response_text(response)


def _call_anthropic(prompt: str, model: str) -> str:
    client = _anthropic_client()
    if client is None:
        raise RuntimeError("Anthropic SDK or ANTHROPIC_API_KEY is not available.")
    response = client.messages.create(
        model=model,
        max_tokens=900,
        messages=[{"role": "user", "content": prompt}],
    )
    return _anthropic_response_text(response)


def _call_provider(prompt: str, provider: str, openai_model: str, anthropic_model: str) -> str:
    if provider == "anthropic":
        return _call_anthropic(prompt, anthropic_model)
    if provider == "openai":
        return _call_openai(prompt, openai_model)
    raise ValueError(f"Unsupported AI provider {provider!r}.")


def _provider_available(provider: str) -> bool:
    if provider == "openai":
        return _openai_client() is not None
    if provider == "anthropic":
        return _anthropic_client() is not None
    if provider == "mock":
        return True
    return False


def _resolve_provider_mode(mode: str, provider: str | None) -> str:
    selected = (provider or os.getenv("AI_COUNCIL_PROVIDER") or "").strip().lower()
    selected_mode = mode.strip().lower()

    if selected_mode == "mock":
        return "mock"
    if selected:
        return selected
    if selected_mode in {"openai", "anthropic", "mixed", "mock"}:
        return selected_mode
    if selected_mode == "live":
        return "openai"
    if selected_mode == "mock":
        return "mock"
    if _provider_available("openai"):
        return "openai"
    if _provider_available("anthropic"):
        return "anthropic"
    return "mock"


def _advisor_provider(advisor: dict[str, str], provider_mode: str) -> str:
    if provider_mode == "mixed":
        return MIXED_PROVIDER_BY_ADVISOR.get(advisor["advisor"], "openai")
    if provider_mode in {"openai", "anthropic"}:
        return provider_mode
    return "mock"


def _live_providers_for_mode(provider_mode: str) -> set[str]:
    if provider_mode == "mixed":
        return {"openai", "anthropic"}
    if provider_mode in {"openai", "anthropic"}:
        return {provider_mode}
    return set()


def _normalise_anthropic_model(model: str) -> str:
    return ANTHROPIC_MODEL_ALIASES.get(model.strip(), model.strip())


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
    optimizer_status = facts["optimizer"]["status"]
    gate = facts.get("approval_gate") or {}
    gate_decision = gate.get("decision", "not_checked")
    if transfers:
        transfer_text = (
            f"move {transfers[0]['currency']} {transfers[0]['amount']:,.0f} "
            f"from {transfers[0]['source_bank_id']} to {transfers[0]['destination_bank_id']}"
        )
    elif optimizer_status == "infeasible":
        transfer_text = "no feasible transfer plan was found under survival and exposure constraints"
    else:
        transfer_text = "no transfer is required"
    name = advisor["advisor"]

    if "Contrarian" in name:
        if optimizer_status == "infeasible":
            return (
                f"The weak point is no longer a bad transfer; it is an infeasible survival problem. "
                f"HHI remains {hhi:.3f}, ES99 is {es99:,.0f}, and the governance gate says {gate_decision}. "
                "Present this as a blocked optimizer case that requires contingency funding, payment throttling, "
                "or confirmed fallback rails, with the infeasibility reason visible."
            )
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
            f"Treasury execution should treat this as a contingency case: {transfer_text}. "
            "The user needs the blocker, missing funding amount, settlement rail status, and next action in one card. "
            "The decision should stay human-approved because an infeasible optimizer output is an escalation, not a money-movement instruction."
        )
    if "CFO" in name:
        if optimizer_status == "infeasible":
            return (
                f"The CFO story is not a cheap-transfer ROI story anymore: avoided liquidity gap is "
                f"{facts['roi']['avoided_liquidity_gap']:,.0f}, ES99 is {es99:,.0f}, and the optimizer found "
                "no feasible route under survival floors. Lead with business exposure and contingency funding, "
                "then show why the model refused a false-positive recommendation."
            )
        return (
            f"The CFO story is strong: avoided liquidity gap is "
            f"{facts['roi']['avoided_liquidity_gap']:,.0f}, released reserve is "
            f"{facts['roi']['released_idle_reserve']:,.0f}, while transfer cost is only "
            f"{facts['optimizer']['total_transfer_cost']:,.2f}. Lead with the economics, then show the math."
        )
    if optimizer_status == "infeasible":
        return (
            "The exposure story is defensible because the engine refuses to fabricate a transfer when CCRI "
            f"limits and survival floors conflict. Optimizer result: {transfer_text}. Keep the survival floors, "
            "solver status, infeasibility reason, and audit events visible for review."
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
    provider: str | None = None,
    anthropic_model: str | None = None,
) -> dict[str, Any]:
    selected_openai_model = model or os.getenv("OPENAI_MODEL") or DEFAULT_OPENAI_MODEL
    selected_anthropic_model = _normalise_anthropic_model(
        anthropic_model or os.getenv("ANTHROPIC_MODEL") or DEFAULT_ANTHROPIC_MODEL
    )
    facts = build_council_facts(scenario_id, downgrade_bank_id)
    framed_question = frame_council_question(facts)
    provider_mode = _resolve_provider_mode(mode, provider)
    live_provider_status = {
        "openai": _provider_available("openai"),
        "anthropic": _provider_available("anthropic"),
    }
    live_available = any(live_provider_status.values())
    fallback_reasons: list[str] = []

    requested_live_providers = _live_providers_for_mode(provider_mode)
    if provider_mode == "mock":
        fallback_reasons.append("provider=mock")
    for live_provider in requested_live_providers:
        if not live_provider_status[live_provider]:
            env_name = "OPENAI_API_KEY" if live_provider == "openai" else "ANTHROPIC_API_KEY"
            fallback_reasons.append(f"{live_provider} unavailable; {env_name} not set or SDK unavailable")

    if not requested_live_providers or not any(live_provider_status[p] for p in requested_live_providers):
        advisor_responses = [
            {
                "advisor": advisor["advisor"],
                "lens": advisor["lens"],
                "provider": "mock",
                "response": _mock_advisor_response(advisor, facts),
            }
            for advisor in ADVISORS
        ]
        peer_reviews = (
            [
                {
                    "reviewer": advisor["advisor"],
                    "provider": "mock",
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
            "provider_mode": provider_mode,
            "model": selected_openai_model,
            "openai_model": selected_openai_model,
            "anthropic_model": selected_anthropic_model,
            "live_available": live_available,
            "provider_status": live_provider_status,
            "fallback_reason": "; ".join(fallback_reasons) if fallback_reasons else "No live provider available.",
            "framed_question": framed_question,
            "facts": facts,
            "advisor_responses": advisor_responses,
            "peer_reviews": peer_reviews,
            "verdict": verdict,
            "formulas_used": COUNCIL_FORMULAS,
        }

    def provider_for_advisor(advisor: dict[str, str]) -> str:
        assigned = _advisor_provider(advisor, provider_mode)
        if assigned == "mock":
            return "mock"
        if _provider_available(assigned):
            return assigned
        fallback_reasons.append(f"{assigned} unavailable for {advisor['advisor']}; used mock fallback")
        return "mock"

    try:
        def advisor_call(idx: int, advisor: dict[str, str]) -> dict[str, str]:
            selected_provider = provider_for_advisor(advisor)
            prompt = _advisor_prompt(advisor, framed_question, facts)
            if selected_provider == "mock":
                response = _mock_advisor_response(advisor, facts)
            else:
                response = _call_provider(
                    prompt,
                    selected_provider,
                    selected_openai_model,
                    selected_anthropic_model,
                )
            return {
                "advisor": advisor["advisor"],
                "lens": advisor["lens"],
                "provider": selected_provider,
                "response": response,
            }

        advisor_responses = _run_parallel(ADVISORS, advisor_call)

        if peer_review:
            def review_call(idx: int, advisor: dict[str, str]) -> dict[str, str]:
                selected_provider = provider_for_advisor(advisor)
                if selected_provider == "mock":
                    response = _mock_peer_review(advisor)
                else:
                    response = _call_provider(
                        _review_prompt(advisor, framed_question, advisor_responses),
                        selected_provider,
                        selected_openai_model,
                        selected_anthropic_model,
                    )
                return {
                    "reviewer": advisor["advisor"],
                    "provider": selected_provider,
                    "response": response,
                }

            peer_reviews = _run_parallel(ADVISORS, review_call)
        else:
            peer_reviews = []

        chairman_provider = "openai" if provider_mode == "mixed" else next(iter(requested_live_providers), "mock")
        if chairman_provider != "mock" and not _provider_available(chairman_provider):
            fallback_reasons.append(f"{chairman_provider} unavailable for chairman; used mock fallback")
            chairman_provider = "mock"
        verdict = (
            _mock_verdict(facts)
            if chairman_provider == "mock"
            else _call_provider(
                _chairman_prompt(framed_question, advisor_responses, peer_reviews),
                chairman_provider,
                selected_openai_model,
                selected_anthropic_model,
            )
        )
        return {
            "mode": "live",
            "provider_mode": provider_mode,
            "model": (
                selected_openai_model
                if provider_mode in {"openai", "mixed"}
                else selected_anthropic_model
            ),
            "openai_model": selected_openai_model,
            "anthropic_model": selected_anthropic_model,
            "live_available": True,
            "provider_status": live_provider_status,
            "fallback_reason": "; ".join(dict.fromkeys(fallback_reasons)) or None,
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
                "provider": "mock",
                "response": _mock_advisor_response(advisor, facts),
            }
            for advisor in ADVISORS
        ]
        return {
            "mode": "mock",
            "provider_mode": provider_mode,
            "model": selected_openai_model,
            "openai_model": selected_openai_model,
            "anthropic_model": selected_anthropic_model,
            "live_available": live_available,
            "provider_status": live_provider_status,
            "fallback_reason": f"Live AI council failed: {exc.__class__.__name__}: {exc}",
            "framed_question": framed_question,
            "facts": facts,
            "advisor_responses": advisor_responses,
            "peer_reviews": [],
            "verdict": _mock_verdict(facts),
            "formulas_used": COUNCIL_FORMULAS,
        }
