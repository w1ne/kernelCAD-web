const radius = 20;
const thickness = 5;

// Circular blank built from 4 quarter-arcs via threePointsArc.
// Each quarter-arc spans 90°. Midpoint is at 45° angle on the circle.
// For a quarter from (R, 0) to (0, R): midpoint at (R/√2, R/√2) ≈ (R·0.7071, R·0.7071).
const m = radius * 0.7071067811865475; // cos(45°) = sin(45°)

return path()
  .moveTo(radius, 0)
  .threePointsArc(0, radius, m, m)         // Q1: (R,0) → (0,R) via (m,m)
  .threePointsArc(-radius, 0, -m, m)       // Q2: (0,R) → (-R,0) via (-m,m)
  .threePointsArc(0, -radius, -m, -m)      // Q3: (-R,0) → (0,-R) via (-m,-m)
  .threePointsArc(radius, 0, m, -m)        // Q4: (0,-R) → (R,0) via (m,-m)
  .close()
  .extrude(thickness);
