// Bolt-hole bracket: a 60 x 40 x 5 mm plate with one M8 clearance hole.
// set_param feature mode changes the hole (feature cylinder_1) in place.
const t = 5;
const base = box(60, 40, t);
const hole = cylinder(t + 2, 4).translate(30, 20, -1);
return base.subtract(hole).fillet(1);
