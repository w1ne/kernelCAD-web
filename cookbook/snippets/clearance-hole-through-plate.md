---
id: clearance-hole-through-plate
title: Through-hole sized for a bolt with clearance
tags: [subtract, hole, bolt, plate, parameter]
keywords:
  - clearance fit hole for a bolt
  - through-hole for M5 bolt
  - bolt diameter plus 0.5mm clearance
  - ISO 273 close normal clearance hole M3 M4 M5 M6
when_to_use: >-
  You need a through-hole sized for a bolt with a small clearance margin. Use
  `hole(face, { diameter, depth: 'through' })` (or `holes` for a pattern), not
  a subtracted cylinder; for a tapped hole see `threaded-hole-tap-drill`.
---

```typescript
const t = 8;
const boltDiam = 5;
// ISO 273 clearance for M5: close 5.3, normal 5.5, coarse 5.8. Bolt + 0.5 = normal.
// hole u/v are offsets from the centre of the top face; 'through' cuts the full plate.
const plate = box(40, 40, t);
return plate.hole('top', { u: 0, v: 0, diameter: boltDiam + 0.5, depth: 'through', name: 'boltClear' });
```
