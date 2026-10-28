# TrueAvail frontend

Next.js (App Router, TypeScript, Tailwind v4) UI for the TrueAvail 14-day liquidity forecasting prototype. API contract: `../docs/SPEC.md`. Design system, page specs and the visual reference: `../docs/design/`.

Pages:

| Route | What it shows |
|---|---|
| `/` | Overview: hero with the account globe and three live stats, the model room (six animated steps from 600 observations to one cash gap, plus LightGBM feature importances), a dashboard preview, what-if teaser, pipeline teaser and the backtest proof |
| `/forecast` | Command center: account rail, P5/P50/P95 corridor chart, alerts timeline, model card, precomputed what-if scenarios (`?account=` selects the account) |
| `/what-if` | Scenario list (demo) or editable scheduled flows (live) with a before → after corridor morph and alerts before / after |
| `/backtest` | Rolling-origin backtest: stats, pinball and coverage charts, per-horizon and fold tables, raw JSON, weak spots |
| `/data` | Active dataset, CSV schema and sample files; generate / upload in live mode |
| `/how-it-works` | Scroll story: a sticky nine-stage pipeline diagram with one real number per stage (numbers read at build time from `public/demo/*.json`) |

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
| `NEXT_PUBLIC_USE_FIXTURES` | unset | `1` serves typed fixtures from `src/lib/fixtures/` instead of calling the API (the model room reuses the backend export `public/demo/explain.json`). The banner says "Fixtures mode". |
| `NEXT_PUBLIC_DEMO` | unset | `1` (`npm run build:demo`): static export to `out/` with `trailingSlash`; the client reads backend responses precomputed by `backend/scripts/export_demo.py` (`make demo-data`) from `public/demo/`. Re-run, generate and upload are disabled with an explanation, what-if switches between precomputed scenarios. Takes precedence over fixtures. |

In live mode a failed request shows an error banner with the URL tried and a Retry button; there is no fallback to fixture data.

## Layout

- `src/app/tokens.css` – design tokens from `docs/design/tokens.css` (light primary, dark via `prefers-color-scheme` or the theme toggle); `globals.css` bridges them into Tailwind and defines the type styles.
- `src/components/ui/` – primitives: Button, Chip, Tag, Segmented, Tabs, Switch, StatTile, Ticker, banners, fields, Mark.
- `src/components/charts/` – `Corridor` (the fan chart used everywhere: gradient corridor, P5 edge, buffer, gap bands, flow markers, crosshair tooltip, table view, open and morph animations), backtest lines, bars, sparkline. Plain SVG, no chart library.
- `src/components/globe/` – orthographic globe (d3-geo, topojson-client, world-atlas): server-rendered static SVG plus the interactive client globe (drag / arrow keys, edge- and collision-aware labels).
- `src/components/model-room/` – the six-step model room driven by `GET /api/forecast/explain`.
- `src/components/dashboard/`, `landing/`, `how-it-works/`, `backtest/` – page sections.
- `src/lib/` – API client (`api.ts`), types, formatting, derivations (`derive.ts`: every on-screen number is computed from backend responses), illustrative city mapping (`geo.ts`), fixtures.
- `public/demo/` – precomputed backend output for the static demo (health, accounts, history, scheduled flows, forecast, explain, alerts, backtest, optimizer, stress, six what-if scenarios, sample CSVs, `manifest.json`).
- `docs/screenshots/` – screenshots of the static demo build.
