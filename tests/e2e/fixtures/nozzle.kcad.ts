const baseRadius = 10;
const topHalfWidth = 5;
const height = 30;

// Nozzle: circular base lofted to a square top — classic loft demo.
// Base is approximated with 4 quarter-arcs (rc.5 threePointsArc).
const m = baseRadius * 0.7071067811865475; // cos(45°) = sin(45°)
const base = path()
  .moveTo(baseRadius, 0)
  .threePointsArc(0, baseRadius, m, m)
  .threePointsArc(-baseRadius, 0, -m, m)
  .threePointsArc(0, -baseRadius, -m, -m)
  .threePointsArc(baseRadius, 0, m, -m)
  .close();

const top = path()
  .moveTo(-topHalfWidth, -topHalfWidth)
  .lineTo(topHalfWidth, -topHalfWidth)
  .lineTo(topHalfWidth, topHalfWidth)
  .lineTo(-topHalfWidth, topHalfWidth)
  .close();

return base.loft(top, { spacing: height });
