# TrueAvail frontend

Next.js (App Router, TypeScript, Tailwind, recharts) UI for the TrueAvail 14-day liquidity forecasting prototype. API contract: `../docs/SPEC.md`.

Pages: `/` dashboard, `/backtest`, `/what-if`, `/data`.

## Run

```bash
npm ci
npm run dev            # http://localhost:3000, expects the backend on http://localhost:8000
npm run lint
npm run build && npm start
```

Without a backend, run against bundled fixtures:

```bash
npm run dev:fixtures   # same as NEXT_PUBLIC_USE_FIXTURES=1 npm run dev
```

Docker:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t trueavail-frontend .
docker run -p 3000:3000 trueavail-frontend
```

## Environment variables

Both are read at build time (inlined into the client bundle).

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL. The browser calls it directly, so it must be reachable from the user's machine. |
| `NEXT_PUBLIC_USE_FIXTURES` | unset | `1` serves typed fixtures from `src/lib/fixtures/` instead of calling the API. The header shows "Fixtures mode". |

In live mode a failed request shows an error banner with the URL tried and a Retry button; there is no fallback to fixture data.

## Layout

- `src/lib/api.ts` – typed client for every SPEC endpoint, `ApiError` (network / http / validation / parse).
- `src/lib/useApi.ts` – small fetch hook (loading, error, reload).
- `src/lib/types.ts` – response and request types from the SPEC.
- `src/lib/fixtures/` – deterministic sample responses (5 accounts, 120-day history, 14-day P5/P50/P95, alerts, backtest, what-if).
- `src/components/` – nav, fan chart, alerts list, model card, error banner, UI primitives.
- Sample CSVs are not bundled: the `/data` page links to the backend (`GET /api/data/samples/{name}`).
- `docs/screenshots/` – full-page screenshots of the four pages against the live docker-compose stack (PostgreSQL-backed backend, default seed-42 dataset).
