// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/usecase-sensor-bracket/solution-expert.kcad.ts
//
// Typical use case U1: wall-mount bracket for a 30 mm cylindrical sensor.
// Slotted clamp ring with an M3 clamp screw; back plate 50 x 40 x 4 mm with
// two M4 countersunk holes 30 mm apart. PLA print; clamp bore 30.2 mm.

const plateW = param('plateW', 50);
const plateH = param('plateH', 40);
const plateT = param('plateT', 4);

const boreDia = param('boreDia', 30.2, { description: 'clamp bore, 0.2mm clearance over 30mm sensor' });
const boreR = boreDia.divide(2);
const ringWall = param('ringWall', 2.5, { min: 1.2 });
const ringOR = boreR.add(ringWall);
const ringHeight = param('ringHeight', 20);
const ringCenterY = param('ringCenterY', 6);

const slotWidth = param('slotWidth', 3);
const earWidth = param('earWidth', 6);
const earDepth = param('earDepth', 10);
const m3ClearDia = param('m3ClearDia', 3.4);

const m4HoleDia = param('m4HoleDia', 4.5); // ISO 10642 M4 clearance
const m4HeadDia = param('m4HeadDia', 8.96); // ISO 10642 M4 countersink head dia
const holeSpacing = param('holeSpacing', 30);
const mountHoleY = param('mountHoleY', -14);

// Back plate, centered in X/Y, z from -plateT to 0 (0 = front/visible face).
let plate = box(plateW, plateH, plateT, true).translate(0, 0, plateT.divide(-2));
plate = plate.holes('top', {
  positions: [
    { u: holeSpacing.divide(-2), v: mountHoleY },
    { u: holeSpacing.divide(2), v: mountHoleY },
  ],
  diameter: m4HoleDia,
  depth: 'through',
  countersink: { diameter: m4HeadDia, angleDeg: 90 },
});

// Clamp ring, axis along Z, on the plate front face; it sinks 0.2 mm into
// the plate so the union has real overlap, not a tangent face.
const ringOuter = cylinder(ringHeight, ringOR).translate(0, ringCenterY, -0.2);
const ringInner = cylinder(ringHeight.add(2), boreR).translate(0, ringCenterY, -1.2);
const ring = ringOuter.subtract(ringInner);

// Radial slot opening the ring toward +Y so it can be clamped shut.
const slotCut = box(slotWidth, ringOR.add(15), ringHeight.add(2))
  .translate(slotWidth.divide(-2), ringCenterY, -1);
const ringSlotted = ring.subtract(slotCut);

// Ear pads flanking the slot, holding the M3 clamp screw. They start 1 mm
// outside the bore, inside the ring wall, so they never intrude on the bore.
const earY = ringCenterY.add(boreR).add(1);
const earPadL = box(earWidth, earDepth, ringHeight)
  .translate(slotWidth.divide(-2).subtract(earWidth), earY, 0);
const earPadR = box(earWidth, earDepth, ringHeight)
  .translate(slotWidth.divide(2), earY, 0);

const screwHoleLen = earWidth.multiply(2).add(slotWidth).add(4);
const screwHole = cylinder(screwHoleLen, m3ClearDia.divide(2))
  .alongAxis([1, 0, 0])
  .translate(screwHoleLen.divide(-2), earY.add(earDepth.divide(2)), ringHeight.divide(2));

dfmSpec({ minWall: 1.2 });

return plate
  .union(ringSlotted)
  .union(earPadL)
  .union(earPadR)
  .subtract(screwHole);
