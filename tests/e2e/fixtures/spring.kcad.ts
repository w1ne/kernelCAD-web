const wireRadius = 1;
const coilRadius = 8;
const pitch = 4;
const turns = 4;

// Helical spring: small square wire profile swept along a helix rail with a
// smooth B-spline spine. A polyline spine on this dense rail makes OCCT
// pipe-shell emit per-segment tubes that do not sew (open square rings in
// the export mesh); spine: 'smooth' builds one C2 spine edge through the
// rail points, places the profile at the rail start, and the export is
// watertight at the analytic tube volume (4 mm² × ~202 mm ≈ 807 mm³).
const profile = path()
  .moveTo(-wireRadius, -wireRadius)
  .lineTo(wireRadius, -wireRadius)
  .lineTo(wireRadius, wireRadius)
  .lineTo(-wireRadius, wireRadius)
  .close();

const rail = helix({ radius: coilRadius, pitch, turns, pointsPerTurn: 24 });
return profile.sweep(rail, { spine: 'smooth' });
