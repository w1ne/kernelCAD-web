---
id: revolute-joint-knuckle
title: Revolute joint knuckle (clevis + tongue + pin) that never collides
tags: [assembly, connector, mate, revolute, hinge, joint]
keywords:
  - hinge knuckle collides at every angle
  - clevis and tongue with disjoint axial ranges
  - pin through clevis bores with clearance
  - revolute joint limits
  - robot arm joint knuckle
when_to_use: >-
  You are building the physical hinge of a revolute joint (robot-arm elbow,
  lid, gripper finger). Knuckles built as boxes that straddle the pivot
  collide at every angle. Split the pivot along the ROTATION AXIS instead:
  the parent's clevis cheeks and the child's tongue occupy disjoint axial
  ranges (a gap between them), both are round about the pivot, and a pin on
  the child runs through clearance bores in the cheeks. Then no angle can
  make them overlap, and the mechanism gates pass at every limit.
---

```typescript
// Pivot axis = Y. Axial ranges along Y (disjoint = collision-free at any angle):
//   child tongue  y in [-4.5, 4.5]
//   parent cheeks y in [5, 9] and [-9, -5]   (0.5 mm gap each side)
const R = 6;          // knuckle radius around the pivot
const pinR = 2;       // pin radius (part of the child)
const boreR = 2.2;    // cheek bore radius (pin + 0.2 mm clearance)

// Cylinder along Y from y0 to y1, centred on the X/Z point (x, z).
const yCyl = (r, y0, y1, x = 0, z = 0) =>
  cylinder(y1 - y0, r).rotateX(-90).translate(x, y0, z);

// Parent: a bar along -X ending in a clevis. The bridge that joins the two
// cheeks stays outside the tongue's swept circle (x <= -R - 2).
const cheeks = union(
  yCyl(R, 5, 9), box(14, 4, 2 * R).translate(-14, 5, -R),
  yCyl(R, -9, -5), box(14, 4, 2 * R).translate(-14, -9, -R),
).subtract(yCyl(boreR, -10, 10));
const parentBody = union(
  cheeks,
  box(6, 18, 2 * R).translate(-14, -9, -R),     // bridge, x in [-14, -8]
  box(40, 9, 8).translate(-54, -4.5, -4),       // link bar
);

// Child: tongue round about the pivot, bar along +X, pin through the cheeks.
const childBody = union(
  yCyl(R, -4.5, 4.5),
  box(40, 9, 8).translate(0, -4.5, -4),
  yCyl(pinR, -9.5, 9.5),
);

const arm = assembly('revolute-joint-knuckle');
const parent = arm.part('parent', parentBody);
const child = arm.part('child', childBody);
parent.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
child.connector('pivot', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
// Limits stop the child bar before it swings into the bridge behind the pivot.
arm.mate('hinge', 'parent.pivot', 'child.pivot', 'revolute', { limitsDeg: [-100, 100] });

return arm.solvedModel({ hinge: 60 });
```
