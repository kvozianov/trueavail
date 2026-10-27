"""The static-demo exporter writes parseable JSON for every page of the demo frontend."""

import json

from scripts.export_demo import SCENARIOS, export


def test_export_demo_writes_parseable_files(tmp_path) -> None:
    manifest = export(tmp_path)

    on_disk = json.loads((tmp_path / "manifest.json").read_text())
    assert on_disk["dataset"]["rows"] == 600 and on_disk["dataset"]["seed"] == 42
    assert on_disk["backend_version"] == manifest["backend_version"]

    for entry in manifest["files"]:
        path = tmp_path / entry["path"]
        assert path.is_file() and path.stat().st_size == entry["bytes"]
        if path.suffix == ".json":
            json.loads(path.read_text())

    forecast = json.loads((tmp_path / "forecast.json").read_text())
    assert len(forecast["points"]) == 5 * 14
    backtest = json.loads((tmp_path / "backtest.json").read_text())
    assert backtest["folds"] == 6 and len(backtest["per_horizon"]) == 14

    index = json.loads((tmp_path / "scenarios" / "index.json").read_text())
    assert [s["id"] for s in index] == [s["id"] for s in SCENARIOS]
    for item in index:
        scenario = json.loads((tmp_path / item["file"]).read_text())
        assert {"id", "title", "description", "adjustments", "baseline", "scenario", "delta"} <= scenario.keys()
        assert scenario["delta"] == item["delta"]
    # Every scenario changes the gap picture; otherwise it is not worth showing.
    assert all(s["delta"]["gaps_removed"] or s["delta"]["gaps_added"] for s in index)
