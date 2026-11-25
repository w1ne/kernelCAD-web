// Circular-profile pipe elbow with a declared 6 mm centreline bend radius.
// The exact line-and-arc spine sews one valid solid; the analytic swept
// length is (30 - 6) + (30 - 6) + 6*pi/2 = 57.4248 mm.
return path().circle(0, 0, 4).sweep(
  [[0, 0, 0], [30, 0, 0], [30, 30, 0]],
  { bendRadius: 6 },
);
