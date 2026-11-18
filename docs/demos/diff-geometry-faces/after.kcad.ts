// Motor-mount plate, revision B: the two mounting holes open up to a loose
// M4 fit (r = 2.25 mm) and a 22 mm pilot bore for a NEMA 17 boss is added
// between them.
const t = 5;
const plate = box(60, 40, t);
const holeA = cylinder(t + 2, 2.25).translate(10, 20, -1);
const holeB = cylinder(t + 2, 2.25).translate(50, 20, -1);
const pilot = cylinder(t + 2, 11).translate(30, 20, -1);
return plate.subtract(holeA).subtract(holeB).subtract(pilot);
