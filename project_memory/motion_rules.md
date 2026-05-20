# Motion Rules

## Status

Active motion direction: operational, product-safe animation.

## Baseline

- Keep motion short: roughly 120-260ms for product controls and surface changes.
- Use transform, opacity, border, background, box-shadow, and SVG dash offset only.
- Animated map flows are allowed because they explain SWIFT/rail movement during simulation.
- Red pulse/wash motion is reserved for stressed accounts, blocked rails, breach, reject, and policy warnings.
- Product pages may use subtle surface reveal, hover lift, and active-state feedback; avoid decorative page choreography.
- Always preserve `prefers-reduced-motion` protection for transitions and animations.
