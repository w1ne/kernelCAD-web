---
id: subtract-then-fillet-rim
title: Plate with a through-hole and a filleted top rim around the hole
tags: [fillet, subtract, hole, plate, parameter]
keywords:
  - fillet the rim of a through-hole
  - rounded edge around a circular hole
  - parametric plate with hole and rim fillet
when_to_use: You want a parametric plate, drill a through-hole, and round the rim where the hole meets the top face.
---

```typescript
const s = param('Plate Size', 50, { unit: 'mm', min: 20, max: 200 });
const t = param('Plate Thickness', 8, { unit: 'mm', min: 2, max: 30 });
const d = param('Hole Diameter', 12, { unit: 'mm', min: 3, max: 30 });
const r = param('Fillet Radius', 1.5, { unit: 'mm', min: 0.2, max: 5 });
const plate = box(s, s, t);
const hole = cylinder(t + 2, d / 2).translate(s / 2, s / 2, -1);
return plate.subtract(hole).fillet(r, { face: 'top' });
```
