// One rigid body, several finishes. A 9 g class micro servo is a single
// rigid body for a mechanism: case, output horn and screws never move
// relative to each other here. Each member keeps its own `.finish()` through
// `union()`, so Studio, render_preview and GLB export show a dark case, an
// aluminium horn and steel screw heads without splitting the servo into one
// assembly part (and one fastened mate) per colour.
//
// Cut faces take the body's finish: the cable notch below is ABS, not the
// cutter's finish. A finish on the union result would recolour every face.
//
// Dimensions are a representative SG90-size envelope, not a vendor drawing.

const caseW = 22.8;   // along X
const caseD = 12.2;   // along Y
const caseH = 22.5;   // along Z, body below the tabs
const tabSpan = 32.4;
const tabT = 2.5;
const tabZ = 15.5;    // tab underside
const shaftX = caseW / 2 - 6; // output shaft sits off-centre, toward +X

const dark = { color: '#1d1f23' };

// Pieces of one material are fused first and finished once (the case is one
// moulding); only members that differ carry their own finish.
const caseShell = union(
  box(caseW, caseD, caseH, true).translate(0, 0, caseH / 2),
  box(tabSpan, caseD, tabT, true).translate(0, 0, tabZ + tabT / 2),
  cylinder(4, 5.9).translate(shaftX, 0, caseH),
).finish('abs', dark);

// Output horn: hub plus one arm, aluminium.
const hubTop = caseH + 4 + 4;
const horn = union(
  cylinder(4, 3.5).translate(shaftX, 0, caseH + 4),
  box(18, 5, 1.6, true).translate(shaftX - 9, 0, hubTop - 0.8),
).finish('aluminium');

// Steel screw heads: two tab screws and the horn screw.
const tabScrewX = tabSpan / 2 - 2.4;
const tabScrewA = cylinder(1.2, 1.9).translate(tabScrewX, 0, tabZ + tabT).finish('steel');
const tabScrewB = cylinder(1.2, 1.9).translate(-tabScrewX, 0, tabZ + tabT).finish('steel');
const hornScrew = cylinder(0.8, 1.3).translate(shaftX, 0, hubTop).finish('steel');

// Cable exit notch in the case wall: the cut face stays ABS.
const notch = box(3, 4, 2, true).translate(-caseW / 2, 0, 3).finish('steel');

return union(caseShell, horn, tabScrewA, tabScrewB, hornScrew).subtract(notch);
