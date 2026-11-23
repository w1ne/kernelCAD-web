// Bracket for the OBJ shading-normals demo: a plate with rounded vertical
// edges, a round boss and a through bore. Hard B-rep edges must shade sharp;
// the boss, the bore and the rounded plate edges must shade smooth.
const plate = box(80, 50, 10, true).translate(0, 0, 5).fillet(6, { parallel: 'Z' });
const boss = cylinder(20, 16).translate(-15, 0, 10);
const bore = cylinder(40, 9).translate(-15, 0, -5);
return plate.union(boss).subtract(bore);
