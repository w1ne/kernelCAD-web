---
id: tapered-fillet-bracket
title: Taper a fillet radius along an edge
tags: [fillet, edge-features, bracket]
keywords:
  - variable radius fillet along an edge
  - tapered fillet
  - fillet from one radius to another
  - linear variable fillet
  - root fillet that grows along the edge
when_to_use: A round must grow along its edge, such as a root fillet that is heavier where a bracket carries more load; pass endRadius to fillet so radius applies at the edge's low end and endRadius at its high end.
example: examples/cookbook-parity/tapered-fillet-bracket.kcad.ts
---

```typescript
const bracket = box(60, 30, 5).union(box(5, 30, 40));
const insideRoot = { parallel: 'Y', within: { xMin: 4, xMax: 6, zMin: 4, zMax: 6 } };
// 2 mm at y = 0 (the edge's low end), 8 mm at y = 30 (its high end).
return bracket.fillet(2, insideRoot, { endRadius: 8 });
// Closed edges (circles) have no ends and are refused with feature.invalid-args.
```
