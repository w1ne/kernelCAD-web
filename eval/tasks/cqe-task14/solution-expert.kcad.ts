// Equilateral triangle (30 mm sides) revolved 180° around the Z axis.
// One side runs radially from (30, 0) → (60, 0) in (radial-X, axial-Z);
// the apex sits at (45, 25.981). A 180° partial revolve sweeps CCW from
// +X through +Y to -X, producing the half-solid the reference expects
// (X = [-60, 60], Y = [0, 60], Z = [0, 25.981]).

const apex = 30 * Math.sin(Math.PI / 3);
const profile = path()
  .moveTo(30, 0)
  .lineTo(60, 0)
  .lineTo(45, apex)
  .close();

return profile.revolve({ angleDeg: 180 });
