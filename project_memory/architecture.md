# Architecture Memory

## Frontend

- Next.js App Router.
- Global CSS in `app/globals.css`.
- Product routes: `/`, `/liquidity-control-tower`, `/demo`, `/judge`, `/technical`, `/functions/[functionKey]`.
- Shared Golden Incident data is derived from `backend/artifacts/demo_snapshot.json` in `lib/golden-incident.ts`.
- Live backend calls are centralized in `lib/api.ts`.
- Demo snapshot calls are proxied through `lib/backend/client.ts` and fall back to deterministic replay artifacts.
- Golden Incident UI lives in `components/liquidity/DemoCockpit.tsx`.
- Realtime demo UI lives in `components/liquidity/RealtimeDemoDashboard.tsx` and is mounted at `/demo`.
- World liquidity map dashboard lives in `components/liquidity/WorldLiquidityMap.tsx` and is mounted on `/` plus `/liquidity-control-tower`.
- `RealtimeDemoDashboard` is client-side only: it advances demo time with an interval, computes projected account balances, renders rescue flows, and applies the execute-plan adjustment locally.
- `WorldLiquidityMap` is currently client-side state only: account selection, capital editing, synthetic condition generation, add-account flow, scenario selection, transfer route drawing, and program response computation are local demo interactions.
- Transfer route visualization is rendered inside the map component as SVG paths over the static world geometry, with account nodes remaining HTML buttons for accessibility.
- Phase 8 pitch/runtime UI also lives in `DemoCockpit`: `RuntimeStrip`, `DecisionStateBar`, and `PitchModePanel`.
- Function-by-function inspection lives in `components/liquidity/FunctionWorkbench.tsx` and uses native expandable modules for resilience without fragile client state.
- Function drilldown pages live in `components/liquidity/FunctionDetailView.tsx`, backed by shared registry data from `lib/function-modules.ts`.
- Judge proof UI lives in `components/liquidity/JudgeView.tsx`.
- Technical proof UI lives in `components/liquidity/TechnicalView.tsx`.
- Mission orchestration lives in `hooks/useLiquidityMission.ts`.
- Mission UI lives in `components/mission/MissionControl.tsx`.
- Product navigation lives in `components/product/ProductNav.tsx`.
- URL query state drives demo phases: `?phase=pending`, `?phase=breached`, `?phase=rejected`.

## Backend

- FastAPI backend is proxied through Next route `/api/backend/[...path]`.
- Verification command: `npm run backend:verify`.
- Contract export command: `npm run backend:contracts`.
- Deterministic demo artifacts live in `backend/artifacts`.

## Current Architecture Principles

- Keep backend math authoritative.
- Keep fallback/demo mode explicit in receipts.
- Avoid duplicating backend formulas in view components unless needed for display formatting.
- Refactor large components only when a behavior change or maintainability gain justifies it.
- Prefer typed adapters over direct JSON shape assumptions in UI components.
