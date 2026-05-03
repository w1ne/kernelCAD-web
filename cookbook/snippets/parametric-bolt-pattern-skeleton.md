---
id: parametric-bolt-pattern-skeleton
title: Parametric part skeleton driven by bolt diameter
tags: [parameter, bolt, plate, hole, subtract]
keywords:
  - parametric bracket scaled by bolt size
  - thickness as multiple of bolt diameter
  - dimensions derived from bolt parameter
when_to_use: You want a part whose dimensions all derive from a single bolt-diameter parameter; thickness, plate size, hole clearance all scale together.
---

````typescript
const boltDiam = param('Bolt Diameter', 5, { unit: 'mm', min: 3, max: 10 });
const t = 2 * boltDiam;
const w = 4 * boltDiam;
const holeR = (boltDiam + 0.5) / 2;
const plate = box(w, w, t);
const hole = cylinder(t + 2, holeR).translate(w / 2, w / 2, -1);
return plate.subtract(hole);
````
