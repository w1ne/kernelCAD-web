---
id: ledge-height-slot-block
title: Cut a pocket down to the plane of another face with cutout upToFace
tags: [cutout, pocket, face-ref]
keywords:
  - up to face
  - cut up to face
  - up to surface
  - extruded cut to face
  - pocket to ledge height
when_to_use: A pocket or slot must end on the plane of an existing planar face (a ledge, a step, an inclined face, or the far side) instead of at a copied depth number; pass upToFace to cutout so the floor follows that face when the model changes.
example: examples/cookbook-parity/ledge-height-slot-block.kcad.ts
---

```typescript
// 60 x 30 x 24 mm stepped block, datum ledge at z = 12 on the right half.
const block = box(60, 30, 24).subtract(box(30, 30, 12).translate(30, 0, 12));
const slot = path().moveTo(-5, -10).lineTo(5, -10).lineTo(5, 10).lineTo(-5, 10).close();
// The slot floor lands on the ledge plane: z = 12.
return block.cutout(slot, {
  face: { containsPoint: [15, 15, 24] },
  upToFace: { containsPoint: [45, 15, 12] },
});
// The target must be planar; an inclined plane gives an inclined floor.
```
