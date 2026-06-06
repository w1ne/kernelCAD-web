const baseRadius = 15;
const liftHeight = 8;
const thickness = 5;

// Cam profile mixing line + sagittaArc (lift) + radiusArc (return) + line.
// Forms a teardrop-ish closed curve. The path must be SIMPLE as well as
// arc-feasible (|radius| >= chord/2): the top sagittaArc dips to (0, 4), so
// the bottom return arc must bulge DOWNWARD (negative-side radius) — an
// upward return arc would peak at (0, 5.73) and cross the top boundary at
// x ≈ ±6.59, making both cap faces self-intersecting and untessellatable.
return path()
  .moveTo(baseRadius, 0)
  .lineTo(baseRadius, liftHeight)
  .sagittaArc(-baseRadius, liftHeight, 4)           // top boundary, dips to (0, 4)
  .lineTo(-baseRadius, 0)
  .radiusArc(baseRadius, 0, -baseRadius * 1.5)      // return arc bulging down to (0, -5.73)
  .close()
  .extrude(thickness);
