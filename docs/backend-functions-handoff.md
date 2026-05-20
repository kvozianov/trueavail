# Liquidity Control Tower Backend Function Handoff

This document summarizes the full backend surface of the project for another AI/model.

## Scope

Backend code is in `backend/liquidity_control_tower/`.

The backend is a Python FastAPI service for a treasury/liquidity MVP. It uses deterministic demo CSV data, pandas feature engineering, quantile forecasting, stress scenarios, a liquidity rebalancing optimizer, governance checks, explainability, ROI summaries, contingency plans, and an AI Council review layer.

Frontend proxy is in `app/api/backend/[...path]/route.ts`; it forwards `GET` and `POST` requests to `BACKEND_URL` or `http://127.0.0.1:8000`.

## Key Runtime Constants

- Demo clock: `2026-05-18T09:00:00Z`
- Demo history seed: `42`
- Default forecast horizon: `14` days
- Default history window: `120` days
- MAD z-score anomaly threshold: `4.0`
- EWMA alpha: `0.35`
- HHI alert threshold: `0.25`
- Default CCRI downgrade delta: `25`
- Default OpenAI model: `gpt-5.2`
- Default Anthropic model: `claude-sonnet-4-5-20250929`

## Public API Endpoints

| Method | Path | Handler | Purpose |
|---|---|---|---|
| `GET` | `/health` | `health` | Returns `{ "status": "ok" }`. |
| `GET` | `/api/demo/metadata` | `demo_metadata` | Returns demo constants, thresholds, model weights, and UI-ready endpoint list. |
| `GET` | `/api/demo/snapshot` | `demo_snapshot` | Returns combined deterministic dashboard payload: forecast, stress scenarios, primary recommendation, explanation, ROI, contingency plan, and mock AI Council. |
| `POST` | `/api/forecast/run` | `run_forecast` | Runs p05/p50/p95 liquidity forecast corridor and returns quality metrics, known events, anomaly flags, HHI, formulas, and first breach. |
| `POST` | `/api/optimizer/rebalance` | `rebalance` | Runs the cost-minimizing liquidity transfer optimizer with CCRI exposure limits and optional survival floors. |
| `POST` | `/api/stress/run` | `stress_run` | Runs `bank_run` or `target2_outage` stress scenario, ES99, HHI, optional optimizer, and approval gate. |
| `POST` | `/api/recommendation/approve` | `approve_recommendation` | Applies a transfer plan to mock balances and returns post-transfer balances, HHI, accounts below buffer, and audit log. |
| `POST` | `/api/explainability/summary` | `explainability_summary` | Builds explanation drawer payload: root causes, timeline, formula cards, data-quality notes. |
| `POST` | `/api/roi/summary` | `roi_summary` | Builds CFO-facing before/after economics: optimizer cost, ES99, avoided gap, released reserve. |
| `POST` | `/api/contingency/plan` | `contingency_plan` | Builds emergency playbook when optimizer/gate blocks the plan: prefunding, deferrals, fallback rails, intraday credit. |
| `POST` | `/api/ai-council/review` | `ai_council_review` | Runs five-advisor AI Council with optional peer review using mock/OpenAI/Anthropic/mixed provider modes. |

## Public Request/Response Models

`schemas.py` defines all Pydantic contracts.

### Forecast

- `ForecastRequest`: `horizon_days`, `as_of`, `prefer_lightgbm`
- `ForecastRunResponse`: `generated_at`, `model_type`, `model_available`, `fallback_reason`, `model_components`, `model_weights`, `feature_quality`, `known_events`, `anomaly_flags`, `metrics`, `hhi`, `forecast`, `first_breach`, `formulas`
- `ForecastPoint`: per-account/date p05/p50/p95 balances, usable liquidity, scheduled net flow, required buffer, known events, risk status, breach flag
- Supporting models: `FeatureQualitySummary`, `HHIResult`, `ForecastMetricSummary`, `KnownEventSummary`, `AnomalyFlagSummary`

### Optimizer

- `OptimizerRequest`: optional `balances`, optional `downgrade_bank_id`, `downgrade_score_delta`, optional `survival_min_balances`
- `OptimizerResponse`: `status`, `solver_engine`, `objective_value`, `total_transfer_cost`, `hhi_before`, `hhi_after`, `transfers`, `post_transfer_balances`, `bank_exposure_limits`, `survival_min_balances`, `audit_events`, `infeasible_reason`, `formulas`
- Supporting models: `OptimizerBalanceInput`, `TransferPlanItem`, `OptimizerAuditEvent`

### Stress

- `StressScenarioRequest`: `scenario_id` (`bank_run` or `target2_outage`), `run_optimizer`, optional `downgrade_bank_id`
- `StressScenarioResponse`: scenario metadata, stress coefficients, stressed balances, total loss, ES99, HHI before/after, accounts below buffer, optional optimizer recommendation, approval gate, formulas
- Supporting models: `StressCoefficient`, `StressBalancePoint`, `ExpectedShortfallSummary`

### Workflow / Explanation / Value

- `ApprovalRequest`: `balances`, `transfers`, `approved_by`, `reason`
- `ApprovalResponse`: approval summary, transfer totals, post-transfer balances, HHI, accounts below buffer, audit log, formulas
- `ExplanationRequest`: `scenario_id`, optional `downgrade_bank_id`
- `ExplanationResponse`: summary, risk status, affected account/currency, root causes, timeline, formula cards, data-quality notes
- `RoiRequest`: `scenario_id`, optional `downgrade_bank_id`
- `RoiResponse`: summary, metrics, optimizer cost, ES99, avoided gap, released reserve, approval gate, formulas
- `ContingencyPlanRequest`: `scenario_id`, optional `downgrade_bank_id`
- `ContingencyPlanResponse`: plan status, optimizer status/reason, gate decision, p05 gap, deferrable coverage, intraday credit need, actions, formulas

### AI Council

- `AICouncilRequest`: `scenario_id`, optional `downgrade_bank_id`, `mode` (`auto`, `live`, `mock`, `openai`, `anthropic`, `mixed`), optional `provider`, `peer_review`, optional `model`, optional `anthropic_model`
- `AICouncilResponse`: resolved mode/provider, provider availability, fallback reason, framed question, mathematical facts, advisor responses, peer reviews, chairman verdict, formulas used

## Internal Function Inventory

### `api.py`

- `health()`: health check.
- `demo_metadata()`: exposes product version, demo clock, thresholds, model weights, endpoint list.
- `run_forecast(request)`: delegates to `run_phase1_forecast`.
- `rebalance(request)`: converts optional balance payload to DataFrame and delegates to `solve_liquidity_rebalance`.
- `stress_run(request)`: delegates to `run_stress_scenario`.
- `approve_recommendation(request)`: applies approved transfers via `apply_transfer_approval`.
- `explainability_summary(request)`: delegates to `build_explanation`.
- `roi_summary(request)`: delegates to `build_roi_summary`.
- `contingency_plan(request)`: delegates to `build_contingency_plan`.
- `ai_council_review(request)`: delegates to `run_ai_council`.
- `demo_snapshot()`: assembles deterministic UI payload from forecast, stress, optimizer, explanation, ROI, contingency, and mock council.

### `data_loader.py`

- `_read_csv(name, **kwargs)`: reads CSV from `backend/data`.
- `load_demo_data()`: loads balances, transactions, settlement rules, bank risk scores, transfer costs, holidays, known events, stress scenarios, observed movements.
- `generate_synthetic_daily_history(balances, as_of, history_days, seed)`: creates deterministic historical daily net-flow data per account/currency.

### `settlement.py`

- `to_timestamp(value)`: normalizes strings/Pandas timestamps.
- `date_key(value)`: returns ISO date key.
- `_holiday_dates(holidays)`: extracts holiday date set.
- `is_business_day(value, holidays)`: checks weekdays excluding holidays.
- `next_business_day(value, holidays)`: rolls to next business day.
- `add_business_days(value, business_days, holidays)`: adds settlement business days.
- `calculate_settlement_timestamp(transaction, settlement_rules, holidays)`: computes settlement timestamp from transaction and rule table.
- `calculate_cash_availability_timestamp(transaction, settlement_rules, holidays)`: computes when cash becomes usable.

### `features.py`

- `add_cyclical_time_features(frame, timestamp_col)`: adds cyclical hour/day/month features.
- `calculate_ewma(series, alpha)`: calculates exponentially weighted moving average.
- `add_calendar_features(frame, holidays)`: adds weekend/holiday/business-day calendar fields.
- `_empty_known_event_features(frame)`: creates empty known-event feature columns.
- `add_known_event_features(frame, known_events)`: annotates payroll, merchant payout, holidays, settlement delays, etc.
- `add_mad_zscore_flags(frame, group_cols, value_col, window, threshold)`: flags robust MAD anomalies.
- `add_rolling_features(frame, alpha)`: adds rolling median, MAD, volatility, EWMA features.
- `build_scheduled_cashflow_frame(transactions, settlement_rules, holidays)`: converts transactions into settled/available scheduled cashflow rows.
- `build_feature_matrix(history, holidays, known_events, alpha, anomaly_threshold)`: builds model-ready feature frame and quality summary.
- `summarize_anomaly_flags(feature_frame, limit, threshold)`: returns top anomaly rows for UI/explainability.
- `latest_feature_state(feature_frame)`: returns latest row per account/currency.

### `forecasting.py`

- `WeightedModel`: dataclass for one model component and its weight.
- `WeightedQuantileEnsemble.__init__(components)`: stores weighted model components.
- `WeightedQuantileEnsemble.predict(features)`: weighted prediction across components.
- `QuantileModelBundle`: dataclass containing p05/p50/p95 ensembles, model availability, components, weights, fallback reason.
- `_fallback_model_bundle(trainable, reason)`: builds deterministic EWMA-volatility fallback bundle.
- `_train_quantile_ensemble_models(trainable)`: trains LightGBM/sklearn quantile models where available.
- `_residual_scale_by_account(trainable)`: estimates residual scale per account.
- `_scheduled_flows_by_day(transactions, settlement_rules, holidays, as_of)`: aggregates future scheduled flows.
- `_future_feature_row(account_state, forecast_date, holidays, known_events, synthetic_net_flow)`: builds one future feature row.
- `_known_events_for_point(known_events, forecast_key, account)`: attaches known events to forecast point.
- `_predict_model_flows(bundle, feature_row, fallback_center, fallback_scale, horizon_step)`: predicts p05/p50/p95 net flow.
- `_build_forecast_points(data, feature_frame, bundle, as_of, horizon_days)`: builds forecast points and breach flags.
- `_calculate_demo_metrics(trainable, forecast, as_of, model_type)`: returns WAPE, band coverage, lead time, model version.
- `run_phase1_forecast(horizon_days, as_of, prefer_lightgbm)`: main forecast orchestration function.

### `risk.py`

- `calculate_hhi(balances, balance_col, threshold)`: calculates Herfindahl-Hirschman concentration index and per-bank contributions.
- `risk_status_from_quantiles(balance_p05, balance_p50, required_buffer)`: maps quantile forecast to green/amber/red style risk status.

### `optimizer.py`

- `Route`: dataclass for possible transfer route.
- `Route.key()`: returns route identity tuple.
- `Route.variable_cost_for(amount)`: calculates variable cost.
- `Route.total_cost_for(amount)`: calculates fixed plus variable transfer cost.
- `max_exposure_share_by_ccri(score)`: maps CCRI score to max bank exposure share.
- `_normalise_balances(balances)`: coerces balances to expected numeric/string structure.
- `apply_ccri_downgrade(bank_risk_scores, downgrade_bank_id, score_delta)`: downgrades one bank and emits audit event.
- `calculate_bank_exposure_limits(balances, bank_risk_scores, transfer_costs)`: calculates per-bank/currency exposure caps.
- `_limit_key(bank_id, currency)`: builds limit map key.
- `_build_routes(balances, transfer_costs)`: builds feasible source/destination transfer routes.
- `_post_balances_from_transfers(balances, transfers)`: applies planned transfers to balances.
- `_transfer_payload(route, amount)`: serializes transfer plan item.
- `_bank_exposures(balances)`: totals exposure by bank/currency.
- `_validate_solution(balances, exposure_limits, survival_min_balances)`: checks caps and survival floors.
- `_solve_with_pulp(balances, routes, exposure_limits, survival_min_balances)`: MIP optimization path using PuLP/CBC.
- `_solve_with_greedy_fallback(balances, routes, exposure_limits, survival_min_balances)`: deterministic fallback when PuLP unavailable.
- `solve_liquidity_rebalance(...)`: main optimizer orchestration.

### `stress.py`

- `_normalise_balance_input(balances)`: uses provided balances or demo balances.
- `_scenario_rows(scenario_id, stress_scenarios)`: filters scenario coefficient rows.
- `_coefficient_for(account, scenario_rows)`: finds matching stress coefficient for account.
- `apply_stress_scenario(scenario_id, balances, stress_scenarios)`: applies balance multipliers and delays to balances.
- `deterministic_loss_distribution(total_loss, scenario_id, points)`: creates deterministic synthetic loss distribution.
- `calculate_expected_shortfall_99(losses)`: calculates ES99 tail metric.
- `survival_min_balances_from_forecast(forecast, balances)`: converts forecast p05 gaps into optimizer survival floor constraints.
- `run_stress_scenario(scenario_id, run_optimizer, downgrade_bank_id, balances)`: main stress orchestration with optional optimizer and approval gate.
- `apply_transfer_approval(balances, transfers, approved_by, reason)`: applies transfers and produces approval/audit response.

### `governance.py`

- `_forecast_gaps_by_account(forecast)`: extracts p05 liquidity gaps from forecast.
- `_net_transfer_impact(transfers)`: calculates net balance effect per account from transfer plan.
- `validate_recommendation_gate(...)`: approves/rejects/escalates optimizer recommendation based on p05 breach worsening, HHI policy, below-buffer accounts, and rail/scenario constraints.

### `explainability.py`

- `_formula_cards()`: returns human-readable formulas.
- `_forecast_root_causes(forecast)`: builds root causes from first forecast breach and known events.
- `_stress_root_causes(stress)`: builds root causes from stressed balances, loss, ES99, and gate.
- `build_explanation(scenario_id, downgrade_bank_id)`: main explanation payload builder.

### `roi.py`

- `_min_downside_gap(forecast)`: calculates downside p05 liquidity gap.
- `build_roi_summary(scenario_id, downgrade_bank_id)`: builds before/after economics and business value metrics.

### `contingency.py`

- `_pending_outflows_for_account(transactions, account_id, currency, as_of, horizon_days)`: finds short-horizon pending outflows.
- `_deferrable_outflow_actions(transactions, account_id, currency, gap, as_of)`: creates deferral actions and coverage amount.
- `build_contingency_plan(scenario_id, downgrade_bank_id, as_of)`: builds emergency playbook with prefunding, deferrals, fallback rails, and intraday credit.

### `ai_council.py`

- `build_council_facts(scenario_id, downgrade_bank_id)`: gathers forecast, stress, optimizer, gate, ROI, contingency, formulas into a fact pack.
- `frame_council_question(facts)`: creates the decision question for advisors.
- `_openai_client()`, `_client()`, `_anthropic_client()`: provider clients.
- `_openai_response_text(response)`, `_anthropic_response_text(response)`: response text extraction.
- `_call_openai(prompt, model)`, `_call_anthropic(prompt, model)`, `_call_provider(...)`: provider calls.
- `_provider_available(provider)`: checks env/client availability.
- `_resolve_provider_mode(mode, provider)`: resolves `auto/live/mock/openai/anthropic/mixed`.
- `_advisor_provider(advisor, provider_mode)`: routes advisor to provider.
- `_live_providers_for_mode(provider_mode)`: provider set needed for mode.
- `_normalise_anthropic_model(model)`: normalizes Anthropic model setting.
- `_advisor_prompt(advisor, framed_question, facts)`: builds advisor prompt.
- `_review_prompt(reviewer, framed_question, advisor_responses)`: builds peer-review prompt.
- `_chairman_prompt(framed_question, advisor_responses, peer_reviews)`: builds final verdict prompt.
- `_mock_advisor_response(advisor, facts)`: deterministic mock advisor.
- `_mock_peer_review(reviewer)`: deterministic mock peer review.
- `_mock_verdict(facts)`: deterministic chairman verdict.
- `_run_parallel(items, fn)`: parallel helper for advisor/review calls.
- `run_ai_council(...)`: main AI Council orchestration.

## Scripts

- `backend/scripts/run_phase1_demo.py`: runs forecast demo.
- `backend/scripts/run_phase2_optimizer_demo.py`: runs optimizer demo.
- `backend/scripts/run_phase3_backend_demo.py`: runs backend end-to-end demo flow.
- `backend/scripts/run_ai_council_demo.py`: runs AI Council demo.
- `backend/scripts/export_ui_contracts.py`: exports OpenAPI, demo snapshot, metadata, and UI handoff JSON artifacts.

## Data Files

- `balances.csv`: account/bank/currency settled balances and required buffers.
- `transactions.csv`: synthetic scheduled cash movements.
- `settlement_rules.csv`: rail/card/transfer settlement and availability rules.
- `bank_risk_scores.csv`: CCRI/risk scores used for exposure limits.
- `transfer_costs.csv`: fixed/variable transfer costs and route availability.
- `calendar_holidays.csv`: business-day holiday calendar.
- `known_events.csv`: payroll, merchant payouts, holidays, settlement delay events.
- `stress_scenarios.csv`: coefficients for `bank_run` and `target2_outage`.
- `observed_movements.csv`: observed movements used by demo logic.

## Generated Artifacts

- `backend/artifacts/openapi.json`: full FastAPI contract.
- `backend/artifacts/demo_snapshot.json`: deterministic dashboard payload.
- `backend/artifacts/demo_metadata.json`: demo clock, seed, thresholds, model weights, endpoint list.
- `backend/artifacts/ui_handoff_summary.json`: summary for frontend/UI handoff.

## Important Behavior Notes

- Backend is synthetic/demo-first; no real bank APIs or real payments.
- Forecast path tries LightGBM/sklearn quantile models, but has deterministic EWMA-volatility fallback.
- Optimizer uses PuLP/CBC when available and deterministic greedy fallback otherwise.
- Optimizer can return `infeasible` rather than forcing a misleading transfer plan.
- Stress scenarios can call optimizer and then governance gate.
- AI Council can run fully deterministic mock mode without API keys; live OpenAI/Anthropic modes depend on environment keys.
- The main UI integration endpoint is `GET /api/demo/snapshot`.
