# TrueAvail — target prototype spec (`ideal-prototype`)

TrueAvail is a 14-day corporate liquidity forecasting prototype. It predicts future account balances as quantile corridors (P5 / P50 / P95), flags cash gaps (dates when the pessimistic balance falls below an account's required buffer), lets the user test what-if adjustments to scheduled payments, and reports honest backtest metrics against a naive baseline.

Scope boundaries (keep these true everywhere, including README and UI copy):
- Data is **synthetic** (5 accounts × 120 daily observations = 600 rows by default, reproducible seed) or a user-uploaded CSV in the same format. The model is **not** calibrated on real bank data.
- No real payments, bank connections, or approvals. Nothing moves money.
- Hackathon-era surfaces (blockchain rail, advisory panel, 3D landing, jury pages) live in branch `legacy-hackathon-demo` / tag `hackathon-may-2026` and are out of scope here.

## Repository layout

```
trueavail/
  backend/                 FastAPI + ML, Python 3.12
    trueavail/             package (renamed from liquidity_control_tower)
      api.py, config.py, data.py (generate + CSV load), features.py,
      forecasting.py, backtest.py, alerts.py, whatif.py,
      stress.py, risk.py, optimizer.py (kept, secondary)
    tests/                 pytest
    data/samples/          sample CSVs (small, committed)
    requirements.txt       pinned versions (pulp<3 or code fixed for pulp>=4)
    Dockerfile
  frontend/                Next.js (App Router, TypeScript, Tailwind, recharts)
    Dockerfile
  docker-compose.yml       backend :8000 + frontend :3000
  Makefile                 make data / make test / make dev / make up
  .github/workflows/ci.yml pytest + frontend lint + build
  docs/SPEC.md (this), docs/ARCHITECTURE.md
  README.md                English, describes exactly what works
```

## Data format

Daily per-account history CSV (`data/samples/history_5accounts_120d.csv`):

```
date,account_id,bank_name,currency,net_flow,ending_balance,required_buffer
2026-01-19,atlas-eur-operating,Atlas Bank,EUR,-12345.67,4300000.00,1000000
```

Scheduled (known) future cash flows CSV (`data/samples/scheduled_flows.csv`):

```
flow_id,account_id,currency,amount,direction,expected_date,rail,description
payout-2026-05-19,atlas-eur-operating,EUR,4100000,outflow,2026-05-19,SEPA,merchant payout
```

`direction` ∈ {inflow, outflow}. Rails and settlement delays may shift the effective date (existing `settlement.py` logic); holidays from `calendar_holidays.csv`.

## Backend API (FastAPI, prefix `/api`, JSON, CORS open for localhost:3000)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | — | `{status:"ok", version, model_available:bool, dataset:{source, seed, rows, accounts:int, start, end}, database}` |
| GET | `/api/accounts` | — | `[{account_id, bank_name, label, currency, settled_balance, required_buffer}]` |
| POST | `/api/data/generate` | `{accounts?:5 (1–12), history_days?:120, seed?:42}` | `DatasetSummary = {source:"synthetic"|"upload", rows, accounts:[id…], start, end, seed?, scheduled_flows:int, warnings:[str]}` |
| POST | `/api/data/upload` | multipart `file` (history CSV), optional `scheduled` (CSV) | `DatasetSummary`; 422 `{detail:{message, errors:[{row, column, message}], total_errors}}` on bad schema |
| GET | `/api/data/samples/{name}` | `history_5accounts_120d.csv` or `scheduled_flows.csv` | CSV file (the default seed-42 samples) |
| GET | `/api/data/history` | `?account_id=` optional | `[{date, account_id, net_flow, ending_balance, required_buffer}]` |
| GET | `/api/data/scheduled` | — | `[{flow_id, account_id, currency, amount, direction, expected_date, effective_date, rail, description}]` |
| POST | `/api/forecast/run` | `{horizon_days?:14, as_of?:date}` | `ForecastResponse` (below) |
| GET | `/api/forecast/explain` | `?horizon_days=14` | `ExplainResponse` (below): what the forecast is made of |
| GET | `/api/forecast/runs` | `?limit=20` | recent forecast / backtest / what-if runs stored in the database |
| GET | `/api/alerts` | `?quantile=p05&horizon_days=14` | `{per_account:[Alert], consolidated:[Alert], threshold_quantile}` |
| POST | `/api/backtest/run` | `{horizon_days?:14, folds?:6, step_days?:7}` | `BacktestResponse` (below) |
| POST | `/api/whatif/run` | `{horizon_days?:14, quantile?:"p05", adjustments:[Adjustment]}` | `{baseline:ForecastResponse, scenario:ForecastResponse, alerts_before:[Alert], alerts_after:[Alert], delta:{gaps_removed, gaps_added, worst_gap_before, worst_gap_after}}` |
| POST | `/api/stress/run` | existing | existing (kept working) |
| POST | `/api/optimizer/rebalance` | existing | existing (kept working, PuLP fixed) |

```
ForecastResponse = {
  as_of, horizon_days, quantiles:[0.05,0.5,0.95],
  model:{type, components:[str], weights:{str:float}, available:bool, fallback_reason?},
  feature_quality:{rows_trainable, anomaly_rows, known_event_rows},
  points:[{date, account_id, currency, balance_p05, balance_p50, balance_p95,
           scheduled_net_flow, required_buffer, breach:bool, known_events:[{flow_id, amount, direction, description}]}],
  first_breach: point | null
}
ExplainResponse = {
  as_of, horizon_days, quantiles, model:{type, available, fallback_reason, weights, n_estimators},
  training:{history_rows, accounts, rows_trainable, anomaly_rows, known_event_rows, feature_columns, feature_labels},
  feature_importance:{model:"lightgbm_quantile", quantile:0.5, importance_type:"gain",
                      features:[{feature, label, group, gain, share}]},   // largest gain first
  components:["lightgbm_quantile","sklearn_gbdt_quantile","ewma_volatility_baseline","blend"],
  series:[{account_id, currency, start_balance, required_buffer, dates, scheduled_net_flow,
           components:{<name>:{flow:{p05,p50,p95}, balance:{p05,p50,p95}}},   // one value per day
           anomaly_dates:[date],   // history days flagged by the MAD anomaly score (excluded from training)
           latest_features:{<feature>: value}}]
}
  // each component's corridor = start balance + scheduled flows + its own cumulated daily quantiles;
  // "blend" is the weighted sum of the components and equals the ForecastResponse corridor
Alert = {account_id|"consolidated", currency, date, quantile_balance, required_buffer, gap_amount, severity:"red"|"amber", drivers:[str]}
  // consolidated alerts are computed per currency (sum of that currency's accounts, no FX conversion)
  // whatif delta.worst_gap_* is the largest gap_amount among the alerts, in that alert's currency
Adjustment = {flow_id?, account_id, expected_date, amount, direction, shift_days?:int, remove?:bool}
BacktestResponse = {
  horizon_days, folds, step_days, rows_evaluated,
  per_horizon:[{h, pinball_p05, pinball_p50, pinball_p95, coverage_90, mae_p50, baseline_mae, baseline_pinball_p50}],
  summary:{mean_pinball_p50, baseline_mean_pinball_p50, improvement_pct, mean_coverage_90, target_coverage:0.9},
  baseline:"seasonal_naive_7d",
  folds_detail:[{fold, train_end, test_start, test_end}],
  model, elapsed_seconds        // per_horizon rows also carry n; summary also has mean_mae_p50, baseline_mean_mae
}
Errors: 422 `detail` is either FastAPI's list of `{loc, msg}` (request schema) or `{message, errors:[{row, column, message}]}` (CSV or adjustment validation).
```

Backtest protocol: rolling-origin. For each fold, train on history up to `train_end`, forecast the next `horizon_days`, score against actual `ending_balance`. Baseline: seasonal naive (net_flow = net_flow 7 days earlier, cumulated). Report pinball loss per quantile, 90 % interval coverage (share of actuals inside P5–P95), MAE of P50. Never claim improvement the numbers do not show.

## Frontend (Next.js, `frontend/`)

Pages:
- `/` Dashboard: dataset summary strip (source, rows, accounts, as-of), per-account cards with settled balance and days-to-first-gap, fan chart (P5–P95 band, P50 line, required buffer line, scheduled flows markers) for the selected account, alerts panel (per-account + consolidated), model card (type, components, weights, fallback reason).
- `/backtest`: run backtest, table per horizon, chart of pinball P50 vs baseline by horizon, coverage line vs 0.9 target, plain-language summary.
- `/what-if`: list of scheduled flows with editable date shift / amount / remove, "Run scenario" → before/after alerts and overlaid fan charts.
- `/data`: generate synthetic (accounts, days, seed) or upload CSV; shows validation warnings and row-level 422 errors; links to the sample files served by `GET /api/data/samples/{name}`.
- `/how-it-works`: plain-language explainer (problem, pipeline diagram, model, backtest numbers, limitations).

Static demo (`NEXT_PUBLIC_DEMO=1`, `npm run build:demo`, deployed to Vercel via `vercel.json`): a static export that reads responses the real backend precomputed into `frontend/public/demo/` (`backend/scripts/export_demo.py`, `make demo-data`). It is precomputed output, not a fallback: live-mode pages never fetch it (only `/how-it-works` embeds its numbers at build time). Generate/upload/re-run are hidden; what-if offers the precomputed scenarios, each built only from supported adjustments.

Rules: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). If the backend is unreachable show a clear error banner; no fake data fallback. Every screen states "Synthetic data — demo". English UI only. Light/dark via `prefers-color-scheme`. recharts for charts.

## Definition of done

1. `docker compose up` → backend healthy on :8000, frontend on :3000, dashboard renders forecast and alerts for the default synthetic dataset.
2. `make test` (pytest) green locally and in GitHub Actions; frontend `lint` + `build` green.
3. README (EN) explains: problem, what the prototype does, how to run, API table, backtest results from the default dataset (actual numbers), limitations.
4. CV bullets written from what runs, not from the plan.
