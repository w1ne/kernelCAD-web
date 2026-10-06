---
id: roller-conveyor-repeated-parts
title: Gravity roller conveyor segment with rollers placed on a pitch and rotated
tags: [assembly, rotate, revolve, extrude]
keywords:
  - roller conveyor
  - gravity conveyor
  - conveyor line
  - rollers on a line
  - rotated cylinders
  - repeated rollers
  - conveyor stand with cross bracing
  - production line layout
when_to_use: >-
  You are modelling a conveyor, roller table or any line of identical
  rotated parts. Model the roller along +Z once in a helper (a revolved
  profile with axle stubs), then place each copy with `at` and lay it across
  the frame with `rotate`, so every roller shares one geometry. Draw flat
  braces as polygons in their own XY plane and rotate them into the stand or
  side plane per part; turn the far side frame 180 deg about Z instead of
  building a mirrored copy. Repeat whole segments the same way for a long
  line (examples/plant/roller-conveyor.kcad.ts: 20 segments, 1,060 parts,
  7 unique geometries).
---

```typescript
// One 3 m segment: x along the line, side frames at y 0..40 and 540..580,
// roller tops at z 760.
const SEG_LEN = 3000;
const PITCH = 75;
const ROLLERS = 39;
const arm = assembly('roller-conveyor');
const FRAME = '#e0a92a';

// C-channel side frame, web toward the rollers, hex axle holes on the pitch.
const sideFrame = () => union(
  box(SEG_LEN, 4, 100).translate(0, 36, 0), box(SEG_LEN, 40, 4), box(SEG_LEN, 40, 4).translate(0, 0, 96),
).subtract(
  cylinder(20, 6.5, 6).rotate([1, 0, 0], 90).translate(75, 46, 85)
    .patternLinear({ count: ROLLERS, direction: [1, 0, 0], spacing: PITCH }),
).color(FRAME);
// Roller along +Z: axle stubs, 50 mm tube with chamfered ends.
const roller = () => path()
  .moveTo(0, 0).lineTo(5.5, 0).lineTo(5.5, 8).lineTo(23, 8).lineTo(25, 10)
  .lineTo(25, 488).lineTo(23, 490).lineTo(5.5, 490).lineTo(5.5, 498).lineTo(0, 498)
  .close().revolve().color('#c9ced3');
const leg = () => union(box(80, 60, 6).translate(-20, -20, 0), box(40, 40, 594).translate(0, 0, 6)).color(FRAME);
const header = () => box(60, 580, 48).color(FRAME);
const tie = () => box(40, 498, 40).color(FRAME);
const standBrace = () => extrudePolygon([[42, 192], [42, 232], [538, 598], [538, 558]], 30).color(FRAME);
const kneeBrace = () => extrudePolygon([[362, 192], [362, 232], [2638, 598], [2638, 558]], 30).color(FRAME);

arm.part('frame-a', sideFrame(), { at: [0, 0, 650] });
arm.part('frame-b', sideFrame(), { at: [SEG_LEN, 580, 650], rotate: [0, 0, 180] });
[300, 2660].forEach((x, k) => {
  arm.part(`stand-${k}-leg-a`, leg(), { at: [x, 0, 0] });
  arm.part(`stand-${k}-leg-b`, leg(), { at: [x + 40, 580, 0], rotate: [0, 0, 180] });
  arm.part(`stand-${k}-header`, header(), { at: [x - 10, 0, 601] });
  arm.part(`stand-${k}-tie`, tie(), { at: [x, 41, 150] });
  // 120 deg about (1,1,1) maps local x -> y, y -> z, z -> x: brace in the stand plane.
  arm.part(`stand-${k}-brace`, standBrace(), { at: [x + 5, 0, 0], rotate: { axis: [1, 1, 1], degrees: 120 } });
});
// +90 deg about X maps local y -> z, z -> -y: knee braces in the side planes.
arm.part('knee-brace-a', kneeBrace(), { at: [0, 35, 0], rotate: [90, 0, 0] });
arm.part('knee-brace-b', kneeBrace(), { at: [0, 575, 0], rotate: [90, 0, 0] });
for (let k = 0; k < ROLLERS; k++) {
  // +90 deg about X maps the roller's +Z axis to -Y: it spans y 41..539.
  arm.part(`roller-${k}`, roller(), { at: [75 + PITCH * k, 539, 735], rotate: [90, 0, 0], material: 'mild-steel' });
}

return arm.model();
```
