# TrueAvail frontend

Next.js (App Router, TypeScript, Tailwind, recharts) UI for the TrueAvail 14-day liquidity forecasting prototype. API contract: `../docs/SPEC.md`.

Pages: `/` dashboard, `/backtest`, `/what-if`, `/data`, `/how-it-works` (plain-language explainer; its numbers are read at build time from `public/demo/*.json`).

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

Static demo (the build deployed to Vercel, no backend needed):

```bash
npm run build:demo     # NEXT_PUBLIC_DEMO=1 next build -> static export in out/
npx serve out          # or any static file server
```

Docker:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t trueavail-frontend .
docker run -p 3000:3000 trueavail-frontend
```

## Environment variables

All are read at build time (inlined into the client bundle).

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL. The browser calls it directly, so it must be reachable from the user's machine. |
| `NEXT_PUBLIC_USE_FIXTURES` | unset | `1` serves typed fixtures from `src/lib/fixtures/` instead of calling the API. The header shows "Fixtures mode". |
| `NEXT_PUBLIC_DEMO` | unset | `1` (`npm run build:demo`): static export to `out/` with `trailingSlash`; the client reads backend responses precomputed by `backend/scripts/export_demo.py` (`make demo-data`) from `public/demo/`. Generate/upload and re-run buttons are hidden, what-if switches between precomputed scenarios, and the header shows a one-line demo banner. Takes precedence over fixtures. |

In live mode a failed request shows an error banner with the URL tried and a Retry button; there is no fallback to fixture data.

## Layout

- `src/lib/api.ts` – typed client for every SPEC endpoint, `ApiError` (network / http / validation / parse).
- `src/lib/useApi.ts` – small fetch hook (loading, error, reload).
- `src/lib/types.ts` – response and request types from the SPEC.
- `src/lib/fixtures/` – deterministic sample responses (5 accounts, 120-day history, 14-day P5/P50/P95, alerts, backtest, what-if).
- `src/components/` – nav, fan chart, alerts list, model card, error banner, UI primitives.
- `public/demo/` – precomputed backend output for the static demo (health, accounts, history, scheduled flows, forecast, alerts, backtest, optimizer, stress, six what-if scenarios, sample CSVs, `manifest.json`). In live mode the `/data` page links to the backend's sample CSVs (`GET /api/data/samples/{name}`); in demo mode to the copies here.
- `docs/screenshots/` – full-page screenshots against the live docker-compose stack (PostgreSQL-backed backend, default seed-42 dataset).
