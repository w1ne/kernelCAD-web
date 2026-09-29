// [dogfood] Drill guide jig for an 18mm board.
// Use case: hook the fence over the board's edge (the fence spans the full
// 18mm board thickness so it registers flush top-to-bottom on that edge),
// then drill straight down through the 8mm guide bushing hole into the
// board's top face. The hole lands 20mm in from the edge (measured from the
// fence's inner registration face) and, since the fence spans the whole
// 18mm thickness, the jig is inherently centred on that thickness.
//
// Only the jig itself is exported. A translucent reference board is added to
// the render/preview ONLY (not part of the exported solid) so the fit can be
// checked visually.

const boardThickness = 18;    // given
const holeOffset = 20;        // distance from the fence's inner face to the hole center
const bushingDia = 8;         // given
const guidePlateLength = 50;  // fence-to-far-edge span, mm (covers offset + margin)
const guidePlateWidth = 30;   // mm
const guidePlateThickness = 10; // mm, thick enough for a stable bushing bore
const fenceThickness = 8;     // mm

// Fence spans the full board thickness plus the guide-plate height above it,
// so its inner face registers flush against the board's edge from top to
// bottom: z runs from -boardThickness (board underside) to +guidePlateThickness
// (top of the guide plate).
const fenceHeight = boardThickness + guidePlateThickness;

// Fence: x in [0, fenceThickness], y in [0, guidePlateWidth], z in [-boardThickness, guidePlateThickness]
let fence = box(fenceThickness, guidePlateWidth, fenceHeight, false)
  .translate(0, 0, -boardThickness);

// Guide plate: sits on top of the board (z in [0, guidePlateThickness]),
// starting right at the fence's inner face.
let guidePlate = box(guidePlateLength, guidePlateWidth, guidePlateThickness, false)
  .translate(fenceThickness, 0, 0);

let jig = fence.union(guidePlate);

// Bushing hole: 20mm from the fence's inner face (x = fenceThickness),
// centred across the guide-plate width, straight through the guide plate.
const holeX = fenceThickness + holeOffset;
const holeY = guidePlateWidth / 2;
const bushingHole = cylinder(guidePlateThickness + 2, bushingDia / 2)
  .translate(holeX, holeY, -1);
jig = jig.subtract(bushingHole);

dfmSpec({ minWall: 1.2, minClearance: 0.3 });

return jig;
