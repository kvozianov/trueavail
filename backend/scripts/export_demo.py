"""Precompute the static demo: run the real backend on the default synthetic dataset and write JSON.

Run from backend/:  python -m scripts.export_demo [--out DIR]

Every file is the response of an actual API endpoint (called in-process through FastAPI's
TestClient against a throwaway SQLite database), so the static frontend in demo mode shows exactly
what the backend computes. What-if scenarios only use adjustments the API supports: shift, resize
or remove an existing scheduled flow, or add a new one.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = BACKEND_DIR.parent
DEFAULT_OUT = REPO_DIR / "frontend" / "public" / "demo"

PAYOUT = {
    "flow_id": "payout-2026-05-19",
    "account_id": "atlas-eur-operating",
    "expected_date": "2026-05-19",
    "amount": 4_100_000.0,
    "direction": "outflow",
}
CARD_SETTLEMENT = {
    "flow_id": "card-settlement-2026-05-18",
    "account_id": "atlas-eur-operating",
    "expected_date": "2026-05-18",
    "amount": 3_200_000.0,
    "direction": "inflow",
}
PROCESSING_FEE = {
    "flow_id": "processing-fee-2026-05-21",
    "account_id": "atlas-eur-operating",
    "expected_date": "2026-05-21",
    "amount": 850_000.0,
    "direction": "outflow",
}

SCENARIOS: list[dict[str, object]] = [
    {
        "id": "payout-plus-2",
        "title": "Pay the merchant payout 2 days later",
        "description": (
            "The EUR 4.1M merchant payout from Atlas EUR Operating moves from 19 May to 21 May, "
            "the day the EUR 3.2M card settlement lands."
        ),
        "adjustments": [{**PAYOUT, "shift_days": 2}],
    },
    {
        "id": "split-payout",
        "title": "Split the payout into two halves",
        "description": (
            "The EUR 4.1M merchant payout is paid as EUR 2.05M on 19 May and EUR 2.05M a week later, on 26 May."
        ),
        "adjustments": [
            {**PAYOUT, "amount": 2_050_000.0},
            {
                "account_id": "atlas-eur-operating",
                "expected_date": "2026-05-26",
                "amount": 2_050_000.0,
                "direction": "outflow",
            },
        ],
    },
    {
        "id": "cancel-fee",
        "title": "Cancel the processing fee",
        "description": "The EUR 850k monthly processing partner fee on 21 May is removed from the schedule.",
        "adjustments": [{**PROCESSING_FEE, "remove": True}],
    },
    {
        "id": "delay-card-settlement",
        "title": "Card settlement arrives 5 days late",
        "description": (
            "The largest expected inflow, a EUR 3.2M card settlement into Atlas EUR Operating, "
            "is shifted 5 days later."
        ),
        "adjustments": [{**CARD_SETTLEMENT, "shift_days": 5}],
    },
    {
        "id": "supplier-prepayment",
        "title": "Unexpected supplier prepayment",
        "description": (
            "A new EUR 1.5M outflow (supplier prepayment) from Atlas EUR Operating on 22 May, "
            "on top of the existing schedule."
        ),
        "adjustments": [
            {
                "account_id": "atlas-eur-operating",
                "expected_date": "2026-05-22",
                "amount": 1_500_000.0,
                "direction": "outflow",
            }
        ],
    },
    {
        "id": "seasonal-dip",
        "title": "Seasonal dip",
        "description": (
            "Several extra outflows spread over the horizon: EUR 400k from Atlas EUR Operating on 22 May, "
            "GBP 700k from Meridian GBP Operating on 25 and 29 May, USD 2.5M from Atlas USD Operating on 27 May."
        ),
        "adjustments": [
            {"account_id": "atlas-eur-operating", "expected_date": "2026-05-22", "amount": 400_000.0, "direction": "outflow"},
            {"account_id": "meridian-gbp-operating", "expected_date": "2026-05-25", "amount": 700_000.0, "direction": "outflow"},
            {"account_id": "meridian-gbp-operating", "expected_date": "2026-05-29", "amount": 700_000.0, "direction": "outflow"},
            {"account_id": "atlas-usd-operating", "expected_date": "2026-05-27", "amount": 2_500_000.0, "direction": "outflow"},
        ],
    },
]


def _git_commit() -> dict[str, object]:
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=REPO_DIR, capture_output=True, text=True, check=True
        ).stdout.strip()
        dirty = bool(
            subprocess.run(
                ["git", "status", "--porcelain", "--", "backend/trueavail", "backend/data"],
                cwd=REPO_DIR,
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        )
        return {"sha": sha, "backend_dirty": dirty}
    except (OSError, subprocess.CalledProcessError):
        return {"sha": None, "backend_dirty": None}


def _worst(alerts: list[dict[str, object]]) -> dict[str, object] | None:
    """Largest gap among alerts (what-if delta.worst_gap_* without its currency and date)."""
    if not alerts:
        return None
    worst = max(alerts, key=lambda alert: float(alert["gap_amount"]))
    return {key: worst[key] for key in ("account_id", "currency", "date", "gap_amount")}


def _check(response, path: str):
    if response.status_code != 200:
        raise RuntimeError(f"{path} -> HTTP {response.status_code}: {response.text[:500]}")
    return response.json()


def export(out_dir: Path) -> dict[str, object]:
    # A throwaway SQLite database, set before any trueavail module creates an engine.
    if "trueavail.db" not in sys.modules:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp(prefix='trueavail-demo-')) / 'demo.db'}"

    from fastapi.testclient import TestClient

    from trueavail.api import app
    from trueavail.config import SAMPLES_DIR, VERSION
    from trueavail.data import STORE

    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[dict[str, object]] = []

    def write(name: str, payload: object) -> None:
        path = out_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
        written.append({"path": name, "bytes": path.stat().st_size})

    with TestClient(app) as client:
        STORE.reset()  # default synthetic dataset: seed 42, 5 accounts x 120 days

        def get(path: str, **params):
            return _check(client.get(path, params=params or None), path)

        def post(path: str, body: dict[str, object]):
            return _check(client.post(path, json=body), path)

        health = get("/health")
        write("health.json", health)
        write("accounts.json", get("/api/accounts"))
        write("history.json", get("/api/data/history"))
        write("scheduled.json", get("/api/data/scheduled"))
        write("forecast.json", post("/api/forecast/run", {"horizon_days": 14}))
        write("explain.json", get("/api/forecast/explain", horizon_days=14))
        write("alerts.json", get("/api/alerts", quantile="p05", horizon_days=14))
        write("backtest.json", post("/api/backtest/run", {"horizon_days": 14, "folds": 6, "step_days": 7}))
        write("optimizer.json", post("/api/optimizer/rebalance", {}))
        write("stress.json", post("/api/stress/run", {}))

        index = []
        for scenario in SCENARIOS:
            body = {"horizon_days": 14, "quantile": "p05", "adjustments": scenario["adjustments"]}
            result = post("/api/whatif/run", body)
            write(
                f"scenarios/{scenario['id']}.json",
                {
                    "id": scenario["id"],
                    "title": scenario["title"],
                    "description": scenario["description"],
                    "adjustments": scenario["adjustments"],
                    **result,
                },
            )
            index.append(
                {
                    "id": scenario["id"],
                    "title": scenario["title"],
                    "description": scenario["description"],
                    "file": f"scenarios/{scenario['id']}.json",
                    "delta": result["delta"],
                    # The delta carries amounts only; the scenario list also needs where and in which currency.
                    "accounts": sorted({str(adj["account_id"]) for adj in scenario["adjustments"]}),
                    "worst_before": _worst(result["alerts_before"]),
                    "worst_after": _worst(result["alerts_after"]),
                }
            )
        write("scenarios/index.json", index)

    samples = out_dir / "samples"
    samples.mkdir(parents=True, exist_ok=True)
    for name in ("history_5accounts_120d.csv", "scheduled_flows.csv"):
        shutil.copyfile(SAMPLES_DIR / name, samples / name)
        written.append({"path": f"samples/{name}", "bytes": (samples / name).stat().st_size})

    manifest = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "backend_version": VERSION,
        "git_commit": _git_commit(),
        "generator": "backend/scripts/export_demo.py",
        "dataset": health["dataset"],
        "model_available": health["model_available"],
        "files": written,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"output directory (default {DEFAULT_OUT})")
    args = parser.parse_args()
    manifest = export(args.out.resolve())
    total = sum(int(f["bytes"]) for f in manifest["files"])
    print(f"wrote {len(manifest['files'])} files ({total / 1024:.0f} KiB) + manifest.json to {args.out}")


if __name__ == "__main__":
    main()
