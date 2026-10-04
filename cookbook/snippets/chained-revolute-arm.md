---
id: chained-revolute-arm
title: Chained 3-joint revolute arm with collision-free knuckles
tags: [assembly, connector, mate, revolute, joint]
keywords:
  - robot arm with three revolute joints
  - chained arm links shoulder elbow wrist
  - serial arm passes mechanism gates at every limit
  - clevis tongue pin knuckle per link
when_to_use: >-
  You are building a serial robot arm (shoulder, elbow, wrist) as an
  assembly. Each link carries a tongue + pin at its proximal pivot and a
  clevis at its distal pivot (disjoint axial ranges, see
  revolute-joint-knuckle), so every joint is collision-free at any angle;
  the joint limits and link lengths keep non-adjacent links clear of each
  other and of the base at every combination of limits.
---

```typescript
// Every pivot axis is Y. Axial ranges along Y at each joint:
//   child tongue y in [-4.5, 4.5]; parent cheeks y in [±5, ±9].
const R = 6, pinR = 2, boreR = 2.2;
const yCyl = (r, y0, y1, x = 0, z = 0) =>
  cylinder(y1 - y0, r).rotateX(-90).translate(x, y0, z);

// Clevis whose pivot sits at the origin, body behind it along -X.
const clevis = () => union(
  union(
    yCyl(R, 5, 9), box(14, 4, 2 * R).translate(-14, 5, -R),
    yCyl(R, -9, -5), box(14, 4, 2 * R).translate(-14, -9, -R),
  ).subtract(yCyl(boreR, -10, 10)),
  box(6, 18, 2 * R).translate(-14, -9, -R),       // bridge, x in [-14, -8]
);

// Link of length L: tongue + pin at the origin, clevis at (L, 0, 0).
const link = (L) => union(
  yCyl(R, -4.5, 4.5),
  yCyl(pinR, -9.5, 9.5),
  box(L - 14, 9, 8).translate(0, -4.5, -4),
  clevis().translate(L, 0, 0),
);

const H = 80;                        // shoulder pivot height
const L1 = 70, L2 = 50, L3 = 40;
const base = union(
  box(80, 60, 10).translate(-40, -30, 0),                  // plate
  box(12, 18, H - 24).translate(-6, -9, 10),               // column
  clevis().rotateY(-90).translate(0, 0, H),                // cheeks point up
);

const arm = assembly('chained-revolute-arm');
const parts = {
  base: arm.part('base', base),
  upper: arm.part('upper', link(L1)),
  fore: arm.part('fore', link(L2)),
  hand: arm.part('hand', link(L3)),
};
const axis = (part, name, x, z) =>
  part.connector(name, { type: 'axis', origin: { kind: 'vec3', value: [x, 0, z] }, axis: [0, 1, 0] });
axis(parts.base, 'shoulder', 0, H);
axis(parts.upper, 'proximal', 0, 0);
axis(parts.upper, 'distal', L1, 0);
axis(parts.fore, 'proximal', 0, 0);
axis(parts.fore, 'distal', L2, 0);
axis(parts.hand, 'proximal', 0, 0);

// Limits keep links out of the bridges behind each pivot (|angle| <= 100)
// and keep the folded hand above the base plate and clear of the column.
arm.mate('shoulder', 'base.shoulder', 'upper.proximal', 'revolute', { limitsDeg: [-100, 0] });
arm.mate('elbow', 'upper.distal', 'fore.proximal', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('wrist', 'fore.distal', 'hand.proximal', 'revolute', { limitsDeg: [-90, 90] });

return arm.solvedModel({ shoulder: -45, elbow: 45, wrist: 30 });
```
