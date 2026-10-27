import os
import tempfile
from pathlib import Path

# Point the app at a throwaway SQLite file before any trueavail module creates an engine.
# Set TEST_DATABASE_URL to run the suite against another database (e.g. a scratch PostgreSQL);
# that database is wiped at session start.
_TMP = tempfile.mkdtemp(prefix="trueavail-tests-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{Path(_TMP) / 'test.db'}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from trueavail import db  # noqa: E402
from trueavail.api import app  # noqa: E402
from trueavail.data import STORE  # noqa: E402

if os.environ.get("TEST_DATABASE_URL"):
    db.delete_all()


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def default_dataset():
    """Every test starts on the default synthetic dataset; tests that replace it get it restored."""
    dataset = STORE.get()
    if not (dataset.source == "synthetic" and dataset.seed == 42 and len(dataset.history) == 600):
        dataset = STORE.reset()
    yield dataset
    current = STORE.get()
    if current.version != dataset.version:
        STORE.reset()
