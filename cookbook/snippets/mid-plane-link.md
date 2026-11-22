---
id: mid-plane-link
title: Centre a part on its sketch plane with a symmetric extrude
tags: [extrude, plate, mirror, subtract]
keywords:
  - symmetric extrude
  - mid-plane extrude
  - midplane extrusion
  - extrude both directions
  - two-sided extrude centred on the sketch
when_to_use: A plate, link, rib or through-cut must be centred on its sketch plane, for example to mate against a mid-plane or mirror about z = 0; pass symmetric to Sketch.extrude instead of extruding one side and translating by -depth/2.
example: examples/cookbook-parity/mid-plane-link.kcad.ts
---

```typescript
// 8 mm link bar, 60 mm pin centres, full-round ends: spans z = -4..4.
const bar = path().moveTo(0, -6).lineTo(60, -6).threePointsArc(60, 6, 66, 0)
  .lineTo(0, 6).threePointsArc(0, -6, -6, 0).close()
  .extrude(8, { symmetric: true });
const bore = path().moveTo(2.6, 0).threePointsArc(-2.6, 0, 0, 2.6).threePointsArc(2.6, 0, 0, -2.6).close()
  .extrude(10, { symmetric: true });
return bar.subtract(bore).subtract(bore.translate(60, 0, 0));
// depth is the total thickness; symmetric cannot be combined with taperDeg or twistAngle.
```
