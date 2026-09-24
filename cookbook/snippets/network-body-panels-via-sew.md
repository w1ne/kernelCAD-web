---
id: network-body-panels-via-sew
title: Network-style body via multi-patch sew (not >2 loft rails)
tags: [shell, continuity, sweep, fillet]
keywords:
  - network surface body
  - more than 2 loft rails
  - multi patch sew body
  - surfaceFromBoundary panels
  - surfaceFromCurves sew thicken
  - MakePipeShell rail limit
  - G2 fillet body panels
when_to_use: >-
  You need a network-style organic body / multi-guide fairing and loft rails
  would exceed OCCT MakePipeShell's 2-rail cap. Do NOT pass >2 rails to
  Sketch.loft — panel with surfaceFromCurves / surfaceFromBoundary, sew closed,
  thicken, then G2 fillet. Pair with automotive-body-envelope for car proportions
  and verify body-likeness before publish.
---

OCCT `MakePipeShell` accepts **at most 2 rails** (spine + auxiliary). Raising
`opts.rails` past 2 always fails with `feature.loft.rail-miss`. For network-style
bodies, switch to a **multi-patch sew** workflow instead of pretending more
rails work.

**Stack**

1. Author panel patches (`nurbsSurface` / `surfaceFromCurves` / `surfaceFromBoundary`).
2. Prefer `.thicken(t)` on each `Surface`, then boolean the solids — **or** `sew([...surfaces], { requireClosed: true })` when the patches already close a shell (`sew` returns a Shape; it has no `.thicken`).
3. G2 fillet long NURBS-adjacent seams on the resulting solid.
4. Before `open_in_studio`: `verify({ check: 'body-likeness', ... })`.

Minimal evaluable pattern (two NURBS patches sewn — scale up to body panels):

```typescript
const a = nurbsSurface({
  controls: [
    [[0, 0, 0], [40, 0, 4], [80, 0, 0]],
    [[0, 30, 4], [40, 30, 12], [80, 30, 4]],
    [[0, 60, 0], [40, 60, 4], [80, 60, 0]],
  ],
  degree: { u: 2, v: 2 },
});
const b = nurbsSurface({
  controls: [
    [[80, 0, 0], [120, 0, 2], [160, 0, 0]],
    [[80, 30, 4], [120, 30, 10], [160, 30, 2]],
    [[80, 60, 0], [120, 60, 2], [160, 60, 0]],
  ],
  degree: { u: 2, v: 2 },
});
// sew() returns a Shape. For solids, thicken each Surface first, then boolean/union,
// or sew a closed shell of Surfaces with requireClosed: true.
return sew([a, b]);
```
