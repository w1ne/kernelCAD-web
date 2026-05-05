const baseRadius = 15;
const liftHeight = 8;
const thickness = 5;

// Cam profile mixing line + sagittaArc (lift) + radiusArc (return) + line.
// Forms a teardrop-ish closed curve. Coordinates verified to keep |radius| >= chord/2.
return path()
  .moveTo(baseRadius, 0)
  .lineTo(baseRadius, liftHeight)
  .sagittaArc(-baseRadius, liftHeight, 4)           // bulge up
  .lineTo(-baseRadius, 0)
  .radiusArc(baseRadius, 0, baseRadius * 1.5)       // return arc, radius > chord/2 = baseRadius
  .close()
  .extrude(thickness);
