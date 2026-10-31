// Same radius, overlapping in z, so the union is one cylinder of height 50.
const lower = cylinder(30, 10);
const upper = cylinder(30, 10).translate(0, 0, 20);
return lower.union(upper);
