# Current Tasks

## Completed

- Loaded `FRONTEND_DEMO_ROADMAP.md` and rebuilt the frontend around the Golden Incident plan.
- Added a frontend-level `goldenIncident` adapter with deterministic replay fallback and visible Live API / Replay Snapshot mode language.
- Replaced the first screen with a black/white governed liquidity decision cockpit centered on `Approve EUR 4.1M payout?`.
- Added URL-driven demo phases for `pending`, `breached`, and `rejected` so the defense flow is deep-linkable and robust.
- Added `/demo`, `/judge`, and `/technical` routes for the Golden Incident flow, jury evidence packet, and technical proof packet.
- Completed Phase 8 polish: runtime status strip, decision state progression, and 3-5 minute pitch mode rail.
- Verified pending remains neutral while breached/rejected states use emergency red.
- Added interactive function separation: expandable Forecast, Stress, HHI, Optimizer, Governance, and Contingency modules with endpoint receipts.
- Added function drilldown routes under `/functions/[functionKey]` for Forecast, Stress, HHI, Optimizer, Governance, and Contingency proof pages.
- Added the world liquidity map dashboard as the new main page and `/liquidity-control-tower` screen.
- Seeded map accounts for New York, Singapore, Saudi Arabia, and Germany with USD/EUR capital and editable synthetic conditions.
- Added interactive map account selection, selected-account editing, synthetic scenario generation, and add-account flow for available countries.
- Upgraded the map into a jury simulation: scenario cards, problem account highlighting, SWIFT/TARGET2/SARIE/Fedwire transfer rails, program response ledger, and decision outcome.
- Added richer seeded account data: bank names, account codes, liquidity floors, primary transfer rails, and demo balances.
- Hardened add-account behavior so the button reads actual form values and supports manual treasury-node creation during the demo.
- Replaced `/demo` with a separate TrySight-inspired realtime simulation dashboard: account rail, central live network map, alert/action panel, liquidity health score, and bottom time machine.
- Added demo playback controls: Start demo, Play/Pause, Crisis Mode, Reset, AI insight, and Execute Plan rescue flow.
- Ran frontend lint, production build, and browser QA across desktop/mobile demo states plus judge/technical routes.
- Added site-wide product-safe motion polish: page surface reveal, button/card/table hover states, animated SWIFT/rail map flows, active account pulses, risk-state washes, function module open motion, and reduced-motion protection.
- Re-ran frontend lint, production build, and browser QA across map, demo, judge, technical, and function detail routes after animation polish.
- Fixed the world map blank/black fallback by adding explicit SVG fill/stroke attributes and redesigned the map page into a stronger control-map dashboard with dark hero, visible Demo CTA, rail mesh header, map legend, larger account nodes, and premium panel styling.
- Re-ran lint, production build, and browser QA for `/`, `/liquidity-control-tower`, plus desktop/mobile map views after the map redesign.
- Added map-native treasury overlays: bank popover card, animated alert notifications, animated money pulses moving along transfer lines, ETA labels on each rail, and transfer ledger notes explaining calendar impact.
- Added a banking-days and seasonality visualization: open/cutoff/closed/usable day strip plus seasonal pressure bars for payroll, tax, month-end, merchant, supplier, and holiday effects.
- Completed a dedicated `/demo` design pass: command-room hero, health/stat control card, improved account cards, map popover, map notices, animated rescue-flow pulses, ETA labels, runway copy, and a banking-days/seasonality board.
- Loaded the master markdown prompt and implemented the Settlement Observatory direction.
- Reworked dashboard first viewport into a treasury command center.
- Added function contract detail pages.
- Created persistent project memory files.
- Normalized app-facing function catalog copy to English.
- Fixed active navigation state for nested function routes and presentation.
- Added visible mission progress state above scenario cards.
- Reworked mission scenario disabled styling so running state stays in the dark design system.
- Captured fresh production screenshots for function pages and mission states.
- Re-ran frontend lint, production build, and backend unit tests.
- Rechecked the full app after the latest changes: stale-copy scan, project memory presence, frontend lint, production build, backend verify, production route probes, and browser screenshots.
- Removed the previous visual system entirely: global styling, motion components, old QA screenshots, and design-memory direction.
- Restored `/demo` and `/` to the Golden Incident decision cockpit with URL-driven phases.
- Added a typed deterministic Permissioned Liquidity Mobility Overlay prototype with legacy-vs-permissioned comparison, timeline replay, policy checks, finality certificate, audit hash, before/after gap, and failure paths.
- Extended `/judge`, `/technical`, and function drilldowns to include Permissioned Liquidity Mobility Overlay, AI Council, ROI, and OpenAPI/backend contract proof.

## Active

- Golden Incident cockpit is ready for dry-run as the main entry point.
- `/demo` now behaves as the main Golden Incident decision room; jury can reveal the false-safe payout, compare legacy settlement against the permissioned liquidity overlay, and inspect governed failure paths.
- The map page still supports choosing simulated deal scenarios and adding treasury accounts.
- Golden Incident proof and function-by-function inspection remain available through `/judge`, `/technical`, and `/functions/[functionKey]`.

## Pending Improvements

- Add richer live backend health/error details when the API is available.
- Consider splitting `DemoCockpit` into smaller files if the next change expands the interaction model.
- Add a timed presenter mode only if a real pitch rehearsal shows pacing problems.
- Consider adding live API request playback to each function drilldown if the backend is available during the pitch.
- Connect the map add-account and synthetic condition model to backend persistence when account storage exists.
- Add richer country/currency support after the demo validates the first four treasury nodes.
- Add scenario authoring if jurors need to create custom transactions live instead of choosing from curated scenarios.
- Keep the top navbar pointed at the Golden Incident demo; use `/liquidity-control-tower` for map/account scenario editing.
- Dry-run `/demo?phase=rejected#permissioned-rail` in presenter mode and tune pacing if the overlay takes too long to explain live.
- Split `MissionControl` into smaller components if another mission behavior change is needed.
- Add richer inline error and retry affordances if backend failures become more common in testing.

## Discovered Issues

- User asked to remove the current visual system and start the next design from zero.
- Localhost browser cache can preserve stale CSS during rapid dev-server restarts; `http://127.0.0.1:3000` loaded the current design cleanly during QA.
- Next.js dev server blocks dev resources for `127.0.0.1` unless configured in `allowedDevOrigins`; use `http://localhost:3000` for browser QA so React interactions hydrate.
- Browser log history still reports a stale hook dependency warning from an earlier hot-reload build; source inspection shows current local `useEffect` dependency arrays are stable.
- Old QA screenshots were deleted because they represented rejected design states.

## Next Highest-Impact Task

Run a human dry-run from `/demo?phase=pending`: click through breach and reject, open the Permissioned Liquidity Mobility Overlay, show clear path versus failure paths, then use `/judge` and `/technical` as proof packets.
