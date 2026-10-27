from sqlalchemy import func, select

from trueavail import db
from trueavail.data import STORE


def test_hosted_postgres_urls_use_the_psycopg_driver(monkeypatch) -> None:
    for raw in ("postgres://u:p@host:5432/d", "postgresql://u:p@host:5432/d"):
        monkeypatch.setenv("DATABASE_URL", raw)
        assert db.database_url() == "postgresql+psycopg://u:p@host:5432/d"
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@host:5432/d")
    assert db.database_url() == "postgresql+psycopg://u:p@host:5432/d"


def test_only_the_latest_datasets_are_kept(client, monkeypatch) -> None:
    monkeypatch.setattr(db, "KEEP_DATASETS", 3)
    for seed in range(1, 6):
        response = client.post("/api/data/generate", json={"accounts": 2, "history_days": 30, "seed": seed})
        assert response.status_code == 200

    with db.get_engine().connect() as conn:
        ids = conn.execute(select(db.datasets.c.id).order_by(db.datasets.c.id)).scalars().all()
        orphan_rows = conn.execute(
            select(func.count()).select_from(db.history_rows).where(db.history_rows.c.dataset_id.not_in(ids))
        ).scalar_one()

    assert len(ids) == 3
    assert ids[-1] == db.latest_dataset_id()
    assert orphan_rows == 0
    assert STORE.get().seed == 5
