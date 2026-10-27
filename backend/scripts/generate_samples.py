"""Write the sample CSVs (default synthetic dataset, seed 42) to data/samples/.

Run from backend/:  python -m scripts.generate_samples
"""

from __future__ import annotations

from trueavail.config import SAMPLES_DIR
from trueavail.data import generate_synthetic_dataset, history_to_csv, scheduled_to_csv


def main() -> None:
    dataset = generate_synthetic_dataset()
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    history_path = SAMPLES_DIR / "history_5accounts_120d.csv"
    scheduled_path = SAMPLES_DIR / "scheduled_flows.csv"
    history_path.write_text(history_to_csv(dataset), encoding="utf-8")
    scheduled_path.write_text(scheduled_to_csv(dataset), encoding="utf-8")
    print(f"wrote {history_path} ({len(dataset.history)} rows)")
    print(f"wrote {scheduled_path} ({len(dataset.scheduled)} rows)")


if __name__ == "__main__":
    main()
