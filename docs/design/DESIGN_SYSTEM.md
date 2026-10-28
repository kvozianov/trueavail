# TrueAvail design system — v1

Companion files: `tokens.css` (drop-in custom properties), `PAGES.md` (page-by-page spec), `reference.html` (pixel reference, open in a browser; screenshots in `screens/`).

Audience for the product: an admissions reviewer who opens the demo for 60–120 seconds, then a treasury-minded reader who stays longer. Everything below is optimised for that first pass: the gap is the headline, the range is the product, honesty is the brand.

---

## 1. Concept

**Working name of the identity: "Corridor."**

The single idea the whole site is built around is the P5–P95 corridor: a fan that opens from the as-of point into the future and, on one account, dips under a dashed red line. Every surface reuses that shape — the logo mark, the hero stats, the model room, the dashboard, the backtest, even the empty state. The reviewer should be able to say, after 30 seconds, "it forecasts a range per account and tells you the day the range goes below the buffer."

What makes it feel like a real system rather than a landing page:

- Every number on the site is a number the backend produced (`frontend/public/demo/*.json`). Copy is written around those numbers; none are invented.
- The model is shown doing its work (model room), scored against a baseline (backtest), and its weak spots are typeset at the same size as its wins.
- Light, airy, near-black type and pill buttons — but the signature element is data-driven (globe + corridor), not decorative.

Naming rules (hard): the model is "a quantile ML ensemble" / "three models" / "LightGBM, gradient boosting and an EWMA baseline". Never "AI", "LLM", "copilot", "assistant", "predicts the future". Synthetic data and precomputed results are stated calmly in the banner, the hero caption, the how-it-works page and the footer.

---

## 2. Principles

1. **The gap is the headline.** Every page answers "where and when does cash fall below the buffer?" before anything else. If there is no gap, say so as a headline too.
2. **Show the range, not a number.** A balance is always drawn as a corridor; a single figure always carries its quantile (P5/P50/P95) and date. No chart without the buffer line.
3. **Honest by default.** Synthetic data, precomputed results, horizon-3 loss and under-coverage at h = 1–3 appear in body type on the page where the win appears, not in a footnote. "Where it is weak" is a designed component, not a disclaimer.
4. **Evidence next to every claim.** A sentence that makes a claim sits next to the number that supports it (600 observations, 548 trainable rows, 0.55/0.30/0.15, 29.2 %, 0.879). Eyebrows and captions carry the numbers; headlines carry the meaning.
5. **Motion explains causality, nothing else.** Things move only to show data → feature → model → corridor → gap, before → after, or stage → stage. No idle animation except the gap pulse and flow particles on the globe. Reduced motion shows the final frame.

---

## 3. Colour

Cool-graphite neutrals on pure white. One accent ("corridor blue"), three reserved status hues, a fixed four-slot chart palette. All values in `tokens.css`.

### 3.1 Why this accent

Red (gap), amber (warning) and green (healthy) are reserved for status and must stay unambiguous. The accent therefore has to be hue-distant from all three and from the near-black ink, and still reach AA as text on white at a chroma that reads as "signal" rather than "corporate blue". A deep ultramarine-indigo (`#2F4BD9`, 6.7:1 on white) does that: it is clearly not the gap red, not the healthy green, it tints to a usable `#EEF1FD` surface, and it reads as "the forecast" wherever it appears (P50 line, corridor fill, lit pipeline stage, links, focus ring). It is deliberately not the default Tailwind/Material blue; it leans violet so the corridor fill stays distinct from the grey-blue neutrals.

Primary buttons stay near-black (`--ink`) so the accent is spent only on data and navigation state.

### 3.2 Light (primary)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--bg` | `#FFFFFF` | page | — |
| `--bg-2` | `#F6F7F8` | banner, tonal cards, segmented track | — |
| `--bg-3` | `#EEF0F2` | bar tracks, tag fills | — |
| `--ink` | `#101214` | headlines, body-strong, primary button | 18.8:1 on bg |
| `--ink-2` | `#4B5057` | body | 8.1:1 |
| `--ink-3` | `#6B7079` | captions, eyebrows, axis ticks | 5.0:1 on bg · 4.6:1 on bg-2 |
| `--ink-4` | `#9AA0A8` | placeholders, disabled, leader lines (never read-critical text) | 2.6:1 (decorative only) |
| `--hairline` | `#E6E8EB` | dividers, grid | decorative |
| `--hairline-2` | `#D5D9DE` | secondary button border, axes | decorative |
| `--border-input` | `#8E949C` | input borders | 3.06:1 (WCAG 1.4.11 ≥ 3:1) |
| `--accent` | `#2F4BD9` | P50, links, focus ring, lit stage | 6.7:1 on bg · 5.5:1 on corridor band |
| `--accent-ink` | `#2439B0` | link hover, text on accent-tint | 9.2:1 on bg · 8.1:1 on tint |
| `--accent-tint` | `#EEF1FD` | selected row, lit stage fill | — |
| `--accent-band` | `rgba(47,75,217,.14)` | P5–P95 fill | — |
| `--gap` | `#C0282A` | gap text | 5.9:1 on bg · 5.2:1 on gap-tint |
| `--gap-fill` | `#DC3B3E` | gap dot, buffer line, globe gap node | 4.4:1 (UI ≥ 3:1) |
| `--gap-tint` | `#FDEEEE` | gap chip fill, selected gap account | — |
| `--gap-band` | `rgba(220,59,62,.09)` | gap-day bands | — |
| `--warn` | `#8A5A00` | warning text | 5.9:1 on bg · 5.5:1 on warn-tint |
| `--warn-fill` | `#E8A400` | warning dot, under-coverage marker (never text) | 2.2:1 (dot only, always with label) |
| `--warn-tint` | `#FFF6E0` | demo chip, weak-spot panel | — |
| `--good` | `#1B7A41` | healthy text | 5.4:1 on bg · 4.8:1 on good-tint |
| `--good-fill` | `#22A45B` | healthy dot, inflow marker | 3.2:1 (UI) |
| `--good-tint` | `#EAF6EE` | healthy chip fill | — |

White on `--ink` buttons: 18.8:1. White on `--accent` buttons: 6.7:1.

### 3.3 Chart series (fixed order, validated)

Validated with the dataviz palette checker (lightness band, chroma floor, CVD ΔE ≥ 12 on every adjacent pair, normal-vision ΔE ≥ 22, ≥ 3:1 on surface). Never cycle; never reuse a status colour as a series.

| Slot | Token | Light | Dark | Used for |
|---|---|---|---|---|
| actual | `--c-actual` | `#101214` | `#F2F3F5` | history line |
| 1 | `--c-accent` | `#2F4BD9` | `#7388F0` | P50, blend corridor, LightGBM component, "after" scenario |
| 2 | `--c-baseline` | `#D4691E` | `#D2782F` | seasonal-naive baseline (backtest) |
| 3 | `--c-gbdt` | `#0BA08F` | `#1BA592` | sklearn GBDT component; "scheduled" feature group |
| 4 | `--c-ewma` | `#9B59D6` | `#9E74E0` | EWMA component; "calendar" feature group |
| before | `--c-before` | `#8B9098` | `#8B9098` | "before" scenario corridor and P50 (dashed) |

Labels and values next to a series are always set in ink tokens; the colour lives in a swatch or the line itself.

### 3.4 Dark (secondary)

Same hues, re-stepped for the dark surface (`#0E1013`) and validated separately; listed in `tokens.css`. Key ratios: ink 17.2:1, ink-2 9.8:1, ink-3 5.9:1 (5.5:1 on surface `#16181C`), accent `#7388F0` 5.9:1, gap `#F0706F` 6.6:1, warn `#F2B84B` 10.7:1, good `#4FC27C` 8.5:1, input border `#656C75` 3.4:1. Dark is applied by `prefers-color-scheme` unless `data-theme="light"` is stamped; `data-theme="dark"` forces it. Shadows are stronger and borders become 7 % white; everything else is token-driven.

---

## 4. Typography

Loaded with `next/font/google` (self-hosted at build, `display: "swap"`, `preload: true`, subsets `latin` only):

| Role | Family | Weights | Why |
|---|---|---|---|
| Display (`--font-display`) | **Instrument Sans** | 500, 600 | Wide, confident, slightly geometric; distinct from the Inter/Geist look without being decorative. Variable axis available (`wdth`), not used. |
| Body / UI (`--font-body`) | **Inter** | 400, 500, 600 | Tabular numerals and `ss01` (open digits) are needed in every table and stat; Inter's hinting on Windows is the safest. |
| Mono (`--font-mono`) | **IBM Plex Mono** | 400, 500 | Eyebrows, dates, ids, feature names, run ids, code. Plex has a real italic and `0` with a dot — reads as engineering, not as terminal cosplay. |

```ts
// frontend/src/app/fonts.ts
import { Instrument_Sans, Inter, IBM_Plex_Mono } from "next/font/google";
export const display = Instrument_Sans({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-instrument-sans", display: "swap" });
export const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
```

### 4.1 Scale (desktop → mobile)

| Style | Family / weight | Size / line-height / tracking | Use |
|---|---|---|---|
| display-xl | display 600 | 64 / 1.02 / −0.028em → 48 → 40 | hero H1 only |
| display-l | display 600 | 48 / 1.04 / −0.026em → 40 → 32 | page hero on inner pages when there is a stat beside it |
| h1 | display 600 | 36 / 1.1 / −0.02em → 32 → 28 | page title ("One gap in 14 days. It starts tomorrow.") |
| h2 | display 600 | 30 / 1.12 / −0.022em → 26 → 24 | section titles, stage titles |
| h3 | display 600 | 20 / 1.3 / −0.012em | card group titles |
| h4 | body 600 | 15 / 1.4 / −0.005em | card titles |
| lead | body 400 | 18 / 1.5 → 16 | hero sub, section intros (`--ink-2`) |
| body | body 400 | 15 / 1.55 | default (`--ink-2`); `--ink` for strong |
| small | body 400 | 13 / 1.45 | captions, hints (`--ink-3`) |
| micro | body 400 | 12 / 1.4 | footnotes, table notes |
| eyebrow | mono 500 | 11 / 1 / +0.12em, uppercase | section labels, rail labels, stage counters (`--ink-3`; `--accent` when it introduces a section) |
| stat-xl / l / m | display 600, tnum | 44 / 32 / 24, tracking −0.025em | hero stats, stage big numbers, stat tiles |
| data | mono 400/500 | 12–13 | dates, ids, run numbers, feature names, chart ticks (11) |

Rules: headlines end with a full stop when they are sentences ("See the cash gap before it happens."). Numbers in running text use Inter with `font-variant-numeric: tabular-nums`. Currency formats: see § 9.4. Max line length for body copy 46–60ch. Never letter-space lowercase body text.

---

## 5. Spacing, grid, layout

4 px base. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128 (`--s-*`).

| Breakpoint | Container | Gutters | Columns / gap | Notes |
|---|---|---|---|---|
| ≥ 1440 (desktop reference) | 1200 fixed | 120 | 12 / 24 | hero 6+6 (text 560 · globe 580), dashboard rail 300 + main 876 |
| 1024–1439 | fluid, 32 gutters | 32 | 12 / 24 | globe scales to min(100 %, 520) |
| 768–1023 (tablet) | fluid | 32 | 8 / 20 | hero stacks (text, then globe 440 centred); dashboard rail becomes a horizontal scroll strip of account cards above the chart |
| 375–767 (mobile reference 375) | fluid | 16 | 4 / 16 | everything single column; globe 343; sticky pipeline becomes a vertical list |

Vertical rhythm: section padding 64 (desktop) / 48 (tablet) / 32 (mobile); card padding 20 (desktop) / 16 (mobile); header 64 / 56; demo banner 36 (one line) / auto (two lines on mobile).

---

## 6. Radii, surfaces, elevation

Radii: `--r-1` 6 (tags, tooltip inner), `--r-2` 10 (inputs, scenario rows, tooltip), `--r-3` 14 (cards, account items), `--r-4` 20 (hero media, model-room stage), pill 999 (buttons, chips, segmented).

**Cards without boxy grey borders.** Three surfaces, all on white or `--bg-2`:

| Variant | Recipe | Use |
|---|---|---|
| elevated (default) | `background: var(--bg); border: 1px solid var(--card-border) /* 6 % ink */; box-shadow: var(--shadow-card)` | data cards: fan chart, alerts, model, scenarios, backtest charts |
| tonal | `background: var(--bg-2); border: 0; shadow: none` | stat clusters, side notes, banner |
| flat | `background: var(--bg); border: 1px solid var(--hairline); no shadow` | empty states, inline panels inside a card |

States: hover (interactive cards only) → `--shadow-hover` + `translateY(-1px)`, 150 ms; selected → `border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), var(--shadow-card)`; gap-selected account item → `--gap-tint` fill with `rgba(220,59,62,.25)` border.

Pop-overs (tooltips, menus) use `--ink` background with white text and `--shadow-pop` so they sit above any chart colour.

Section backgrounds alternate `--bg` and `--bg-2` on the landing page only (hero white, model room white, how-it-works teaser `--bg-2`, backtest proof white, footer `--bg-2`). Inner pages are white throughout.

---

## 7. Iconography

`lucide-react`, 16 px in buttons/chips, 20 px standalone, stroke 1.75, `currentColor`. Only these icons are used: `arrow-right`, `arrow-up-right`, `rotate-ccw` (replay), `play`, `pause`, `chevron-down`, `chevron-right`, `check`, `x`, `alert-triangle` (warning banner), `octagon-alert` (error banner), `info`, `download`, `upload`, `github` (lucide's `github` or inline mark), `menu`, `sun`/`moon` (theme toggle, optional), `external-link`. Flow direction is never an icon: use the ▲/▼ glyphs in the mono tag component (`.tag.in` / `.tag.out`).

Brand mark (`<Mark/>`): three strokes fanning from a shared left point (P95 full, P50 55 %, P5 30 % opacity) crossed by a dashed red hairline (the buffer). 22 px in the header, 32 px in the footer, 512 px as favicon/OG source. Wordmark: "TrueAvail", Instrument Sans 600, −0.02em, with the mark 9 px to its left.

---

## 8. Components

All components live in `frontend/src/components/ui/` (primitives) and `frontend/src/components/` (product). States listed are the ones the reference renders; the implementation must support every one.

### 8.1 Button
Pill, height 44 (md), 34 (sm), 52 (lg); padding 22 / 14 / 28; Inter 500 15 / 13 / 16; icon 16 at gap 8.
- **primary**: `--ink` fill, `--bg` text. hover `#2A2E34` + `--shadow-hover`; active `#000` + `translateY(1px)`; focus-visible `--focus-ring`; loading: spinner 14 px replaces icon, label becomes gerund ("Running…"), `aria-busy`; disabled: opacity .42, no pointer.
- **secondary**: `--bg` fill, `--ink` text, 1 px `--hairline-2` border; hover `--bg-2` + border `--ink-4`.
- **ghost**: transparent, `--ink-2` text; hover `--bg-2`, `--ink` text.
- **accent**: `--accent` fill, white text — only for the data-changing action on a page (Run scenario, Run backtest, Generate). hover `--accent-ink`.
- **danger**: `--gap-tint` fill, `--gap` text — Remove flow, Delete dataset.
In the static demo, actions that cannot run are rendered secondary + disabled with a tooltip "Precomputed demo — run locally with docker compose up".

### 8.2 Input / number / select
Height 40, radius 10, border `--border-input`, Inter 15 (numbers: Plex Mono 14, tnum, thousands separated by thin spaces), label Inter 500 13 above, hint 12.5 `--ink-3` below. States: focus (`--accent` border + `--focus-ring-input`), error (`--gap-fill` border + 14 % red ring, hint in `--gap`, `aria-invalid`), disabled (`--bg-2` fill, `--ink-4` text). Suffix slot (currency code, "d") in mono 12 `--ink-3`. Select = same box with `chevron-down`; native `<select>` on mobile.

### 8.3 Segmented control / tabs / switch
- Segmented: track `--bg-3` pill, 3 px padding, options 30 px tall; selected = white pill with 1 px soft shadow, `--ink` text. Use for ≤ 4 mutually exclusive views (Per account / Per currency; account picker in the model room). Role `radiogroup`.
- Tabs: text 14/500, 24 px gap, `--ink-3` → `--ink` selected with 2 px `--ink` underline sitting on the hairline; `role="tablist"`, arrow-key navigation.
- Switch: 38×22, `--hairline-2` → `--ink` when on; used only for "Show history / Show components" chart toggles.

### 8.4 Chip (status pill) and tag
- Chip: 26 px pill, 7 px dot + label 12.5/500. Variants: gap (`--gap-tint`/`--gap`), warn, good, accent, neutral (hairline border), mono (run ids). Always dot + text, never colour alone.
- Tag: 22 px, radius 6, Plex Mono 11.5, `--bg-3`; `.in` (▲, good tint) / `.out` (▼, gap tint) for scheduled flows: `▼ €4.10M merchant payout · SEPA · 19 May`.

### 8.5 Tooltip
`--ink` surface, radius 10, padding 10×12, Inter 12.5, mono eyebrow line (date · day n), rows `key … value` with tnum values, optional divider + gap line in `--gap` (dark: `#F0706F`) and driver line in `#B6BAC1`. Positioned by the chart (flip left of the crosshair when within 240 px of the right edge). Appears 120 ms, follows the pointer snapped to the nearest day; keyboard: arrow keys move the crosshair, tooltip reads via `aria-live="polite"`.

### 8.6 Stat tile
Value in display 600 (44/32/24, tnum), label small `--ink-3`, optional third line 13. Value colours: `--ink`; `--gap` only when the stat *is* a gap; never green for "good" numbers (the label says it). Empty: "—" with label "no data yet".

### 8.7 Account item (rail)
Grid: text column + 72×24 sparkline; rows: bank eyebrow (mono 11), name 15/600, balance 15/500 + "buffer €1.00M" small; status row: days number (display 22) + mono caption ("day to gap" / "days clear") and a chip (gap amount or min P5). Sparkline = last 30 days, `--ink-2` 1.25 px line over `--bg-3` area fill. States: rest, hover (`--bg-2`), selected (`--bg-2` + hairline border), selected-gap (`--gap-tint`), keyboard focus ring. Clicking selects the account for the fan chart; the chart cross-fades (320 ms).

### 8.8 Alert item
18 px timeline column (severity dot 10 px, red/amber, with a 2 px hairline connector), body (title "Gap €2.13M" 14/600 + account 13 `--ink-3`; second line "P5 balance −€1.13M vs buffer €1.00M"; drivers as `.tag.out` chips), right column date (13/600) + "in n days" (mono 11.5). Amber threshold is the backend's severity; the UI adds the explanation "amber: under 10 % of buffer" when severity is amber. List shows 4, then "Show all 10 alerts · 6 more, 25 May – 1 Jun →".

### 8.9 Scenario card / row
Row: title 14/600, one-line description 13 `--ink-3`, right-aligned delta: big number (display 22) coloured `--good` for removed gaps, `--gap` for added, `--ink` for 0; mono caption "GAP DAYS · worst €2.17M → €310K". Selected row: `--ink` border. Selecting triggers the before → after morph on the paired chart (§ 10.3).

### 8.10 Banner
- Demo banner (every page, under the header): `--bg-2`, 36 px, 12.5 px: **Demo on synthetic data** · 5 accounts × 120 days, seed 42 · every number was precomputed by the real backend on {generated_at} · full pipeline: `docker compose up` — Read how it works. Not dismissible.
- Error banner: 3 px `--gap-fill` left rule on `--gap-tint`: "**Backend unreachable.** Could not reach `localhost:8000`. Nothing is shown in its place: no fake data fallback. Retry".
- Warning banner: amber rule on `--warn-tint`: "**3 rows rejected.** Row 14, column `ending_balance`: not a number … Show all".

### 8.11 Header / nav
64 px, hairline bottom. Left: mark + wordmark. Nav (14/500, pill hover `--bg-2`, active = `--ink` text on `--bg-2` pill): Overview · Forecast · What-if · Backtest · Data · How it works. Right: `Synthetic data · demo` warn chip, GitHub secondary sm button, "See the forecast" primary sm (landing only; on inner pages omitted). Mobile: logo, Demo chip, menu button → full-screen sheet with the six links and the GitHub button.

### 8.12 Footer
`--bg-2`, 48 px padding. Left: mark 32 + one paragraph: "Engineering prototype. Data is synthetic (or a CSV you upload); the model is not calibrated on real bank data. No bank connections, no payments, nothing moves money." Right: links GitHub · How it works · Data format · `backend 0.2.0 · demo generated 28 Oct 2026` (mono).

### 8.13 Empty / error states
Flat card, centred, h4 + small + secondary sm button. Copy in § 11.

---

## 9. Data-viz rules

### 9.1 Corridor (fan) chart — the canonical component `<Corridor/>`
Used by the dashboard, what-if, model room, how-it-works sketch and the hero stat sparklines. One SVG, one scale set, props control which layers render.

Layers, bottom to top:
1. y grid: `--hairline`, 1 px, 4–5 ticks; zero line `--hairline-2`.
2. gap-day bands: full-height rects, `--gap-band`, one per breach day (adjacent days merge into one rect).
3. corridor P5–P95: polygon filled with a horizontal gradient `--accent` α .06 → .20 (fades in toward the horizon so uncertainty "thickens"), no stroke. Components in the model room use flat 12 % fills of their own hue.
4. P5 line: `--c-accent` 1 px dashed 3/3 at 70 % (so the pessimistic edge is traceable).
5. actual line: `--c-actual` 1.75 px.
6. P50: `--c-accent` 2 px, round joins.
7. buffer: `--gap-fill` 1.25 px dashed 5/4, label "required buffer €1.00M" in mono 11 `--gap`, placed left-above the line over the history area.
8. as-of divider: `--ink-4` 1 px dashed 2/3 with mono "as of" above.
9. scheduled-flow markers: 10 px triangles, ▲ `--good-fill` for inflows placed 18 px below P50, ▼ `--gap-fill` for outflows 18 px above P50, on the effective date; hover shows the flow in the tooltip.
10. end labels P95 / P50 / P5 (mono 11, `--accent`) at the right edge.
11. crosshair + tooltip (§ 8.5).

Axes: x ticks every 5 days in mono 11 `--ink-3` ("28 Apr", "3 May"); y ticks compact ("−1.5M", "0", "1.5M", "3M", "4.5M"). Domain: history + forecast, padded 6 %; always includes 0 and the buffer. No axis lines, no chart border.

### 9.2 Backtest charts
Line pair, one y axis each (never dual-axis). Pinball: model `--c-accent` solid 2 px with 3.5 px white-ringed points, baseline `--c-baseline` dashed 5/4; the losing horizon gets a `--warn-tint` column and a mono annotation. Coverage: model line, target as `--ink-2` dashed rule labelled "target 0.90", under-target points in `--warn-fill`, the under-covered horizon range as a `--warn-tint` rounded column. Both charts carry a legend and a "table view" toggle.

### 9.3 Bars
Weights and feature importance: 8 px tracks (`--bg-3`, radius 4), fill in the series hue, label left (mono for ids, Inter for readable labels), value right (tnum). No axis. Gain-zero features are not drawn as empty bars; they are explained in a note (see § 11, model room step "aside").

### 9.4 Number formats
- Money: `Intl.NumberFormat("en-US", {style:"currency", currency, notation:"compact", maximumFractionDigits:2})` → `€2.13M`, `$8.90M`, `£900K`, `−€1.13M` (true minus U+2212, no space). ≥ 1M two decimals, 100K–999K no decimals (`€850K`), < 100K one decimal (`€29.4K`), < 1K full. Full precision in tooltips and tables (`−1,131,273`).
- Percent: `29.2 %` (thin space before %), coverage as a ratio `0.879` where the target is a ratio.
- Dates: `Tue 19 May` in UI, `19 May` on axes, ISO in exports. Relative: `in 1 day`, `in 7 days`.
- Counts: `600`, `82,024` (grouped).

### 9.5 Accessibility of charts
Every chart has `role="img"` + `aria-label` summarising the finding ("Atlas EUR Operating: P5 falls below the €1.00M buffer on 19 May, gap €2.13M; 10 gap days in 14"), a visually hidden table (`<table>` with the plotted values) toggleable via "Table view", and keyboard crosshair navigation. Colour is never the only encoding: corridor vs. buffer differ by dash pattern, components differ by label, series by legend + direct end labels.

---

## 10. Motion system

Library: `motion` (Framer Motion v11+, `motion/react`) with `LazyMotion` + `domAnimation` features on the landing page; `useReducedMotion()` gates everything.

| Token | Value | Used for |
|---|---|---|
| `--dur-micro` 120 ms | hover colour, chip dot, switch | |
| `--dur-ui` 200 ms | buttons, tabs underline, segmented thumb | |
| `--dur-panel` 320 ms | cards entering (y 8 → 0, opacity), tooltip, account cross-fade | |
| `--dur-chart` 600 ms | path morph before → after, corridor opening | |
| `--dur-scene` 900 ms | model-room frame transitions | |
| `--dur-ticker` 700 ms | number tickers | |
| `--ease` (0.2, 0, 0, 1) | default | |
| `--ease-out` (0, 0, .2, 1) | entering | |
| `--ease-draw` (.65, 0, .35, 1) | path drawing | |

Patterns:
- **Corridor opens** (signature): P50 draws left → right over 600 ms (`pathLength` 0 → 1); the band scales from the P50 outwards (`scaleY` around the P50 is not possible for a polygon, so animate the band's P5/P95 control points from P50 values to final values, 600 ms, starting 200 ms after P50). Buffer line draws after (300 ms). Gap bands fade in last (200 ms) with the first gap chip ticking its number.
- **Number ticker**: 700 ms ease-out from 0 (first paint) or from previous value (updates), tnum so width is stable; respects reduced motion (instant).
- **Scroll-linked**: `useScroll({ target, offset: ["start end", "end start"] })` → `useTransform` for pipeline stage index and particle progress. Nothing parallax.
- **Before → after**: both corridors mounted; "before" fades to the grey tokens while the "after" path `d` morphs (same point count, 600 ms), gap bands crossfade, delta tiles tick.
- **Globe**: continuous slow rotation is *not* used (orthographic globe stays fixed on the Atlantic). Flow particles travel each arc in 4.5 s on a loop; the gap node pulses (ring 7 → 26 px, 2.4 s, two rings offset 1.2 s). On hover of a node, the account's label and a mini stat appear (320 ms).
- **Reduced motion**: tickers instant; corridor and pipeline render final frames; model room becomes a stepper with no auto-advance; globe particles and pulse static (pulse replaced by a solid 2 px ring).

Performance budget for `/`: ≤ 600 KB gzipped JS. Expected: Next runtime + React ≈ 95 KB, `motion` (LazyMotion) ≈ 18 KB, `d3-geo` + `topojson-client` ≈ 28 KB, `visx` pieces ≈ 30 KB, page code ≈ 40 KB, world `land-110m.json` 30 KB (fetched lazily by the globe after hydration; a baked static SVG of the same globe is the SSR/no-JS fallback and LCP element). Total ≈ 240 KB with headroom. Use `next/dynamic` with `ssr: false` for the interactive globe and the model room; the static SVG and the model room's final frame render on the server.

---

## 11. Copy voice and key copy

Voice: plain, declarative, specific. Numbers before adjectives. Sentences end with a full stop. No exclamation marks, no "powerful", no "AI". Second person only in instructions. British spelling off, en-US numbers.

**Hero**
- Eyebrow: `14-DAY LIQUIDITY FORECAST · QUANTILE ML ENSEMBLE`
- H1: `See the cash gap before it happens.`
- Lead: `TrueAvail forecasts a P5–P95 balance corridor for every bank account, 14 days ahead, and flags the days when the pessimistic case falls below the required buffer — days before a treasury team would otherwise notice.`
- CTAs: `See the forecast` (primary, → /forecast) · `How it works` (secondary) · `Source on GitHub` (text link)
- Stats: `€2.13M / FIRST CASH GAP / Atlas EUR Operating · Tue 19 May, in 1 day` · `29.2% / LOWER LOSS VS BASELINE / Pinball P50, 6-fold rolling backtest` · `0.88 / 90 % INTERVAL COVERAGE / Target 0.90 · honest: under at h 1–3`
- Globe caption: `Illustrative locations · 5 accounts · 7 scheduled flows`

**Demo banner**: `Demo on synthetic data · 5 accounts × 120 days, seed 42 · every number was precomputed by the real backend on 28 Oct 2026 · full pipeline: docker compose up — Read how it works`

**Model room** (section title `Six steps from 600 observations to one cash gap.`; per-step copy in `PAGES.md` § 2.3)

**How it works stages** (title + one real number each):
01 Synthetic generator / CSV upload — 600 rows · 5 accounts · seed 42 · 19 Jan – 18 May 2026
02 PostgreSQL — datasets · 7 scheduled flows · forecast runs
03 Feature engineering — 21 features · 548 trainable rows · 12 anomalies
04 Three quantile models — LightGBM 120 trees · GBDT 90 trees · EWMA baseline
05 Weighted quantile blend — 0.55 · 0.30 · 0.15
06 Balance corridor P5 / P50 / P95 — 14 days × 5 accounts; Atlas EUR P5 on 19 May −€1.13M
07 Alerts · What-if · Backtest — 10 gap days · 6 scenarios · 29.2 % lower loss
08 FastAPI — 12 JSON endpoints · OpenAPI at /docs
09 Next.js dashboard — static export for the demo · live with docker compose up

**Empty states**
- No gaps: `No cash gaps in the next 14 days.` / `P5 stays above every buffer. Try a scenario to stress the schedule.` [Open what-if]
- No alerts for currency: `No consolidated gap in EUR.` / `Sum of the three EUR accounts stays above the summed buffer. No FX conversion.`
- No dataset (self-hosted): `No dataset yet.` / `Generate a synthetic dataset or upload a history CSV.` [Generate 5 accounts × 120 days]
- Scenario not selected: `Pick a scenario to see the corridor move.`
**Error states**
- Backend unreachable: `Backend unreachable.` / `Could not reach localhost:8000. Nothing is shown in its place: no fake data fallback.` [Retry]
- Upload rejected: `3 rows rejected.` / `Row 14, column ending_balance: not a number.` … [Show all] — row-level list from the 422 payload.
- Model unavailable (fallback): `Trained model unavailable — EWMA fallback in use.` + `fallback_reason` from `/api/forecast/run`.

---

## 12. Implementation notes

**Routes** (App Router, static export in demo mode): `/` landing (hero + model room + dashboard preview + how-it-works teaser + proof + CTA), `/forecast` dashboard, `/what-if`, `/backtest`, `/data`, `/how-it-works`. Keep the existing `/` → dashboard behaviour available at `/forecast`; `/` is new.

**Libraries**
- Charts: **visx** (`@visx/scale`, `@visx/shape`, `@visx/axis`, `@visx/tooltip`, `@visx/responsive`) + `d3-shape` curves. Chosen over recharts because the corridor needs custom gradient fills, path morphing for before → after, a shared `<Corridor/>` used inside the model room timeline, and ~60 KB less JS. recharts stays acceptable for the plain backtest line charts if time is short, but one charting approach is preferred.
- Motion: `motion` (`motion/react`, `LazyMotion` + `domAnimation`), `useInView`, `useScroll`, `animate()` sequences for the model room.
- Globe: `d3-geo` (`geoOrthographic`, `geoPath`, `geoGraticule10`, `geoInterpolate` for arcs) + `topojson-client` + `world-atlas/land-110m.json` (owner's existing world-map code). Server-rendered static SVG fallback generated once at build with the same projection parameters (rotate `[22, −44]`, scale 284 on a 600 viewBox).
- Icons: `lucide-react`. Fonts: `next/font/google`.
- No chart or animation library on `/data` and `/backtest` tables.

**File structure**
```
src/app/(site)/page.tsx                 landing
src/app/forecast/page.tsx               dashboard
src/app/what-if | backtest | data | how-it-works/page.tsx
src/app/fonts.ts  globals.css  tokens.css
src/components/ui/{Button,Input,Select,Segmented,Tabs,Chip,Tag,Tooltip,StatTile,Card,Banner,Mark}.tsx
src/components/nav/{Header,DemoBanner,Footer,MobileMenu}.tsx
src/components/charts/{Corridor,CorridorLayers,BacktestLines,Bars,Sparkline,chartScales.ts,format.ts}.tsx
src/components/globe/{Globe.client,GlobeStatic,arcs.ts,nodes.ts}.tsx
src/components/model-room/{ModelRoom,Stage,steps/*.tsx,timeline.ts}.tsx
src/components/dashboard/{AccountRail,AccountItem,AlertsTimeline,AlertItem,ModelCard,ScenarioSwitcher}.tsx
src/components/how-it-works/{PipelineSticky,PipelineSvg,PipelineList(mobile),stages.ts}.tsx
src/lib/{api.ts,demo.ts,types.ts,format.ts,useReducedMotion.ts}
```

**Build order**: 1 tokens + fonts + Header/Banner/Footer/Button/Chip → 2 `<Corridor/>` with the dashboard (rail, alerts, model card) → 3 scenario switcher with the morph → 4 backtest page → 5 how-it-works sticky pipeline (desktop + mobile list) → 6 landing hero with static globe, then interactive globe → 7 model room → 8 data page → 9 dark theme pass → 10 a11y + perf checklist.

**Checklist (must pass)**
- Visual: matches `reference.html` at 1440 and 375 within 2 px for spacing and type; all component states present; dark theme passes the same contrast table; no layout shift on font load (`size-adjust` from next/font).
- Content: every number on the site traceable to `public/demo/*.json`; banner on every page; "Synthetic" and "precomputed" words present on `/`, `/forecast`, `/how-it-works`; no "AI/LLM" strings (grep in CI).
- A11y: Lighthouse a11y ≥ 95; all text ≥ 4.5:1, UI ≥ 3:1 (axe); keyboard reach for rail, scenarios, tabs, chart crosshair; `prefers-reduced-motion` honoured (final frames, no tickers); charts have `aria-label` + table view; focus ring visible on every interactive element; touch targets ≥ 44 px on mobile.
- Perf: `/` ≤ 600 KB gzip JS (`next build` output + `source-map-explorer`), LCP ≤ 2.0 s on a simulated 4G, globe data loaded after hydration, no CLS > 0.05, fonts preloaded, land-110m cached immutable.
- Robustness: backend unreachable → error banner only; demo mode hides run buttons with the precomputed tooltip; 422 payload rendered row by row.
