// SPDX-License-Identifier: CC0-1.0
// Wall shelf unit: one bay of the single-sided shelving that lines a
// supermarket's perimeter walls. What makes it wall shelving rather than a
// bookcase: slotted steel uprights with cantilever brackets hooked into
// them so the shelves hang off the back panel with no front posts, a deep
// base deck on a kick plinth, price-ticket strips on every shelf edge and
// a lit category header box on top. Stocked with pasta, jars, tins and
// kitchen-roll packs. Generic visualization geometry at about real size
// (1.4 m wide, 2.25 m tall), millimetres, Z up, front on -Y, wall on +Y.

meta({
  name: "wall-shelf-unit",
  license: 'CC0-1.0',
  title: "Wall shelf unit",
  description: "One bay of supermarket perimeter wall shelving at about real size: slotted steel uprights, cantilever brackets, deep base deck on a kick plinth, four shelves with price-ticket strips stocked with pasta, jars, tins and kitchen-roll packs, and a lit category header box. Material controls: uprights and brackets, shelves, back panel, header box. groceryCream, darkOak and nightRestock presets.",
  tags: ['wall shelving', 'shelf unit', 'gondola', 'perimeter shelving', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#e5e2da', { label: 'Uprights and brackets' });
const shelf = param('shelf', '#c4cbcf', { label: 'Shelves' });
const back = param('back', '#7d6d5a', { label: 'Back panel' });
const header = param('header', '#2f6f9e', { label: 'Header box' });

presets({
  groceryCream: { frame: '#e5e2da', shelf: '#c4cbcf', back: '#7d6d5a', header: '#2f6f9e' },
  darkOak: { frame: '#2b2f33', shelf: '#8a6440', back: '#4a3a2c', header: '#c8323a' },
  nightRestock: { frame: '#354750', shelf: '#66747a', back: '#262b2e', header: '#3e6677' },
});

const p = assembly("wall-shelf-unit");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 1400;
const IW = W - 80;
const YB = 220;
const H = 2080;
const D = 430;
const YF = YB - 20 - D;

// Back panel with seams, slotted uprights and the kick plinth.
add("back-panel", blk(0, YB - 10, 0, W - 40, 20, H).color(back));
for (let i = 0; i < 5; i++) add(`back-seam-${i}`, blk(0, YB - 21, 420 + i * 340, W - 40, 4, 6).color('#2b2f33'));
for (const [k, x] of [['l', -W / 2 + 20], ['r', W / 2 - 20]]) {
  add(`upright-${k}`, blk(x, YB - 30, 0, 40, 60, H + 20).color(frame));
  for (let i = 0; i < 26; i++) add(`slot-${k}-${i}`, blk(x, YB - 61, 260 + i * 68, 12, 4, 30).color('#15181a'));
}
add("plinth", blk(0, (YF + YB) / 2 - 10, 0, IW, D, 120).color(frame));
add("kick-plate", blk(0, YF - 12, 10, IW, 4, 100).color('#2b2f33'));
add("base-deck", blk(0, (YF + YB) / 2 - 10, 120, IW, D, 16).color(shelf));
add("base-strip", blk(0, YF - 12, 100, IW, 6, 44).color('#f7f4e8'));

// Four cantilever shelves on triangular brackets.
const shelfZ = [560, 960, 1340, 1720];
const depth = [D, D - 40, D - 80, D - 120];
const bracket = (d: number) => profileYZ([[YB - 30, 0], [YB - 30 - d + 20, 0], [YB - 30, -180]], 12);
shelfZ.forEach((z, s) => {
  const d = depth[s];
  const yf = YB - 20 - d;
  add(`shelf-${s}`, blk(0, yf + d / 2, z - 18, IW, d, 18).color(shelf));
  for (const [k, x] of [['l', -W / 2 + 46], ['r', W / 2 - 46]]) add(`bracket-${k}-${s}`, bracket(d).translate(x, 0, z - 18).color(frame));
  add(`price-strip-${s}`, blk(0, yf - 3, z - 50, IW, 6, 44).color('#f7f4e8'));
  for (let i = 0; i < 4; i++) add(`ticket-${s}-${i}`, blk(-480 + i * 320, yf - 7, z - 44, 90, 3, 30).color('#e8c22a'));
});

// Base deck: kitchen-roll packs.
for (let i = 0; i < 4; i++) {
  const x = -480 + i * 320;
  add(`roll-pack-${i}`, blk(x, -40, 136, 290, 300, 330).color('#f4f6f6'));
  add(`roll-band-${i}`, blk(x, -192, 220, 290, 4, 90).color(i % 2 ? '#3c7fc4' : '#7fbf4a'));
}
// Shelf 0: pasta packets standing up.
const pastaCol = ['#2f5fa8', '#d8322a', '#2f5fa8', '#f2a51a'];
for (let i = 0; i < 10; i++) {
  const x = -585 + i * 130;
  add(`pasta-${i}`, blk(x, -100, 560, 110, 70, 260).color(pastaCol[i % 4]));
  add(`pasta-window-${i}`, blk(x, -137, 640, 60, 4, 110).color('#e8c87a'));
}
// Shelf 1: jars with lids.
const jar = turned([[0, 0], [42, 0], [42, 120], [32, 140], [0, 140]]);
for (let i = 0; i < 12; i++) {
  const x = -594 + i * 108;
  add(`jar-${i}`, jar.translate(x, -60, 960).color(i % 3 === 0 ? '#c8402a' : i % 3 === 1 ? '#7a4a2a' : '#e3b24a'));
  add(`jar-lid-${i}`, cylinder(22, 34, 10).translate(x, -60, 1100).color('#d9b23a'));
}
// Shelf 2: tins two high.
for (let r = 0; r < 2; r++) {
  for (let i = 0; i < 12; i++) add(`tin-${r}-${i}`, cylinder(110, 38, 10).translate(-594 + i * 108, -20, 1340 + r * 112).color(i % 2 ? '#c94b3a' : '#3b8a5a'));
}
// Shelf 3: cereal-type boxes.
const boxCol = ['#e8a02a', '#5a4ab0', '#c94b3a', '#3b8a5a'];
for (let i = 0; i < 8; i++) add(`box-${i}`, blk(-560 + i * 160, 40, 1720, 140, 80, 240).color(boxCol[i % 4]));

// Lit category header box on top.
add("header-box", blk(0, YB - 110, H + 20, W, 160, 150).color(header));
add("header-face", blk(0, YB - 192, H + 45, W - 120, 4, 100).color('#f7f4e8'));
add("header-text", blk(-160, YB - 196, H + 75, 600, 4, 40).color(header));
add("header-icon", cylinder(4, 38, 16).rotateX(90).translate(380, YB - 194, H + 95).color('#e8c22a'));

return p.model();
