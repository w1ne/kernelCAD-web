---
id: repair-tangency-radius
title: Repair a tangentCircle whose radius cannot sit outside existing circles
tags: [tangency, sketch]
keywords:
  - sketch.tangency.no-solution
  - tangentCircle radius too small
  - external tangent radius floor
  - repair_script tangency
when_to_use: evaluate_script reported sketch.tangency.no-solution because a tangentCircle radius was smaller than (centre-distance - r1 - r2) / 2 between existing circles, and you want the radius derived from that gap.
---

Two circles a centre-distance D apart admit no externally-tangent circle
of radius r < (D - r1 - r2) / 2. `repair_script` measures D from the
captured entities and sets `opts.radius` to that floor.

The block below is the repaired result of `examples/repair/tangency-radius-too-small.kcad.ts`.

```typescript
return path().tangentCircle(
  [{ kind: 'circle', center: [0, 0], radius: 10 },
   { kind: 'circle', center: [30, 0], radius: 4 }],
  { radius: 8 },
).extrude(10);
```
