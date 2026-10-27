"""Persistence: datasets, their history rows and scheduled flows, and forecast runs.

``DATABASE_URL`` selects the database (PostgreSQL in docker-compose, SQLite by default for
local runs and tests). Tables are created on startup; there are no migrations.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

import pandas as pd
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    delete,
    func,
    insert,
    select,
)
from sqlalchemy.engine import Engine

DEFAULT_DATABASE_URL = "sqlite:///./trueavail.db"

metadata = MetaData()

datasets = Table(
    "datasets",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("source", String(16), nullable=False),
    Column("seed", Integer, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("rows", Integer, nullable=False),
    Column("accounts", JSON, nullable=False),  # [account_id, ...]
    Column("labels", JSON, nullable=False),  # {account_id: label}
    Column("warnings", JSON, nullable=False),
)

history_rows = Table(
    "history_rows",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("dataset_id", Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("date", String(10), nullable=False),
    Column("account_id", String(80), nullable=False),
    Column("bank_name", String(120), nullable=False),
    Column("currency", String(3), nullable=False),
    Column("net_flow", Float, nullable=False),
    Column("ending_balance", Float, nullable=False),
    Column("required_buffer", Float, nullable=False),
)

scheduled_flows = Table(
    "scheduled_flows",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("dataset_id", Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("flow_id", String(80), nullable=False),
    Column("account_id", String(80), nullable=False),
    Column("currency", String(3), nullable=False),
    Column("amount", Float, nullable=False),
    Column("direction", String(8), nullable=False),
    Column("expected_date", String(10), nullable=False),
    Column("effective_date", String(10), nullable=False),
    Column("rail", String(40), nullable=False),
    Column("description", String(255), nullable=False),
)

forecast_runs = Table(
    "forecast_runs",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("dataset_id", Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("kind", String(16), nullable=False),  # forecast | whatif | backtest
    Column("horizon_days", Integer, nullable=False),
    Column("as_of", String(10), nullable=True),
    Column("model_type", String(40), nullable=True),
    Column("summary", JSON, nullable=False),
)

HISTORY_FIELDS = ["date", "account_id", "bank_name", "currency", "net_flow", "ending_balance", "required_buffer"]
SCHEDULED_FIELDS = [
    "flow_id",
    "account_id",
    "currency",
    "amount",
    "direction",
    "expected_date",
    "effective_date",
    "rail",
    "description",
]

_engine: Engine | None = None


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = database_url()
        kwargs: dict[str, object] = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        _engine = create_engine(url, **kwargs)
        metadata.create_all(_engine)
    return _engine


def reset_engine() -> None:
    """Drop the cached engine (tests switch DATABASE_URL between sessions)."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None


def init_db() -> None:
    metadata.create_all(get_engine())


def _now() -> datetime:
    return datetime.now(UTC)


def save_dataset(
    *,
    source: str,
    seed: int | None,
    history: pd.DataFrame,
    scheduled: pd.DataFrame,
    labels: dict[str, str],
    warnings: list[str],
) -> int:
    accounts = list(dict.fromkeys(history["account_id"].astype(str).tolist()))
    history_records = [
        {**{k: row[k] for k in HISTORY_FIELDS}} for row in history[HISTORY_FIELDS].to_dict("records")
    ]
    scheduled_records = (
        [{k: row[k] for k in SCHEDULED_FIELDS} for row in scheduled[SCHEDULED_FIELDS].to_dict("records")]
        if not scheduled.empty
        else []
    )
    with get_engine().begin() as conn:
        dataset_id = conn.execute(
            insert(datasets)
            .values(
                source=source,
                seed=seed,
                created_at=_now(),
                rows=len(history),
                accounts=accounts,
                labels=labels,
                warnings=list(warnings),
            )
            .returning(datasets.c.id)
        ).scalar_one()
        conn.execute(insert(history_rows), [{**row, "dataset_id": dataset_id} for row in history_records])
        if scheduled_records:
            conn.execute(insert(scheduled_flows), [{**row, "dataset_id": dataset_id} for row in scheduled_records])
    return int(dataset_id)


def latest_dataset_id() -> int | None:
    with get_engine().connect() as conn:
        value = conn.execute(select(func.max(datasets.c.id))).scalar()
    return None if value is None else int(value)


def load_dataset(dataset_id: int) -> dict[str, object] | None:
    with get_engine().connect() as conn:
        meta = conn.execute(select(datasets).where(datasets.c.id == dataset_id)).mappings().first()
        if meta is None:
            return None
        history = pd.DataFrame(
            conn.execute(
                select(*[history_rows.c[name] for name in HISTORY_FIELDS])
                .where(history_rows.c.dataset_id == dataset_id)
                .order_by(history_rows.c.id)
            )
            .mappings()
            .all(),
            columns=HISTORY_FIELDS,
        )
        scheduled = pd.DataFrame(
            conn.execute(
                select(*[scheduled_flows.c[name] for name in SCHEDULED_FIELDS])
                .where(scheduled_flows.c.dataset_id == dataset_id)
                .order_by(scheduled_flows.c.id)
            )
            .mappings()
            .all(),
            columns=SCHEDULED_FIELDS,
        )
    scheduled["amount"] = scheduled["amount"].astype(float)
    return {"meta": dict(meta), "history": history, "scheduled": scheduled}


def record_run(
    *,
    dataset_id: int,
    kind: str,
    horizon_days: int,
    as_of: str | None,
    model_type: str | None,
    summary: dict[str, object],
) -> int:
    with get_engine().begin() as conn:
        run_id = conn.execute(
            insert(forecast_runs)
            .values(
                dataset_id=dataset_id,
                created_at=_now(),
                kind=kind,
                horizon_days=horizon_days,
                as_of=as_of,
                model_type=model_type,
                summary=summary,
            )
            .returning(forecast_runs.c.id)
        ).scalar_one()
    return int(run_id)


def list_runs(limit: int = 20) -> list[dict[str, object]]:
    with get_engine().connect() as conn:
        rows = conn.execute(select(forecast_runs).order_by(forecast_runs.c.id.desc()).limit(limit)).mappings().all()
    return [
        {**dict(row), "created_at": row["created_at"].isoformat() if row["created_at"] else None} for row in rows
    ]


def delete_all() -> None:
    """Test helper: wipe every table."""
    with get_engine().begin() as conn:
        for table in (forecast_runs, scheduled_flows, history_rows, datasets):
            conn.execute(delete(table))
