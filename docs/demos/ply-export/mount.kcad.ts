// Shaft-support assembly for the PLY export demo: an anodized-black mounting
// plate with four M4 clearance holes and a centre bore, a steel shaft through
// the bore, and an orange set collar. Exported as one PLY with every part
// placed in world space and coloured from its finish / colour.
const t = 6;
let plate = box(60, 60, t).fillet(2);
for (const [x, y] of [[8, 8], [52, 8], [8, 52], [52, 52]]) {
  plate = plate.subtract(cylinder(t + 2, 2.2).translate(x, y, -1));
}
plate = plate.subtract(cylinder(t + 2, 4.1).translate(30, 30, -1)).finish('anodized-black');
const shaft = cylinder(50, 4).finish('steel');
const collar = cylinder(8, 9).subtract(cylinder(10, 4.05).translate(0, 0, -1)).color('#e8742a');
return assembly()
  .part('plate', plate)
  .part('shaft', shaft, { at: [30, 30, -12] })
  .part('collar', collar, { at: [30, 30, t] })
  .model();
