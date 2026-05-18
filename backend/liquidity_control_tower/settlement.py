from __future__ import annotations

from datetime import date

import pandas as pd


def to_timestamp(value: str | pd.Timestamp) -> pd.Timestamp:
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        return ts.tz_localize("UTC")
    return ts.tz_convert("UTC")


def date_key(value: str | pd.Timestamp) -> str:
    return to_timestamp(value).strftime("%Y-%m-%d")


def _holiday_dates(holidays: pd.DataFrame | list[str]) -> set[date]:
    if isinstance(holidays, pd.DataFrame):
        return {pd.Timestamp(row).date() for row in holidays["date"].tolist()}
    return {pd.Timestamp(row).date() for row in holidays}


def is_business_day(value: pd.Timestamp, holidays: pd.DataFrame | list[str]) -> bool:
    day = value.date()
    return value.weekday() < 5 and day not in _holiday_dates(holidays)


def next_business_day(value: pd.Timestamp, holidays: pd.DataFrame | list[str]) -> pd.Timestamp:
    cursor = value
    while not is_business_day(cursor, holidays):
        cursor += pd.Timedelta(days=1)
    return cursor


def add_business_days(
    value: str | pd.Timestamp,
    business_days: int,
    holidays: pd.DataFrame | list[str],
) -> pd.Timestamp:
    cursor = to_timestamp(value)
    if business_days == 0:
        return next_business_day(cursor, holidays)

    added = 0
    while added < business_days:
        cursor += pd.Timedelta(days=1)
        if is_business_day(cursor, holidays):
            added += 1

    return next_business_day(cursor, holidays)


def calculate_settlement_timestamp(
    transaction: pd.Series,
    settlement_rules: pd.DataFrame,
    holidays: pd.DataFrame,
) -> pd.Timestamp:
    rail = transaction["rail"]
    rule = settlement_rules.loc[settlement_rules["rail"] == rail]
    if rule.empty:
        raise ValueError(f"Missing settlement rule for rail={rail!r}")

    delay = int(rule.iloc[0]["delay_business_days"])
    return add_business_days(transaction["expected_at"], delay, holidays)


def calculate_cash_availability_timestamp(
    transaction: pd.Series,
    settlement_rules: pd.DataFrame,
    holidays: pd.DataFrame,
) -> pd.Timestamp:
    if transaction["direction"] == "outflow":
        return next_business_day(to_timestamp(transaction["expected_at"]), holidays)
    return calculate_settlement_timestamp(transaction, settlement_rules, holidays)
