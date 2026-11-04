---
id: tolerance-stack
title: Declare dimension tolerances for a 1D stack
tags: [tolerance, dimension]
keywords:
  - tolerance stack worst-case and RSS
  - analyze_tolerance_stack
  - dimension tol upper lower
  - root-sum-square variance share
  - 1D arithmetic stack gap
when_to_use: >-
  You need to know whether a gap still holds when two declared dimensions are
  at their tolerance limits. Put tol on shape.dimension, then call the MCP
  tool analyze_tolerance_stack with a chain of those ids. The result is a 1D
  worst-case band and an independent RSS band, not a GD&T capability study.
---

```typescript
// Slot 10 +0.2/−0 and tab 9.8 +0/−0.1. analyze_tolerance_stack reads the
// chain [{ id: 'slot', sense: '+' }, { id: 'tab', sense: '-' }] and reports
// worst-case and RSS limits. A missing tol is refused.
return box(20, 10, 5)
  .dimension({
    id: 'slot',
    kind: 'linear',
    from: [0, 0, 0],
    to: [10, 0, 0],
    tol: { upper: 0.2, lower: 0 },
  })
  .dimension({
    id: 'tab',
    kind: 'linear',
    from: [0, 0, 0],
    to: [9.8, 0, 0],
    tol: { upper: 0, lower: -0.1 },
  });
```
