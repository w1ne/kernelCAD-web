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
const plateSize = param('plateSize', 50, { min: 20, max: 200 });
const plateThickness = param('plateThickness', 8, { min: 2, max: 30 });
const holeDia = param('holeDia', 12, { min: 3, max: 30 });
const filletRadius = param('filletRadius', 1.5, { min: 0.2, max: 5 });

return box(plateSize, plateSize, plateThickness)
  .hole('top', { u: 0, v: 0, diameter: holeDia, depth: 'through', name: 'centerHole' })
  .fillet(filletRadius, { face: 'centerHole.wall' });
```
