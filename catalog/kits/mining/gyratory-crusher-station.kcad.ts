// SPDX-License-Identifier: CC0-1.0
// Gyratory crusher station, the primary crusher that haul trucks tip
// run-of-mine ore into. What makes it one: a tall stack of round shells
// (bottom shell with the drive arm, middle shell, flaring top shell lined with
// concaves) whose throat shows the manganese mantle head rising through a bowl
// of rock, a spider beam across the top with its central cap, a horizontal
// countershaft and motor out to one side, all set in a deep concrete pit whose
// walls form the truck dump pocket, with a dump deck, wheel stop and a
// pedestal rock breaker for oversize.
// Millimetres, Z up, crusher axis at the origin, truck dump side towards +Y.
meta({
  name: "gyratory-crusher-station",
  license: 'CC0-1.0',
  title: "Gyratory crusher station",
  description: "Primary gyratory crusher station at about real size: bottom shell with countershaft arm, middle shell and flaring top shell whose throat shows the manganese mantle head in a bowl of rock, spider beam and cap, horizontal countershaft with coupling and motor, discharge chute into the pit below, concrete pit walls forming the truck dump pocket, dump deck with wheel stop, operator deck with handrails and a pedestal rock breaker for oversize. Material controls: crusher shell coating, deck and drive steel, manganese wear steel, pit concrete, plus a rock-breaker choice (fitted, none). weathered, highVisibility and yellowPlant presets.",
  tags: ['mining', 'mineral processing', 'crushing', 'gyratory crusher', 'primary crusher', 'comminution', 'dump pocket', 'rock breaker'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3e6f96', { label: 'Crusher shell coating' });
const structuralSteel = param('structuralSteel', '#4f5b62', { label: 'Deck and drive steel' });
const manganeseSteel = param('manganeseSteel', '#8c8a84', { label: 'Manganese wear steel' });
const concrete = param('concrete', '#a6a196', { label: 'Pit concrete' });
const rockBreaker = param('rockBreaker', 'fitted', { choices: ['fitted', 'none'], label: 'Rock breaker' });
presets({
  weathered: { coatedSteel: '#5d6f73', structuralSteel: '#666a66', manganeseSteel: '#77736b', concrete: '#8b8579' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', manganeseSteel: '#9a978f', concrete: '#b3afa6' },
  yellowPlant: { coatedSteel: '#e2b31c', structuralSteel: '#2f3437', manganeseSteel: '#8f8b82', concrete: '#aaa59b' },
});

const p = assembly("gyratory-crusher-station");
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
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

const dark = '#26292b', ore = '#7a6650', oreLight = '#9a8670', grease = '#3a3631', stripe = '#e8c21a';
const N = 24;
const Zd = 9000; // truck dump deck level
const Zt = 8200; // top of the top shell

// ---- Pit floor, crusher pedestal and discharge chute ----
add('pit-floor', blk(-9800, -10200, 0, 6200, 4400, 300).color(concrete));
add('crusher-pedestal', blk(-2600, -2600, 300, 2600, 2600, 2600)
  .subtract(blk(-1300, -2700, 300, 1300, 1300, 2300)).color(concrete));
add('discharge-chute', blk(-1200, -2500, 900, 1200, 1100, 2300).color(dark));
add('surge-ore', lathe([[1500, 300], [300, 1400]], 10).translate(0, -3300, 0).color(ore));

// ---- Shells, spider and mantle ----
add('bottom-shell', lathe([[2300, 2600], [2400, 2800], [2400, 4300], [2250, 4500]], N).color(coatedSteel));
add('bottom-flange', rod(2600, 4300, 4500, N).color(coatedSteel));
add('middle-shell', lathe([[2350, 4500], [2550, 6100]], N).color(coatedSteel));
add('middle-flange', rod(2800, 6000, 6200, N).color(coatedSteel));
add('top-shell', lathe([[2600, 6200], [3100, 8000], [3150, Zt]], N).color(coatedSteel));
add('top-rim', rod(3300, Zt - 150, Zt, N).color(manganeseSteel));
for (let k = 0; k < 12; k++) {
  add(`shell-rib-${k}`, blk(2350, -70, 4600, 2700, 70, 6000).rotateZ((360 * k) / 12 + 15).color(coatedSteel));
}
// Bowl: rock filling the concaves, with the mantle head breaking through.
add('bowl-rock', rod(2900, Zt - 260, Zt - 40, N).color(ore));
add('mantle', lathe([[1500, Zt - 200], [900, Zt + 500], [350, Zt + 1000]], N).color(manganeseSteel));
const lumps = [[2200, 15, 260], [2400, 70, 340], [2100, 130, 220], [2350, 185, 300], [2250, 250, 280], [2450, 310, 240], [1800, 100, 180], [1900, 220, 200]];
for (const [k, [r, a, s]] of lumps.entries()) {
  const t = (a * Math.PI) / 180;
  add(`bowl-lump-${k}`, blk(-s, -s * 0.8, -s * 0.6, s, s * 0.8, s * 0.6).rotateX(25 + k * 17).rotateZ(a)
    .translate(r * Math.cos(t), r * Math.sin(t), Zt - 40).color(k % 2 ? oreLight : ore));
}
add('spider-beam', blk(-3300, -380, Zt + 950, 3300, 380, Zt + 1450).color(coatedSteel));
add('spider-arm-guard', blk(-3300, -430, Zt + 1450, 3300, 430, Zt + 1520).color(manganeseSteel));
add('spider-cap', lathe([[750, Zt + 1450], [700, Zt + 1800], [350, Zt + 2100]], 16).color(coatedSteel));
add('spider-cap-lube', tube([300, 0, Zt + 2000], [1600, -900, Zt + 2400], 50, 6).color(dark));

// ---- Countershaft, coupling and motor out to -Y ----
const sz = 3500;
add('countershaft-box', blk(-650, -4400, 2600, 650, -2200, 4300).color(coatedSteel));
add('countershaft', latheY([[260, -6100], [260, -4300]], 0, sz, 12).color(manganeseSteel));
add('coupling-guard', latheY([[480, -5500], [480, -4800]], 0, sz, 12).color(stripe));
add('motor-base', blk(-1100, -9900, 300, 1100, -2600, 2600).color(concrete));
add('motor', latheY([[900, -9200], [1050, -9000], [1050, -6500], [900, -6200]], 0, sz, 20).color(structuralSteel));
for (let y = -8800; y < -6600; y += 280) add(`motor-fin-${y}`, latheY([[1120, y], [1120, y + 70]], 0, sz, 20).color(structuralSteel));
add('motor-terminal-box', blk(1000, -8200, sz - 300, 1500, -7400, sz + 400).color(structuralSteel));
add('motor-fan-cowl', latheY([[820, -9600], [880, -9200]], 0, sz, 16).color(dark));

// ---- Hydraulic setting unit beside the crusher ----
add('hydraulic-unit', blk(3200, -2400, 300, 4800, -1000, 1700).color(structuralSteel));
add('hydraulic-tank', latheY([[450, -2300], [450, -1100]], 4000, 2200, 12).color(coatedSteel));
add('hydraulic-line', tube([3200, -1400, 1500], [2400, -800, 2900], 60, 6).color(dark));

// ---- Dump pocket: pit walls, dump deck, wheel stop ----
add('back-wall', blk(-6200, 3600, 300, 6200, 4400, Zd).color(concrete));
add('side-wall-l', blk(-6200, -1200, 300, -5400, 3600, Zd).color(concrete));
add('side-wall-r', blk(5400, -1200, 300, 6200, 3600, Zd).color(concrete));
add('dump-deck', blk(-6200, 4400, 0, 6200, 9800, Zd).color(concrete));
add('wheel-stop', blk(-4400, 4500, Zd, 4400, 5200, Zd + 900).color(concrete));
for (let k = 0; k < 6; k++) {
  add(`wheel-stop-stripe-${k}`, blk(-4300 + k * 1500, 4480, Zd + 100, -3700 + k * 1500, 4500, Zd + 800).color(stripe));
}
// Sloping dump apron: lined wear plate from the back wall into the crusher throat.
add('dump-apron', blk(-3200, 0, -150, 3200, 2600, 150).rotateX(-28).translate(0, 2400, Zt + 600).color(manganeseSteel));
add('apron-ore', blk(-2600, 0, 0, 2600, 1800, 300).rotateX(-28).translate(0, 2500, Zt + 780).color(ore));

// ---- Operator deck at the front with handrails and stair ----
const dz = Zt - 400;
add('operator-deck', blk(-5400, -3900, dz - 120, 5400, -3300, dz).color(structuralSteel));
add('deck-side-l', blk(-5400, -3300, dz - 120, -3800, 3600, dz).color(structuralSteel));
add('deck-side-r', blk(3800, -3300, dz - 120, 5400, 3600, dz).color(structuralSteel));
for (const x of [-5100, -2000, 2000, 5100]) add(`deck-column-${x}`, rod(120, 300, dz - 120, 8).translate(x, -3600, 0).color(structuralSteel));
for (const x of [-5300, -3500, -1700, 0, 1700, 3500, 5300]) add(`handrail-post-${x}`, rod(25, dz, dz + 1100, 6).translate(x, -3870, 0).color(stripe));
add('handrail-top', tube([-5300, -3870, dz + 1100], [5300, -3870, dz + 1100], 25, 6).color(stripe));
add('handrail-mid', tube([-5300, -3870, dz + 550], [5300, -3870, dz + 550], 20, 6).color(stripe));
// Stair down the left side of the deck to the pit floor.
for (let k = 0; k < 14; k++) {
  const z = 300 + ((dz - 300) * (k + 1)) / 15, x = -9400 + 270 * k;
  add(`stair-tread-${k}`, blk(x, -3900, z - 40, x + 300, -3300, z).color(structuralSteel));
}
add('stair-stringer', tube([-9500, -3300, 350], [-5500, -3300, dz - 80], 70, 4).color(structuralSteel));
add('stair-rail', tube([-9500, -3870, 1300], [-5400, -3870, dz + 1100], 25, 6).color(stripe));

// ---- Pedestal rock breaker on the right pit wall ----
if (rockBreaker.value === 'fitted') {
  const bx = 5000, by = 2600;
  add('breaker-pedestal', rod(450, Zd, Zd + 1300, 12).translate(bx, by, 0).color(coatedSteel));
  add('breaker-slew', rod(650, Zd + 1300, Zd + 1650, 12).translate(bx, by, 0).color(structuralSteel));
  const s = [bx, by, Zd + 1500], e = [bx - 3600, by - 1200, Zd + 3300], w = [bx - 5200, by - 2200, Zt + 400];
  add('breaker-boom', tube(s, e, 230, 6).color(coatedSteel));
  add('breaker-stick', tube(e, w, 170, 6).color(coatedSteel));
  add('boom-cylinder', tube([bx - 300, by - 100, Zd + 1300], [bx - 2200, by - 750, Zd + 2900], 90, 6).color(manganeseSteel));
  add('stick-cylinder', tube([e[0] + 500, e[1] + 150, e[2] + 400], [e[0] - 900, e[1] - 600, e[2] + 100], 70, 6).color(manganeseSteel));
  add('breaker-hammer', tube(w, [w[0] - 100, w[1] - 50, w[2] - 1300], 220, 8).color(stripe));
  add('breaker-moil', tube([w[0] - 100, w[1] - 50, w[2] - 1300], [w[0] - 130, w[1] - 65, w[2] - 1900], 70, 6).color(manganeseSteel));
  add('breaker-hose', tube([bx - 200, by, Zd + 1650], [e[0] + 200, e[1], e[2] + 300], 40, 6).color(grease));
}

return p.model();
