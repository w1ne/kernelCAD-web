// SPDX-License-Identifier: CC0-1.0
// Promotional pallet display: the "drop-and-sell" pallet of drinks parked
// in a supermarket's main aisle. What makes it a promo pallet rather than
// a stack of boxes: a real Euro pallet base (deck boards, stringers and
// nine blocks), three layers of shelf-ready trays whose cut-down printed
// fronts show rows of cans, card tier sheets between the layers, a
// pyramid of shrink-wrapped multipacks on top, a price card on the front
// and a branded header card on a pole at the back. An optional printed
// skirt wraps the pallet. Generic visualization geometry at about real
// size (1.2 x 0.8 m, 1.8 m to the header), millimetres, Z up, front on -Y.

meta({
  name: "pallet-display",
  license: 'CC0-1.0',
  title: "Promotional pallet display",
  description: "Drop-and-sell drinks pallet at about real size: Euro pallet base with deck boards, stringers and blocks, three layers of shelf-ready trays with printed cut-down fronts showing rows of cans, card tier sheets, a pyramid of shrink-wrapped multipacks, a price card and a branded header card on a pole. Material controls: pallet timber, tray card, can colour, brand print. colaPromo, citrusSummer and craftBeer presets; optional printed skirt.",
  tags: ['pallet display', 'promo pallet', 'drop and sell', 'aisle display', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 4600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#b48d5a', { label: 'Pallet timber' });
const card = param('card', '#e9dfc8', { label: 'Tray card' });
const can = param('can', '#c8232c', { label: 'Can colour' });
const print = param('print', '#1d1d1f', { label: 'Brand print' });
const skirt = param('skirt', 'bare', { choices: ['bare', 'printed'], label: 'Pallet skirt' });

presets({
  colaPromo: { timber: '#b48d5a', card: '#e9dfc8', can: '#c8232c', print: '#1d1d1f' },
  citrusSummer: { timber: '#c49c66', card: '#f4f1e6', can: '#f2c230', print: '#2f8f3a' },
  craftBeer: { timber: '#8a6640', card: '#c8a878', can: '#2a5b7a', print: '#e8e1cc' },
});

const p = assembly("pallet-display");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const L = 1200;
const D = 800;
const PT = 144;

// Euro pallet: bottom boards, nine blocks, stringers and five top boards.
for (const [i, y, w] of [[0, -350, 100], [1, 0, 145], [2, 350, 100]]) add(`bottom-board-${i}`, blk(0, y, 0, L, w, 22).color(timber));
for (const [kx, x] of [['l', -527.5], ['m', 0], ['r', 527.5]]) {
  for (const [ky, y] of [['f', -350], ['m', 0], ['b', 350]]) add(`block-${kx}${ky}`, blk(x, y, 22, 145, y === 0 ? 145 : 100, 78).color('#9a7548'));
  add(`stringer-${kx}`, blk(x, 0, 100, 145, D, 22).color(timber));
}
for (const [i, y, w] of [[0, -327.5, 145], [1, -163.75, 100], [2, 0, 145], [3, 163.75, 100], [4, 327.5, 145]]) add(`top-board-${i}`, blk(0, y, 122, L, w, 22).color(timber));
if (skirt.value === 'printed') {
  add("skirt-front", blk(0, -D / 2 - 6, 0, L + 12, 6, PT).color(print));
  add("skirt-side", blk(-L / 2 - 6, 0, 0, 6, D + 12, PT).color(print));
  add("skirt-stripe", blk(0, -D / 2 - 10, 50, L - 100, 4, 40).color(can));
  add("skirt-side-stripe", blk(-L / 2 - 10, 0, 50, 4, D - 100, 40).color(can));
}

// Three layers of shelf-ready trays. The camera sees the front row and the -X side row,
// so only those cans are modelled; the hidden core is a solid block of stock.
const TIER = 136;
const R = 33;
const PITCH = 74;
for (let t = 0; t < 3; t++) {
  const z = PT + t * TIER;
  add(`tray-floor-${t}`, blk(0, 0, z, L - 20, D - 20, 4).color(card));
  add(`stock-core-${t}`, blk(30, 30, z + 4, L - 100, D - 100, 120).color('#5a5e62'));
  for (let i = 0; i < 16; i++) {
    add(`can-f-${t}-${i}`, cylinder(122, R, 8).translate(-555 + i * PITCH, -D / 2 + 45, z + 4).color(can));
  }
  for (let j = 1; j < 10; j++) {
    add(`can-s-${t}-${j}`, cylinder(122, R, 8).translate(-555, -D / 2 + 45 + j * PITCH, z + 4).color(can));
  }
  add(`tray-front-${t}`, blk(0, -D / 2 + 8, z, L - 20, 6, 60).color(print));
  add(`tray-side-${t}`, blk(-L / 2 + 13, 0, z, 6, D - 20, 60).color(print));
  add(`tray-band-${t}`, blk(-200, -D / 2 + 4, z + 18, 300, 3, 24).color(card));
  add(`tier-sheet-${t}`, blk(0, 0, z + 126, L - 10, D - 10, 6).color(card));
}

// Pyramid of shrink-wrapped multipacks on the top sheet.
const ZT = PT + 3 * TIER;
const packs = [[-390, -200, 0], [0, -200, 0], [390, -200, 0], [-390, 170, 0], [0, 170, 0], [390, 170, 0], [-195, -10, 1], [195, -10, 1]];
packs.forEach(([x, y, lvl], i) => {
  const z = ZT + lvl * 200;
  add(`pack-${i}`, blk(x, y, z, 370, 270, 200).color(can));
  add(`pack-label-${i}`, blk(x, y - 137, z + 60, 260, 4, 90).color(card));
  add(`pack-logo-${i}`, blk(x - 60, y - 140, z + 85, 100, 3, 40).color(print));
});

// Price card clipped to the top tray front.
add("price-card", blk(380, -D / 2 - 2, PT + 2 * TIER + 20, 240, 6, 150).color('#f2d24a'));
add("price-figure", blk(380, -D / 2 - 6, PT + 2 * TIER + 60, 160, 4, 60).color('#c8232c'));

// Header card on a pole at the back-right corner.
const PX = L / 2 - 120;
const PY = D / 2 - 60;
add("pole", cylinder(1700 - ZT, 18, 10).translate(PX, PY, ZT).color('#9aa3a7'));
add("pole-shoe", blk(PX, PY, ZT, 90, 90, 30).color('#5d6468'));
const arch = [[-360, 0], [360, 0]];
for (let i = 0; i <= 12; i++) {
  const a = (i / 12) * Math.PI;
  arch.push([360 * Math.cos(a), 220 + 80 * Math.sin(a)]);
}
add("header", profileXZ(arch, 14).translate(PX - 240, PY - 30, 1520).color(print));
add("header-roundel", cylinder(6, 110, 20).rotateX(90).translate(PX - 470, PY - 37, 1680).color(can));
add("header-word", blk(PX - 160, PY - 40, 1690, 320, 4, 70).color(card));
add("header-sub", blk(PX - 160, PY - 40, 1600, 260, 4, 30).color(can));

return p.model();
