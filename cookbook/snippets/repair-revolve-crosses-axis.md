---
id: repair-revolve-crosses-axis
title: Repair a revolve profile that crossed the rotation axis
tags: [revolve, sketch]
keywords:
  - revolve profile crosses axis
  - feature.revolve.crosses-axis
  - clamp path x to zero
  - repair_script revolve
when_to_use: evaluate_script reported feature.revolve.crosses-axis (a path x-coordinate was negative) and you want the profile clamped onto x >= 0 instead of rewriting the sketch by hand.
---

A revolve profile is (radial-X, axial-Z). Any x < 0 crosses the axis and
the kernel refuses to build a self-intersecting solid. `repair_script`
clamps every numeric path x-literal to 0.

The block below is the repaired result of `examples/repair/revolve-crosses-axis.kcad.ts`.

```typescript
return path()
  .moveTo(0, 0)
  .lineTo(10, 0)
  .lineTo(10, 5)
  .lineTo(0, 5)
  .close()
  .revolve();
```
