from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi.encoders import jsonable_encoder

from backend.liquidity_control_tower.api import app, demo_metadata, demo_snapshot
from backend.liquidity_control_tower.config import ARTIFACTS_DIR


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(jsonable_encoder(payload), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    openapi = app.openapi()
    snapshot = demo_snapshot()
    metadata = demo_metadata()

    _write_json(ARTIFACTS_DIR / "openapi.json", openapi)
    _write_json(ARTIFACTS_DIR / "demo_snapshot.json", snapshot)
    _write_json(ARTIFACTS_DIR / "demo_metadata.json", metadata)
    _write_json(
        ARTIFACTS_DIR / "ui_handoff_summary.json",
        {
            "generated_at": generated_at,
            "artifact_dir": str(ARTIFACTS_DIR),
            "files": [
                "openapi.json",
                "demo_snapshot.json",
                "demo_metadata.json",
            ],
            "primary_endpoint": "GET /api/demo/snapshot",
            "notes": [
                "AI Council inside the golden snapshot is generated in mock mode for deterministic UI work.",
                "Live OpenAI/Claude council remains available through POST /api/ai-council/review.",
                "Use demo_metadata.json for fixed demo clock, seed, thresholds, and ensemble weights.",
            ],
        },
    )

    print(
        json.dumps(
            {
                "status": "ok",
                "artifact_dir": str(ARTIFACTS_DIR),
                "generated_files": [
                    str(ARTIFACTS_DIR / "openapi.json"),
                    str(ARTIFACTS_DIR / "demo_snapshot.json"),
                    str(ARTIFACTS_DIR / "demo_metadata.json"),
                    str(ARTIFACTS_DIR / "ui_handoff_summary.json"),
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
