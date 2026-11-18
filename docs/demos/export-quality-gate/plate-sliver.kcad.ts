// Mounting plate with a 1.5 mm locating strip that is meant to finish flush
// with the top face. The strip was typed as 6.005 mm tall instead of the
// plate's 6 mm, so the union leaves a 0.005 mm step: a sliver end face
// (1.5 x 0.005 = 0.0075 mm²) and 0.005 mm edges that a mesher or CAM tool
// chokes on. The export quality gate reports them.
const t = 6;
const stripHeight = 6.005; // BUG: should equal t
let plate = box(60, 40, t);
for (const [x, y] of [[8, 8], [52, 8], [8, 32], [52, 32]]) {
  plate = plate.subtract(cylinder(t + 2, 2.2).translate(x, y, -1));
}
const strip = box(30, 1.5, stripHeight).translate(30, 19.25, 0);
return plate.union(strip);
