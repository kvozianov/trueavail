# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-23
- Primary product surfaces: `/`, `/demo`, `/judge`, `/technical`, `/liquidity-control-tower`, `/functions/[functionKey]`, `/landing`.
- Evidence reviewed: `FRONTEND_DEMO_ROADMAP.md`, `project_memory/design_system.md`, `project_memory/vision.md`, `project_memory/architecture.md`, `project_memory/current_tasks.md`, `app/globals.css`, `components/liquidity/DemoCockpit.tsx`, `components/liquidity/PermissionedRailPanel.tsx`, `/Users/kirill/Downloads/DESIGN.md`, `/Users/kirill/Downloads/theme.css`, `/Users/kirill/Downloads/variables.css`, `/Users/kirill/Downloads/tokens.json`, `.stitch/designs/*`.

## Brand
- Personality: Premium treasury command center, precise, quiet, governed, high-confidence.
- Trust signals: deterministic replay, explicit live/fallback status, p05/ES99/HHI metrics, solver status, audit IDs, OpenAPI/backend contract proof.
- Avoid: generic SaaS dashboard, marketing hero, public blockchain aesthetics, token/wallet/gas/mining/DeFi language, fake bank integration claims, oversized cards that crowd simulation space.

## Product goals
- Goals: Explain “Book balance says green. Usable liquidity says red.” in the first 30 seconds; keep the Golden Incident central; expose backend value through forecast, stress, HHI, optimizer, governance, contingency, AI Council, ROI, and permissioned liquidity mobility evidence.
- Non-goals: Production payment rail, backend rewrite, crypto positioning, decorative animation, one-off visual reference copying.
- Success signals: Jury can click through pending -> breached -> rejected, compare legacy vs permissioned rail, see why governance rejects, and understand p05 gap, TARGET2 stress loss, ES99, HHI, infeasible optimizer, and contingency.

## Personas and jobs
- Primary personas: Treasury operator, CFO/risk reviewer, technical judge, operations lead.
- User jobs: Detect unsafe payout, understand liquidity gap, compare rail options, defend rejection with evidence, inspect contracts and replay artifacts.
- Key contexts of use: Pitch demo, jury walkthrough, treasury incident room, cut-off pressure review.

## Information architecture
- Primary navigation: Home/demo cockpit, map cockpit, judge evidence packet, technical proof packet, function drilldowns.
- Core routes/screens: `/demo` as Golden Incident control room; `/liquidity-control-tower` as map simulation; `/judge` as evidence matrix; `/technical` as implementation proof; `/functions/[functionKey]` as function-level contracts.
- Content hierarchy: Decision -> exposure -> constraint -> evidence -> action -> audit. Controls should frame the simulation, not consume the simulation area.

## Design principles
- Principle 1: High-density controls, spacious simulation. Side rails compress inputs and evidence so the center remains available for complex visualizations.
- Principle 2: Every visual state must explain a treasury decision, not decorate a fintech page.
- Tradeoffs: Use dark glass surfaces and subtle glow from the refero/Origin reference, but keep orange/red reserved for incident, blocker, and active policy focus. Prefer Tailwind utility composition for new demo layout while preserving stable existing CSS for legacy route surfaces.

## Visual language
- Color: Midnight background `#0f1011`, charcoal surfaces, mist text, muted gray borders, orange incident glow, red for breach/reject/blocker only. Optional blue/violet accents are allowed only as contained functional data accents.
- Typography: Display serif for large cockpit questions; compact sans for UI; mono for IDs, timestamps, APIs, audit hashes, solver status, and numbers.
- Spacing/layout rhythm: Compact controls use 6-10px internal gaps, 8-12px section gaps, and small button/input heights. Simulation stage uses the largest uninterrupted rectangle on desktop.
- Shape/radius/elevation: 8px controls, 14-16px cards, 24-30px hero/stage shells, subtle 1px borders, restrained backdrop blur on floating panels.
- Motion: Short opacity/transform transitions only. Collapsible panels should feel instant and not block repeated demo operation. Respect reduced motion.
- Imagery/iconography: No decorative illustrations. Use deterministic network/cloud atmosphere and financial data visualization.

## Components
- Existing components to reuse: `DemoNav`, Golden Incident data adapter, `RuntimeStrip`, `PermissionedRailPanel`, `FunctionWorkbench`, judge/technical/function views, map controls.
- New/changed components: Compact `/demo` shell with collapsible simulation controls, central result stage, evidence/audit rail, and high-density metric/action chips.
- Variants and states: pending, breached, rejected, escalated, timed-out, live, replay, loading, fallback, collapsed, expanded.
- Token/component ownership: CSS variables in `app/globals.css`; new demo layout should use Tailwind utilities with CSS variable references such as `text-[var(--ink)]`, `border-[var(--line)]`, and `bg-[rgba(...)]`.

## Accessibility
- Target standard: Keyboard reachable, readable contrast, visible focus, semantic sections, ARIA labels for stateful controls.
- Keyboard/focus behavior: Collapsible panel buttons must expose `aria-expanded`; rail/action buttons must stay focus-visible.
- Contrast/readability: No white text on near-white overlays and no muted text below readable contrast on map or glass panels.
- Screen-reader semantics: Preserve decision, evidence, action, audit section labels; status updates use `aria-live` where already present.
- Reduced motion and sensory considerations: Existing reduced-motion CSS remains required; no constant motion in frequently used controls.

## Responsive behavior
- Supported breakpoints/devices: Desktop pitch screen, laptop, tablet, mobile around 390px.
- Layout adaptations: Desktop uses left control rail + central simulation + right evidence rail; medium screens collapse rails above/below; mobile stacks controls and keeps panels compact.
- Touch/hover differences: Buttons need at least comfortable tap targets on mobile, while desktop can use compact `sm` density.

## Interaction states
- Loading: Compact runtime/fallback status strip, skeleton surfaces for charts/tables.
- Empty: Explain missing snapshot or API data without hiding deterministic replay.
- Error: Show fallback active and keep demo usable.
- Success: Use neutral/white/gray or subdued success tint; do not overuse green.
- Disabled: Muted text and border, not invisible.
- Offline/slow network, if applicable: Replay Snapshot mode remains explicit.

## Content voice
- Tone: Command-first, treasury-native, defensible.
- Terminology: Usable liquidity, p05 gap, TARGET2 stress, ES99, HHI, optimizer infeasible, governance reject, contingency, Permissioned Liquidity Mobility Overlay.
- Microcopy rules: No “replace SWIFT”; say legacy route vs permissioned overlay. No crypto/web3 terminology. Keep labels short in compact controls.

## Implementation constraints
- Framework/styling system: Next.js App Router, React client components, Tailwind v4 via `@tailwindcss/postcss`, existing global CSS variables.
- Design-token constraints: Reference tokens from `/Users/kirill/Downloads/*`; do not copy copyrighted video or production assets.
- Performance constraints: Deterministic canvas background, no heavy animation libraries unless a user-visible collapse/transition benefit justifies the dependency.
- Compatibility constraints: Preserve URL phase state (`?phase=pending|breached|rejected`), deterministic replay, and Golden Incident metrics.
- Test/screenshot expectations: `npm run lint`, `npm run build`, `npm run backend:verify` where relevant, browser QA desktop/mobile for `/demo`, and contrast review of map/evidence surfaces.

## Open questions
- [ ] Should the compact cockpit become the only `/demo` layout or should a “presenter dense mode” toggle preserve the current spacious layout? Owner: product. Impact: scope of CSS cleanup.
- [ ] Should Framer Motion be added for collapsible panels after the pitch, or should CSS-only transitions remain the safer short-term path? Owner: engineering. Impact: dependency and bundle size.
