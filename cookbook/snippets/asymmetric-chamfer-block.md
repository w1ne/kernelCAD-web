---
id: asymmetric-chamfer-block
title: Bevel an edge with two different leg lengths
tags: [chamfer, edge-features, plate]
keywords:
  - two distance chamfer
  - asymmetric chamfer
  - distance and angle chamfer
  - lead-in bevel with unequal legs
when_to_use: A bevel needs unequal legs, such as a lead-in or a weld prep; `distance` is measured on the reference face and `distance2` or `angleDeg` sets the other leg.
example: examples/cookbook-parity/asymmetric-chamfer-block.kcad.ts
---

```typescript
const block = box(40, 30, 10);
// 2 mm in from the rim on the top face, 5 mm down the side faces.
return block.chamfer(2, 'top', { distance2: 5 });
// Distance and angle: .chamfer(2, 'top', { angleDeg: 60 })
// Edge query: name the reference face: .chamfer(3, { parallel: 'Z' }, { distance2: 6, face: 'front' })
```
