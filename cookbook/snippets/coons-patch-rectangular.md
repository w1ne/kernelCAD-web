---
id: coons-patch-rectangular
title: Coons-patch surface from 4 NURBS boundary curves
tags: [primitive]
keywords:
  - coons patch
  - surfaceFromBoundary
  - four boundary nurbs curves
when_to_use: You need a freeform NURBS surface whose silhouette is defined by 4 stitched boundary curves authored as nurbsCurve(). Walk the loop in declaration order (bottom, right, top, left), call surfaceFromBoundary, then thicken into a solid.
---

```typescript
const bottom = nurbsCurve([[0, 0, 0], [25, 0, 1], [50, 0, 0]]);
const right  = nurbsCurve([[50, 0, 0], [50, 12, 0.5], [50, 25, 0]]);
const top    = nurbsCurve([[50, 25, 0], [25, 25, 1], [0, 25, 0]]);
const left   = nurbsCurve([[0, 25, 0], [0, 12, 0.5], [0, 0, 0]]);
const panel  = surfaceFromBoundary([bottom, right, top, left]).thicken(2);
return panel;
```
