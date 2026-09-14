---
id: repair-shell-too-thick
title: Repair a shell thicker than half the solid
tags: [shell]
keywords:
  - feature.kernel-failed shell
  - shell thickness too large
  - hollow wall exceeds half bbox
  - repair_script shell
when_to_use: evaluate_script reported feature.kernel-failed on a .shell() whose wall is thicker than half the thinnest bounding-box dimension, and you want a feasible thickness derived from that bbox.
---

OCCT cannot hollow a solid when the wall is thicker than half the thinnest
dimension. `repair_script` reads the input bbox and proposes 0.40× / 0.25× /
0.10× of that dimension, under the half-thickness ceiling.

The block below is the repaired result of `examples/repair/shell-too-thick.kcad.ts`.

```typescript
return box(10, 10, 10).shell(4, { face: 'top' });
```
