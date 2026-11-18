// The same mounting plate with the locating strip height tied to the plate
// thickness, so the strip finishes exactly flush and no sliver remains.
const t = 6;
const stripHeight = t; // fixed: one shared value instead of a typed 6.005
let plate = box(60, 40, t);
for (const [x, y] of [[8, 8], [52, 8], [8, 32], [52, 32]]) {
  plate = plate.subtract(cylinder(t + 2, 2.2).translate(x, y, -1));
}
const strip = box(30, 1.5, stripHeight).translate(30, 19.25, 0);
return plate.union(strip);
