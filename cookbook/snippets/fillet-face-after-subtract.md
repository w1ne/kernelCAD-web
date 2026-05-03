---
id: fillet-face-after-subtract
title: Fillet only the top face after subtract
tags: [fillet, subtract, face-ref, edge-features]
keywords:
  - round the rim of a hole
  - fillet the top edge after cutting
  - chamfer the lip of a pocket
when_to_use: After subtracting a hole or pocket, you want to round only the rim of the resulting opening — not every edge in the part.
---

```typescript
const plate = box(50, 50, 8);
const hole = cylinder(10, 6).translate(25, 25, -1);
return plate.subtract(hole).fillet(1.5, { face: 'top' });
```
