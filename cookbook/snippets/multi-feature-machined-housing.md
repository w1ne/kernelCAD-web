---
id: multi-feature-machined-housing
title: Multi-feature machined housing with bosses, pockets, bearing seats, fillets
tags: [shell, hole, pocket, fillet, plate, parameter, manufacturing, subtract, primitive]
keywords:
  - machined housing
  - bearing housing
  - gearbox housing
  - multi-feature enclosure
  - bearing seat bore
  - mounting boss
  - blind pocket
  - hole pattern
  - production enclosure
  - real mechanical part
  - manufacturing intent walls fillets
  - complex housing not stacked boxes
when_to_use: >-
  Prompt asks for a real / production / complex mechanical housing, bearing
  housing, gearbox-ish enclosure, or multi-feature machined part with walls,
  fillets, bosses, pockets, and hole patterns. Prefer this over
  union-of-stacked-primitives — Adam-level bar requires manufacturing-intent
  BREP, not a toy stack of boxes.
---

Adam-competitive mechanical mid-complexity: editable params, cavity walls,
bearing seat bore, floor bosses, bolt pattern, fillet. Do **not** ship a
`union` of raw boxes when the user said real / production / complex /
enclosure / gearbox / housing.

```typescript
const L = param('length', 120, { min: 60, max: 240 });
const W = param('width', 80, { min: 40, max: 160 });
const H = param('height', 50, { min: 25, max: 100 });
const wall = param('wall', 4, { min: 2, max: 10 });
const seatR = param('bearingSeatR', 12, { min: 5, max: 30 });

// Solid blank, then cavity so walls remain (manufacturing intent).
let body = box(L, W, H);
body = body.subtract(
  box(L.subtract(wall.multiply(2)), W.subtract(wall.multiply(2)), H.subtract(wall))
    .translate(wall, wall, wall),
);

// Floor bosses inside the cavity, then through-floor taps.
for (const [x, y] of [[16, 16], [104, 16], [16, 64], [104, 64]] as const) {
  body = body.union(cylinder(8, 8).translate(x, y, wall));
}
body = body.subtract(
  cylinder(H.add(2), 2.6)
    .translate(16, 16, -1)
    .patternGrid({
      x: { count: 2, direction: [1, 0, 0], spacing: 88 },
      y: { count: 2, direction: [0, 1, 0], spacing: 48 },
    }),
);

// Bearing seat: through-Y bore. rotate(axis, degrees) — after +90° about X,
// cylinder height runs −Y, so anchor at +Y past the far wall.
body = body.subtract(
  cylinder(W.add(2), seatR)
    .rotate([1, 0, 0], 90)
    .translate(L.divide(2), W.add(1), H.divide(2)),
);

return body.fillet(1.5, { parallel: [0, 0, 1] });
```

**Verify before claiming success**

1. `evaluate_script` — clean compile, named params editable in Studio.
2. Optional `verify({ check: 'dfm' })` for print/machine sanity.
3. `export({ format: 'step' })` when the user needs a stranger-acceptable part.
4. Prefer `design_loop` for multi-attempt enclosure/gearbox prompts — revise on
   `nextActionPrompt` until green (see docs/agent/adam-quality-bar.md).
