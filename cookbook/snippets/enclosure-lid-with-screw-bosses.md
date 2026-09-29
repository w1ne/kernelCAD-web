---
id: enclosure-lid-with-screw-bosses
title: Enclosure base and screw-on lid with corner bosses and clearance holes
tags: [shell, hole, pocket, fillet, plate, parameter, manufacturing, assembly, subtract]
keywords:
  - enclosure lid
  - screw-on cover
  - electronics box lid
  - corner bosses with taps
  - clamshell without hinge fasteners
  - production enclosure cover plate
when_to_use: >-
  Prompt asks for an electronics enclosure with a removable screw-on lid/cover
  (not a hinged clamshell). Build a walled base with corner bosses + lid with
  matching clearance holes. Prefer this over `clamshell-hinge-two-part-assembly`
  when the user wants fasteners, not a revolute hinge.
---

```typescript
const L = param('length', 100, { min: 50, max: 200 });
const W = param('width', 70, { min: 40, max: 140 });
const H = param('height', 35, { min: 20, max: 80 });
const wall = param('wall', 2.5, { min: 1.5, max: 5 });
const lidT = param('lidThickness', 2.5, { min: 1.5, max: 5 });

const arm = assembly('enclosure');

let base = box(L, W, H);
base = base.subtract(
  box(L.subtract(wall.multiply(2)), W.subtract(wall.multiply(2)), H.subtract(wall))
    .translate(wall, wall, wall),
);

// Corner bosses inside the cavity (M3 taps through floor).
const bossR = 5;
const tapR = 1.25;
const inset = wall.add(8);
for (const [x, y] of [
  [inset, inset],
  [L.subtract(inset), inset],
  [inset, W.subtract(inset)],
  [L.subtract(inset), W.subtract(inset)],
] as const) {
  base = base.union(cylinder(H.subtract(wall), bossR).translate(x, y, wall));
  base = base.subtract(cylinder(H.add(2), tapR).translate(x, y, -1));
}
base = base.fillet(1, { parallel: [0, 0, 1] });
arm.part('base', base, { material: 'abs' });

let lid = box(L, W, lidT);
for (const [x, y] of [
  [inset, inset],
  [L.subtract(inset), inset],
  [inset, W.subtract(inset)],
  [L.subtract(inset), W.subtract(inset)],
] as const) {
  lid = lid.subtract(cylinder(lidT.add(2), 1.7).translate(x, y, -1));
}
arm.part('lid', lid.translate(0, 0, H), { material: 'abs' });

return arm.model();
```
