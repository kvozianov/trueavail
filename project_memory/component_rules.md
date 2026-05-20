# Component Rules

## Navigation

- Active state must work for nested routes.
- Mobile navigation must close after route selection.
- Keep top navigation compact and predictable.

## Mission Control

- Mission state belongs in `useLiquidityMission`.
- UI should expose queued, running, complete, blocked, and error states.
- API receipts must stay inspectable but should not dominate first glance.
- Approval blocked is a successful governance outcome, not a generic error.

## Data Visualization

- Charts should support the core story: p05 breach, stress loss, concentration, and governance.
- Avoid decorative charts that do not change a decision.
- Keep labels readable and numeric formatting stable.

## Copy

- Use direct treasury language.
- Avoid fake enterprise generalities.
- Use "deterministic demo snapshot" for fallback artifact language.
