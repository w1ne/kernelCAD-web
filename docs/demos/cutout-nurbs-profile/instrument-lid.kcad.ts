// Instrument enclosure lid, 120 × 80 × 6 mm, with an elliptical display
// window cut through and a spline-bounded thumb recess 2.5 mm deep at the
// front edge. Both are `cutout()` features on the top face, so the window
// and recess walls carry the `wall` created ref.
//
// Profile (x, y) is mm from the centre of the top face; +y points to the back.

const LENGTH = 120;        // mm
const DEPTH = 80;          // mm
const THICKNESS = 6;       // mm
const WINDOW_RX = 30;      // mm, display window semi-axis along the length
const WINDOW_RY = 15;      // mm
const WINDOW_Y = 8;        // mm, window centre behind the face centre
const RECESS_DEPTH = 2.5;  // mm

const displayWindow = path().ellipse(0, WINDOW_Y, WINDOW_RX, WINDOW_RY);
const thumbRecess = path()
  .moveTo(-14, -32)
  .lineTo(14, -32)
  .spline([[14, -32], [7, -24], [0, -22], [-7, -24], [-14, -32]])
  .close();

return box(LENGTH, DEPTH, THICKNESS)
  .cutout(displayWindow, { face: 'top', depth: 'through', name: 'displayWindow' })
  .cutout(thumbRecess, { face: 'top', depth: RECESS_DEPTH, name: 'thumbRecess' });
