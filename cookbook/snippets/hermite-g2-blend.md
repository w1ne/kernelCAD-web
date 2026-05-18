---
id: hermite-g2-blend
title: Quintic Hermite G2 bridge between NURBS curve flanks
tags: [primitive]
keywords:
  - hermiteG2
  - quintic hermite transition
  - g2-continuous curve bridge
when_to_use: You have a pair of existing NURBS curves whose tangents and curvatures match at the join point and you want a G2-continuous compound spine (so a downstream variableSweep does not kink at the join). Author the flanks via nurbsCurve, then drop a hermiteG2 between them with matching endpoint tangents and curvatures.
---

```typescript
const flankL = nurbsCurve([[-30, 0, 0], [-20, 4, 0], [-10, 4, 0]]);
const flankR = nurbsCurve([[ 10, 4, 0], [ 20, 4, 0], [ 30, 0, 0]]);
const bridge = hermiteG2(
  { point: [-10, 4, 0], tangent: [10, 0, 0], curvature: [0, -0.05, 0] },
  { point: [ 10, 4, 0], tangent: [10, 0, 0], curvature: [0, -0.05, 0] },
);
const profile = path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();
const spineHalf = variableSweep(bridge, [
  { t: 0, profile },
  { t: 1, profile: path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close() },
]);
return spineHalf;
```
