// Manufacturing benchmark case 05 (#1227): an FDM two-part housing.
//
// Prompt: "FDM PETG two-part housing for a small sensor board: an open-top
// base and a flat lid. The lid locates in the base with a lip that has
// 0.2 mm clearance per side, and four M3 self-tapping screws go through the
// lid into bosses in the base. Leave a USB-C opening in one end wall. Keep
// the lid fit when the housing gets longer."
//
// Parts and interfaces the benchmark checks:
//   - `base`: Length x 40 x 20 mm box with 2 mm walls and a 2 mm floor;
//     four 6 mm bosses at 7 mm from each outer corner, flush with the rim,
//     each with a 2.5 mm M3 self-tap pilot hole 10 mm deep; a 9 x 3.5 mm
//     USB-C opening through the x = 0 wall, centred at y = 20, z = 6;
//     connector `lid` on the rim corner (0, 0, 20);
//   - `lid`: Length x 40 x 2 mm plate with four 3.4 mm M3 clearance holes
//     on the boss axes, and a 1.2 mm thick, 3 mm deep locating lip under it
//     with 0.2 mm clearance to the base walls; connector `seat` on its
//     bottom face corner (0, 0, 0);
//   - mate: `screwed` (fastened base.lid -> lid.seat).
// The board inside and the screws are not modelled.
const length = param('Length', 60, { unit: 'mm', min: 40, max: 120 });
const width = 40;
const height = 20;
const wall = 2;
const clearance = 0.2;
const lip = 1.2;

const farX = length.subtract(7);
const bosses = [[7, 7], [farX, 7], [7, width - 7], [farX, width - 7]] as const;

let base = box(length, width, height)
  .subtract(box(length.subtract(2 * wall), width - 2 * wall, height).translate(wall, wall, wall));
for (const [x, y] of bosses) {
  base = base.union(cylinder(height - wall, 3).translate(x, y, wall));
}
for (const [x, y] of bosses) {
  base = base.subtract(cylinder(11, 1.25).translate(x, y, height - 10));
}
base = base.subtract(box(4, 9, 3.5).translate(-1, width / 2 - 4.5, 6 - 1.75));

const inset = wall + clearance;
// The ring is cut before the union so the cut cannot thin the plate.
const lipRing = box(length.subtract(2 * inset), width - 2 * inset, 3).translate(inset, inset, -3)
  .subtract(box(length.subtract(2 * (inset + lip)), width - 2 * (inset + lip), 5).translate(inset + lip, inset + lip, -4));
let lid = box(length, width, 2).union(lipRing);
for (const [x, y] of bosses) {
  lid = lid.subtract(cylinder(4, 1.7).translate(x, y, -1));
}

const housing = assembly('fdm-two-part-housing');
housing.part('base', base.color('#2f3b45')).connector('lid', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, height] } });
housing.part('lid', lid.color('#9aa7b1')).connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
housing.mate('screwed', 'base.lid', 'lid.seat', 'fastened');
return housing.solvedModel({}, { validate: 'error' });
