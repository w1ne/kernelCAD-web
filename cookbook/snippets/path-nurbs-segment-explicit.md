---
id: path-nurbs-segment-explicit
title: Explicit 2D B-spline segment via path().nurbsSegment() control net
tags: [primitive, sketch, extrude]
keywords:
  - path nurbsSegment
  - explicit b-spline control net
  - 2D nurbs sketch segment
  - programmatic profile generation
when_to_use: You have an explicit B-spline control polygon (programmatic generation, round-tripping from external CAD, when precise shape control beats waypoint convenience) and want a 2D path segment authored from the control net directly. The first control point must match the current pen position within 1e-6 mm; the pen ends at the last control point.
---

```typescript
const profile = path()
  .moveTo(0, 0)
  .nurbsSegment(
    [[0, 0], [5, 10], [15, 10], [20, 0]],
    { degree: 3 },
  )
  .lineTo(20, -5)
  .lineTo(0, -5)
  .close();

return profile.extrude(3);
```
