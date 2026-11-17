// Manufacturing benchmark case 06 (#1227): an FDM snap-fit lid box.
//
// Prompt: "FDM PETG box with a lid that snaps on, no screws. Put one
// cantilever hook in the middle of each long side; each hook catches in a
// window cut through the base wall. Keep 0.2 mm clearance around the hooks
// so the closed box does not rub, and keep the hooks centred when the box
// gets longer."
//
// Parts and interfaces the benchmark checks:
//   - `base`: Length x 30 x 20 mm open-top box with 2 mm walls and a 2 mm
//     floor; one 8 x 1.9 mm window through each long wall, centred on
//     x = Length / 2, from z = 9.8 to z = 11.7; connector `lid` on the rim
//     corner (0, 0, 20);
//   - `lid`: Length x 30 x 2 mm plate with two 6 mm wide, 1.5 mm thick,
//     10 mm long cantilever beams hanging inside the long walls with 0.2 mm
//     clearance; each beam ends in a 1.0 x 1.5 mm barb that sits in its
//     window; connector `seat` on its bottom face corner (0, 0, 0);
//   - mate: `snapped` (fastened base.lid -> lid.seat), declared as a snap
//     fit of the lid along +z.
// Beam strain during assembly, PETG creep and the retention force are not
// modelled; the check_assembly_path force step is declared, not simulated.
const length = param('Length', 60, { unit: 'mm', min: 40, max: 120 });
const width = 30;
const height = 20;
const wall = 2;
const clearance = 0.2;
const beam = 1.5;
const beamLength = 10;
const barb = 1.0;
const barbHeight = 1.5;
const hookWidth = 6;

const mid = length.divide(2);
let base = box(length, width, height)
  .subtract(box(length.subtract(2 * wall), width - 2 * wall, height).translate(wall, wall, wall));
for (const y of [-1, width - wall - 1]) {
  base = base.subtract(box(hookWidth + 2, wall + 2, barbHeight + 0.4).translate(mid.subtract(hookWidth / 2 + 1), y, height - beamLength - clearance));
}

let lid = box(length, width, 2);
const beamY = wall + clearance;
for (const [beamAt, barbAt] of [[beamY, beamY - barb], [width - beamY - beam, width - beamY]] as const) {
  lid = lid.union(box(hookWidth, beam, beamLength).translate(mid.subtract(hookWidth / 2), beamAt, -beamLength));
  lid = lid.union(box(hookWidth, barb, barbHeight).translate(mid.subtract(hookWidth / 2), barbAt, -beamLength));
}

const snapBox = assembly('snap-fit-lid-box');
snapBox.part('base', base.color('#2f3b45')).connector('lid', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, height] } });
snapBox.part('lid', lid.color('#9aa7b1')).connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
snapBox.mate('snapped', 'base.lid', 'lid.seat', 'fastened', { fit: { kind: 'snap', part: 'lid', axis: [0, 0, 1] } });
return snapBox.solvedModel({}, { validate: 'error' });
