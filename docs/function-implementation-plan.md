# Function Implementation Plan

Source: `/Users/kirill/Downloads/Liquidity_Control_Tower_Functions.docx`, backend FastAPI contract, and `backend/artifacts/demo_snapshot.json`.

## Product Routes

- `/dashboard`: operational command center with live treasury state, settlement observatory, delay markers, scenario controls, gate verdict, and evidence rail.
- `/functions`: implementation map for every MVP function, grouped by capability area.
- `/functions/[slug]`: individual function pages. Pages use different layouts by category so unrelated functions do not feel like copied cards.

## Function Groups

- Forecast & Data Science: forecast corridor, ML ensemble, feature engineering, anomaly filtering, known events, risk status, HHI.
- Optimization & Risk: CCRI, MIP optimizer, survival floor constraints, stress testing, ES99, governance gate, contingency plan.
- Workflow & Business Value: recommendation approval, explainability, ROI, AI Council, OpenAI + Claude routing.
- UI & Integration: demo snapshot, OpenAPI contract, UI handoff artifacts, backend verify.

## Implementation Steps

- [x] Extract MVP functions from the DOCX and current backend routes.
- [x] Create shared function catalog data for UI pages.
- [x] Add `/functions` index page with grouped implementation status.
- [x] Add `/functions/[slug]` pages with category-specific layouts.
- [x] Add `/dashboard` with rotating globe, treasury flow routes, delay indicators, and backend-derived panels.
- [ ] Add deeper interaction against live FastAPI endpoints when the frontend is ready to depend on `backend:dev`.
