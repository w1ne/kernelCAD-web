---
id: metric-thread-from-diameter
title: Coarse ISO metric thread from a nominal hole diameter
tags: [hole, thread, fastener]
keywords:
  - nominal diameter to coarse ISO metric designation
  - thread true fromDiameter fills pitch from the diameter
  - resolve_metric_thread metricThreadFromDiameter
  - 12 millimetres becomes M12 coarse
when_to_use: >-
  You have a bare hole diameter in millimetres (12) and need the ISO coarse
  designation (M12 × 1.75). Use hole({ diameter, thread: true }) or
  metricThreadFromDiameter. Do not use this for an ISO 273 clearance bore.
---

```typescript
// diameter is the NOMINAL major size. thread: true fills the ISO 261 coarse
// pitch (12 mm → M12 × 1.75) and records metadata.threadSpec. The kernel
// drills the minor diameter. A clearance bore is a different call.
return box(40, 40, 8).hole('top', { u: 0, v: 0, diameter: 12, depth: 'through', thread: true });
```
