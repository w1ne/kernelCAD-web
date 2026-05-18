---
id: path-hermite-g2-blend-2d
title: 2D quintic Hermite G2 transition between two path runs
tags: [primitive, sketch, extrude]
keywords:
  - path hermiteG2
  - quintic hermite 2D
  - g2-continuous path transition
  - eyewear bridge to brow blend
when_to_use: You're authoring a freeform 2D outline that should transition from one prescribed point + tangent (+ curvature) to another with G2 continuity (no visible curvature crease where adjacent neighbours meet). Drop a single .hermiteG2(a, b) call into the chain; a.point must match the current pen position. Tangent magnitude is the first derivative (typical ~ chord length, NOT unit length).
---

```typescript
const profile = path()
  .moveTo(-20, 0)
  .lineTo(-10, 0)
  .hermiteG2(
    { point: [-10, 0], tangent: [0,  8], curvature: [0, 0] },
    { point: [ 10, 0], tangent: [0, -8], curvature: [0, 0] },
  )
  .lineTo(20, 0)
  .lineTo(20, -6)
  .lineTo(-20, -6)
  .close();

return profile.extrude(2.5);
```
