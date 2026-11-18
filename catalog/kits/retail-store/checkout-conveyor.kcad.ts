// SPDX-License-Identifier: CC0-1.0
// Checkout conveyor: the belt where shoppers unload their basket before
// the cashier scans it. What makes it a conveyor rather than a table: a
// rubber belt that wraps round end drums at both ends, raised side rails
// with a rolled lip that keep goods on the belt, a photo-eye pair at the
// cashier end that stops the belt, a red stop button, a triangular "next
// customer" divider bar lying on the belt, and a kicked-in cabinet with
// vent slots. Optionally a shopper's groceries ride on the belt. Generic
// visualization geometry at about real size (1.8 m long, 860 mm belt
// height), millimetres, Z up, belt runs along X toward +X, aisle side -Y.

meta({
  name: "checkout-conveyor",
  license: 'CC0-1.0',
  title: "Checkout conveyor lane",
  description: "Supermarket checkout belt at about real size: rubber belt wrapping round end drums, rolled side rails, photo-eye stop sensors, red stop button, triangular next-customer divider bar and a kicked cabinet with vent slots, with optional groceries on the belt (cereal box, milk carton, bottle, cans). Material controls: cabinet, belt rubber, rails, accent. laneGrey, brightWhite and nightShift presets; goods choice.",
  tags: ['checkout', 'conveyor', 'belt', 'till lane', 'supermarket', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#8d9aa1', { label: 'Cabinet panels' });
const belt = param('belt', '#25292c', { label: 'Belt rubber' });
const rails = param('rails', '#c3cacd', { label: 'Side rails' });
const accent = param('accent', '#e2a623', { label: 'Divider and trim accent' });
const goods = param('goods', 'loaded', { choices: ['loaded', 'empty'], label: 'Goods on belt' });

presets({
  laneGrey: { cabinet: '#8d9aa1', belt: '#25292c', rails: '#c3cacd', accent: '#e2a623' },
  brightWhite: { cabinet: '#e8ecec', belt: '#3a4044', rails: '#9aa4a8', accent: '#2f8fd1' },
  nightShift: { cabinet: '#2d363c', belt: '#1a1d1f', rails: '#7d878c', accent: '#d2362d' },
});

const p = assembly("checkout-conveyor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

const L = 1800;
const W = 560;
const BZ = 860;
const DR = 40;

// Cabinet with a kicked-in toe, vent slots on the aisle face.
add("cabinet", profileYZ([[-W / 2 + 60, 0], [W / 2, 0], [W / 2, BZ - 60], [-W / 2, BZ - 60], [-W / 2, 160]], L)
  .subtract(blk(-500, -W / 2, 300, 500, 20, 14))
  .subtract(blk(-500, -W / 2, 340, 500, 20, 14))
  .subtract(blk(-500, -W / 2, 380, 500, 20, 14))
  .subtract(blk(-300 + 50, -W / 2, 170, 8, 20, BZ - 240))
  .subtract(blk(300, -W / 2, 170, 8, 20, BZ - 240))
  .color(cabinet));
add("toe-kick", blk(0, -W / 2 + 70, 0, L - 20, 10, 100).color(belt));
add("accent-band", blk(0, -W / 2 - 3, 640, L, 6, 50).color(accent));

// Belt: flat top run plus the drums it wraps round at each end.
add("belt-top", blk(0, 0, BZ - 2 * DR, L - 2 * DR, W - 120, 2 * DR).color(belt));
for (const s of [-1, 1]) {
  add(`drum-${s < 0 ? 'l' : 'r'}`, cylinder(W - 120, DR, 16).rotateX(90).translate(s * (L / 2 - DR), (W - 120) / 2, BZ - DR).color(belt));
}
for (let i = -8; i <= 8; i++) add(`belt-rib-${i + 8}`, blk(i * 100, 0, BZ, 8, W - 130, 1.5).color('#34393c'));

// Side rails with a rolled lip.
for (const s of [-1, 1]) {
  const tag = s < 0 ? 'aisle' : 'back';
  const y0 = s * (W / 2 - 60);
  const prof = [[0, BZ - 60], [s * 60, BZ - 60], [s * 60, BZ + 35], [s * 30, BZ + 50], [s * 0, BZ + 35], [s * 0, BZ + 4]].map(([y, z]) => [y + y0, z]);
  add(`rail-${tag}`, profileYZ(prof, L).color(rails));
}

// Cashier end: photo-eye posts across the belt and a red stop button.
const EX = L / 2 - 160;
for (const s of [-1, 1]) {
  add(`eye-post-${s < 0 ? 'aisle' : 'back'}`, blk(EX, s * (W / 2 - 30), BZ + 35, 30, 30, 140).color(rails));
  add(`eye-lens-${s < 0 ? 'aisle' : 'back'}`, blk(EX, s * (W / 2 - 46), BZ + 140, 16, 4, 16).color('#d2362d'));
}
add("end-stop", blk(L / 2 + 10, 0, BZ - 60, 20, W, 130).color(accent));
add("stop-button-base", blk(L / 2 - 80, -W / 2 - 30, BZ - 120, 80, 60, 80).color('#f2c230'));
add("stop-button", cylinder(30, 26, 14).rotateX(90).translate(L / 2 - 80, -W / 2 - 60, BZ - 80).color('#d2362d'));

// "Next customer" divider bar: a long triangular prism lying on the belt.
add("divider-bar", profileYZ([[-30, 0], [30, 0], [0, 50]], 440).rotateZ(90).translate(-140, 0, BZ).color(accent));

if (goods.value === 'loaded') {
  // Cereal box lying slightly turned, milk carton with a gable top, bottle and cans.
  add("cereal-box", blk(0, 0, 0, 300, 80, 200).rotateZ(-12).translate(-560, -20, BZ).color('#d8452e'));
  add("cereal-label", blk(0, -42, 60, 160, 4, 100).rotateZ(-12).translate(-560, -20, BZ).color('#f4d24a'));
  add("milk-carton", blk(-380, 60, BZ, 90, 90, 200).color('#f4f6f6'));
  add("milk-gable", profileYZ([[-45, 0], [45, 0], [0, 40]], 90).translate(-380, 60, BZ + 200).color('#2f6fc1'));
  add("milk-band", blk(-380, 14, BZ + 70, 90, 3, 60).color('#2f6fc1'));
  add("bottle", turned([[0, 0], [40, 0], [40, 180], [14, 240], [14, 270], [0, 270]]).rotateY(90).translate(80, -60, BZ + 40).color('#2f8a4a'));
  for (let k = 0; k < 3; k++) add(`can-${k}`, cylinder(120, 33, 12).translate(420 + k * 72, 70, BZ).color(['#c92a2a', '#c4cbcf', '#c92a2a'][k]));
  add("bread-loaf", blk(260, 80, BZ, 200, 120, 90).color('#c8914f'));
  add("bread-top", cylinder(200, 60, 12).rotateY(90).translate(160, 80, BZ + 90).color('#b47a3c'));
}

return p.model();
