---
id: rack-row-repeated-parts
title: Row of identical cabinets built from helpers, placed with at and rotate
tags: [assembly, rotate, primitive, subtract]
keywords:
  - rack row
  - data center row
  - server rack cabinet
  - repeated parts
  - many identical parts
  - array of assemblies
  - place copies with at
  - rotate a copy
  - mirrored copy with rotate
  - large assembly
when_to_use: >-
  You are laying out many identical parts or sub-units (racks in a row,
  cabinets, bins, fixtures) in one assembly. Build each shape in a helper
  function and call it per copy, place copies with `at` and orient them with
  `rotate` (mirrored rails, the second door leaf, the far end panel) instead
  of baking each copy's own position into the shape, so identical copies
  share one geometry and a 1,000-part row stays fast. Keep every part's
  bounding box >= 1 mm from its neighbours so the clash check stays cheap.
  Check `inspect({ of: 'assembly' }).uniqueGeometries`; the full row with
  servers, switches, blanking panels and a cable ladder is
  examples/plant/rack-row.kcad.ts.
---

```typescript
// 42U cabinets, 600 W x 1200 D x 2000 H mm, front door on the -y face.
const RACKS = 10;
const PITCH = 602;
const U = 44.45;
const arm = assembly('rack-row');
const CABINET = '#a9b0b9';

const plinth = () => box(600, 1200, 50).subtract(box(520, 1120, 60).translate(40, 40, -5)).translate(0, 0, 31)
  .union(cylinder(33, 12).translate(20, 20, 0)).union(cylinder(33, 12).translate(580, 20, 0))
  .union(cylinder(33, 12).translate(20, 1180, 0)).union(cylinder(33, 12).translate(580, 1180, 0))
  .color(CABINET);
const roof = () => box(600, 1200, 40).subtract(box(400, 80, 60).translate(100, 60, -10)).color(CABINET);
const post = () => box(40, 40, 1876).color(CABINET);
// 19-inch rail, L profile: front flange (x 0..30) + side web (y 0..60).
const rail = () => union(box(30, 2.5, 1876), box(2.5, 60, 1876)).color('#e3e6e9');
// Perforated door: shallow pan, slotted skin, swing handle.
const door = (w: number, cols: number, handleX: number) => box(w, 22, 1874)
  .subtract(box(w - 60, 22, 1794).translate(30, 2, 40))
  .subtract(box(46, 10, 22).translate(50, -4, 80).patternGrid({
    x: { count: cols, direction: [1, 0, 0], spacing: 84 },
    y: { count: 46, direction: [0, 0, 1], spacing: 37 },
  }))
  .union(box(24, 25, 180).translate(handleX, -25, 850))
  .color(CABINET);
const server = () => box(446, 750, 87).color('#7d838b');
const sidePanel = () => box(15, 1200, 1968).color(CABINET);

for (let i = 0; i < RACKS; i++) {
  const x0 = i * PITCH;
  const name = (part: string) => `rack-${i}-${part}`;
  arm.part(name('plinth'), plinth(), { at: [x0, 0, 0], material: 'mild-steel' });
  [[0, 0], [560, 0], [0, 1160], [560, 1160]].forEach(([x, y], k) =>
    arm.part(name(`post-${k}`), post(), { at: [x0 + x, y, 82], material: 'mild-steel' }));
  arm.part(name('roof'), roof(), { at: [x0, 0, 1959], material: 'mild-steel' });
  // One rail shape, mirrored into all four corners by rotation.
  arm.part(name('rail-fl'), rail(), { at: [x0 + 45, 150, 82] });
  arm.part(name('rail-fr'), rail(), { at: [x0 + 555, 150, 1958], rotate: [0, 180, 0] });
  arm.part(name('rail-rl'), rail(), { at: [x0 + 45, 1050, 1958], rotate: [180, 0, 0] });
  arm.part(name('rail-rr'), rail(), { at: [x0 + 555, 1050, 82], rotate: [0, 0, 180] });
  for (let k = 0; k < 8; k++) {
    arm.part(name(`server-${k}`), server(), { at: [x0 + 77, 152, 90 + 2 * U * k], material: 'mild-steel' });
  }
  arm.part(name('front-door'), door(596, 6, 546), { at: [x0 + 2, -23, 82] });
  // Split rear door: the same leaf turned 180 deg about Z, and about X.
  arm.part(name('rear-left'), door(296, 3, 14), { at: [x0 + 298, 1223, 82], rotate: [0, 0, 180] });
  arm.part(name('rear-right'), door(296, 3, 14), { at: [x0 + 302, 1223, 1956], rotate: [180, 0, 0] });
}

arm.part('side-panel-near', sidePanel(), { at: [-16, 0, 31] });
arm.part('side-panel-far', sidePanel(), { at: [RACKS * PITCH + 14, 1200, 31], rotate: [0, 0, 180] });

return arm.model();
```
