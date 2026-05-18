from __future__ import annotations

import json
import os
import sys
import time

from backend.liquidity_control_tower.ai_council import run_ai_council


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def main() -> None:
    mode = os.getenv("AI_COUNCIL_MODE", "auto")
    peer_review = _env_bool("AI_COUNCIL_PEER_REVIEW", True)
    scenario_id = os.getenv("AI_COUNCIL_SCENARIO", "target2_outage")
    downgrade_bank_id = os.getenv("AI_COUNCIL_DOWNGRADE_BANK", "atlas") or None
    model = os.getenv("OPENAI_MODEL")
    started_at = time.time()

    print(
        (
            "Starting AI Council "
            f"(mode={mode}, model={model or 'default'}, peer_review={peer_review}, "
            f"scenario={scenario_id})..."
        ),
        file=sys.stderr,
        flush=True,
    )
    print(
        "Live mode can take 1-3 minutes because it runs 5 advisors, optional peer reviews, and a chairman.",
        file=sys.stderr,
        flush=True,
    )

    council = run_ai_council(
        scenario_id=scenario_id,
        downgrade_bank_id=downgrade_bank_id,
        mode=mode,
        peer_review=peer_review,
        model=model,
    )
    elapsed = time.time() - started_at
    print(f"AI Council finished in {elapsed:.1f}s using {council['mode']} mode.", file=sys.stderr, flush=True)
    print(
        json.dumps(
            {
                "mode": council["mode"],
                "model": council["model"],
                "live_available": council["live_available"],
                "fallback_reason": council["fallback_reason"],
                "advisor_count": len(council["advisor_responses"]),
                "peer_review_count": len(council["peer_reviews"]),
                "advisor_responses": council["advisor_responses"],
                "verdict": council["verdict"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
