import numpy as np
import pandas as pd
import pytest

from trueavail import db
from trueavail.config import SAMPLES_DIR
from trueavail.data import (
    HISTORY_COLUMNS,
    SCHEDULED_COLUMNS,
    STORE,
    DataValidationError,
    generate_synthetic_dataset,
    history_to_csv,
    parse_history_csv,
    scheduled_to_csv,
)


def _sample_bytes(name: str) -> bytes:
    return (SAMPLES_DIR / name).read_bytes()


def test_default_dataset_is_5_accounts_by_120_days() -> None:
    dataset = generate_synthetic_dataset()

    assert len(dataset.history) == 600
    assert len(dataset.account_ids) == 5
    assert dataset.as_of == "2026-05-18"
    assert str(dataset.history["date"].min()) == "2026-01-19"


def test_generator_is_deterministic_and_seed_sensitive() -> None:
    a = generate_synthetic_dataset(seed=42).history
    b = generate_synthetic_dataset(seed=42).history
    c = generate_synthetic_dataset(seed=7).history

    pd.testing.assert_frame_equal(a, b)
    assert not np.allclose(a["net_flow"], c["net_flow"])


def test_balances_are_consistent_with_net_flows_and_anchor_to_settled_balance() -> None:
    dataset = generate_synthetic_dataset()
    for _, group in dataset.history.groupby("account_id"):
        diffs = group["ending_balance"].diff().iloc[1:].to_numpy()
        assert np.allclose(diffs, group["net_flow"].iloc[1:].to_numpy(), atol=0.05)
    accounts = dataset.accounts().set_index("account_id")
    assert accounts.loc["atlas-eur-operating", "settled_balance"] == pytest.approx(3_000_000.0)


def test_generator_supports_extra_accounts_and_other_lengths() -> None:
    dataset = generate_synthetic_dataset(accounts=8, history_days=60, seed=3)

    assert len(dataset.account_ids) == 8
    assert len(dataset.history) == 480
    assert set(dataset.scheduled["account_id"]) <= set(dataset.account_ids)
    with pytest.raises(ValueError):
        generate_synthetic_dataset(accounts=99)


def test_sample_files_match_default_generator() -> None:
    dataset = generate_synthetic_dataset()

    assert _sample_bytes("history_5accounts_120d.csv").decode() == history_to_csv(dataset)
    assert _sample_bytes("scheduled_flows.csv").decode() == scheduled_to_csv(dataset)
    header = _sample_bytes("history_5accounts_120d.csv").decode().splitlines()[0]
    assert header.split(",") == HISTORY_COLUMNS
    assert _sample_bytes("scheduled_flows.csv").decode().splitlines()[0].split(",") == SCHEDULED_COLUMNS


def test_scheduled_flows_get_settlement_adjusted_effective_dates() -> None:
    flows = generate_synthetic_dataset().scheduled.set_index("flow_id")

    # outflow on a business day settles the same day
    assert flows.loc["payout-2026-05-19", "effective_date"] == "2026-05-19"
    # card clearing: +2 business days, skipping the 2026-05-20 holiday
    assert flows.loc["card-settlement-2026-05-18", "effective_date"] == "2026-05-21"


def test_parse_history_reports_row_level_errors() -> None:
    csv = (
        "date,account_id,bank_name,currency,net_flow,ending_balance,required_buffer\n"
        "2026-01-01,acc-1,Bank,EUR,10,100,50\n"
        "not-a-date,acc-1,Bank,EUR,10,110,50\n"
        "2026-01-03,acc-1,Bank,euro,abc,120,-5\n"
    )
    with pytest.raises(DataValidationError) as info:
        parse_history_csv(csv.encode())

    errors = info.value.errors
    assert {"row": 3, "column": "date"} == {k: errors[0][k] for k in ("row", "column")}
    columns_row4 = {e["column"] for e in errors if e["row"] == 4}
    assert {"currency", "net_flow", "required_buffer"} <= columns_row4


def test_parse_history_rejects_missing_columns_and_short_history() -> None:
    with pytest.raises(DataValidationError) as info:
        parse_history_csv(b"date,account_id\n2026-01-01,a\n")
    assert {e["column"] for e in info.value.errors} >= {"net_flow", "ending_balance"}

    short = "\n".join(
        ["date,account_id,bank_name,currency,net_flow,ending_balance,required_buffer"]
        + [f"2026-01-{day:02d},a,Bank,EUR,1,{100 + day},10" for day in range(1, 11)]
    )
    with pytest.raises(DataValidationError) as info:
        parse_history_csv(short.encode())
    assert "at least" in info.value.errors[0]["message"]


def test_generate_endpoint_replaces_active_dataset(client) -> None:
    response = client.post("/api/data/generate", json={"accounts": 3, "history_days": 90, "seed": 7})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "synthetic"
    assert body["rows"] == 270
    assert len(body["accounts"]) == 3
    assert body["seed"] == 7
    assert client.get("/health").json()["dataset"]["rows"] == 270


def test_generate_endpoint_validates_input(client) -> None:
    assert client.post("/api/data/generate", json={"accounts": 0}).status_code == 422


def test_upload_sample_files_round_trip(client) -> None:
    response = client.post(
        "/api/data/upload",
        files={
            "file": ("history.csv", _sample_bytes("history_5accounts_120d.csv"), "text/csv"),
            "scheduled": ("scheduled.csv", _sample_bytes("scheduled_flows.csv"), "text/csv"),
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source"] == "upload"
    assert body["rows"] == 600
    assert body["scheduled_flows"] == 7
    assert body["warnings"] == []
    accounts = {a["account_id"]: a for a in client.get("/api/accounts").json()}
    assert accounts["atlas-eur-operating"]["settled_balance"] == pytest.approx(3_000_000.0)


def test_upload_history_only_warns_about_missing_scheduled(client) -> None:
    response = client.post(
        "/api/data/upload", files={"file": ("h.csv", _sample_bytes("history_5accounts_120d.csv"), "text/csv")}
    )

    assert response.status_code == 200
    assert any("no scheduled flows" in w for w in response.json()["warnings"])
    assert client.get("/api/data/scheduled").json() == []


def test_upload_bad_schema_returns_422_with_row_errors(client) -> None:
    history = _sample_bytes("history_5accounts_120d.csv").decode().splitlines()
    history[5] = history[5].replace("EUR", "E1")
    bad = ("\n".join(history) + "\n").encode()

    response = client.post("/api/data/upload", files={"file": ("h.csv", bad, "text/csv")})

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["errors"][0]["row"] == 6
    assert detail["errors"][0]["column"] == "currency"


def test_upload_scheduled_with_unknown_account_is_rejected(client) -> None:
    scheduled = (
        "flow_id,account_id,currency,amount,direction,expected_date,rail,description\n"
        "x-1,ghost-account,EUR,100,outflow,2026-05-20,SEPA,test\n"
        "x-2,atlas-eur-operating,EUR,100,sideways,2026-05-20,SEPA,test\n"
    ).encode()
    response = client.post(
        "/api/data/upload",
        files={
            "file": ("h.csv", _sample_bytes("history_5accounts_120d.csv"), "text/csv"),
            "scheduled": ("s.csv", scheduled, "text/csv"),
        },
    )

    assert response.status_code == 422
    errors = response.json()["detail"]["errors"]
    assert (2, "account_id") in {(e["row"], e["column"]) for e in errors}
    assert (3, "direction") in {(e["row"], e["column"]) for e in errors}


def test_history_and_scheduled_endpoints(client) -> None:
    rows = client.get("/api/data/history", params={"account_id": "atlas-eur-operating"}).json()
    assert len(rows) == 120
    assert set(rows[0]) == {"date", "account_id", "net_flow", "ending_balance", "required_buffer"}
    assert client.get("/api/data/history", params={"account_id": "nope"}).status_code == 404
    assert len(client.get("/api/data/history").json()) == 600

    flows = client.get("/api/data/scheduled").json()
    assert len(flows) == 7
    assert {"flow_id", "effective_date", "rail", "description"} <= set(flows[0])


def test_accounts_endpoint(client) -> None:
    accounts = client.get("/api/accounts").json()

    assert len(accounts) == 5
    assert set(accounts[0]) == {"account_id", "bank_name", "label", "currency", "settled_balance", "required_buffer"}
    assert accounts[0]["label"] == "EUR Operating"


def test_sample_download_endpoint(client) -> None:
    response = client.get("/api/data/samples/scheduled_flows.csv")
    assert response.status_code == 200
    assert response.text.startswith("flow_id,")
    assert client.get("/api/data/samples/../../etc/passwd").status_code == 404


def test_datasets_are_persisted_and_latest_is_active(client) -> None:
    client.post("/api/data/generate", json={"accounts": 2, "history_days": 45, "seed": 1})
    latest = db.latest_dataset_id()
    loaded = db.load_dataset(latest)

    assert loaded["meta"]["source"] == "synthetic"
    assert loaded["meta"]["rows"] == 90
    assert len(loaded["history"]) == 90

    STORE._dataset = None  # simulate a fresh process: state must come back from the database
    dataset = STORE.get()
    assert dataset.version == latest
    assert len(dataset.history) == 90
    assert dataset.accounts()["label"].tolist() == ["EUR Operating", "EUR Reserve"]


def test_history_csv_round_trip_through_parser() -> None:
    history, warnings = parse_history_csv(history_to_csv(generate_synthetic_dataset()).encode())
    assert len(history) == 600
    assert warnings == []
