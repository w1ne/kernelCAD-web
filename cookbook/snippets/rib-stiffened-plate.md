---
id: rib-stiffened-plate
title: Add a vertical stiffening rib to a plate
tags: [rib, plate, bracket, union]
keywords:
  - add a rib to a plate
  - stiffening web from an open centerline
  - vertical rib geometry
  - reinforce a flat plate
when_to_use: A plate needs a constant-thickness upright support wall from a straight or bent open XY centerline; overlap the rib with the base for a connected B-rep.
example: examples/cookbook-parity/rib-stiffened-plate.kcad.ts
---

```typescript
const plate = box(40, 30, 10);
return rib(plate, [[5, 15], [35, 15]], {
  thickness: 2,
  height: 20,
  startZ: 9.9, // 0.1 mm overlap into the plate
});
```
