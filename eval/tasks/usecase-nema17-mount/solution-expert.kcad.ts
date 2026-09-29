// U2 — NEMA-17 motor mount L-bracket for 2020 aluminium extrusion.
// Motor face 42.3mm square, 31mm M3 hole pattern, 22mm pilot; base w/ 2x M5
// slots for the extrusion; 5mm thick; fillet on the bend.
// VERIFIED against live kernelCAD MCP 2026-09-28. Published: https://app.kernelcad.com/p/xavMyquk
//
// NOTE: box.holes('front', {positions:[...]}) / box.hole('front', {...}) silently
// mis-cut 3 of 5 holes on this face (product bug — see report). Worked around by
// cutting each hole as an explicit world-frame cylinder(...).alongAxis([0,1,0]).

const t = param('t', 5); // plate thickness
const baseW = param('baseW', 50); // X width of base plate
const baseD = param('baseD', 45); // Y depth of base plate (along extrusion)
const vertW = param('vertW', 48); // X width of vertical (motor) plate
const vertH = param('vertH', 55); // Z height of vertical plate above base top
const filletR = param('filletR', 4);

const nemaSpacing = param('nemaSpacing', 31); // NEMA17 31mm square bolt pattern
const nemaHoleDia = param('nemaHoleDia', 3.4); // M3 clearance
const pilotDia = param('pilotDia', 22); // NEMA17 pilot boss bore
const motorCenterZ = param('motorCenterZ', 30); // motor-face pattern center height (world Z)

const slotWidth = param('slotWidth', 5.5); // M5 clearance
const slotLen = param('slotLen', 10);
const slotSpacingX = param('slotSpacingX', 20); // matches 2020 extrusion bolt spacing
const slotCenterY = param('slotCenterY', 22);

let vert = box(vertW, t, vertH, false).translate(vertW.divide(-2), 0, t);

const holeLen = t.add(2);
const xL = nemaSpacing.divide(-2);
const xR = nemaSpacing.divide(2);
const zBot = motorCenterZ.subtract(nemaSpacing.divide(2));
const zTop = motorCenterZ.add(nemaSpacing.divide(2));

const nema1 = cylinder(holeLen, nemaHoleDia.divide(2)).alongAxis([0, 1, 0]).translate(xL, -1, zBot);
const nema2 = cylinder(holeLen, nemaHoleDia.divide(2)).alongAxis([0, 1, 0]).translate(xR, -1, zBot);
const nema3 = cylinder(holeLen, nemaHoleDia.divide(2)).alongAxis([0, 1, 0]).translate(xL, -1, zTop);
const nema4 = cylinder(holeLen, nemaHoleDia.divide(2)).alongAxis([0, 1, 0]).translate(xR, -1, zTop);
const pilot = cylinder(holeLen, pilotDia.divide(2)).alongAxis([0, 1, 0]).translate(0, -1, motorCenterZ);

vert = vert.subtract(nema1).subtract(nema2).subtract(nema3).subtract(nema4).subtract(pilot);

// Base plate: X centered, Y from 0..baseD, Z from 0..t
let base = box(baseW, baseD, t, false).translate(baseW.divide(-2), 0, 0);

let bracket = base.union(vert);

// Fillet the inside (concave) bend edge running along X at the join.
bracket = bracket.fillet(filletR, { concave: true, parallel: [1, 0, 0] });

// Two M5 slots through the base plate for the 2020 extrusion T-slot.
const slotCutL = cylinder(t.add(2), slotWidth.divide(2))
  .translate(slotSpacingX.divide(-2), slotCenterY.subtract(slotLen.divide(2)), -1)
  .union(cylinder(t.add(2), slotWidth.divide(2))
    .translate(slotSpacingX.divide(-2), slotCenterY.add(slotLen.divide(2)), -1))
  .union(box(slotWidth, slotLen, t.add(2), true)
    .translate(slotSpacingX.divide(-2), slotCenterY, t.add(2).divide(2).subtract(1)));

const slotCutR = cylinder(t.add(2), slotWidth.divide(2))
  .translate(slotSpacingX.divide(2), slotCenterY.subtract(slotLen.divide(2)), -1)
  .union(cylinder(t.add(2), slotWidth.divide(2))
    .translate(slotSpacingX.divide(2), slotCenterY.add(slotLen.divide(2)), -1))
  .union(box(slotWidth, slotLen, t.add(2), true)
    .translate(slotSpacingX.divide(2), slotCenterY, t.add(2).divide(2).subtract(1)));

bracket = bracket.subtract(slotCutL).subtract(slotCutR);

dfmSpec({ minWall: 1.2 });

return bracket;
