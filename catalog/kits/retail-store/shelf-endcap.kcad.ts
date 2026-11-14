// SPDX-License-Identifier: CC0-1.0
// Shelf endcap: the promotional display at the end of a supermarket aisle
// gondola. What makes it an endcap rather than a plain shelf: a tall
// slotted-upright frame with a pegboard back, shelves that step back as
// they rise so every row shows, a deep base deck piled with shipper
// cartons, a "deal" header board on top with a starburst price flash,
// a wobbler on a stalk sticking out of the middle shelf, and price strips
// along every shelf edge. Stocked with cans, cereal boxes and bottles.
// Generic visualization geometry at about real size (0.92 m wide, 2.16 m
// tall), millimetres, Z up, front on -Y, gondola run behind on +Y.

meta({
  name: "shelf-endcap",
  license: 'CC0-1.0',
  title: "Shelf endcap display",
  description: "Supermarket aisle-end promotional display at about real size: slotted uprights with pegboard back, deep base deck piled with shipper cartons, three stepped shelves of cans, cereal boxes and bottles with price strips, a wobbler on a stalk and a deal header with a starburst price flash. Material controls: frame, shelves, header board, promo flash. saleRed, organicGreen and nightRestock presets.",
  tags: ['endcap', 'end cap', 'gondola end', 'promo display', 'shelving', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3a4a55', { label: 'Frame powder coat' });
const shelf = param('shelf', '#c4cbcf', { label: 'Shelves' });
const header = param('header', '#d8322a', { label: 'Header board' });
const promo = param('promo', '#f6d32a', { label: 'Promo flash' });

presets({
  saleRed: { frame: '#3a4a55', shelf: '#c4cbcf', header: '#d8322a', promo: '#f6d32a' },
  organicGreen: { frame: '#e5ebed', shelf: '#d8dcd6', header: '#3f7d4e', promo: '#f4f1ea' },
  nightRestock: { frame: '#262b2e', shelf: '#66747a', header: '#354750', promo: '#d2a536' },
});

const p = assembly("shelf-endcap");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const W = 920;
const YB = 240;
const H = 1920;

// Slotted uprights, pegboard back and a kick plinth.
for (const [k, x] of [['l', -W / 2 + 25], ['r', W / 2 - 25]]) {
  add(`upright-${k}`, blk(x, YB - 25, 0, 50, 50, H).color(frame));
  for (let i = 0; i < 22; i++) add(`slot-${k}-${i}`, blk(x, YB - 51, 200 + i * 75, 14, 4, 34).color('#15181a'));
  add(`base-leg-${k}`, blk(x, -40, 0, 50, 520, 40).color(frame));
}
add("pegboard", blk(0, YB - 10, 140, W - 100, 20, H - 140).color(frame));
for (let i = 0; i < 6; i++) add(`peg-seam-${i}`, blk(0, YB - 22, 400 + i * 260, W - 100, 4, 6).color('#15181a'));
add("plinth", blk(0, -30, 0, W - 100, 500, 140).color(frame));
add("kick-plate", blk(0, -282, 10, W - 100, 4, 120).color('#15181a'));

// Base deck piled with shipper cartons.
add("base-deck", blk(0, -30, 140, W - 100, 500, 16).color(shelf));
add("base-strip", blk(0, -282, 120, W - 100, 6, 44).color('#f7f4e8'));
for (let r = 0; r < 2; r++) {
  for (let i = 0; i < 3; i++) {
    const x = -260 + i * 260;
    add(`carton-${r}-${i}`, blk(x, -170 + r * 210, 156, 240, 190, 200 + (i % 2) * 120).color('#c9a46a'));
    if (r === 0) {
      add(`carton-print-${i}`, blk(x, -267, 200, 180, 4, 110).color(i % 2 ? header : '#2f6fb0'));
      add(`carton-flash-${i}`, blk(x + 60, -270, 260, 50, 4, 40).color(promo));
    }
  }
}

// Three stepped shelves with front lip and price strip.
const shelves = [[620, -200], [960, -130], [1300, -60]];
shelves.forEach(([z, yf], s) => {
  const d = YB - 20 - yf;
  add(`shelf-${s}`, blk(0, yf + d / 2, z - 18, W - 100, d, 18).color(shelf));
  add(`bracket-l-${s}`, blk(-W / 2 + 60, yf + d / 2, z - 70, 10, d, 52).color(frame));
  add(`bracket-r-${s}`, blk(W / 2 - 60, yf + d / 2, z - 70, 10, d, 52).color(frame));
  add(`price-strip-${s}`, blk(0, yf - 3, z - 50, W - 100, 6, 44).color('#f7f4e8'));
  add(`price-tag-${s}`, blk(-200 + s * 150, yf - 7, z - 44, 100, 3, 32).color(promo));
});

// Shelf 0: two rows of cans.
const canCol = ['#c8232c', '#f4f6f6', '#c8232c', '#2f6fb0'];
for (let r = 0; r < 2; r++) {
  for (let i = 0; i < 9; i++) add(`can-${r}-${i}`, cylinder(122, 33, 10).translate(-360 + i * 90, -150 + r * 110, 620).color(canCol[(i + r) % 4]));
}
// Shelf 1: cereal boxes face out.
const boxCol = ['#e8a02a', '#5a4ab0', '#3b8a5a', '#e8a02a', '#c94b3a', '#5a4ab0'];
for (let i = 0; i < 6; i++) {
  const x = -340 + i * 136;
  add(`cereal-${i}`, blk(x, -40, 960, 120, 70, 280).color(boxCol[i]));
  add(`cereal-bowl-${i}`, blk(x, -77, 1020, 80, 4, 90).color('#f4f1ea'));
}
// Shelf 2: bottles of oil or sauce.
const bottle = turned([[0, 0], [36, 0], [36, 170], [12, 250], [0, 250]]);
for (let i = 0; i < 8; i++) add(`bottle-${i}`, bottle.translate(-350 + i * 100, 40, 1300).color(i % 2 ? '#d9b23a' : '#7a3a2a'));

// Wobbler on a stalk from the middle shelf.
const disc = (r: number, n: number) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
add("wobbler-stalk", blk(W / 2 - 140, -230, 930, 10, 100, 8).color('#e9f3f5'));
add("wobbler", profileXZ(disc(80, 16), 4).translate(W / 2 - 140, -282, 900).color(promo));
add("wobbler-dot", profileXZ(disc(40, 12), 4).translate(W / 2 - 140, -286, 900).color(header));

// Header board with starburst price flash and text bars.
add("header", blk(0, YB - 30, H, W, 30, 240).color(header));
const star = Array.from({ length: 24 }, (_, i) => {
  const r = i % 2 ? 92 : 130;
  const a = (Math.PI * i) / 12;
  return [r * Math.cos(a), r * Math.sin(a)];
});
add("starburst", profileXZ(star, 6).translate(W / 2 - 170, YB - 48, H + 120).color(promo));
add("starburst-price", blk(W / 2 - 170, YB - 54, H + 95, 110, 4, 50).color(header));
add("deal-text", blk(-140, YB - 48, H + 135, 420, 4, 60).color('#ffffff'));
add("deal-subtext", blk(-170, YB - 48, H + 60, 360, 4, 26).color(promo));

return p.model();
