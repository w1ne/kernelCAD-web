// Correct: enclosure with a snap-fit lid. The lid's locating lip drops
// inside the walls and two hooks catch on ledges; no screws, so the
// fastened mate binds faces that carry no holes.
const L = 70;
const W = 50;
const H = 30;
const wall = 2;
const base = box(L, W, H).subtract(box(L - 2 * wall, W - 2 * wall, H).translate(wall, wall, wall))
  .union(box(10, 1, 1.5).translate(L / 2 - 5, wall, H - 5))
  .union(box(10, 1, 1.5).translate(L / 2 - 5, W - wall - 1, H - 5));
const lid = box(L, W, 2).translate(0, 0, H)
  .union(box(L - 2 * wall - 0.4, W - 2 * wall - 0.4, 3).translate(wall + 0.2, wall + 0.2, H - 3)
    .subtract(box(L - 2 * wall - 3.4, W - 2 * wall - 3.4, 3).translate(wall + 1.7, wall + 1.7, H - 3)))
  .union(box(10, 1.2, 6).translate(L / 2 - 5, wall + 1.2, H - 6))
  .union(box(10, 1.2, 6).translate(L / 2 - 5, W - wall - 2.4, H - 6));

const asm = assembly('snap-box');
const b = asm.part('base', base, { material: 'petg' });
const l = asm.part('lid', lid, { material: 'petg' });
b.connector('rim', { type: 'frame', origin: { kind: 'vec3', value: [L / 2, W / 2, H] } });
l.connector('rim', { type: 'frame', origin: { kind: 'vec3', value: [L / 2, W / 2, H] } });
asm.mate('snap', 'base.rim', 'lid.rim', 'fastened');
return asm.solvedModel({});
