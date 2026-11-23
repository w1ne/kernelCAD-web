// SPDX-License-Identifier: CC0-1.0
// Ball mill, the secondary grinding drum that takes SAG-mill product and
// grinds it to flotation size with a steel-ball charge. What makes it one: a
// long shell (longer than it is wide, unlike a SAG mill) with liner-bolt rows
// and bolted manway covers, short conical heads on hollow trunnions in hooded
// bearings on concrete piers, a guarded girth gear near the discharge end
// driven by a pinion, gearbox and motor running parallel to the mill, a feed
// spout fed by the cyclone underflow line, a discharge trommel (or overflow
// bell) over a sump, and a bin of make-up grinding balls at its feet.
// Millimetres, Z up, mill axis along X, ground origin under the mill centre.
meta({
  name: "ball-mill",
  license: 'CC0-1.0',
  title: "Ball mill assembly",
  description: "Overflow ball mill at about real size: 6.8 m long, 4.6 m diameter shell with liner-bolt rows and bolted manway covers, conical heads on hollow trunnions in hooded bearings on concrete piers, guarded girth gear with pinion, gearbox and finned motor, feed spout with cyclone underflow line and feed box on legs, discharge trommel or overflow bell over a sump, make-up grinding-ball bin, lube unit and walkway with handrails. Material controls: mill shell coating, drive and structural steel, trunnion and trommel steel, pier concrete, plus a discharge choice (trommel, overflow). weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'mineral processing', 'grinding', 'ball mill', 'comminution', 'concentrator', 'girth gear', 'trommel'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3f7f9e', { label: 'Mill shell coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Drive and structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Trunnion and trommel steel' });
const concrete = param('concrete', '#a19d94', { label: 'Pier concrete' });
const discharge = param('discharge', 'trommel', { choices: ['trommel', 'overflow'], label: 'Discharge end' });
presets({
  weathered: { coatedSteel: '#5d6f73', structuralSteel: '#666a66', stainlessSteel: '#969f9e', concrete: '#8b8579' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', concrete: '#b3afa6' },
  greyPlant: { coatedSteel: '#b9bec0', structuralSteel: '#2f5a8a', stainlessSteel: '#d0d6d6', concrete: '#a8a49b' },
});

const p = assembly("ball-mill");
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

const dark = '#26292b', grease = '#3a3631', rubber = '#1f2224', ballSteel = '#7d8287';
const Zc = 3300; // mill axis height
const R = 2300; // shell radius
const N = 24;

// ---- Foundation slab and piers ----
add('foundation', blk(-7300, -4900, 0, 7400, 4100, 200).color(concrete));
for (const [k, x] of [-4500, 4500].entries()) {
  add(`pier-${k}`, blk(x - 650, -1800, 200, x + 650, 1800, Zc - 1500).color(concrete));
  add(`pier-plinth-${k}`, blk(x - 800, -2000, 200, x + 800, 2000, 600).color(concrete));
}

// ---- Shell, heads and trunnions ----
add('mill-shell', latheX([
  [900, -5000], [900, -4100], [R - 120, -3550], [R, -3400], [R, 3400], [R - 120, 3550], [900, 4100], [900, 5000],
], 0, Zc, N).color(coatedSteel));
for (const [k, x] of [-3400, 0, 3400].entries()) add(`shell-flange-${k}`, latheX([[R + 90, x - 70], [R + 90, x + 70]], 0, Zc, N).color(coatedSteel));
// Rows of liner bolts running the length of the shell.
for (let k = 0; k < 12; k++) {
  const a = (360 * k) / 12 + 15;
  for (const [s, x0, x1] of [[0, -3200, -150], [1, 150, 1800]]) {
    add(`liner-bolts-${k}-${s}`, blk(x0, -35, R, x1, 35, R + 40).rotateX(a).translate(0, 0, Zc).color(structuralSteel));
  }
}
// Bolted manway covers facing the operator side.
for (const x of [-1700, 1000]) {
  add(`manway-${x}`, blk(x - 450, -320, R - 20, x + 450, 320, R + 90).rotateX(52).translate(0, 0, Zc).color(stainlessSteel));
  add(`manway-handle-${x}`, blk(x - 200, -40, R + 90, x + 200, 40, R + 170).rotateX(52).translate(0, 0, Zc).color(dark));
}
for (const [k, x] of [-4500, 4500].entries()) {
  add(`trunnion-journal-${k}`, latheX([[1000, x - 600], [1000, x + 600]], 0, Zc, N).color(stainlessSteel));
  add(`bearing-housing-${k}`, blk(x - 600, -1500, Zc - 1500, x + 600, 1500, Zc - 150).color(structuralSteel));
  add(`bearing-cap-${k}`, latheX([[1300, x - 500], [1300, x + 500]], 0, Zc - 100, 16).color(structuralSteel));
  add(`bearing-oil-line-${k}`, tube([x, -1500, Zc - 700], [x, -2600, 700], 40, 6).color(dark));
}

// ---- Girth gear, guard, pinion and drive train (on the -Y side) ----
const gx = 2200;
add('girth-gear', latheX([[R + 300, gx - 160], [R + 300, gx + 160]], 0, Zc, 48).color(grease));
add('gear-guard', latheX([[R + 500, gx - 330], [R + 500, gx + 330]], 0, Zc, N).color(structuralSteel));
add('gear-guard-band', latheX([[R + 540, gx - 50], [R + 540, gx + 50]], 0, Zc, N).color(coatedSteel));
const py = -(R + 1100), pz = Zc - 1300;
add('pinion-base', blk(gx - 600, py - 800, 200, 6900, py + 800, 1100).color(structuralSteel));
add('pinion-bearing-a', blk(gx - 550, py - 500, 1100, gx - 300, py + 500, pz + 330).color(structuralSteel));
add('pinion-bearing-b', blk(gx + 300, py - 500, 1100, gx + 550, py + 500, pz + 330).color(structuralSteel));
add('pinion-shaft', latheX([[200, gx - 600], [200, 3800]], py, pz, 12).color(stainlessSteel));
add('coupling-guard', latheX([[400, 2950], [400, 3550]], py, pz, 12).color(coatedSteel));
add('gearbox', blk(3800, py - 750, 1100, 4900, py + 750, pz + 700).color(structuralSteel));
add('gearbox-cover', blk(3700, py - 550, 1350, 3800, py + 550, pz + 550).color(structuralSteel));
add('motor', latheX([[700, 5150], [800, 5300], [800, 6600], [650, 6750]], py, pz, 20).color(structuralSteel));
for (let x = 5400; x < 6500; x += 200) add(`motor-fin-${x}`, latheX([[870, x], [870, x + 50]], py, pz, 20).color(structuralSteel));
add('motor-fan-cowl', latheX([[620, 6750], [700, 6950]], py, pz, 16).color(dark));
add('motor-terminal-box', blk(5600, py - 350, pz + 750, 6200, py + 350, pz + 1150).color(structuralSteel));

// ---- Feed end: spout, feed box on legs and cyclone underflow line ----
add('feed-spout', latheX([[650, -6300], [650, -4900]], 0, Zc, 16).color(structuralSteel));
add('feed-box', blk(-7000, -900, Zc - 800, -6000, 900, Zc + 900).color(structuralSteel));
add('feed-box-lid', blk(-7050, -950, Zc + 900, -5950, 950, Zc + 980).color(coatedSteel));
for (const [x, y] of [[-6900, -800], [-6900, 800], [-6100, -800], [-6100, 800]]) add(`feed-leg-${x}-${y}`, rod(90, 200, Zc - 800, 8).translate(x, y, 0).color(structuralSteel));
add('underflow-line', tube([-6500, 0, Zc + 980], [-6500, 0, Zc + 2600], 260, 10).color(rubber));
add('underflow-bend', tube([-6500, 0, Zc + 2600], [-5200, 0, Zc + 3300], 260, 10).color(rubber));
add('underflow-flange', rod(330, Zc + 2550, Zc + 2650, 10).translate(-6500, 0, 0).color(stainlessSteel));

// ---- Discharge end over a sump ----
add('discharge-sump', blk(5100, -1700, 200, 7300, 1700, Zc - 1300).color(coatedSteel));
add('sump-opening', blk(5200, -1500, Zc - 1320, 7200, 1500, Zc - 1280).color(dark));
if (discharge.value === 'overflow') {
  add('overflow-bell', latheX([[850, 5000], [1250, 5700]], 0, Zc, 20).color(stainlessSteel));
  add('discharge-hood', blk(5750, -1500, Zc - 1300, 7200, 1500, Zc + 1400).color(structuralSteel));
  add('hood-door', blk(6100, -1520, Zc - 400, 6900, -1500, Zc + 900).color(coatedSteel));
} else {
  add('trommel-screen', latheX([[950, 5000], [950, 6700]], 0, Zc, 20).color(dark));
  for (const x of [5050, 5600, 6150, 6650]) add(`trommel-band-${x}`, latheX([[1010, x], [1010, x + 70]], 0, Zc, 20).color(stainlessSteel));
  for (let k = 0; k < 8; k++) add(`trommel-bar-${k}`, blk(5000, -25, 965, 6700, 25, 1000).rotateX(22.5 * k).translate(0, 0, Zc).color(stainlessSteel));
  add('reject-chute', tube([6750, 0, Zc - 400], [7300, 0, Zc - 1600], 500, 4).color(structuralSteel));
}

// ---- Make-up grinding-ball bin at the operator side ----
add('ball-bin', blk(-6400, -4300, 200, -4900, -3000, 1000)
  .subtract(blk(-6300, -4200, 400, -5000, -3100, 1100)).color(coatedSteel));
for (const [k, [x, y, z]] of [[-6050, -3950, 900], [-5700, -3900, 900], [-5300, -3950, 900], [-5900, -3500, 900],
  [-5500, -3450, 900], [-5150, -3400, 900], [-5850, -3720, 1080], [-5420, -3700, 1080]].entries()) {
  add(`grinding-ball-${k}`, sphere(170).translate(x, y, z).color(ballSteel));
}

// ---- Lube unit and access walkway (+Y side) ----
add('lube-unit', blk(-1600, 3100, 200, 400, 3800, 1500).color(structuralSteel));
add('lube-filter-a', rod(140, 1500, 2000, 10).translate(-1100, 3450, 0).color(coatedSteel));
add('lube-filter-b', rod(140, 1500, 2000, 10).translate(-650, 3450, 0).color(coatedSteel));
const wz = Zc - 1500, wy = R + 500;
add('walkway-deck', blk(-3300, wy, wz, 3300, wy + 800, wz + 60).color(structuralSteel));
for (const x of [-3100, -1000, 1000, 3100]) add(`walkway-post-${x}`, rod(70, 200, wz, 8).translate(x, wy + 400, 0).color(structuralSteel));
for (const x of [-3250, -1600, 0, 1600, 3250]) add(`handrail-post-${x}`, rod(25, wz, wz + 1100, 6).translate(x, wy + 770, 0).color(coatedSteel));
add('handrail-top', tube([-3250, wy + 770, wz + 1100], [3250, wy + 770, wz + 1100], 25, 6).color(coatedSteel));
add('handrail-mid', tube([-3250, wy + 770, wz + 550], [3250, wy + 770, wz + 550], 20, 6).color(coatedSteel));

return p.model();
