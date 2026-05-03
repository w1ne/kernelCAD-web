---
id: clearance-hole-through-plate
title: Through-hole sized for a bolt with clearance
tags: [subtract, hole, bolt, plate, parameter]
keywords:
  - clearance fit hole for a bolt
  - through-hole for M5 bolt
  - bolt diameter plus 0.5mm clearance
when_to_use: You need a through-hole sized for a bolt with a small clearance margin; cylinder height extends beyond the plate so the cut is unambiguous.
---

````typescript
const t = 8;
const boltDiam = 5;
const plate = box(40, 40, t);
const hole = cylinder(t + 2, (boltDiam + 0.5) / 2).translate(20, 20, -1);
return plate.subtract(hole);
````
