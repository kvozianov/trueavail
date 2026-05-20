# Known Issues

## Active

- `app/globals.css` contains older base styles plus later Settlement Observatory overrides. It works, but long-term maintainability would improve by extracting route/component sections or pruning unused legacy selectors.
- Mobile screenshots need a dedicated QA pass across landing, dashboard, presentation, simulator, and function detail.
- `components/mission/MissionControl.tsx` is large. Split when the next behavior change touches mission artifacts or receipts.
- Browser dev logs may retain stale hot-reload warnings from earlier sessions even after production builds pass. Current source inspection found no local dependency-array shape change.

## Watch

- Keep deterministic fallback clearly labeled.
- Keep function pages aligned with backend contract changes after `npm run backend:contracts`.
- Do not let landing/presentation visuals become more important than the operator dashboard.
- Keep function catalog copy in one product language unless a localized mode is explicitly added.
