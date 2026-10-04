// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-nema17-mount/solution-expert.kcad.ts
//
// Typical use case U2: L-bracket that mounts a NEMA 17 stepper to a 2020
// aluminium extrusion. Motor plate with the 31 mm M3 pattern and the 22 mm
// pilot bore, base with two M5 slots for the extrusion, 5 mm thick, fillet on
// the inside of the bend.

const t = param('t', 5); // plate thickness
const baseW = param('baseW', 50); // X width of the base plate
const baseD = param('baseD', 45); // Y depth of the base plate (along the extrusion)
const vertW = param('vertW', 48); // X width of the motor plate (>= 42.3 motor face)
const vertH = param('vertH', 55); // Z height of the motor plate above the base
const filletR = param('filletR', 4);

const nemaSpacing = param('nemaSpacing', 31); // NEMA 17 bolt pattern
const nemaHoleDia = param('nemaHoleDia', 3.4); // M3 clearance
const pilotDia = param('pilotDia', 22); // NEMA 17 pilot boss
const motorCenterZ = param('motorCenterZ', 30); // motor axis height (world Z)

// M5 extrusion slots. Plain numbers: a cutout profile reads a ParamRef
// coordinate as 0 today (https://github.com/w1ne/kernelCAD-web/issues/803).
const slotWidth = 5.5; // M5 clearance
const slotLen = 10; // centre-to-centre travel
const slotSpacingX = 20; // 2020 extrusion slot spacing
const slotCenterY = 22;

// Motor plate: x -24..24, y 0..5, z 5..60. Hole (u, v) on 'front' (the y = 0
// face) is measured from the face centre, u along +X and v along +Z.
let vert = box(vertW, t, vertH).translate(vertW.divide(-2), 0, t);
const v0 = motorCenterZ.subtract(t.add(vertH.divide(2))); // motor axis in face v
const half = nemaSpacing.divide(2);
vert = vert.holes('front', {
  positions: [
    { u: half.negate(), v: v0.subtract(half) },
    { u: half, v: v0.subtract(half) },
    { u: half.negate(), v: v0.add(half) },
    { u: half, v: v0.add(half) },
  ],
  diameter: nemaHoleDia,
  depth: 'through',
});
vert = vert.hole('front', { u: 0, v: v0, diameter: pilotDia, depth: 'through' });

// Base plate: x -25..25, y 0..45, z 0..5, with the two extrusion slots cut
// through its top face (profile origin = face centre, x along +X, y along +Y).
let base = box(baseW, baseD, t).translate(baseW.divide(-2), 0, 0);
const r = slotWidth / 2;
const cy = slotCenterY - 45 / 2; // base top-face centre is at y = baseD / 2
for (const cx of [-slotSpacingX / 2, slotSpacingX / 2]) {
  const y0 = cy - slotLen / 2;
  const y1 = cy + slotLen / 2;
  const slot = path()
    .moveTo(cx + r, y0)
    .lineTo(cx + r, y1)
    .threePointsArc(cx - r, y1, cx, y1 + r)
    .lineTo(cx - r, y0)
    .threePointsArc(cx + r, y0, cx, y0 - r)
    .close();
  base = base.cutout(slot, { face: 'top', depth: 'through' });
}

// Join, then round the inside (concave) edge of the bend, which runs along X.
const bracket = base.union(vert).fillet(filletR, { concave: true, parallel: [1, 0, 0] });

dfmSpec({ minWall: 1.2 });

return bracket;
