# Design System Memory

## Status

Active direction: black/white governed liquidity decision cockpit.

The frontend should feel like an operational decision interface for treasury risk, not a marketing page, generic fintech dashboard, or shadcn-style admin shell.

## Visual System

- Palette: off-black, off-white, grayscale, and emergency red only for breach, reject, policy violation, and destructive warnings.
- Layout: payout queue, selected payment decision, evidence chain, liquidity impact simulation, audit stamp.
- UI density: tables, rails, ledgers, audit rows, status traces, and compact controls over decorative cards.
- Phase 8 presentation layer: runtime status strip, decision state bar, and horizontal pitch mode rail.
- Interactive function layer: native expandable modules for Forecast, Stress, HHI, Optimizer, Governance, and Contingency. Each module must expose input, output, handoff, endpoint, and receipt checks.
- Function drilldown pages: same visual language as the cockpit, with receipt panel, primary proof metric, call contract, execution trace, decision impact, and function rail.
- World liquidity map: use a strong control-map first screen with a dark command hero, explicit capital totals, visible Demo CTA, protected SVG fills/strokes, HTML account nodes over SVG geography, compact rail mesh header, and editable scenario controls. Map nodes should stay accessible as real buttons and compress labels on mobile to avoid overlap.
- Simulation language: jury scenario cards must show a concrete transaction, affected account, transfer rails, program response, and final decision. SWIFT/SEPA/TARGET2/SARIE/Fedwire routes appear as dashed map lines; red is only for stressed or blocked routes/accounts.
- Map simulation overlays: use floating bank popovers, small animated map notifications, moving money pulses on transfer paths, and ETA labels on the rail itself. These overlays must explain state, not decorate.
- Banking day and seasonality proof: every key scenario should show how cut-off windows, weekends, closed banking days, and seasonal payout pressure change usable cash. Use a compact day strip plus pressure bars so jurors can see the calendar logic graphically.
- Account data display: each treasury node should show bank name, city, account code, currency, capital, liquidity floor, and condition so the demo feels explainable instead of arbitrary.
- `/demo` visual reference: TrySight-like control room with top liquidity health, left account list, central live map, right alerts/actions, and bottom time machine. Keep it operational, dense, and map-first on mobile.
- Typography: system UI sans for product ergonomics, monospace for IDs, API evidence, solver status, and audit rows.
- Motion: operational and state-driven. Use short opacity/transform transitions, animated SWIFT/rail flow lines, restrained active-account pulses, and red risk washes only when they clarify simulation state.
- Copy: command-first treasury language such as `Reject`, `Prefund`, `Throttle`, `Escalate`, `Hold`, and `Restart Demo`.
- State color rule: pending/ready states stay neutral; red is reserved for breach, reject, policy blockers, and destructive warnings.

## Active Routes

- `/` and `/liquidity-control-tower`: world liquidity map dashboard.
- `/demo`: realtime TrySight-inspired liquidity simulation dashboard.
- `/judge`: jury evidence packet with function status table.
- `/technical`: architecture, reproducibility, model stack, and OpenAPI proof.
