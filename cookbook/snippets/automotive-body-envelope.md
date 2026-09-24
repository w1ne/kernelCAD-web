---
id: automotive-body-envelope
title: Organic automotive body envelope via spline sections + rail loft
tags: [shell, sketch, continuity, sweep, fillet]
keywords:
  - automotive body envelope
  - organic car body
  - berlinetta body
  - sports car body shell
  - rail loft body
  - spline loft sections
  - surfaceFromCurves car body
  - fairing body envelope
  - G2 fillet body panels
  - car body with glass separate
when_to_use: You need a recognizable organic vehicle / berlinetta / fairing body — NOT a stylized polyline loft demo. Prefer spline or hermiteG2 station profiles with ≤2 loft rails (or surfaceFromCurves + sew + thicken + G2 fillet). Keep glass and aero as separate fastened parts; never union wide boxes into the loft solid or cut through-Y arches through a loft.
---

Use this for **organic** car / berlinetta / fairing envelopes. The stylized
`loft-body-shell-from-profiles` recipe (24× `lineTo` ovals) is a mechanism-demo
shell only — do not use it for likeness-driven automotive bodies.

**Preferred stack**

1. Station profiles with `path().spline(...)` or `hermiteG2` — never dense
   `lineTo` polylines pretending to be ovals.
2. `profile.loft(other, { planes, rails })` with **≤2 rails** that pass within
   1 mm of every section (see `examples/curves-surfacing/handle-and-tee.kcad.ts`),
   **or** `surfaceFromCurves(sections)` → `sew([...], { requireClosed: true })`
   → `.thicken(t)` → small G2 / `.fillet` on long edges.
3. Glass canopy as its own solid (union or assembly mate) — do not subtract a
   through-Y arch from the loft (topology collapses; booleans explode).
4. Spoilers / aero / mirrors as separate parts fastened later — never
   `loft.union(wideBox)` to fake appendages.

**Boolean crash patterns (known)**

- Unioning a wide axis-aligned box into a freeform loft → self-intersect /
  non-manifold fuse; keep appendages as separate solids.
- Subtracting a cutter that only grazes a loft (exact tangency) → noop or
  fragile topology; overlap ≥0.1 mm or skip the cut.
- Chaining many booleans on an unfixed loft before fillet → accumulated
  tolerance failures; evaluate after each major solid, fillet early, then
  assemble.
- Open shells into solid booleans → reject; thicken/sew closed first.

```typescript
// Organic envelope demo: spline stations + 2 rails (≤2) + separate glass.
// Rails must pass within 1 mm of every section (corner waypoints match).
const start = path()
  .moveTo(-18, -8)
  .spline([[-18, -8], [-20, 0], [-16, 10], [0, 12], [16, 10], [20, 0], [18, -8]])
  .lineTo(-18, -8)
  .close();
const end = path()
  .moveTo(-12, -6)
  .spline([[-12, -6], [-14, 0], [-10, 7], [0, 8], [10, 7], [14, 0], [12, -6]])
  .lineTo(-12, -6)
  .close();
const railL = nurbsCurve([[-18, -8, 0], [-16, -7, 40], [-12, -6, 80]], { degree: 2 });
const railR = nurbsCurve([[18, -8, 0], [16, -7, 40], [12, -6, 80]], { degree: 2 });
const body = start.loft(end, {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, 80] },
  ],
  rails: [railL, railR],
});
// Glass as a separate solid — do NOT cut a through-Y arch out of the loft.
const glass = box(28, 1.5, 18).translate(-14, 6, 35);
return body.fillet(1.5, { parallel: [0, 0, 1] }).union(glass);
```
