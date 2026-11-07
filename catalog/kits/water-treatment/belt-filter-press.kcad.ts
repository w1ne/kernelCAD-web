// SPDX-License-Identifier: CC0-1.0
// Belt filter press, the sludge dewatering machine of a treatment works.
// What makes it one: two wide endless filter belts. Flocculated sludge from a
// conditioning tank spreads on the upper, horizontal gravity table, where
// rows of ploughs turn it while free water drains through. The belts then
// close in a wedge and snake between a train of rollers of shrinking
// diameter, squeezing the sludge between them, and a doctor blade scrapes the
// cake off into a chute over a screw conveyor. Wash boxes spray the returning
// belts, tension cylinders keep them tight, and a drip pan under the open steel
// frame collects the filtrate.
// Millimetres, Z up, belts 2 m wide across Y, sludge travels towards +X.
meta({
  name: "belt-filter-press",
  license: 'CC0-1.0',
  title: "Belt filter press",
  description: "Two-metre belt filter press at about real size on an open steel frame: flocculation tank with mixer feeding a distribution box, gravity drainage table with sludge and three rows of ploughs, a closing wedge and a serpentine pressure train of rollers with the two filter belts and cake between them, doctor blade and cake chute onto a screw conveyor carrying cake, belt wash boxes with spray bars, pneumatic tension cylinders, drip pan and control panel. Material controls: frame coating, filter belts, stainless rollers and trim, sludge cake; weathered, highVisibility and stainlessFrame presets.",
  tags: ['water treatment', 'wastewater', 'sludge', 'dewatering', 'belt filter press', 'biosolids', 'filter belt'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Frame coating' });
const filterBelt = param('filterBelt', '#2f4d73', { label: 'Filter belts' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless rollers and trim' });
const sludge = param('sludge', '#5a4632', { label: 'Sludge cake' });
presets({
  weathered: { coatedSteel: '#687b78', filterBelt: '#3e4a52', stainlessSteel: '#9ca7a6', sludge: '#4d3d2c' },
  highVisibility: { coatedSteel: '#e5682d', filterBelt: '#1f5fa8', stainlessSteel: '#e1ddd0', sludge: '#6b5236' },
  stainlessFrame: { coatedSteel: '#aeb7b8', filterBelt: '#2a6b4f', stainlessSteel: '#d3d9d8', sludge: '#544030' },
});

const p = assembly("belt-filter-press");
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
// Lathe along Y: [[radius, y], ...] with y rising, centred on (x, z).
const latheY = (pts, x, z, n = 12) => lathe(pts, n).rotateX(-90).translate(x, 0, z);
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// A full-width band (belt or cake) of thickness t from (xa, za) to (xb, zb).
const band = (a, b, t, half = 1000) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return blk(0, -half, -t / 2, L, half, t / 2).rotateY(-ang).translate(a[0], 0, a[1]);
};

const dark = '#23272a', cake = sludge;
add('screw-support-a', blk(6050, -2300, 0, 6450, -2100, 300).color(coatedSteel));
add('screw-support-b', blk(6050, 2100, 0, 6450, 2300, 300).color(coatedSteel));
const W = 1150; // frame half width

// ---- Open frame ----
const cols = [-200, 1800, 3800, 5700];
for (const x of cols) {
  for (const s of [-1, 1]) {
    add(`column-${x}-${s}`, blk(x - 90, s * W - 90, 0, x + 90, s * W + 90, 2350).color(coatedSteel));
    add(`column-foot-${x}-${s}`, blk(x - 180, s * W - 180, 0, x + 180, s * W + 180, 30).color(coatedSteel));
  }
  add(`cross-beam-${x}`, blk(x - 80, -W, 250, x + 80, W, 400).color(coatedSteel));
}
for (const s of [-1, 1]) {
  for (const z of [250, 2200]) add(`side-rail-${s}-${z}`, blk(-290, s * W - 80, z, 5790, s * W + 80, z + 150).color(coatedSteel));
  add(`side-brace-${s}`, tube([1800, s * W, 400], [3800, s * W, 2200], 45, 4).color(coatedSteel));
}
add('drip-pan', blk(-100, -1020, 120, 5600, 1020, 240).color(stainlessSteel));
add('drip-pan-outlet', latheY([[110, -1350], [110, -1020]], 2800, 180, 10).color(stainlessSteel));

// ---- Rollers: bearing blocks either side ----
const roller = (name, x, z, r) => {
  add(name, latheY([[r, -1060], [r, 1060]], x, z, r > 250 ? 16 : 12).color(stainlessSteel));
  add(`${name}-shaft`, latheY([[55, -1230], [55, 1230]], x, z, 8).color(dark));
  for (const s of [-1, 1]) add(`${name}-bearing-${s}`, blk(x - 120, s * W - 70, z - 110, x + 120, s * W + 70, z + 110).color(dark));
};

// Gravity table: upper belt along z = 2000.
const GZ = 2000;
roller('gravity-tail-roller', 0, GZ - 150, 150);
roller('gravity-head-roller', 3600, GZ - 150, 150);
add('gravity-belt', band([0, GZ], [3600, GZ], 16).color(filterBelt));
add('gravity-grid', blk(100, -1000, GZ - 120, 3500, 1000, GZ - 40).color(stainlessSteel));
add('gravity-sludge', band([300, GZ + 50], [3450, GZ + 40], 80, 900).color(sludge));
for (let k = 0; k < 3; k++) {
  const x = 900 + k * 900;
  add(`plough-bar-${k}`, latheY([[30, -1150], [30, 1150]], x, GZ + 260, 6).color(stainlessSteel));
  for (let j = 0; j < 8; j++) {
    const y = -875 + j * 250 + (k % 2) * 60;
    add(`plough-${k}-${j}`, blk(-15, -70, GZ + 30, 15, 70, GZ + 260).rotateZ(35).translate(x, y, 0).color(stainlessSteel));
  }
}
for (const s of [-1, 1]) add(`gravity-side-seal-${s}`, blk(150, s * 960, GZ, 3500, s * 980 + s * 20, GZ + 220).color(stainlessSteel));

// Wedge zone and pressure train: belts and cake snake between rollers.
const train = [[3550, 1500, 250], [2700, 1250, 300], [3800, 1000, 340], [2800, 720, 300], [4300, 600, 260], [5200, 860, 220]];
train.forEach(([x, z, r], k) => roller(`press-roller-${k}`, x, z, r));
add('wedge-lower-belt', band([3600, GZ - 300], [3550 + 250, 1500], 16).color(filterBelt));
// Cake path: tangent hops between successive rollers, alternating sides.
for (let k = 0; k < train.length - 1; k++) {
  const [x0, z0, r0] = train[k], [x1, z1, r1] = train[k + 1];
  const side = k % 2 ? 1 : -1;
  const a = [x0, z0 + side * r0], b = [x1, z1 - side * r1];
  add(`belt-run-upper-${k}`, band([a[0], a[1] + 30], [b[0], b[1] + 30], 16).color(filterBelt));
  add(`cake-run-${k}`, band(a, b, 40, 980).color(cake));
  add(`belt-run-lower-${k}`, band([a[0], a[1] - 30], [b[0], b[1] - 30], 16).color(filterBelt));
}
// Belt return runs under the train back to the gravity table.
add('return-belt-upper', band([5400, 900], [5500, 1700], 16).color(filterBelt));
add('return-belt-upper-top', band([5500, 1700], [3700, GZ - 20], 16).color(filterBelt));
add('return-belt-lower', band([5200, 640], [-100, 520], 16).color(filterBelt));
add('return-belt-lower-up', band([-100, 520], [0, GZ - 300], 16).color(filterBelt));
roller('return-roller-a', 5500, 1700, 140);
roller('return-roller-b', -100, 520, 140);

// ---- Belt tension cylinders ----
for (const s of [-1, 1]) {
  add(`tension-cylinder-${s}`, latheX([[90, 4400], [90, 5250]], s * (W + 120), 1650, 10).color(coatedSteel));
  add(`tension-rod-${s}`, latheX([[35, 5250], [35, 5480]], s * (W + 120), 1650, 8).color(stainlessSteel));
}

// ---- Wash boxes with spray bars on the return runs ----
for (const [k, [x, z]] of [[1800, 760], [4600, 1880]].entries()) {
  add(`wash-box-${k}`, blk(x - 300, -1080, z - 180, x + 300, 1080, z + 120).color(stainlessSteel));
  add(`spray-bar-${k}`, latheY([[40, -1250], [40, 1250]], x, z + 200, 8).color(dark));
  add(`wash-feed-${k}`, tube([x, -1250, z + 200], [x, -1250, z + 700], 35, 6).color(dark));
}

// ---- Doctor blade, cake chute and screw conveyor ----
add('doctor-blade', band([5480, 960], [5660, 700], 20).color(dark));
add('cake-chute', band([5450, 900], [6100, 640], 30, 1050).color(stainlessSteel));
for (const s of [-1, 1]) add(`chute-cheek-${s}`, blk(5450, s * 1040 - 15, 600, 6100, s * 1040 + 15, 950).color(stainlessSteel));
add('screw-trough', blk(5900, -2400, 300, 6600, 2400, 620).color(stainlessSteel));
add('screw-conveyor-casing', latheY([[300, -2400], [300, 2400]], 6250, 300, 14).color(stainlessSteel));
add('screw-cake', blk(5950, -2300, 600, 6550, 2300, 680).color(cake));
for (let k = 0; k < 6; k++) add(`cake-lump-${k}`, lathe([[160, -10], [190, 60], [80, 180]], 6).translate(6050 + (k % 3) * 200, -1600 + k * 620, 650).color(cake));
add('screw-drive', latheY([[260, 2450], [260, 3050]], 6250, 300, 12).color(coatedSteel));

// ---- Flocculation tank and feed ----
add('floc-tank-stand', blk(-1700, -700, 0, -500, 700, 1700).color(coatedSteel));
add('floc-tank', lathe([[560, 1700], [600, 1800], [600, 2900], [560, 2950]], 16).translate(-1100, 0, 0).color(stainlessSteel));
add('floc-mixer-motor', rod(170, 2950, 3450, 10).translate(-1100, 0, 0).color(coatedSteel));
add('floc-polymer-line', tube([-1100, 650, 2600], [-1100, 1500, 2600], 30, 6).color(dark));
add('feed-pipe', tube([-500, 0, 2500], [150, 0, 2500], 90, 10).color(stainlessSteel));
add('distribution-box', blk(100, -1000, GZ + 120, 450, 1000, GZ + 420).color(stainlessSteel));
add('sludge-feed-pipe', tube([-2400, 0, 600], [-1650, 0, 600], 110, 10).color(dark));
add('sludge-feed-riser', tube([-1650, 0, 600], [-1650, 0, 2300], 110, 10).color(dark));

// ---- Control panel ----
add('control-panel', blk(-900, -2100, 0, 100, -1600, 1900).color(coatedSteel));
add('control-panel-door-line', blk(-860, -2120, 150, 60, -2100, 1850).color(dark));
add('control-panel-hmi', blk(-600, -2140, 1250, -200, -2120, 1550).color('#7fc4d6'));
for (const [k, c] of ['#3fae49', '#d33a2c', '#e8c23a'].entries()) add(`pilot-light-${k}`, latheY([[40, -2160], [40, -2120]], -650 + k * 150, 1050, 8).color(c));

return p.model();
