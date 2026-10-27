from __future__ import annotations

from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import db
from .alerts import build_alerts
from .backtest import run_backtest
from .config import CORS_ORIGINS, SAMPLES_DIR, VERSION
from .data import STORE, DataValidationError, dataset_from_upload, generate_synthetic_dataset
from .forecasting import model_available, run_forecast
from .optimizer import solve_liquidity_rebalance
from .schemas import (
    AccountOut,
    AlertsResponse,
    BacktestRequest,
    BacktestResponse,
    DatasetSummary,
    ForecastRequest,
    ForecastResponse,
    ForecastRunOut,
    GenerateRequest,
    HealthResponse,
    HistoryRowOut,
    OptimizerRequest,
    OptimizerResponse,
    ScheduledFlowOut,
    StressScenarioRequest,
    StressScenarioResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from .stress import run_stress_scenario
from .whatif import AdjustmentError, run_whatif

SAMPLE_FILES = {"history_5accounts_120d.csv", "scheduled_flows.csv"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(
    title="TrueAvail API",
    version=VERSION,
    description=(
        "14-day liquidity forecasting prototype on synthetic data: quantile balance corridors, "
        "cash-gap alerts, what-if on scheduled flows and a rolling-origin backtest. "
        "No bank connections; nothing moves money."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DataValidationError)
async def _validation_error(_: Request, exc: DataValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": {"message": exc.message, "errors": exc.errors, "total_errors": exc.total_errors}},
    )


@app.exception_handler(ValueError)
async def _value_error(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": {"message": str(exc), "errors": []}})


def _summary(dataset) -> dict[str, object]:
    return dataset.summary()


# ---------------------------------------------------------------------------
# Health, accounts, data
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
def health() -> dict[str, object]:
    dataset = STORE.get()
    return {
        "status": "ok",
        "version": VERSION,
        "model_available": model_available(),
        "dataset": {
            "source": dataset.source,
            "seed": dataset.seed,
            "rows": int(len(dataset.history)),
            "accounts": len(dataset.account_ids),
            "start": str(dataset.history["date"].min()),
            "end": dataset.as_of,
        },
        "database": db.get_engine().dialect.name,
    }


@app.get("/api/accounts", response_model=list[AccountOut])
def accounts() -> list[dict[str, object]]:
    return STORE.get().accounts().drop(columns=["bank_id"]).to_dict("records")


@app.post("/api/data/generate", response_model=DatasetSummary)
def generate(request: GenerateRequest | None = None) -> dict[str, object]:
    request = request or GenerateRequest()
    dataset = generate_synthetic_dataset(
        accounts=request.accounts, history_days=request.history_days, seed=request.seed
    )
    return _summary(STORE.set(dataset))


@app.post("/api/data/upload", response_model=DatasetSummary)
async def upload(
    file: UploadFile = File(..., description="history CSV"),
    scheduled: UploadFile | None = File(default=None, description="optional scheduled flows CSV"),
) -> dict[str, object]:
    history_raw = await file.read()
    scheduled_raw = await scheduled.read() if scheduled is not None else None
    dataset = dataset_from_upload(history_raw, scheduled_raw or None)
    return _summary(STORE.set(dataset))


@app.get("/api/data/history", response_model=list[HistoryRowOut])
def history(account_id: str | None = None) -> list[dict[str, object]]:
    frame = STORE.get().history
    if account_id is not None:
        frame = frame.loc[frame["account_id"] == account_id]
        if frame.empty:
            raise HTTPException(status_code=404, detail=f"unknown account_id {account_id!r}")
    columns = ["date", "account_id", "net_flow", "ending_balance", "required_buffer"]
    return frame[columns].to_dict("records")


@app.get("/api/data/scheduled", response_model=list[ScheduledFlowOut])
def scheduled() -> list[dict[str, object]]:
    frame = STORE.get().scheduled
    return [] if frame.empty else frame.to_dict("records")


@app.get("/api/data/samples/{name}")
def sample_file(name: str) -> FileResponse:
    if name not in SAMPLE_FILES or not (SAMPLES_DIR / name).is_file():
        raise HTTPException(status_code=404, detail=f"unknown sample {name!r}")
    return FileResponse(SAMPLES_DIR / name, media_type="text/csv", filename=name)


# ---------------------------------------------------------------------------
# Forecast, alerts, backtest, what-if
# ---------------------------------------------------------------------------


def _run_summary(forecast: dict[str, object]) -> dict[str, object]:
    breaches = [point for point in forecast["points"] if point["breach"]]
    first = forecast["first_breach"]
    return {
        "points": len(forecast["points"]),
        "breach_points": len(breaches),
        "accounts_with_breach": sorted({point["account_id"] for point in breaches}),
        "first_breach": None if first is None else {"date": first["date"], "account_id": first["account_id"]},
        "model": forecast["model"],
    }


@app.post("/api/forecast/run", response_model=ForecastResponse)
def forecast_run(request: ForecastRequest | None = None) -> dict[str, object]:
    request = request or ForecastRequest()
    dataset = STORE.get()
    result = run_forecast(dataset, horizon_days=request.horizon_days, as_of=request.as_of)
    result["run_id"] = db.record_run(
        dataset_id=dataset.version,
        kind="forecast",
        horizon_days=request.horizon_days,
        as_of=result["as_of"],
        model_type=result["model"]["type"],
        summary=_run_summary(result),
    )
    return result


@app.get("/api/forecast/runs", response_model=list[ForecastRunOut])
def forecast_runs(limit: int = Query(default=20, ge=1, le=200)) -> list[dict[str, object]]:
    return db.list_runs(limit)


@app.get("/api/alerts", response_model=AlertsResponse)
def alerts(
    quantile: str = Query(default="p05", pattern="^(p05|p50|p95)$"),
    horizon_days: int = Query(default=14, ge=1, le=30),
) -> dict[str, object]:
    return build_alerts(run_forecast(STORE.get(), horizon_days=horizon_days), quantile)


@app.post("/api/backtest/run", response_model=BacktestResponse)
def backtest_run(request: BacktestRequest | None = None) -> dict[str, object]:
    request = request or BacktestRequest()
    dataset = STORE.get()
    result = run_backtest(
        dataset, horizon_days=request.horizon_days, folds=request.folds, step_days=request.step_days
    )
    db.record_run(
        dataset_id=dataset.version,
        kind="backtest",
        horizon_days=request.horizon_days,
        as_of=dataset.as_of,
        model_type=result["model"]["type"],
        summary={"summary": result["summary"], "folds": result["folds"], "step_days": result["step_days"]},
    )
    return result


@app.post("/api/whatif/run", response_model=WhatIfResponse)
def whatif_run(request: WhatIfRequest) -> dict[str, object]:
    dataset = STORE.get()
    try:
        result = run_whatif(
            dataset,
            [adjustment.model_dump() for adjustment in request.adjustments],
            horizon_days=request.horizon_days,
            quantile=request.quantile,
        )
    except AdjustmentError as exc:
        raise HTTPException(status_code=422, detail={"message": str(exc), "errors": []}) from exc
    db.record_run(
        dataset_id=dataset.version,
        kind="whatif",
        horizon_days=request.horizon_days,
        as_of=result["scenario"]["as_of"],
        model_type=result["scenario"]["model"]["type"],
        summary={"adjustments": len(request.adjustments), "delta": result["delta"]},
    )
    return result


# ---------------------------------------------------------------------------
# Stress and optimizer (secondary)
# ---------------------------------------------------------------------------


@app.post("/api/stress/run", response_model=StressScenarioResponse)
def stress_run(request: StressScenarioRequest) -> dict[str, object]:
    return run_stress_scenario(
        scenario_id=request.scenario_id,
        run_optimizer=request.run_optimizer,
        downgrade_bank_id=request.downgrade_bank_id,
    )


@app.post("/api/optimizer/rebalance", response_model=OptimizerResponse)
def rebalance(request: OptimizerRequest) -> dict[str, object]:
    balances = None
    if request.balances is not None:
        balances = pd.DataFrame([balance.model_dump() for balance in request.balances])
    return solve_liquidity_rebalance(
        balances=balances,
        downgrade_bank_id=request.downgrade_bank_id,
        downgrade_score_delta=request.downgrade_score_delta,
        survival_min_balances=request.survival_min_balances,
    )
