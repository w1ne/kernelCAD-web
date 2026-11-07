// Semi-autogenous (SAG) grinding mill, the big drum at the head of a
// concentrator that tumbles run-of-mine ore with a steel-ball charge. What
// makes it one: a wide, short shell (about twice as wide as long) with bolted
// flanges and rows of liner bolts, conical feed and discharge heads necking
// down to hollow trunnions riding in hooded bearings on tall concrete piers; a
// guarded girth gear near the discharge end driven by a pinion, gearbox and
// motor running parallel to the mill; a stationary feed chute into one
// trunnion and a trommel screen on the other over a discharge sump.
// Millimetres, Z up, mill axis along X, ground origin under the mill centre.
meta({
  name: "sag-mill",
  license: 'CC0-1.0',
  title: "SAG grinding mill",
  description: "Semi-autogenous grinding mill at about real size: 8 m shell with bolted flanges and liner-bolt rows, conical feed and discharge heads on hollow trunnions in hooded bearings on concrete piers, guarded girth gear with pinion, gearbox and finned motor, stationary feed chute with square hopper, discharge trommel over a sump, lube unit and access walkway with handrails. Material controls: mill shell coating, structural steel, trunnion and trommel steel, concrete; weathered, highVisibility and greyPlant presets.",
  tags: ['mining', 'mineral processing', 'grinding', 'SAG mill', 'comminution', 'concentrator', 'girth gear', 'trommel'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#d7a22c', { label: 'Mill shell coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Drive and structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Trunnion and trommel steel' });
const concrete = param('concrete', '#a19d94', { label: 'Pier concrete' });
presets({
  weathered: { coatedSteel: '#8d7a4c', structuralSteel: '#666a66', stainlessSteel: '#969f9e', concrete: '#8b8579' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', concrete: '#b3afa6' },
  greyPlant: { coatedSteel: '#b9bec0', structuralSteel: '#2f5a8a', stainlessSteel: '#d0d6d6', concrete: '#a8a49b' },
});

const p = assembly("sag-mill");
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

const dark = '#26292b', grease = '#3a3631';
const Zc = 5400; // mill axis height
const R = 4000; // shell radius
const N = 24;

// ---- Foundation slab and piers ----
add('foundation', blk(-7600, -6200, 0, 8200, 5600, 200).color(concrete));
for (const [k, x] of [-4250, 4250].entries()) {
  add(`pier-${k}`, blk(x - 750, -2300, 200, x + 750, 2300, Zc - 1900).color(concrete));
  add(`pier-plinth-${k}`, blk(x - 900, -2500, 200, x + 900, 2500, 700).color(concrete));
}

// ---- Shell, heads and trunnions ----
add('mill-shell', latheX([
  [1250, -4900], [1250, -3500], [R - 150, -2350], [R, -2200], [R, 2200], [R - 150, 2350], [1250, 3500], [1250, 4900],
], 0, Zc, N).color(coatedSteel));
for (const [k, x] of [-2250, 0, 2250].entries()) add(`shell-flange-${k}`, latheX([[R + 110, x - 90], [R + 110, x + 90]], 0, Zc, N).color(coatedSteel));
// Rows of liner bolts running the length of the shell.
for (let k = 0; k < 16; k++) {
  const a = (360 * k) / 16 + 11.25;
  for (const [s, x0, x1] of [[0, -2050, -250], [1, 250, 1500]]) {
    add(`liner-bolts-${k}-${s}`, blk(x0, -45, R, x1, 45, R + 45).rotateX(a).translate(0, 0, Zc).color(structuralSteel));
  }
}
// Head stiffening ribs on the feed cone.
for (let k = 0; k < 12; k++) {
  const a = (360 * k) / 12;
  add(`feed-head-rib-${k}`, tube([-3480, 0, 1350], [-2380, 0, R - 60], 70, 4).rotateX(a).translate(0, 0, Zc).color(coatedSteel));
}
for (const [k, x] of [-4250, 4250].entries()) {
  add(`trunnion-journal-${k}`, latheX([[1350, x - 650], [1350, x + 650]], 0, Zc, N).color(stainlessSteel));
  // Hooded trunnion bearing: lower housing and a rounded cap.
  add(`bearing-housing-${k}`, blk(x - 700, -1900, Zc - 1900, x + 700, 1900, Zc - 200).color(structuralSteel));
  add(`bearing-cap-${k}`, latheX([[1700, x - 600], [1700, x + 600]], 0, Zc - 150, 16).color(structuralSteel));
  add(`bearing-oil-line-${k}`, tube([x, -1900, Zc - 800], [x, -3400, 900], 45, 6).color(dark));
}

// ---- Girth gear, guard, pinion and drive train (on the -Y side) ----
const gx = 1700;
add('girth-gear', latheX([[R + 420, gx - 200], [R + 420, gx + 200]], 0, Zc, 48).color(grease));
add('gear-guard', latheX([[R + 650, gx - 380], [R + 650, gx + 380]], 0, Zc, N).color(structuralSteel));
add('gear-guard-band', latheX([[R + 690, gx - 60], [R + 690, gx + 60]], 0, Zc, N).color(coatedSteel));
const py = -(R + 1300), pz = Zc - 1600;
add('pinion-base', blk(gx - 700, py - 900, 200, 7800, py + 900, 1300).color(structuralSteel));
add('pinion-bearing-a', blk(gx - 650, py - 600, 1300, gx - 350, py + 600, pz + 400).color(structuralSteel));
add('pinion-bearing-b', blk(gx + 350, py - 600, 1300, gx + 650, py + 600, pz + 400).color(structuralSteel));
add('pinion-shaft', latheX([[260, gx - 700], [260, 4200]], py, pz, 12).color(stainlessSteel));
add('coupling-guard', latheX([[480, 3000], [480, 3700]], py, pz, 12).color(coatedSteel));
add('gearbox', blk(3800, py - 900, 1300, 5200, py + 900, pz + 900).color(structuralSteel));
add('gearbox-cover', blk(3700, py - 700, 1600, 3800, py + 700, pz + 700).color(structuralSteel));
add('motor', latheX([[900, 5500], [1000, 5650], [1000, 7400], [850, 7550]], py, pz, 20).color(structuralSteel));
for (let x = 5750; x < 7300; x += 220) add(`motor-fin-${x}`, latheX([[1080, x], [1080, x + 60]], py, pz, 20).color(structuralSteel));
add('motor-fan-cowl', latheX([[800, 7550], [900, 7800]], py, pz, 16).color(dark));
add('motor-terminal-box', blk(6100, py - 400, pz + 900, 6800, py + 400, pz + 1350).color(structuralSteel));

// ---- Feed end: stationary spout and square hopper ----
add('feed-spout', latheX([[1000, -6600], [1000, -4800]], 0, Zc, 16).color(structuralSteel));
add('feed-hopper', lathe([[1300, Zc], [1300, Zc + 1700], [2600, Zc + 3600]], 4).rotateZ(45).translate(-6600, 0, 0).color(structuralSteel));
add('feed-hopper-rim', lathe([[2650, Zc + 3600], [2650, Zc + 3750]], 4).rotateZ(45).translate(-6600, 0, 0).color(coatedSteel));
for (const [x, y] of [[-7400, -900], [-7400, 900], [-5800, -900], [-5800, 900]]) add(`feed-leg-${x}-${y}`, rod(110, 200, Zc + 600, 8).translate(x, y, 0).color(structuralSteel));
add('ore-in-hopper', lathe([[2300, Zc + 3300], [1200, Zc + 3900], [300, Zc + 4100]], 4).rotateZ(45).translate(-6600, 0, 0).color('#7d6f62'));

// ---- Discharge end: trommel screen over a sump ----
add('trommel-screen', latheX([[1150, 4900], [1150, 6900]], 0, Zc, 20).color(dark));
for (const x of [4950, 5600, 6250, 6850]) add(`trommel-band-${x}`, latheX([[1220, x], [1220, x + 80]], 0, Zc, 20).color(stainlessSteel));
for (let k = 0; k < 8; k++) add(`trommel-bar-${k}`, blk(4900, -30, 1170, 6900, 30, 1210).rotateX(22.5 * k).translate(0, 0, Zc).color(stainlessSteel));
add('discharge-sump', blk(4900, -1800, 200, 7400, 1800, Zc - 1500).color(coatedSteel));
add('sump-opening', blk(5000, -1600, Zc - 1520, 7300, 1600, Zc - 1480).color(dark));
add('oversize-chute', tube([6950, 0, Zc - 500], [8000, 0, Zc - 2600], 650, 4).color(structuralSteel));

// ---- Lube unit and access walkway (+Y side) ----
add('lube-unit', blk(-1800, 4700, 200, 600, 5500, 1700).color(structuralSteel));
add('lube-filter-a', rod(160, 1700, 2300, 10).translate(-1200, 5100, 0).color(coatedSteel));
add('lube-filter-b', rod(160, 1700, 2300, 10).translate(-700, 5100, 0).color(coatedSteel));
const wz = Zc - 1900, wy = R + 700;
add('walkway-deck', blk(-3600, wy, wz, 3600, wy + 900, wz + 60).color(structuralSteel));
for (const x of [-3400, -1100, 1100, 3400]) add(`walkway-post-${x}`, rod(80, 200, wz, 8).translate(x, wy + 450, 0).color(structuralSteel));
for (const x of [-3500, -1750, 0, 1750, 3500]) add(`handrail-post-${x}`, rod(25, wz, wz + 1100, 6).translate(x, wy + 870, 0).color(coatedSteel));
add('handrail-top', tube([-3500, wy + 870, wz + 1100], [3500, wy + 870, wz + 1100], 25, 6).color(coatedSteel));
add('handrail-mid', tube([-3500, wy + 870, wz + 550], [3500, wy + 870, wz + 550], 20, 6).color(coatedSteel));
for (let k = 0; k < 9; k++) add(`stair-tread-${k}`, blk(3700 + k * 380, wy, wz - (k + 1) * 380, 4000 + k * 380, wy + 900, wz - (k + 1) * 380 + 40).color(structuralSteel));
add('stair-stringer', tube([3600, wy + 900, wz], [7300, wy + 900, 200], 50, 6).color(structuralSteel));

return p.model();
