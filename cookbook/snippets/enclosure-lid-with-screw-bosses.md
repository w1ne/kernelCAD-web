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
  - M3 tapped screw bosses and lid clearance holes with holes()
  - Arduino Raspberry Pi ESP32 project box case with screws
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

// Corner bosses inside the cavity, tapped M3 through the floor; matching M3
// clearance holes (ISO 273 normal, 3.4 mm) in the lid.
const bossR = 5;
const inset = wall.add(8);
const corners = [
  [inset, inset],
  [L.subtract(inset), inset],
  [inset, W.subtract(inset)],
  [L.subtract(inset), W.subtract(inset)],
] as const;
for (const [x, y] of corners) {
  base = base.union(cylinder(H.subtract(wall), bossR).translate(x, y, wall));
}
// Entry face: the outside of the floor. After the cavity cut 'bottom' is
// ambiguous (the inner floor also came from it), so pick it by normal + z.
// hole u/v are offsets from the centre of that face (u = +X, v = +Y).
// thread: diameter is the nominal M3; the kernel drills the ISO minor diameter
// (2.46 mm tap drill) up through floor and boss. Not a subtracted cylinder.
const fromCentre = corners.map(([x, y]) => ({ u: x.subtract(L.divide(2)), v: y.subtract(W.divide(2)) }));
base = base.holes({ byNormal: '-Z', atZ: 0 }, {
  positions: fromCentre,
  diameter: 3,
  depth: H, // full height: 'through' would stop where the floor opens into the cavity
  thread: { pitch: 0.5 },
  name: 'bossTap',
});
base = base.fillet(1, { parallel: [0, 0, 1] });
arm.part('base', base, { material: 'abs' });

const lid = box(L, W, lidT).holes('top', {
  positions: fromCentre,
  diameter: 3.4,
  depth: 'through',
  name: 'lidClear',
});
arm.part('lid', lid.translate(0, 0, H), { material: 'abs' });

return arm.model();
```
