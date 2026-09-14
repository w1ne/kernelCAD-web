---
id: surface-quality-fillet-vs-g2
title: Compare a plain fillet vs a G2 blend with continuity inspect and zebra
tags: [continuity]
keywords:
  - G2 blend
  - G1 fillet
  - continuity inspect
  - zebra stripes
  - curvature inspect
  - surface quality
when_to_use: >-
  You filleted or blended a freeform panel and need numbers, not a guess:
  is the join G0, G1, or G2? inspect({ of: 'continuity' }) samples each
  shared edge for position gap, normal jump and curvature difference.
  inspect({ of: 'curvature' }) reports per-face Gaussian and mean curvature
  (sphere 1/r², cylinder Gaussian 0 and |H|=1/(2r)). render_preview overlay
  zebra / curvature / continuity is the picture of those numbers.
---

```typescript
const bump = nurbsSurface({
  controls: [
    [[0, 0, 0], [20, 0, 4], [40, 0, 0]],
    [[0, 20, 4], [20, 20, 10], [40, 20, 4]],
    [[0, 40, 0], [20, 40, 4], [40, 40, 0]],
  ],
  degree: { u: 2, v: 2 },
});
const cutter = nurbsSurface({
  controls: [[[20, -5, -10], [20, 45, -10]], [[20, -5, 20], [20, 45, 20]]],
  degree: { u: 1, v: 1 },
});
return sew(bump.split(cutter));
```
