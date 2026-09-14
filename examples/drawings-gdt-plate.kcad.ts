// Mounting plate for the `svg-drawing` GD&T example (see
// `docs` / the `kernelcad-drawings` skill for how to dimension it).
//
// Four corner through-holes, a counterbore on the first, and a raised boss
// whose top rim is filleted — enough real feature geometry to exercise
// hole/fillet/chamfer/datum/fcf annotation kinds on a single sheet.
const w = 80;
const h = 50;
const t = 10;
const holeR = 3.25; // ⌀6.5

let plate = box(w, h, t);
for (const [x, y] of [[10, 10], [70, 10], [10, 40], [70, 40]] as const) {
  plate = plate.subtract(cylinder(t + 4, holeR).translate(x, y, -2));
}
// Counterbore on the first hole.
plate = plate.subtract(cylinder(4, 6).translate(10, 10, 6));
// Raised boss with a filleted top rim (genuine circular fillet arc).
const boss = cylinder(8, 10).translate(65, 25, t);
plate = plate.union(boss).fillet(2, { atZ: t + 8 });

return plate;
