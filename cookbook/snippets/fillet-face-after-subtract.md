---
id: fillet-face-after-subtract
title: Fillet only the rim of a hole after subtract
tags: [fillet, subtract, face-ref, edge-features]
keywords:
  - round the rim of a hole
  - fillet the top edge after cutting
  - chamfer the lip of a pocket
when_to_use: After subtracting a hole or pocket, you want to round only the rim of the resulting opening — not every edge in the part.
---

```typescript
// `fillet(r, { face: 'top' })` rounds EVERY edge of the top face — the
// outer perimeter too, not just the hole. Select the rim alone: the top
// face sits at z = 8 and the hole mouth is the only CIRCLE edge there.
const plate = box(50, 50, 8);
const hole = cylinder(10, 6).translate(25, 25, -1);
return plate.subtract(hole).fillet(1.5, { atZ: 8, ofCurveType: 'CIRCLE' });
```
