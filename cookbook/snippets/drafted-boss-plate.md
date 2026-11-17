---
id: drafted-boss-plate
title: Draft a boss or pocket with a tapered extrude
tags: [extrude, draft, plate, manufacturing]
keywords:
  - tapered extrude
  - extrude with draft angle
  - draft a boss for mould release
  - taper angle extrusion
  - frustum from a sketch
when_to_use: A moulded or cast feature such as a screw boss, rib block or pocket core needs drafted side walls; pass taperDeg to Sketch.extrude instead of lofting two hand-sized profiles or calling draft() face by face.
example: examples/cookbook-parity/drafted-boss-plate.kcad.ts
---

```typescript
const plate = box(60, 40, 4);
// Ø8 mm boss, 10 mm tall, 3° draft: the top is Ø(8 − 2·10·tan 3°) ≈ Ø6.95 mm.
const boss = path().moveTo(4, 0).threePointsArc(-4, 0, 0, 4).threePointsArc(4, 0, 0, -4).close()
  .extrude(10, { taperDeg: 3 });
return plate.union(boss.translate(15, 20, 4)).subtract(cylinder(9, 1.25).translate(15, 20, 5));
// A negative taperDeg widens the profile toward the far end.
```
