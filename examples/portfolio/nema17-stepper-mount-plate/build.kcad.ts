// NEMA 17 stepper-motor panel-mount plate.
//
// Holds a NEMA 17 stepper (42 × 42 mm face, 31 mm bolt circle, ~22 mm boss)
// against a flat panel. The motor sits perpendicular to the plate (motor
// axis = Z); the plate bolts to the host panel via four M5 corner holes.
//
// Every editable dimension is a `param()` so the plate re-sizes for
// adjacent motor sizes (NEMA 14, NEMA 23) by changing `motorFace` and
// `boltCircle` together.

const motorFace = param('motorFace', 42);          // NEMA 17 face edge (mm)
const boltCircle = param('boltCircle', 31);        // 4× M3 bolt-circle diameter
const motorBoss = param('motorBoss', 23);          // motor boss + clearance

const plateSize = param('plateSize', 70);          // square plate edge
const plateT = param('plateT', 5);                 // plate thickness

const m3Hole = param('m3Hole', 3.4);               // M3 clearance
const m5Hole = param('m5Hole', 5.4);               // M5 clearance

const cornerOffset = param('cornerOffset', 27);    // panel-attach hole offset from center

// Square plate centered at origin in X,Y; sits at z ∈ [0, plateT].
const plate = box(plateSize, plateSize, plateT);

// Bores sized slightly taller than the plate so they cut through cleanly.
const boreH = plateT.add(2);
const motorBore = cylinder(boreH, motorBoss.divide(2)).translate(0, 0, -1);

// 4× M3 mounting holes at bolt-circle corners.
const r = boltCircle.divide(2);
const negR = r.negate();
const m3pp = cylinder(boreH, m3Hole.divide(2)).translate(r,    r,    -1);
const m3pn = cylinder(boreH, m3Hole.divide(2)).translate(r,    negR, -1);
const m3np = cylinder(boreH, m3Hole.divide(2)).translate(negR, r,    -1);
const m3nn = cylinder(boreH, m3Hole.divide(2)).translate(negR, negR, -1);

// 4× M5 panel-attach holes at corners of the plate.
const c = cornerOffset;
const negC = c.negate();
const m5pp = cylinder(boreH, m5Hole.divide(2)).translate(c,    c,    -1);
const m5pn = cylinder(boreH, m5Hole.divide(2)).translate(c,    negC, -1);
const m5np = cylinder(boreH, m5Hole.divide(2)).translate(negC, c,    -1);
const m5nn = cylinder(boreH, m5Hole.divide(2)).translate(negC, negC, -1);

return plate.subtract(motorBore, m3pp, m3pn, m3np, m3nn, m5pp, m5pn, m5np, m5nn);
