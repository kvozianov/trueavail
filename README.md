# Liquidity Control Tower

Liquidity Control Tower is a fintech treasury MVP for PSPs, neobanks, and multi-currency finance teams.

The product shows not just how much money a company has on paper, but how much liquidity is actually usable after settlement delays, cut-offs, holidays, buffers, and planned payouts. The main demo scenario finds a future EUR cash gap, explains why it happens, runs a cost-minimizing treasury optimizer, and then applies a governance gate before any approval.

## Demo Goal

In 3–5 minutes, the demo should answer four questions:

- Where is the liquidity risk?
- When will it happen?
- Why will it happen?
- What action should treasury approve, reject, or escalate?

## MVP Scope

The MVP uses synthetic data instead of real bank integrations. It focuses on clear settlement logic, explainable cash gap detection, deterministic recommendations, and a dashboard that can be shown to a jury without extra setup.

Out of scope for the hackathon MVP:

- real bank APIs;
- real payments;
- production ML;
- ERP/TMS integrations;
- complex RBAC or compliance flows.

## Main Demo Story

1. Total cash looks healthy.
2. Usable EUR liquidity drops because card clearing settles later than a merchant payout.
3. A bank holiday pushes an expected inflow by one business day.
4. The dashboard raises a Red risk alert for a cash gap in roughly 36 hours.
5. The PuLP optimizer proposes the cheapest CCRI-compliant transfer route.
6. The governance gate checks whether the transfer worsens the p05 forecast breach, leaves HHI above policy, or depends on unavailable TARGET2 rails.
7. The AI Council explains why the current action should be rejected or escalated before a human approval.
8. The ROI block still shows the economic stakes, but the dashboard labels the plan as blocked until treasury resolves the funding direction and rail feasibility.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 Backend

The Python backend contains the MVP data and ML layer:

- synthetic balances, transactions, settlement rules, bank risk scores, and transfer costs in `backend/data`;
- pandas feature engineering with cyclical hour encoding, EWMA, rolling statistics, and MAD-based anomaly flags;
- LightGBM quantile forecasting support for p05 / p50 / p95 when `lightgbm` and `scikit-learn` are installed;
- EWMA + volatility fallback so the demo still returns a forecast corridor without optional ML dependencies;
- FastAPI endpoint `POST /api/forecast/run`.

Run the Phase 1 forecast check:

```bash
npm run backend:forecast
```

Run backend tests:

```bash
npm run backend:test
```

Start the FastAPI server:

```bash
npm run backend:dev
```

Run the Phase 2 optimizer demo:

```bash
npm run backend:optimizer
```

Run the backend-only end-to-end demo for the future UI:

```bash
npm run backend:demo
```

Run the AI Council review:

```bash
npm run backend:council
```

Fast AI Council smoke test without live API calls:

```bash
AI_COUNCIL_MODE=mock AI_COUNCIL_PEER_REVIEW=false npm run backend:council
```

Live AI Council with fewer calls:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5.2"
AI_COUNCIL_PEER_REVIEW=false npm run backend:council
```

Install Python dependencies when working on the ML path:

```bash
python3 -m pip install -r requirements.txt
```

On macOS, LightGBM also needs OpenMP:

```bash
brew install libomp
```

The optimizer exposes `POST /api/optimizer/rebalance`. It uses PuLP/CBC when `pulp` is installed and keeps a deterministic fallback for demo continuity. The model minimizes transfer cost while enforcing account floor constraints, binary route usage, and CCRI-driven exposure limits.

Backend API contracts prepared for the external UI service:

- `POST /api/forecast/run`: p05 / p50 / p95 forecast corridor, feature quality, WAPE, coverage, HHI, first breach.
- `POST /api/optimizer/rebalance`: PuLP transfer recommendation with costs, post-transfer balances, HHI before/after, audit events.
- `POST /api/stress/run`: `bank_run` or `target2_outage` stress coefficients, stressed balances, ES 99%, HHI before/after, optional optimizer recommendation, and approval gate.
- `POST /api/recommendation/approve`: applies recommended transfers to mock balances and returns an audit log.
- `POST /api/explainability/summary`: root causes, event timeline, formula cards, and data-quality notes for the dashboard explanation drawer.
- `POST /api/roi/summary`: CFO-facing before/after economics, optimizer cost, avoided downside gap, ES 99%, and released reserve.
- `POST /api/ai-council/review`: five independent AI advisor reviews, optional peer review, and a chairman verdict over the mathematical backend outputs.
- `GET /api/demo/snapshot`: combined forecast + stress + primary recommendation payload for dashboard integration.

AI Council uses `OPENAI_API_KEY` from the environment when available. Optional:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-5.2"
```

Or create a local `.env` file:

```bash
cp .env.example .env
```

Then edit `.env`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.2
AI_COUNCIL_PEER_REVIEW=false
```

`.env` is ignored by git. Commit only `.env.example`.

Without a key, the backend returns a deterministic mock council with the same response shape, so the demo and UI integration remain stable.
