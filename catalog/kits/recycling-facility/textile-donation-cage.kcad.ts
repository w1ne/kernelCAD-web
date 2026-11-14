// SPDX-License-Identifier: CC0-1.0
// Textile donation cage: the wheeled wire roll cage that a reuse centre
// parks at the drop-off point for bagged clothes, shoes and linen. What
// makes it a donation cage rather than a stillage: a tall zinc wire-mesh
// cage on a low deck with four castors (two braked), a front gate swung
// wide open on its hinges, a hand-loading header sign above the cage,
// tied clothing bags stacked inside and a pair of shoes strapped on top.
// Generic visualization geometry at about real size (0.9 x 0.75 x 1.9 m),
// millimetres, Z up, open gate toward -Y.

meta({
  name: "textile-donation-cage",
  license: 'CC0-1.0',
  title: "Textile donation cage",
  description: "Wheeled textile donation roll cage at about real size: zinc wire-mesh walls on a low deck with four castors, front gate swung wide open, header sign board on posts, tied clothing bags stacked inside and a strapped pair of shoes on the top. Material controls: cage (zinc wire), bags, sign board and castors. charity, weathered, municipal and highVisibility presets.",
  tags: ["recycling", "textiles", "clothing donation", "reuse", "roll cage", "containers", "drop-off", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cage = param('cage', '#b4bcbf', { label: 'Cage (zinc wire)' });
const bags = param('bags', '#7a4fa0', { label: 'Clothing bags' });
const sign = param('sign', '#2f8a5a', { label: 'Header sign' });
const castors = param('castors', '#2b2e30', { label: 'Castors (rubber)' });

presets({
  charity: { cage: '#b4bcbf', bags: '#7a4fa0', sign: '#2f8a5a', castors: '#2b2e30' },
  weathered: { cage: '#8c918d', bags: '#5a4a5e', sign: '#4f6b58', castors: '#3c403e' },
  municipal: { cage: '#5f6a70', bags: '#2f5d9a', sign: '#d77632', castors: '#2b2e30' },
  highVisibility: { cage: '#e0b020', bags: '#d4402a', sign: '#24282b', castors: '#2b2e30' },
});

const p = assembly("textile-donation-cage");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 900, D = 750, ZD = 170, ZT = 1750, HW = W / 2, HD = D / 2;

// Deck with castors at the corners (front pair braked).
add("deck", blk(0, 0, ZD - 40, W, D, 40).color(cage));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * (HW - 70), y = sy * (HD - 70);
  add(`castor-horn-${sx}-${sy}`, blk(x, y, 55, 50, 90, ZD - 95).color(cage));
  add(`castor-wheel-${sx}-${sy}`, cylinder(36, 55, 12).rotateY(90).translate(x - 18, y, 55).color(castors));
  if (sy < 0) add(`castor-brake-${sx}`, blk(x, y - 70, 95, 40, 60, 14).color('#d4402a'));
}

// Wire mesh: corner tubes, then a grid of wires on back and sides.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`corner-${sx}-${sy}`, blk(sx * (HW - 15), sy * (HD - 15), ZD, 30, 30, ZT - ZD).color(cage));
const span = (n: number, len: number) => Array.from({ length: n }, (_, i) => -len / 2 + (len * (i + 1)) / (n + 1));
const levels = span(6, ZT - ZD).map((z) => z + (ZT + ZD) / 2);
for (const x of span(7, W - 30)) add(`wire-back-${Math.round(x)}`, blk(x, HD - 15, ZD, 8, 8, ZT - ZD).color(cage));
for (const sx of [-1, 1]) for (const y of span(6, D - 30)) add(`wire-side-${sx}-${Math.round(y)}`, blk(sx * (HW - 15), y, ZD, 8, 8, ZT - ZD).color(cage));
for (const z of [...levels, ZT - 10]) {
  add(`hwire-back-${Math.round(z)}`, blk(0, HD - 15, z - 4, W - 30, 8, 8).color(cage));
  for (const sx of [-1, 1]) add(`hwire-side-${sx}-${Math.round(z)}`, blk(sx * (HW - 15), 0, z - 4, 8, D - 30, 8).color(cage));
}

// Front gate hinged on the left corner, swung open about 100 degrees.
const GW = W - 40;
let gate = blk(GW / 2, 0, 0, GW, 14, 14).union(blk(GW / 2, 0, ZT - ZD - 60, GW, 14, 14));
for (const x of span(7, GW)) gate = gate.union(blk(x + GW / 2, 0, 0, 8, 8, ZT - ZD - 60));
for (const z of levels) gate = gate.union(blk(GW / 2, 0, z - ZD - 4, GW, 8, 8));
add("front-gate", gate.rotateZ(-100).translate(-HW + 15, -HD - 10, ZD + 20).color(cage));
for (const z of [ZD + 200, ZT - 300]) add(`gate-hinge-${z}`, cylinder(60, 18, 8).translate(-HW + 15, -HD - 10, z).color(cage));
add("gate-latch", blk(HW - 15, -HD - 10, 1000, 30, 30, 80).color('#d4402a'));

// Header sign board on two posts above the cage.
for (const sx of [-1, 1]) add(`sign-post-${sx}`, blk(sx * (HW - 80), HD - 15, ZT, 30, 30, 260).color(cage));
add("sign-board", blk(0, HD - 40, ZT + 120, W - 60, 20, 300).color(sign));
add("sign-band", blk(0, HD - 54, ZT + 220, W - 220, 8, 70).color('#f2efe6'));
add("sign-icon", cylinder(10, 70, 16).rotateX(90).translate(-260, HD - 52, ZT + 250).color('#f2efe6'));

// Tied clothing bags stacked inside, mixed with a few clear bags.
const tied: [number, number, number, number, string | null][] = [
  [-220, -120, 210, 200, null], [200, -150, 210, 200, '#d9dcd6'], [-200, 170, 210, 190, '#3a3f44'],
  [220, 160, 210, 210, null], [0, 0, 560, 200, '#c9b48a'], [-230, -110, 600, 170, null],
  [230, 110, 590, 180, '#d9dcd6'], [-150, 120, 880, 180, null], [180, -130, 860, 170, '#3a3f44'],
];
for (const [x, y, z, r, c] of tied) {
  const col = c === null ? bags : c;
  add(`bag-${x}-${y}-${z}`, sphere(r).translate(x, y, ZD + z).color(col));
  add(`bag-knot-${x}-${y}-${z}`, cylinder(70, 35, 8).translate(x, y, ZD + z + r - 20).color(col));
}

// A pair of shoes strapped together, sitting on the top bags.
for (const s of [-1, 1]) {
  add(`shoe-sole-${s}`, blk(40 + s * 60, -60, ZD + 1060, 100, 270, 30).color('#3a3f44'));
  add(`shoe-upper-${s}`, blk(40 + s * 60, -20, ZD + 1090, 90, 190, 90).color('#a8704a'));
}

return p.model();
