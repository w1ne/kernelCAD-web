// SPDX-License-Identifier: CC0-1.0
// Spiral concentrator bank, the gravity separator that splits heavy mineral
// from light gangue in a flowing slurry. What makes it one: helical
// fibreglass troughs winding down round a central column, slurry spreading
// across each trough with a dark band of heavy concentrate hugging the inner
// edge, a feed box at the top of every spiral fed by hoses from a round
// distributor, and a product splitter box at the foot of each spiral sending
// concentrate, middlings and tailings down hoses into three launders.
// Millimetres, Z up, bank along X, launders on the -Y (front) side, ground
// origin at the centre of the bank.
meta({
  name: "spiral-concentrator",
  license: 'CC0-1.0',
  title: "Spiral concentrator bank",
  description: "Bank of gravity spiral concentrators at about real size: helical fibreglass troughs winding four turns down round central columns, slurry spread across each trough with a dark heavy-mineral band on the inner edge, a feed box at the top of each spiral fed by hoses from a round feed distributor on the top beam, product splitter boxes at the foot with concentrate, middlings and tailings hoses into three launders, and a steel bay frame on a concrete plinth. Material controls: trough fibreglass, frame steel, slurry, heavy-mineral concentrate, plus a spiral count choice (2, 3, 4). weathered, highVisibility and ilmeniteSand presets.",
  tags: ['mining', 'mineral processing', 'gravity separation', 'spiral concentrator', 'mineral sands', 'concentrator', 'slurry', 'launder'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 8400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#dfe3dc', { label: 'Trough fibreglass' });
const structuralSteel = param('structuralSteel', '#3f6f96', { label: 'Frame steel' });
const slurry = param('slurry', '#b49a74', { label: 'Slurry' });
const concentrate = param('concentrate', '#2b2a2c', { label: 'Heavy-mineral concentrate' });
const count = param('count', '3', { choices: ['2', '3', '4'], label: 'Spirals in bank' });
presets({
  weathered: { coatedSteel: '#b9b5a6', structuralSteel: '#666a66', slurry: '#8e7c66', concentrate: '#3a3634' },
  highVisibility: { coatedSteel: '#f0f0ea', structuralSteel: '#e48a1e', slurry: '#c2ab84', concentrate: '#1f2022' },
  ilmeniteSand: { coatedSteel: '#d8dde4', structuralSteel: '#2f5a8a', slurry: '#d6c29a', concentrate: '#4a2f2a' },
});

const p = assembly("spiral-concentrator");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Closed (radius, z) outline swept round a helix about the Z axis (the
// transverse section's second coordinate runs opposite to Z, hence -z).
const poly = (pts) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) o = o.lineTo(x, y);
  return o.close();
};
const TURNS = 4, PITCH = 560;
const helical = (pts) => poly(pts.map(([r, z]) => [r, -z])).sweep(helix({ radius: 400, pitch: PITCH, turns: TURNS, pointsPerTurn: 12 }), { spine: 'helix', section: 'transverse' });
// Trough top surface: falls from the column to the outer third, then rises to the lip.
const ztop = (r) => (r < 400 ? 10 - ((r - 110) * 55) / 290 : -45 + ((r - 400) * 25) / 150);

const concrete = '#a6a196', hose = '#26292b', rubber = '#1f2224';
const n = Number(count.value);
const SP = 1700;
const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * SP);
const Zb = 950; // trough bottom end
const Zt = Zb + PITCH * TURNS; // trough top end
const halfX = xs[n - 1] + 950;

add('plinth', blk(-halfX - 300, -1500, 0, halfX + 300, 1100, 150).color(concrete));

// ---- Bay frame: posts, top beams and a base beam carrying the columns ----
for (const [i, x] of [-halfX, ...xs.slice(0, -1).map((v) => v + SP / 2), halfX].entries()) {
  // Intermediate front posts would hide the spirals; the front beam spans end to end.
  for (const y of (Math.abs(x) === halfX ? [-900, 900] : [900])) add(`frame-post-${i}-${y < 0 ? 'f' : 'b'}`, blk(x - 60, y - 60, 150, x + 60, y + 60, Zt + 700).color(structuralSteel));
}
for (const y of [-900, 900]) add(`top-beam-${y < 0 ? 'f' : 'b'}`, blk(-halfX - 80, y - 80, Zt + 700, halfX + 80, y + 80, Zt + 860).color(structuralSteel));
add('base-beam', blk(-halfX, -80, 150, halfX, 80, 330).color(structuralSteel));
add('cross-tie', blk(-halfX, 860, 900, halfX, 940, 980).color(structuralSteel));

// ---- Spirals ----
const trough = [[110, 10], [400, -45], [550, -20], [575, 70], [600, 70], [590, -70], [400, -85], [110, -25]];
const slurryBand = [[250, ztop(250) + 12], [548, ztop(548) + 14], [548, ztop(548) - 6], [400, -50], [250, ztop(250) - 6]];
const heavyBand = [[150, ztop(150) + 16], [255, ztop(255) + 18], [255, ztop(255) - 4], [150, ztop(150) - 4]];
for (const [i, x] of xs.entries()) {
  add(`column-${i}`, rod(70, 330, Zt + 700, 10).translate(x, 0, 0).color(structuralSteel));
  add(`trough-${i}`, helical(trough).translate(x, 0, Zb).color(coatedSteel));
  add(`slurry-${i}`, helical(slurryBand).translate(x, 0, Zb).color(slurry));
  add(`concentrate-band-${i}`, helical(heavyBand).translate(x, 0, Zb).color(concentrate));
  // Feed box at the top start of the helix (angle 0, +X).
  add(`feed-box-${i}`, blk(x + 200, -160, Zt - 40, x + 600, 160, Zt + 200).color(coatedSteel));
  add(`feed-slurry-${i}`, blk(x + 230, -130, Zt + 150, x + 570, 130, Zt + 190).color(slurry));
  add(`feed-hose-${i}`, tube([x + 400, 0, Zt + 180], [x + 260, -420, Zt + 940], 45, 8).color(hose));
  // Product splitter box at the foot with three outlet hoses to the launders.
  add(`splitter-box-${i}`, blk(x + 180, -260, Zb - 330, x + 640, 120, Zb - 40).color(coatedSteel));
  add(`splitter-blades-${i}`, blk(x + 200, -240, Zb - 60, x + 620, 100, Zb - 30).color(concentrate));
  for (const [k, ly] of [-1080, -1260, -1440].entries()) {
    add(`product-hose-${i}-${k}`, tube([x + 260 + k * 140, -200, Zb - 330], [x + 260 + k * 140, ly, 700], 40, 8).color(k === 0 ? rubber : hose));
  }
}

// ---- Feed distributor on the top beams ----
add('distributor-deck', blk(-halfX - 80, -980, Zt + 860, halfX + 80, -820, Zt + 900).color(structuralSteel));
add('distributor-pot', lathe([[160, Zt + 900], [380, Zt + 1150], [380, Zt + 1450], [340, Zt + 1500]], 14).translate(0, -420, 0).color(coatedSteel));
add('distributor-feed-pipe', tube([0, -420, Zt + 1500], [0, -420, Zt + 2100], 120, 12).color(structuralSteel));
add('distributor-feed-bend', tube([0, -420, Zt + 2100], [-halfX - 300, -420, Zt + 2100], 120, 12).color(structuralSteel));
for (const [i, x] of xs.entries()) add(`distributor-hose-${i}`, tube([0, -420, Zt + 1000], [x + 260, -420, Zt + 940], 45, 8).color(hose));
for (const y of [-900, 900]) add(`top-beam-cap-${y < 0 ? 'f' : 'b'}`, blk(-halfX - 80, y - 80, Zt + 860, halfX + 80, y + 80, Zt + 880).color(structuralSteel));

// ---- Three product launders along the front: concentrate, middlings, tailings ----
const products = [concentrate, '#8e7a5c', slurry];
for (const [k, ly] of [-1080, -1260, -1440].entries()) {
  const z0 = 420 - k * 90;
  add(`launder-${k}`, blk(-halfX, ly - 85, z0, halfX, ly + 85, z0 + 260).subtract(blk(-halfX - 10, ly - 65, z0 + 25, halfX + 10, ly + 65, z0 + 270)).color(structuralSteel));
  add(`launder-flow-${k}`, blk(-halfX + 5, ly - 64, z0 + 25, halfX - 5, ly + 64, z0 + 215).color(products[k]));
  for (const x of [-halfX + 150, halfX - 150]) add(`launder-leg-${k}-${x < 0 ? 'l' : 'r'}`, blk(x - 40, ly - 40, 150, x + 40, ly + 40, z0).color(structuralSteel));
}

return p.model();
