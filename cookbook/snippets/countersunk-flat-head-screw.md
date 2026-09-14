---
id: countersunk-flat-head-screw
title: Countersunk hole seating a flat-head screw flush
tags: [fastener, revolve, assembly]
keywords:
  - countersink cone 90 degrees for ISO 10642 flat head
  - flat head screw seated flush with the face
  - countersink diameter equals head diameter
  - holes with countersink option
when_to_use: >-
  You need countersunk holes whose cone matches a flat-head screw so the head
  sits flush: hole or holes with countersink { diameter, angleDeg } cut a real
  cone widest at the entry face, and a revolved 90° head of the same diameter
  fills it with no gap on the cone and no overlap (M3–M6 ISO 10642 table).
---

```typescript
// ISO 10642 countersunk head, 90°: nominal d, head diameter dk; ISO 273 medium
// clearance bore dh.
const ISO10642 = {
  M3: { d: 3, dk: 6.72, dh: 3.4 },
  M4: { d: 4, dk: 8.96, dh: 4.5 },
  M5: { d: 5, dk: 11.2, dh: 5.5 },
  M6: { d: 6, dk: 13.44, dh: 6.6 },
};
const spec = ISO10642.M4;
const thickness = 6;
const length = 12;
const spacing = 30;

// Two countersunk holes in a 50 × 20 bar. The countersink diameter is the head
// diameter, so the cone rim matches the head rim at the face.
const bar = box(50, 20, thickness).translate(-25, -10, 0).holes({ atZ: thickness, byNormal: 'Z' }, {
  positions: [{ u: -spacing / 2, v: 0 }, { u: spacing / 2, v: 0 }],
  diameter: spec.dh,
  depth: 'through',
  countersink: { diameter: spec.dk, angleDeg: 90 },
});

// Flat-head screw as a revolve profile (radius, height): shank of Ø d, then
// the 90° head cone from Ø d up to Ø dk at the top face (z = 0 of the screw).
const headHeight = (spec.dk - spec.d) / 2; // 90° included angle → rise = radial step
function flatHeadScrew() {
  return path()
    .moveTo(0, -length)
    .lineTo(spec.d / 2, -length)
    .lineTo(spec.d / 2, -headHeight)
    .lineTo(spec.dk / 2, 0)
    .lineTo(0, 0)
    .close()
    .revolve();
}

const arm = assembly('countersunk-flat-head-screw');
arm.part('bar', bar, { material: 'aluminum-6061' });
arm.part('screw-a', flatHeadScrew(), { material: 'mild-steel', at: [-spacing / 2, 0, thickness] });
arm.part('screw-b', flatHeadScrew(), { material: 'mild-steel', at: [spacing / 2, 0, thickness] });
return arm.model();
```
