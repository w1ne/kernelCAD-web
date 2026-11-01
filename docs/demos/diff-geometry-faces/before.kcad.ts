// Motor-mount plate, revision A: a 60 x 40 x 5 mm plate with two M4
// clearance holes (r = 2 mm) on a 40 mm pitch.
const t = 5;
const plate = box(60, 40, t);
const holeA = cylinder(t + 2, 2).translate(10, 20, -1);
const holeB = cylinder(t + 2, 2).translate(50, 20, -1);
return plate.subtract(holeA).subtract(holeB);
