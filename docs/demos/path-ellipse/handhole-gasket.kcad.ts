// Elliptical handhole gasket, 190 × 140 mm outside, 15 mm land, 3 mm thick,
// turned 30° in the sheet.
//
// Sketch booleans do not take a NURBS profile, so the opening is an extruded
// ellipse subtracted from the blank.

const OUTER_RX = 95;        // mm, semi-axis along the long side
const OUTER_RY = 70;        // mm
const LAND = 15;            // mm, gasket width on both axes
const THICKNESS = 3;        // mm
const TURN = 30;            // degrees, nesting angle in the sheet

const blank = path().ellipse(0, 0, OUTER_RX, OUTER_RY, { rotationDeg: TURN }).extrude(THICKNESS);
const opening = path()
  .ellipse(0, 0, OUTER_RX - LAND, OUTER_RY - LAND, { rotationDeg: TURN })
  .extrude(THICKNESS + 2)
  .translate(0, 0, -1);

return blank.subtract(opening);
