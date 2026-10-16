// Correct: Raspberry Pi style enclosure. Base is a 2 mm shell with four
// screw bosses carrying 2.5 mm pilot holes (cut, not hole()); the lid has
// 3.4 mm clearance holes over the bosses and is screwed down.
const L = 95;
const W = 70;
const H = 25;
const wall = 2;
const bossR = 3.5;
const inset = 6;
const corners: Array<[number, number]> = [[inset, inset], [L - inset, inset], [inset, W - inset], [L - inset, W - inset]];

let base = box(L, W, H).subtract(box(L - 2 * wall, W - 2 * wall, H).translate(wall, wall, wall));
for (const [x, y] of corners) {
  base = base.union(cylinder(H - wall, bossR).translate(x, y, wall));
  base = base.subtract(cylinder(8, 1.25).translate(x, y, H - 8));
}
let lid = box(L, W, 2.5).translate(0, 0, H);
for (const [x, y] of corners) {
  lid = lid.subtract(cylinder(3, 1.7).translate(x, y, H - 0.25));
}

const asm = assembly('pi-enclosure');
const b = asm.part('base', base, { material: 'petg' });
const l = asm.part('lid', lid, { material: 'petg' });
b.connector('screw', { type: 'frame', origin: { kind: 'vec3', value: [inset, inset, H] } });
l.connector('screw', { type: 'frame', origin: { kind: 'vec3', value: [inset, inset, H] } });
asm.mate('lid-screws', 'base.screw', 'lid.screw', 'fastened');
return asm.solvedModel({});
