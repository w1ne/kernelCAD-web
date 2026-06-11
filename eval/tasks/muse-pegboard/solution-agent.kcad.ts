// MUSE 'pegboard' — perforated CNC timber panel, 600 x 400 x 5 mm, with a
// centered grid of 6 mm through-holes on a 25 mm pitch and rounded corners.
// Single solid: rounded-rect plate minus a patterned cylinder grid.

const W = 600;        // width
const H = 400;        // height
const T = 5;          // thickness
const CORNER_R = 10;  // board_corner_radius
const PITCH = 25;     // spacing
const HOLE_R = 3;     // hole_radius

// Centered grid: leave at least one pitch of margin to every edge.
const COLS = 21; // span 500 <= 600 - 2*25
const ROWS = 13; // span 300 <= 400 - 2*25

// extrudeRoundedRect is center-anchored in XY with its base at z = 0.
const board = extrudeRoundedRect(W, H, CORNER_R, T);

// One through-hole cylinder, patterned into the full centered grid, then
// subtracted in a single boolean.
const x0 = -((COLS - 1) / 2) * PITCH;
const y0 = -((ROWS - 1) / 2) * PITCH;
const holeGrid = cylinder(T + 2, HOLE_R)
  .translate(x0, y0, -1)
  .patternGrid({
    x: { count: COLS, direction: [1, 0, 0], spacing: PITCH },
    y: { count: ROWS, direction: [0, 1, 0], spacing: PITCH },
  });

return board.subtract(holeGrid).color('plate');
