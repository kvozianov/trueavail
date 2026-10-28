# TrueAvail — page-by-page spec (v1)

Read with `DESIGN_SYSTEM.md` (tokens, components, motion, copy) and `reference.html` (pixels). Every number quoted here comes from `frontend/public/demo/*.json` (`manifest.json` generated 2026-10-28, backend 0.2.0, dataset seed 42, 600 rows, as-of 2026-05-18). Where the spec says "live", the self-hosted build calls the API instead of reading JSON; the layout is identical.

Reviewer timeline used on every page:
- **5 s** — what the eye lands on: one headline, one coloured number, one picture.
- **30 s** — what one scroll or one click reveals: the evidence.
- **2 min** — what a curious reviewer can verify: limits, data, code.

---

## 1. Global

- Header (64 px) + demo banner (36 px) on every page; footer on every page. See `DESIGN_SYSTEM.md` § 8.10–8.12.
- Page container 1200 at 1440; gutters 120 / 32 / 16.
- Page title block on inner pages: eyebrow (mono, context: `FORECAST · AS OF MON 18 MAY 2026 · HORIZON 14 D · THRESHOLD P5`) → h1 (a finding, not a label) → optional right-aligned controls.
- Loading: skeletons in `--bg-3` with the exact final geometry (no spinners for page data); charts draw with the "corridor opens" animation once data is in.
- Error: `Backend unreachable` banner replaces page content below the title; no cached or fake data.

---

## 2. `/` — Overview (landing)

Goal: in 60–120 s convey a real forecasting system with a real model, real evaluation and honest limits. Sections in order; the page is ~6 viewports on desktop.

### 2.1 Hero (viewport 1)
Layout: 12-col grid, text spans 1–6 (560 px), globe spans 7–12 (580 px square), vertically centred; padding 64 top / 56 bottom.
- Eyebrow (accent, with dot) → display-xl H1 (two lines) → lead (46ch) → CTA row (primary lg `See the forecast` with `arrow-right`, secondary lg `How it works`, text link `Source on GitHub` with icon) → stats row (3 columns, hairline above, 44 px gap): value stat-l + mono label + 13 px note. Stat 1 value is `--gap`.
- Globe (`<Globe/>`): orthographic, rotate `[22, −44]`, scale 284 on a 600 box; sphere radial gradient white → `#ECEFF2`; graticule `#DFE3E8` 0.7 px; land `#E4E8ED` with `#CCD2DA` 0.6 px stroke; horizon ring `--hairline-2`. 5 nodes (accent, 4.5 px, white 2 px ring) at Frankfurt (Atlas EUR Operating), Amsterdam (Nova EUR Reserve), Luxembourg (Orion EUR Safeguarding), New York (Atlas USD Operating), London (Meridian GBP Operating). Leader lines to labels (city 12.5/600, account mono 11). Frankfurt node is `--gap-fill`, 5.5 px, two pulsing rings, third label line in mono `--gap`: `Gap −€2.13M · Tue 19 May`. Arcs: great circles with a 12 % altitude bulge, accent 1.3 px dashed 2.5/4 at 55 %, one per scheduled flow between the 5 nodes (NY→FRA, LON→FRA, AMS→FRA, LUX→FRA, FRA→NY, drawn from `scheduled.json` account pairs mapped to cities; direction = inflow toward the receiving account). Particles: 2.5 px accent dots, 4.5 s loop per arc. Caption under the globe in mono uppercase `--ink-4`: `Illustrative locations · 5 accounts · 7 scheduled flows`.
- Hover on a node: label gains a stat (balance / min P5 / days clear), 320 ms. Click: navigates to `/forecast?account=…`.
- 5 s: headline + red €2.13M + pulsing red node. 30 s: the three stats explain forecast / proof / honesty. 2 min: GitHub link, banner.
- Tablet: text then globe (440) centred. Mobile 375: eyebrow, H1 40 px, lead 16, CTAs wrap, globe 343, stats 2×2 (adds `600 / OBSERVATIONS / 5 accounts × 120 d`).
- Reduced motion / no JS: the static SVG (same projection, baked at build) with solid ring on Frankfurt.
- Labels are HTML (absolutely positioned over the SVG from projected coordinates) or SVG `<text>` with a fixed CSS font size, so they stay 12.5 / 11 px at every globe size; on mobile (343 px globe) only the two gap-relevant labels (Frankfurt with its gap line, New York) and the caption render, the other three nodes show their city on tap.

### 2.2 Proof strip (between hero and model room, `--bg-2`, 72 px tall)
Mono eyebrow line: `BACKTEST 29.2 % LOWER PINBALL LOSS · 6 FOLDS · 420 SCORED POINTS · COVERAGE 0.879 / 0.90 · LIGHTGBM + GBDT + EWMA · FASTAPI · POSTGRESQL · NEXT.JS` as a slow (40 s) marquee that stops on hover and is static under reduced motion. It doubles as the stack line.

### 2.3 Model room (viewports 2–3)
Section title block: eyebrow `MODEL ROOM · ATLAS EUR OPERATING` → h2 `Six steps from 600 observations to one cash gap.` → right: segmented account picker (5 accounts; default Atlas EUR because it has the gap; the copy below adapts its numbers) + `Replay` secondary sm + `Play all`.

**Desktop layout — sticky stage.** Left column (7 cols): the stage, a `--r-4` elevated card 760×420 containing one SVG (viewBox 520×220 scaled) that persists across steps; sticky at `top: 96px`. Right column (5 cols): six step blocks, each `min-height: 60vh`, with `STEP 0n ——` mono counter + title (15/600) + body (13.5). The step whose top crosses 45 % of the viewport is active (`useInView` with `margin: "-45% 0px -45% 0px"`); becoming active triggers that step's animation on the stage (not scrubbed — a deterministic `animate()` sequence). Scrolling back re-runs the earlier step's exit state. Progress dots (6) at the stage's bottom-left; clicking a dot scrolls to that step.

**Mobile.** Stage on top (full width, 220 px tall), then a horizontal stepper (6 dots + Prev/Next); the text block below swaps with the step. No sticky.

**Frames** (times are durations of the enter animation; all with `--ease`, reduced motion = final frame):

| # | Title | Stage shows | Enter animation | Text |
|---|---|---|---|---|
| 01 | 600 daily observations | 5 strips (one per account, label mono: `Atlas EUR`, `Nova EUR`, …), each 120 tiny bars (2.2 px wide) whose height is the day's balance normalised per account; counter top-right `0 / 600` | bars appear left→right, 1.2 s total, stagger 2 ms; counter ticks 0 → 600 over 1.2 s; 12 anomaly bars flash `--warn-fill` for 400 ms at the end | `120 days × 5 accounts. Each row is a balance and a net flow. **12** rows are flagged as anomalies, **548** remain trainable after the 7-day lags.` |
| 02 | Engineered features | the strips compress into one row at the top (300 ms), then 21 feature chips fan in grouped `CALENDAR` (5, violet tint) · `RECENT HISTORY (ATLAS EUR, 18 MAY)` (8, accent tint, with live values from `series[].latest_features`: `net_flow_lag_1 = 19.7K`, `net_flow_lag_2 = −3.5K`, `net_flow_lag_7 = 20.6K`, `balance_lag_1 = 2.98M`, `rolling_mean_7 = 16.9K`, `rolling_volatility_7 = 31.8K`, `ewma_net_flow = 13.4K`, `mad_zscore = 0.45`) · `SCHEDULED` (4, green tint) | chips enter 30 ms apart, y 6 → 0 + opacity, 900 ms total; the four scheduled chips enter last and then dim to 60 % (foreshadowing step 05) | `Calendar, lags of 1 / 2 / 7 days, a 7-day mean and volatility, an EWMA and an anomaly score. Scheduled payments are placed on their settlement date per rail.` |
| 03 | Three models, three corridors | axes (y −1M…3M, x 18 May → 1 Jun), start point 3.00M; three corridors from `explain.series[Atlas].components`: LightGBM (accent), GBDT (teal), EWMA (violet), each a 12 % band + 1.75 px P50; labels bottom-right: `LightGBM · P5 day 1 −1.14M`, `GBDT −1.11M`, `EWMA −1.16M · widest by day 14` | corridors draw one after another (P50 `pathLength` 500 ms, band opens 400 ms), LightGBM first; 1.6 s total | `LightGBM (120 trees), gradient boosting (90 trees) and an EWMA volatility baseline each draw their own P5–P95. On day 1 they agree within **€50K**: the gap is not a model artefact. EWMA, with no features, widens fastest.` |
| 04 | Weighted quantile blend | three weight bars (mono labels, 100 px tracks) bottom-right fill to 55 / 30 / 15 %; the three corridors cross-fade into the single blend corridor (accent band with the horizontal gradient) + 2 px P50 | bars fill 500 ms staggered 100 ms; corridors cross-fade 600 ms; total 1.2 s | `The three corridors collapse into one: **0.55** × LightGBM + **0.30** × GBDT + **0.15** × EWMA, quantile by quantile. Start balance and scheduled flows are added day by day.` |
| 05 | Crosses the buffer | buffer line €1.00M draws (dashed, `--gap-fill`, 300 ms) with label below-right `required buffer €1.00M`; the P5 dashed edge brightens; gap-day bands fade in (200 ms) on days 1–2 and 7–14 | 900 ms | `P5 falls under the €1.00M buffer on **Tue 19 May**: gap **€2.13M**. Eight smaller gaps follow from 25 May.` |
| 06 | Gap day lights up | day-1 dot on P5 (`--gap-fill`, white ring) scales 0 → 1 with one pulse; leader to the annotation `Tue 19 May · P5 −1.13M · gap 2.13M`; a ▼ marker on day 1 with tag `▼ €4.10M merchant payout · SEPA` and a ▲ on day 3 `€3.20M card settlement · Card Clearing (expected 18 May)`; the first alert item (same component as the dashboard) slides into the stage's bottom edge | 1.1 s | `Driver: the **€4.1M** merchant payout (SEPA) leaves on 19 May; the €3.2M card settlement expected on 18 May lands only on 21 May. The same alert appears on the dashboard.` CTA under the step: `Open the forecast →` |
| aside | What the model looks at | replaces the stage with the importance panel: 11 bars (gain > 0) from `feature_importance.features`, label = `label`, bar colour by `group` (calendar violet, history accent, scheduled teal), value `share` as %; note under the bars | bars fill 600 ms staggered 40 ms | Title `What the model looks at` · `LightGBM · P50 · gain`. Note: `10 features carry no gain: hour-of-day (constant on daily data) and the scheduled-event flags — scheduled payments are added to the corridor directly, not learned by the trees.` |

"Play all": runs 01 → 06 with 2.2 s per step without scrolling (stage pinned, text column highlights the current step). "Replay": re-runs the active step. Account picker: re-targets `series[account]`; for accounts without a gap, step 05 text becomes `P5 stays above the €1.20M buffer for all 14 days — no gap.` and step 06 shows the minimum P5 point instead with `min P5 €4.28M · 1 Jun`.

Data contract: `GET /api/forecast/explain` / `public/demo/explain.json` as shipped (`model`, `training`, `feature_importance`, `components`, `series`). Nothing else is required.

### 2.4 Dashboard preview (viewport 4)
Eyebrow `COMMAND CENTER` → h2 `One screen per treasury morning.` → a real, interactive `<Corridor/>` for Atlas EUR with the four alert items beside it (the same components as `/forecast`, reduced: no rail), and a primary button `Open the forecast`. Under it a 3-tile row: `10 / gap days in 14`, `€2.17M / worst gap (Wed 20 May)`, `0 / consolidated gaps (EUR · USD · GBP)`.

### 2.5 What-if teaser
Two-column: left copy `Test the decision before making it.` + three scenario rows (Pay the merchant payout 2 days later −2, Cancel the processing fee −8, Card settlement 5 days late +4); right the before → after mini corridor that morphs when a row is selected. Button `Open what-if`.

### 2.6 How it works teaser (`--bg-2`)
The sticky pipeline in miniature: the nine-stage SVG (desktop) with stages 01–09 lighting in sequence on scroll (one per 60 px of scroll), one caption line per lit stage. Button `Read how it works`.

### 2.7 Proof (backtest) block
Exactly the "05 backtest as proof" frame of `reference.html`: eyebrow, h2 `29.2 % lower loss than a seasonal-naive baseline — and worse at one horizon.`, three tonal stat cards, two charts, the `Where it is weak` panel. Button `See the full backtest`.

### 2.8 Closing CTA + footer
h2 `Run it on your own CSV.` · body `docker compose up starts PostgreSQL, the FastAPI backend and the dashboard. Upload a history CSV in the documented format and get the same forecast, alerts, what-if and backtest on your data.` · code block with the command · buttons `Source on GitHub` (primary) · `Data format` (secondary).

---

## 3. `/forecast` — command-center dashboard

Layout at 1440: title block; then rail 300 + main 876 (gap 24). Main: fan chart card (full width), then alerts card (1fr) + model card (380), then scenario card (full width).

- Title: eyebrow context line; h1 is computed: `One gap in 14 days. It starts tomorrow.` (n gaps across accounts; "starts in n days"); if none: `No cash gaps in the next 14 days.`; right: mono chip `run #1 · 28 Oct 05:35 UTC` and `Re-run forecast` (disabled in demo with tooltip; accent in live mode).
- **Account rail** (`AccountRail`): eyebrow `ACCOUNTS · 5 · 3 CURRENCIES`; 5 `AccountItem`s sorted gap-first then by days-to-gap, then by currency; selected = the account in the chart; keyboard ↑/↓ moves selection. Footer micro note: `Consolidated per currency: no gap in EUR, USD or GBP. Sum of accounts, no FX conversion.` Tablet: horizontal scroll strip of 240 px cards; mobile: same strip, snap.
- **Fan chart card** (`Corridor`): header h4 `Atlas Bank · EUR Operating`, small `Last 21 days actual + 14-day forecast · P5 / P50 / P95 · as of 18 May`, legend row (Actual, P5–P95, P50, Buffer, Gap days, Inflow/Outflow); chart 800×310 viewBox, responsive; controls top-right on hover: `Table view`, `History 21 d / 60 d` segmented. Account switch = 320 ms cross-fade of paths, axes re-scale with 400 ms tween.
- **Alerts card** (`AlertsTimeline`): h4 `Alerts · 10 in 14 days`, small `P5 below the buffer · all on Atlas EUR Operating`, segmented `Per account / Per currency`; 4 items then `Show all 10 alerts · 6 more, 25 May – 1 Jun →` (expands in place, 320 ms). Per currency view: three rows EUR / USD / GBP with chip `no consolidated gap` or the gap alert list. Hover on an alert highlights that day's band in the chart (band opacity .09 → .18).
- **Model card**: `ensemble-quantile · P5 / P50 / P95 · trained model in use` (or the fallback reason in `--warn`); three weight bars; three mini stats 548 / 12 / 7; link `Open the model room →` (to `/#model-room`).
- **Scenario card** (`ScenarioSwitcher`): h4 `What-if · 6 precomputed scenarios`; left: six rows (3 visible + `Show 3 more`); right: before → after corridor (400×150) with legend and two cells `WORST GAP · BEFORE €2.17M` → `AFTER €310K` + small note (`8 smaller gap days remain from 25 May`). Selecting a row morphs the chart (600 ms), ticks the cells, and shows a chip `Scenario applied` on the main fan chart with a `Clear` link (the main chart overlays the scenario corridor; the base corridor turns grey). Button `Open what-if`.
- States: loading skeleton (rail 5 blocks, chart box, 4 alert rows); error banner; empty (no gaps) → rail all green, chart without bands, alerts card shows the empty state.
- Mobile: title (h1 28), chip row, rail strip, chart (full width, 260 px tall, legend collapses into a `Legend` disclosure), alerts, model, scenarios (rows only; chart shows on row tap in a sheet).

---

## 4. `/what-if`

- Title: eyebrow `WHAT-IF · 6 PRECOMPUTED SCENARIOS · NOTHING IS EXECUTED` → h1 `Move a payment, watch the gap move.`
- Demo layout: left (5 cols) scenario list (all six rows, selected first = `payout-plus-2`); right (7 cols) `Corridor` before/after for the affected account (account select above the chart lists only accounts touched by the scenario), delta tiles (gap days removed / added / worst before / worst after), then two alert columns `Alerts before (10)` / `Alerts after (8)` using `AlertItem` with removed alerts shown struck-through and faded in the "after" column header count.
- Live layout (self-hosted): the scenario list is replaced by the scheduled-flows table (7 rows: flow, account, effective date, shift days input, amount input, remove checkbox) with `Reset` ghost and `Run scenario (n changes)` accent button; results identical to demo.
- Motion: row select → before corridor greys (200 ms), after corridor morphs (600 ms), delta numbers tick (700 ms), removed alerts collapse (320 ms).
- Copy: scenario titles and descriptions from `scenarios/index.json`.
- Mobile: list, then chart, then tiles, then alerts stacked.

---

## 5. `/backtest` — proof

- Title: eyebrow `BACKTEST · ROLLING ORIGIN · 6 FOLDS · 7-DAY STEP · 420 SCORED ACCOUNT-DAYS` → h1 `29.2 % lower loss than a seasonal-naive baseline — and worse at one horizon.`
- Controls (live mode only): Horizon / Folds / Step inputs + `Run backtest` accent; demo shows a mono chip `precomputed · 2.68 s on a laptop`.
- Three tonal stat cards: `82,024 / mean pinball loss P50 · model / vs 115,880 seasonal-naive`, `13 / 14 / horizons where the model beats the baseline / loses at h = 3: 67.7K vs 52.7K`, `0.879 / mean 90 % interval coverage · target 0.90 / under target at h = 1–3 (0.80 · 0.70 · 0.67); on target from h = 4`.
- Two chart cards (pinball by horizon with h = 3 highlighted; coverage with target rule and under-coverage column). Tabs under them: `Summary · Per horizon · Folds · Raw JSON`. Per-horizon table (14 rows, tnum, lower pinball in bold, under-target coverage in `--warn`); Folds table (6 rows with train end / test window); Raw JSON in a mono panel.
- `Where it is weak` panel (amber rule) with the four bullets; same type size as the summary.
- Plain-language paragraph: `Rolling origin: for each of 6 folds the ensemble is retrained on history up to the cut-off and scores the next 14 days against actual balances; the baseline repeats the net flow from 7 days earlier. Scheduled payments are not replayed, and the data is synthetic, so this measures the method, not real-world accuracy.`
- 5 s: 29.2 % and "worse at one horizon". 30 s: the two charts. 2 min: table, folds, raw JSON.

---

## 6. `/data`

- Title: eyebrow `DATA · SYNTHETIC · SEED 42` → h1 `600 rows, 5 accounts, 120 days.`
- Dataset summary card: tiles `source synthetic`, `rows 600`, `accounts 5`, `history 19 Jan – 18 May 2026`, `scheduled flows 7`, `generated 28 Oct 2026` + the 5 accounts as a compact table (bank, label, currency, settled balance, buffer).
- Sample downloads: two flat cards with `download` icon: `history_5accounts_120d.csv · 46.5 KB` and `scheduled_flows.csv · 0.9 KB`; each shows the header row in a mono block and the first two data rows.
- Schema section: two tables (history CSV columns, scheduled-flows CSV columns) with type and example.
- `Upload in the self-hosted version` panel (tonal): copy `The hosted demo is read-only. Run docker compose up, open localhost:3000/data, and upload a history CSV (and optionally a scheduled-flows CSV). Rows are validated one by one; errors come back with row and column.` + code block + secondary button `Source on GitHub`. Live mode: this panel becomes the upload form (drop zone 160 px, file chips, `Upload` accent) and a `Generate synthetic` form (accounts 1–12, days, seed) with the warning/error banners.
- Mobile: stacked; tables scroll horizontally inside their cards.

---

## 7. `/how-it-works` — scroll story

- Intro: eyebrow `HOW IT WORKS · 9 STAGES` → display-l `From a CSV to a cash gap, in nine stages.` → lead (the current page's first paragraph, kept).
- **Sticky pipeline** (desktop): left column 440 px scrolls with nine `StageCard`s (each `min-height: 90vh`): mono counter `STAGE 03 / 09 · FEATURE ENGINEERING`, h2 title, body (≤ 40ch), big number (stat-xl, tnum; `--gap` only for the corridor stage's `−€1.13M`), progress bar (9 segments: done `--ink-4`, active `--accent`). Right column: the pipeline SVG (560×640 viewBox, max-width 600, sticky at `top: 96px`). Stage boxes: upcoming (`--hairline-2` stroke, `--ink-3` title), done (`--ink-4` stroke, `--ink` title), active (`--accent-tint` fill, `--accent` 1.5 px stroke, `--accent-ink` text). Edges: `--hairline-2` → `--ink-4` when done → `--accent` when active; particles (3 px accent dots, `animateMotion` 1.2–1.6 s) travel only on the active edges. Stage 04 and 07 are three side-by-side boxes; the active state lights all three with a shared bracket edge.
- Stage copy and numbers: `DESIGN_SYSTEM.md` § 11; each body paragraph is the existing how-it-works prose split per stage (problem → pipeline → model → backtest → limitations), with the worked example (Atlas EUR, €4.1M payout vs €3.2M settlement landing on 21 May) living in stage 06.
- After the pipeline: `The model` paragraph with weight bars; `Backtest` numbers (the three stat cards + weak-spot panel, shared with `/backtest`); `Limitations` list (synthetic, not calibrated, no bank connections, no FX, hosted demo precomputed); `Source` link.
- **Mobile**: the `PipelineList` — a vertical list of nine rows (40 px numbered circle, title, mono metric) with a 1 px spine; the active row (by scroll position) gets the accent treatment; stage cards sit above the list in a horizontal stepper. No sticky.
- **Reduced motion**: all stages drawn in the done state, active = the one in view, no particles; progress bar static.

---

## 8. Header, navigation and page transitions

- Active route = pill on the nav item. `/` is `Overview`.
- Mobile menu sheet: 320 ms slide from the top, links 18 px, GitHub button, theme toggle, the demo line.
- Route change: content fades 150 ms; no slide.
- Anchors: `/#model-room`, `/#how-it-works`, `/#proof` scroll with `scroll-margin-top: 112px`.

---

## 9. Data the backend must still provide (none blocking)

Everything on these pages is covered by the current `public/demo/` set (`health, accounts, history, scheduled, forecast, explain, alerts, backtest, scenarios/*`). Nice-to-have, not required:
1. `manifest.json`: a `generated_at` is present — the banner reads it; nothing else needed.
2. `explain.json` per-account `latest_features` is present; a `feature_labels` lookup is used for the chips (present).
3. Optional for the globe hover stat: nothing — `forecast.json` points give min P5 per account.
4. Optional for `/data`: the sample CSV byte sizes are in `manifest.json` (present).
