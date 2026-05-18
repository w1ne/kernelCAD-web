---
id: path-spline-organic-outline
title: Organic 2D outline via path().spline() N-waypoint B-spline
tags: [primitive, sketch, extrude]
keywords:
  - path spline
  - organic 2D outline
  - freeform sketch profile
  - eyewear brow profile
  - b-spline waypoint interpolation
when_to_use: You need a freeform 2D outline (eyewear brow, ergonomic grip silhouette, sneaker midsole) authored as a sequence of measured waypoints, and arc primitives + smoothSpline are too rigid. Drop a single .spline([...]) call into the path() chain after moveTo; the path interpolates through every waypoint at degree 3.
---

```typescript
const brow = path()
  .moveTo(-60, 0)
  .spline([
    [-60, 0],
    [-30, 6],
    [  0, 9],
    [ 30, 6],
    [ 60, 0],
  ])
  .lineTo(60, -8)
  .lineTo(-60, -8)
  .close();

return brow.extrude(4);
```
