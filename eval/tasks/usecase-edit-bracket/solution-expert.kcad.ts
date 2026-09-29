// U14 — edit of the U1 sensor-wall-bracket project (slug q81ZVP1J, v2):
// "make the back plate 10 mm taller, move the holes accordingly and add a
// 45 deg chamfer on the front edges."
// Changes vs U1 baseline (confirmed via diff_scripts / diff_geometry):
//   plateH: 40 -> 50 (centered box, grows symmetrically top+bottom)
//   mountHoleY: -14 -> -19 (shifted -5mm to preserve the original 6mm gap
//     to the new bottom edge, i.e. "moved accordingly" with the plate)
//   + frontChamfer param (1mm) and plate.chamfer(1, {face:'top'}) applied
//     to the back plate's front-face perimeter BEFORE any other feature
//     unions it, to avoid the face-split-after-boolean bug (see report).
// Everything else (ring, slot, ears, screw hole, boreDia=30.2 clearance,
// M4 countersinks, holeSpacing=30) is untouched.
// VERIFIED against live kernelCAD MCP 2026-09-28. Published:
// https://app.kernelcad.com/p/q81ZVP1J?version=2

const plateW = param('plateW', 50);
const plateH = param('plateH', 50);
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
const earOverlap = param('earOverlap', 3);
const m3ClearDia = param('m3ClearDia', 3.4);

const m4HoleDia = param('m4HoleDia', 4.5);
const m4HeadDia = param('m4HeadDia', 8.96);
const holeSpacing = param('holeSpacing', 30);
const mountHoleY = param('mountHoleY', -19);

const frontChamfer = param('frontChamfer', 1);

let plate = box(plateW, plateH, plateT, true).translate(0, 0, plateT.divide(-2));
plate = plate.chamfer(frontChamfer, { face: 'top' });
plate = plate.holes('top', {
  positions: [
    { u: holeSpacing.divide(-2), v: mountHoleY },
    { u: holeSpacing.divide(2), v: mountHoleY },
  ],
  diameter: m4HoleDia,
  depth: 'through',
  countersink: { diameter: m4HeadDia, angleDeg: 90 },
});

const ringOuter = cylinder(ringHeight, ringOR).translate(0, ringCenterY, -0.2);
const ringInner = cylinder(ringHeight.add(2), boreR).translate(0, ringCenterY, -1.2);
const ring = ringOuter.subtract(ringInner);

const slotCut = box(slotWidth, ringOR.add(15), ringHeight.add(2))
  .translate(slotWidth.divide(-2), ringCenterY, -1);
const ringSlotted = ring.subtract(slotCut);

const earY = ringCenterY.add(ringOR).subtract(earOverlap);
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
