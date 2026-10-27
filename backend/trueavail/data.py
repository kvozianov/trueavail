"""Data layer: synthetic dataset generation, CSV upload validation and the in-process dataset store.

State model
-----------
Every generated or uploaded dataset is saved to the database (``db.py``); the *active*
dataset is the latest one. ``STORE`` caches its decoded DataFrames per process. A fresh
database is seeded with the default synthetic dataset (5 accounts x 120 days, seed 42).
There is one active dataset for everyone (single-user demo, no tenants).
"""

from __future__ import annotations

import io
import math
import re
import threading
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache

import numpy as np
import pandas as pd

from .config import (
    DEFAULT_ACCOUNTS,
    DEFAULT_AS_OF,
    DEFAULT_HISTORY_DAYS,
    DEMO_HISTORY_SEED,
    MAX_ACCOUNTS,
    MIN_HISTORY_DAYS_PER_ACCOUNT,
    REFERENCE_DIR,
)
from .settlement import add_business_days, next_business_day

HISTORY_COLUMNS = [
    "date",
    "account_id",
    "bank_name",
    "currency",
    "net_flow",
    "ending_balance",
    "required_buffer",
]
SCHEDULED_COLUMNS = [
    "flow_id",
    "account_id",
    "currency",
    "amount",
    "direction",
    "expected_date",
    "rail",
    "description",
]
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_UPLOAD_ROWS = 100_000
MAX_REPORTED_ERRORS = 100

# Known future flows for the five reference accounts. Dates are relative to DEFAULT_AS_OF
# (2026-05-18) and reproduce the demo story: a large EUR merchant payout lands before the
# card-clearing inflow settles, so Atlas EUR Operating dips below its buffer.
BASE_SCHEDULED_FLOWS = [
    ("card-settlement-2026-05-18", "atlas-eur-operating", "EUR", 3_200_000, "inflow", "2026-05-18", "Card Clearing", "card settlement from weekend merchant volume"),
    ("payout-2026-05-19", "atlas-eur-operating", "EUR", 4_100_000, "outflow", "2026-05-19", "SEPA", "merchant payout"),
    ("usd-platform-2026-05-19", "atlas-usd-operating", "USD", 1_600_000, "inflow", "2026-05-19", "SWIFT", "platform settlement from US PSP partner"),
    ("processing-fee-2026-05-21", "atlas-eur-operating", "EUR", 850_000, "outflow", "2026-05-21", "SEPA", "monthly processing partner fee"),
    ("reserve-topup-2026-05-21", "nova-eur-reserve", "EUR", 950_000, "inflow", "2026-05-21", "SEPA", "reserve account top-up"),
    ("gbp-payroll-2026-05-22", "meridian-gbp-operating", "GBP", 900_000, "outflow", "2026-05-22", "Local Bank Transfer", "UK payroll"),
    ("usd-payroll-2026-05-28", "atlas-usd-operating", "USD", 1_800_000, "outflow", "2026-05-28", "SWIFT", "month-end payroll"),
]

_EXTRA_BANKS = ["Helix Bank", "Lyra Bank", "Polaris Bank", "Sirius Bank", "Vega Bank", "Castor Bank", "Rigel Bank"]
_EXTRA_CURRENCIES = ["EUR", "USD", "GBP"]
_DEFAULT_RAIL = {"EUR": "SEPA", "USD": "SWIFT", "GBP": "Local Bank Transfer"}
_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,80}$")
_CCY_RE = re.compile(r"^[A-Z]{3}$")


class DataValidationError(ValueError):
    """Raised when an uploaded CSV fails validation. ``errors`` are row-level dicts."""

    def __init__(self, message: str, errors: list[dict[str, object]]) -> None:
        super().__init__(message)
        self.message = message
        self.errors = errors[:MAX_REPORTED_ERRORS]
        self.total_errors = len(errors)


# ---------------------------------------------------------------------------
# Reference data (rails, holidays, bank risk, transfer costs, stress coefficients)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _reference_cached() -> dict[str, pd.DataFrame]:
    def read(name: str, **kwargs) -> pd.DataFrame:
        return pd.read_csv(REFERENCE_DIR / name, **kwargs)

    return {
        "account_profiles": read("account_profiles.csv"),
        "settlement_rules": read("settlement_rules.csv"),
        "holidays": read("calendar_holidays.csv", parse_dates=["date"]),
        "bank_risk_scores": read("bank_risk_scores.csv"),
        "transfer_costs": read("transfer_costs.csv"),
        "stress_scenarios": read("stress_scenarios.csv"),
    }


def load_reference_data() -> dict[str, pd.DataFrame]:
    """Return copies of the static reference tables shipped in ``data/reference``."""
    return {name: frame.copy() for name, frame in _reference_cached().items()}


def bank_id_from_name(bank_name: str) -> str:
    """'Atlas Bank' -> 'atlas'. Used to join uploaded accounts to bank-level reference tables."""
    slug = re.sub(r"[^a-z0-9]+", "-", str(bank_name).strip().lower()).strip("-")
    slug = re.sub(r"-bank$", "", slug)
    return slug or "unknown"


# ---------------------------------------------------------------------------
# Dataset container and store
# ---------------------------------------------------------------------------


@dataclass
class Dataset:
    source: str  # "synthetic" | "upload"
    history: pd.DataFrame  # HISTORY_COLUMNS + bank_id, label
    scheduled: pd.DataFrame  # SCHEDULED_COLUMNS + effective_date
    seed: int | None = None
    warnings: list[str] = field(default_factory=list)
    version: int = 0

    @property
    def as_of(self) -> str:
        return str(self.history["date"].max())

    @property
    def account_ids(self) -> list[str]:
        return list(dict.fromkeys(self.history["account_id"].tolist()))

    def accounts(self) -> pd.DataFrame:
        """One row per account with the latest settled balance (last ending_balance)."""
        last = self.history.sort_values(["account_id", "date"]).groupby("account_id", sort=False).tail(1)
        order = {account_id: idx for idx, account_id in enumerate(self.account_ids)}
        last = last.assign(_order=last["account_id"].map(order)).sort_values("_order")
        return pd.DataFrame(
            {
                "account_id": last["account_id"].astype(str).to_numpy(),
                "bank_id": last["bank_id"].astype(str).to_numpy(),
                "bank_name": last["bank_name"].astype(str).to_numpy(),
                "label": last["label"].astype(str).to_numpy(),
                "currency": last["currency"].astype(str).to_numpy(),
                "settled_balance": last["ending_balance"].astype(float).to_numpy(),
                "required_buffer": last["required_buffer"].astype(float).to_numpy(),
            }
        )

    def summary(self) -> dict[str, object]:
        return {
            "source": self.source,
            "rows": int(len(self.history)),
            "accounts": self.account_ids,
            "start": str(self.history["date"].min()),
            "end": str(self.history["date"].max()),
            "seed": self.seed,
            "scheduled_flows": int(len(self.scheduled)),
            "warnings": list(self.warnings),
        }


class DatasetStore:
    """Active-dataset accessor backed by the database (see ``db.py``).

    The active dataset is the most recently saved row in ``datasets``. Each process keeps a
    decoded copy in memory and reloads it when a newer dataset id appears, so several API
    workers stay consistent. An empty database is seeded with the default synthetic dataset.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._dataset: Dataset | None = None

    def get(self) -> Dataset:
        from . import db

        with self._lock:
            latest = db.latest_dataset_id()
            if latest is None:
                return self._persist(generate_synthetic_dataset())
            if self._dataset is None or self._dataset.version != latest:
                self._dataset = _dataset_from_db(latest)
            return self._dataset

    def set(self, dataset: Dataset) -> Dataset:
        with self._lock:
            return self._persist(dataset)

    def reset(self) -> Dataset:
        return self.set(generate_synthetic_dataset())

    def _persist(self, dataset: Dataset) -> Dataset:
        from . import db

        labels = dict(zip(dataset.history["account_id"], dataset.history["label"]))
        dataset.version = db.save_dataset(
            source=dataset.source,
            seed=dataset.seed,
            history=dataset.history,
            scheduled=dataset.scheduled,
            labels=labels,
            warnings=dataset.warnings,
        )
        self._dataset = dataset
        return dataset


def _dataset_from_db(dataset_id: int) -> Dataset:
    from . import db

    loaded = db.load_dataset(dataset_id)
    if loaded is None:  # pragma: no cover - concurrent delete
        raise LookupError(f"dataset {dataset_id} not found")
    meta = loaded["meta"]
    history = loaded["history"]
    history["bank_id"] = history["bank_name"].map(bank_id_from_name)
    labels = meta.get("labels") or {}
    history["label"] = [
        labels.get(account_id, f"{bank} {ccy}")
        for account_id, bank, ccy in zip(history["account_id"], history["bank_name"], history["currency"])
    ]
    scheduled = loaded["scheduled"] if not loaded["scheduled"].empty else empty_scheduled()
    return Dataset(
        source=str(meta["source"]),
        history=history,
        scheduled=scheduled,
        seed=meta.get("seed"),
        warnings=list(meta.get("warnings") or []),
        version=dataset_id,
    )


STORE = DatasetStore()


# ---------------------------------------------------------------------------
# Scheduled flows: settlement-adjusted effective dates
# ---------------------------------------------------------------------------


def effective_date_for(
    expected_date: str,
    direction: str,
    rail: str,
    settlement_rules: pd.DataFrame,
    holidays: pd.DataFrame,
) -> str:
    """Outflows leave on the next business day; inflows become available after the rail delay."""
    ts = pd.Timestamp(expected_date, tz="UTC")
    if direction == "outflow":
        return next_business_day(ts, holidays).strftime("%Y-%m-%d")
    rule = settlement_rules.loc[settlement_rules["rail"] == rail]
    delay = int(rule.iloc[0]["delay_business_days"]) if not rule.empty else 0
    return add_business_days(ts, delay, holidays).strftime("%Y-%m-%d")


def with_effective_dates(scheduled: pd.DataFrame) -> pd.DataFrame:
    ref = _reference_cached()
    result = scheduled.copy()
    if result.empty:
        result["effective_date"] = pd.Series(dtype=str)
        return result
    result["effective_date"] = [
        effective_date_for(row["expected_date"], row["direction"], row["rail"], ref["settlement_rules"], ref["holidays"])
        for row in result.to_dict("records")
    ]
    return result


def empty_scheduled() -> pd.DataFrame:
    frame = pd.DataFrame({col: pd.Series(dtype=str) for col in SCHEDULED_COLUMNS})
    frame["amount"] = frame["amount"].astype(float)
    frame["effective_date"] = pd.Series(dtype=str)
    return frame


# ---------------------------------------------------------------------------
# Synthetic generator (net-flow process reused from the original data_loader)
# ---------------------------------------------------------------------------


def _account_profiles(accounts: int, seed: int) -> pd.DataFrame:
    base = _reference_cached()["account_profiles"]
    profiles = base.head(accounts).to_dict("records")
    extra_rng = np.random.default_rng(seed + 10_000)
    for idx in range(len(profiles), accounts):
        bank_name = _EXTRA_BANKS[(idx - len(base)) % len(_EXTRA_BANKS)]
        currency = _EXTRA_CURRENCIES[idx % len(_EXTRA_CURRENCIES)]
        bank_id = bank_id_from_name(bank_name)
        settled = float(round(extra_rng.uniform(2_000_000, 8_000_000), -4))
        profiles.append(
            {
                "account_id": f"{bank_id}-{currency.lower()}-operating",
                "bank_id": bank_id,
                "bank_name": bank_name,
                "label": f"{currency} Operating",
                "currency": currency,
                "settled_balance": settled,
                "required_buffer": float(round(settled * 0.25, -5)),
            }
        )
    return pd.DataFrame(profiles)


def generate_synthetic_history(
    profiles: pd.DataFrame,
    as_of: str = DEFAULT_AS_OF,
    history_days: int = DEFAULT_HISTORY_DAYS,
    seed: int = DEMO_HISTORY_SEED,
) -> pd.DataFrame:
    """Repeatable daily account history ending on ``as_of``.

    The net-flow process (weekday seasonality, Friday payout cycle, month-end outflows,
    Gaussian noise and three large Atlas EUR shocks) is the one from the original
    ``data_loader.generate_synthetic_daily_history``. Balances are anchored so that the last
    ending_balance equals the account profile's settled balance:
    ``ending_balance[t] = settled_balance - sum(net_flow[t+1:])``.
    """

    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp(as_of), periods=history_days, freq="D")
    frames: list[pd.DataFrame] = []

    for account in profiles.to_dict("records"):
        settled_balance = float(account["settled_balance"])
        daily_scale = max(settled_balance * 0.045, 90_000.0)
        net_flows = np.empty(history_days)

        for idx, day in enumerate(dates):
            weekday = day.weekday()
            seasonal = 1.0 + 0.22 * np.sin(2 * np.pi * weekday / 7)
            payout_cycle = 1.0 + (0.55 if weekday == 4 else 0.0)
            month_end = 1.0 + (0.35 if day.day >= 27 else 0.0)
            noise = rng.normal(0, daily_scale * 0.08)
            inflow = daily_scale * seasonal * (1.06 if account["currency"] == "EUR" else 0.92)
            outflow = daily_scale * 0.86 * payout_cycle * month_end
            net_flow = inflow - outflow + noise
            if account["account_id"] == "atlas-eur-operating" and idx in (38, 77, 104):
                net_flow -= daily_scale * 5.8
            net_flows[idx] = round(float(net_flow), 2)

        future_sum = np.concatenate([np.cumsum(net_flows[::-1])[::-1][1:], [0.0]])
        balances = np.round(settled_balance - future_sum, 2)
        frames.append(
            pd.DataFrame(
                {
                    "date": dates.strftime("%Y-%m-%d"),
                    "account_id": account["account_id"],
                    "bank_name": account["bank_name"],
                    "currency": account["currency"],
                    "net_flow": net_flows,
                    "ending_balance": balances,
                    "required_buffer": float(account["required_buffer"]),
                    "bank_id": account["bank_id"],
                    "label": account["label"],
                }
            )
        )

    return pd.concat(frames, ignore_index=True)


def _synthetic_scheduled(profiles: pd.DataFrame, as_of: str, seed: int) -> pd.DataFrame:
    account_ids = set(profiles["account_id"])
    rows = [
        dict(zip(SCHEDULED_COLUMNS, flow))
        for flow in BASE_SCHEDULED_FLOWS
        if flow[1] in account_ids
    ]
    base_ids = set(_reference_cached()["account_profiles"]["account_id"])
    rng = np.random.default_rng(seed + 20_000)
    as_of_ts = pd.Timestamp(as_of)
    for account in profiles.to_dict("records"):
        if account["account_id"] in base_ids:
            continue
        rail = _DEFAULT_RAIL.get(account["currency"], "SEPA")
        for direction, share in (("outflow", rng.uniform(0.5, 1.0)), ("inflow", rng.uniform(0.2, 0.5))):
            day = (as_of_ts + pd.Timedelta(days=int(rng.integers(2, 13)))).strftime("%Y-%m-%d")
            rows.append(
                {
                    "flow_id": f"{direction}-{account['account_id']}-{day}",
                    "account_id": account["account_id"],
                    "currency": account["currency"],
                    "amount": float(round(account["settled_balance"] * share, -4)),
                    "direction": direction,
                    "expected_date": day,
                    "rail": rail,
                    "description": "synthetic supplier payment" if direction == "outflow" else "synthetic customer receipt",
                }
            )
    if not rows:
        return empty_scheduled()
    frame = pd.DataFrame(rows, columns=SCHEDULED_COLUMNS)
    frame["amount"] = frame["amount"].astype(float)
    return with_effective_dates(frame)


def generate_synthetic_dataset(
    accounts: int = DEFAULT_ACCOUNTS,
    history_days: int = DEFAULT_HISTORY_DAYS,
    seed: int = DEMO_HISTORY_SEED,
    as_of: str = DEFAULT_AS_OF,
) -> Dataset:
    if not 1 <= accounts <= MAX_ACCOUNTS:
        raise ValueError(f"accounts must be between 1 and {MAX_ACCOUNTS}")
    profiles = _account_profiles(accounts, seed)
    history = generate_synthetic_history(profiles, as_of=as_of, history_days=history_days, seed=seed)
    scheduled = _synthetic_scheduled(profiles, as_of, seed)
    return Dataset(source="synthetic", history=history, scheduled=scheduled, seed=seed)


def history_to_csv(dataset: Dataset) -> str:
    frame = dataset.history[HISTORY_COLUMNS].copy()
    return frame.to_csv(index=False, float_format="%.2f")


def scheduled_to_csv(dataset: Dataset) -> str:
    frame = dataset.scheduled[SCHEDULED_COLUMNS].copy()
    return frame.to_csv(index=False, float_format="%.2f")


# ---------------------------------------------------------------------------
# CSV upload validation
# ---------------------------------------------------------------------------


def _read_csv_text(raw: bytes, kind: str) -> pd.DataFrame:
    if len(raw) > MAX_UPLOAD_BYTES:
        raise DataValidationError(
            f"{kind} file is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
            [{"row": None, "column": None, "message": "file too large"}],
        )
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise DataValidationError(
            f"{kind} file is not valid UTF-8", [{"row": None, "column": None, "message": str(exc)}]
        ) from exc
    if not text.strip():
        raise DataValidationError(f"{kind} file is empty", [{"row": None, "column": None, "message": "empty file"}])
    try:
        frame = pd.read_csv(io.StringIO(text), dtype=str, keep_default_na=False, skipinitialspace=True)
    except Exception as exc:  # pandas raises several parser error types
        raise DataValidationError(
            f"{kind} file could not be parsed as CSV", [{"row": None, "column": None, "message": str(exc)}]
        ) from exc
    frame.columns = [str(col).strip() for col in frame.columns]
    if len(frame) > MAX_UPLOAD_ROWS:
        raise DataValidationError(
            f"{kind} file has more than {MAX_UPLOAD_ROWS} rows",
            [{"row": None, "column": None, "message": "too many rows"}],
        )
    return frame


def _missing_columns(frame: pd.DataFrame, required: list[str], kind: str) -> None:
    missing = [col for col in required if col not in frame.columns]
    if missing:
        raise DataValidationError(
            f"{kind} file is missing required columns: {', '.join(missing)}",
            [{"row": 1, "column": col, "message": "missing column"} for col in missing],
        )


def _parse_date(value: str) -> str | None:
    try:
        return date.fromisoformat(value.strip()).isoformat()
    except ValueError:
        return None


def _parse_float(value: str) -> float | None:
    try:
        number = float(str(value).strip().replace("_", ""))
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def parse_history_csv(raw: bytes) -> tuple[pd.DataFrame, list[str]]:
    frame = _read_csv_text(raw, "history")
    _missing_columns(frame, HISTORY_COLUMNS, "history")
    if frame.empty:
        raise DataValidationError("history file has no data rows", [{"row": None, "column": None, "message": "no rows"}])

    errors: list[dict[str, object]] = []
    rows: list[dict[str, object]] = []
    seen: set[tuple[str, str]] = set()

    for idx, record in enumerate(frame.to_dict("records")):
        line = idx + 2  # header is line 1
        row_errors: list[dict[str, object]] = []

        def err(column: str, message: str) -> None:
            row_errors.append({"row": line, "column": column, "message": message})

        parsed_date = _parse_date(record["date"])
        if parsed_date is None:
            err("date", f"invalid date {record['date']!r}, expected YYYY-MM-DD")
        account_id = str(record["account_id"]).strip()
        if not _ID_RE.match(account_id):
            err("account_id", "account_id must be 1-80 chars of letters, digits, . _ : -")
        bank_name = str(record["bank_name"]).strip()
        if not bank_name:
            err("bank_name", "bank_name is required")
        currency = str(record["currency"]).strip().upper()
        if not _CCY_RE.match(currency):
            err("currency", f"invalid currency {record['currency']!r}, expected ISO code like EUR")
        numbers: dict[str, float] = {}
        for col in ("net_flow", "ending_balance", "required_buffer"):
            value = _parse_float(record[col])
            if value is None:
                err(col, f"{col} must be a finite number, got {record[col]!r}")
            else:
                numbers[col] = value
        if numbers.get("required_buffer", 0.0) < 0:
            err("required_buffer", "required_buffer must be >= 0")
        if parsed_date is not None and account_id:
            key = (account_id, parsed_date)
            if key in seen:
                err("date", f"duplicate row for account {account_id} on {parsed_date}")
            seen.add(key)

        if row_errors:
            errors.extend(row_errors)
            continue
        rows.append(
            {
                "date": parsed_date,
                "account_id": account_id,
                "bank_name": bank_name,
                "currency": currency,
                **numbers,
                "_line": line,
            }
        )

    if errors:
        raise DataValidationError(f"history file has {len(errors)} invalid value(s)", errors)

    history = pd.DataFrame(rows)
    first_seen = {account_id: idx for idx, account_id in enumerate(dict.fromkeys(history["account_id"]))}
    history = (
        history.assign(_order=history["account_id"].map(first_seen))
        .sort_values(["_order", "date"])
        .drop(columns=["_order"])
        .reset_index(drop=True)
    )
    warnings: list[str] = []

    for account_id, group in history.groupby("account_id", sort=False):
        for col in ("currency", "bank_name"):
            values = group[col].unique()
            if len(values) > 1:
                errors.append(
                    {
                        "row": int(group["_line"].iloc[0]),
                        "column": col,
                        "message": f"account {account_id} has inconsistent {col}: {', '.join(map(str, values))}",
                    }
                )
        if len(group) < MIN_HISTORY_DAYS_PER_ACCOUNT:
            errors.append(
                {
                    "row": None,
                    "column": "account_id",
                    "message": (
                        f"account {account_id} has {len(group)} rows; at least "
                        f"{MIN_HISTORY_DAYS_PER_ACCOUNT} daily observations are required"
                    ),
                }
            )
            continue
        dates = pd.to_datetime(group["date"])
        gaps = int((dates.diff().dt.days.fillna(1) > 1).sum())
        if gaps:
            warnings.append(f"{account_id}: {gaps} gap(s) in daily dates; lags treat consecutive rows as consecutive days")
        balance_diff = group["ending_balance"].diff().iloc[1:]
        mismatch = (balance_diff - group["net_flow"].iloc[1:]).abs() > (1.0 + 1e-6 * group["ending_balance"].abs().iloc[1:])
        if int(mismatch.sum()):
            warnings.append(
                f"{account_id}: {int(mismatch.sum())} row(s) where ending_balance change != net_flow "
                "(model trains on net_flow; forecast starts from the last ending_balance)"
            )

    if errors:
        raise DataValidationError(f"history file failed consistency checks ({len(errors)} issue(s))", errors)

    end_dates = history.groupby("account_id")["date"].max()
    if end_dates.nunique() > 1:
        warnings.append(
            f"accounts end on different dates ({end_dates.min()} .. {end_dates.max()}); "
            f"forecast as-of is {end_dates.max()}"
        )

    history["bank_id"] = history["bank_name"].map(bank_id_from_name)
    history["label"] = history["bank_name"] + " " + history["currency"]
    return history.drop(columns=["_line"]), warnings


def parse_scheduled_csv(raw: bytes, accounts: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    frame = _read_csv_text(raw, "scheduled")
    if "description" not in frame.columns:
        frame["description"] = ""
    _missing_columns(frame, SCHEDULED_COLUMNS, "scheduled")
    known_rails = set(_reference_cached()["settlement_rules"]["rail"])
    currency_by_account = dict(zip(accounts["account_id"], accounts["currency"]))

    errors: list[dict[str, object]] = []
    warnings: list[str] = []
    rows: list[dict[str, object]] = []
    seen: set[str] = set()
    unknown_rails: set[str] = set()

    for idx, record in enumerate(frame.to_dict("records")):
        line = idx + 2
        row_errors: list[dict[str, object]] = []

        def err(column: str, message: str) -> None:
            row_errors.append({"row": line, "column": column, "message": message})

        flow_id = str(record["flow_id"]).strip()
        if not _ID_RE.match(flow_id):
            err("flow_id", "flow_id must be 1-80 chars of letters, digits, . _ : -")
        elif flow_id in seen:
            err("flow_id", f"duplicate flow_id {flow_id}")
        seen.add(flow_id)
        account_id = str(record["account_id"]).strip()
        if account_id not in currency_by_account:
            err("account_id", f"unknown account_id {account_id!r} (not in history)")
        currency = str(record["currency"]).strip().upper()
        if account_id in currency_by_account and currency != currency_by_account[account_id]:
            err("currency", f"currency {currency} does not match account currency {currency_by_account[account_id]}")
        amount = _parse_float(record["amount"])
        if amount is None or amount <= 0:
            err("amount", f"amount must be a positive number, got {record['amount']!r}")
        direction = str(record["direction"]).strip().lower()
        if direction not in ("inflow", "outflow"):
            err("direction", f"direction must be inflow or outflow, got {record['direction']!r}")
        expected_date = _parse_date(record["expected_date"])
        if expected_date is None:
            err("expected_date", f"invalid date {record['expected_date']!r}, expected YYYY-MM-DD")
        rail = str(record["rail"]).strip()
        if not rail:
            err("rail", "rail is required")
        elif rail not in known_rails:
            unknown_rails.add(rail)

        if row_errors:
            errors.extend(row_errors)
            continue
        rows.append(
            {
                "flow_id": flow_id,
                "account_id": account_id,
                "currency": currency,
                "amount": float(amount),
                "direction": direction,
                "expected_date": expected_date,
                "rail": rail,
                "description": str(record["description"]).strip(),
            }
        )

    if errors:
        raise DataValidationError(f"scheduled file has {len(errors)} invalid value(s)", errors)
    if unknown_rails:
        warnings.append(
            f"unknown rail(s) {', '.join(sorted(unknown_rails))}: treated as same-day settlement "
            f"(known rails: {', '.join(sorted(known_rails))})"
        )
    if not rows:
        return empty_scheduled(), warnings
    return with_effective_dates(pd.DataFrame(rows, columns=SCHEDULED_COLUMNS)), warnings


def dataset_from_upload(history_raw: bytes, scheduled_raw: bytes | None) -> Dataset:
    history, warnings = parse_history_csv(history_raw)
    dataset = Dataset(source="upload", history=history, scheduled=empty_scheduled(), seed=None)
    if scheduled_raw:
        scheduled, scheduled_warnings = parse_scheduled_csv(scheduled_raw, dataset.accounts())
        dataset.scheduled = scheduled
        warnings.extend(scheduled_warnings)
        as_of = dataset.as_of
        past = int((scheduled["effective_date"] <= as_of).sum()) if not scheduled.empty else 0
        if past:
            warnings.append(f"{past} scheduled flow(s) settle on or before the as-of date {as_of} and are ignored by the forecast")
    else:
        warnings.append("no scheduled flows file uploaded; the forecast uses the model only")
    dataset.warnings = warnings
    return dataset
