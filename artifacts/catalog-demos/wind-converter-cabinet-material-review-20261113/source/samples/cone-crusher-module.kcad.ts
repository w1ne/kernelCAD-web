// SPDX-License-Identifier: CC0-1.0
// Cone crusher module, the secondary/tertiary crushing stage after the jaw
// crusher. What makes it one: a squat round machine, not a box - a main frame
// bottom shell with a horizontal countershaft box sticking out the side, an
// adjustment ring ringed by clamping cylinders, the bowl and its conical
// hopper on top with a feed distributor, hydraulic tramp-release cylinders
// round the waist, and a grooved sheave driven by V-belts from a motor beside
// it. It sits on a raised steel module with a service deck and handrail, a
// hydraulic power unit, and a discharge conveyor running out underneath.
// Millimetres, Z up, countershaft along -X, discharge conveyor towards +X.
meta({
  name: "cone-crusher-module",
  license: 'CC0-1.0',
  title: "Cone crusher module",
  description: "Secondary cone crusher at about real size on a raised steel module: round main frame with a horizontal countershaft box, adjustment ring with clamping cylinders and tramp-release cylinders, bowl and conical feed hopper with distributor and ore, grooved drive sheave on V-belts from a motor on a slide base, hydraulic power unit, service deck with handrail and ladder, discharge chute and inclined conveyor carrying crushed ore. Material controls: crusher coating, module and drive steel, hydraulic chrome, belts and rubber, plus a hopper load choice (loaded, empty). weathered, highVisibility and yellowPlant presets.",
  tags: ['mining', 'mineral processing', 'crushing', 'cone crusher', 'secondary crusher', 'V-belt drive', 'conveyor', 'crushing plant'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 5200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#2f6fb0', { label: 'Crusher coating' });
const structuralSteel = param('structuralSteel', '#4b5459', { label: 'Module and drive steel' });
const stainlessSteel = param('stainlessSteel', '#c3cacc', { label: 'Hydraulic cylinder chrome' });
const rubber = param('rubber', '#25292b', { label: 'Belts and rubber' });
const hopperLoad = param('hopperLoad', 'loaded', { choices: ['loaded', 'empty'], label: 'Hopper load' });
presets({
  weathered: { coatedSteel: '#56707f', structuralSteel: '#666a66', stainlessSteel: '#9da3a3', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#cfd5d6', rubber: '#24282a' },
  yellowPlant: { coatedSteel: '#e2b01f', structuralSteel: '#2d3134', stainlessSteel: '#c3cacc', rubber: '#1d2022' },
});

const p = assembly("cone-crusher-module");
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

const rock = '#8a7d6c', rockDark = '#6f6457', dark = '#1e2123', warn = '#e8c21e';
const Zb = 2600; // crusher seat on the module
const Z = (z) => Zb + z;

// ---- Raised steel module ----
for (const [x, y] of [[-1500, -1500], [-1500, 1500], [1500, -1500], [1500, 1500]]) {
  add(`module-column-${x}-${y}`, blk(x - 150, y - 150, 0, x + 150, y + 150, Zb).color(structuralSteel));
  add(`column-base-${x}-${y}`, blk(x - 300, y - 300, 0, x + 300, y + 300, 50).color(structuralSteel));
}
for (const y of [-1500, 1500]) add(`ring-beam-x-${y}`, blk(-1650, y - 160, Zb - 450, 1650, y + 160, Zb).color(structuralSteel));
for (const x of [-1500, 1500]) add(`ring-beam-y-${x}`, blk(x - 160, -1650, Zb - 450, x + 160, 1650, Zb).color(structuralSteel));
for (const [k, [a, b]] of [[[-1500, -1500, 300], [1500, -1500, Zb - 450]], [[-1500, 1500, 300], [1500, 1500, Zb - 450]]].entries()) {
  add(`module-brace-${k}`, tube(a, b, 70, 6).color(structuralSteel));
}

// ---- Crusher: main frame, adjustment ring, bowl and hopper ----
add('main-frame', lathe([[1150, Z(0)], [1150, Z(650)], [1350, Z(850)]], 20).color(coatedSteel));
add('main-frame-flange', rod(1450, Z(-60), Z(80), 20).color(coatedSteel));
for (let k = 0; k < 4; k++) {
  add(`frame-rib-${k}`, blk(1100, -70, Z(80), 1420, 70, Z(780)).rotateZ(45 + 90 * k).color(coatedSteel));
}
add('adjustment-ring', rod(1600, Z(850), Z(1120), 24).color(coatedSteel));
add('bowl', lathe([[1300, Z(1120)], [1150, Z(1500)], [700, Z(1750)]], 20).color(coatedSteel));
add('bowl-cap', rod(720, Z(1750), Z(1820), 20).color(structuralSteel));
add('feed-hopper', lathe([[650, Z(1820)], [650, Z(2000)], [1250, Z(2750)]], 16)
  .subtract(lathe([[560, Z(1900)], [560, Z(2050)], [1160, Z(2800)]], 16)).color(coatedSteel));
add('hopper-rim', lathe([[1300, Z(2720)], [1300, Z(2800)]], 16)
  .subtract(lathe([[1160, Z(2700)], [1160, Z(2820)]], 16)).color(structuralSteel));
add('feed-distributor', lathe([[350, Z(2050)], [150, Z(2250)]], 10).color(stainlessSteel));
if (hopperLoad.value === 'loaded') {
  add('ore-in-hopper', lathe([[1120, Z(2550)], [700, Z(2820)], [200, Z(2950)]], 12).color(rock));
  for (const [k, a] of [0, 70, 150, 220, 300].entries()) {
    add(`ore-lump-${k}`, sphere(140).translate(Math.cos((a * Math.PI) / 180) * 650, Math.sin((a * Math.PI) / 180) * 650, Z(2780)).color(rockDark));
  }
}
// Clamping cylinders standing round the adjustment ring.
for (let k = 0; k < 10; k++) {
  const a = (2 * Math.PI * (k + 0.5)) / 10;
  const x = Math.cos(a) * 1500, y = Math.sin(a) * 1500;
  add(`clamp-cylinder-${k}`, rod(80, Z(1120), Z(1380), 8).translate(x, y, 0).color(stainlessSteel));
}
// Tramp-release cylinders round the waist, between the frame flange and the ring.
for (let k = 0; k < 8; k++) {
  const a = (2 * Math.PI * k) / 8 + 0.2;
  const x = Math.cos(a) * 1420, y = Math.sin(a) * 1420;
  add(`tramp-cylinder-${k}`, rod(110, Z(250), Z(820), 8).translate(x, y, 0).color(warn));
  add(`tramp-rod-${k}`, rod(55, Z(80), Z(250), 6).translate(x, y, 0).color(stainlessSteel));
}
add('adjustment-motor', blk(-400, -1950, Z(900), 400, -1650, Z(1250)).color(structuralSteel));
add('lock-hose-loop', tube([300, -1700, Z(1000)], [1100, -1450, Z(700)], 35, 6).color(rubber));

// ---- Countershaft box, sheave and V-belt drive (towards -X) ----
const sz = Z(350);
add('countershaft-box', latheX([[330, -2300], [330, -1100]], 0, sz, 12).color(coatedSteel));
add('countershaft-housing', blk(-1800, -420, Z(0), -1150, 420, Z(700)).color(coatedSteel));
add('countershaft', latheX([[110, -2650], [110, -2300]], 0, sz, 10).color(stainlessSteel));
const sheave = (y, z, r, name) => {
  add(`${name}`, latheX([[r, -2800], [r, -2400]], y, z, 20).color(structuralSteel));
  for (const x of [-2730, -2630, -2530, -2430]) add(`${name}-groove-${x}`, latheX([[r - 40, x], [r - 40, x + 30]], y, z, 20).color(dark));
};
sheave(0, sz, 750, 'crusher-sheave');
const my = -2700, mz = 1200;
sheave(my, mz, 300, 'motor-sheave');
for (const x of [-2730, -2630, -2530, -2430]) {
  add(`v-belt-top-${x}`, tube([x + 15, 0, sz + 750], [x + 15, my, mz + 300], 22, 4).color(rubber));
  add(`v-belt-bottom-${x}`, tube([x + 15, 0, sz - 750], [x + 15, my, mz - 300], 22, 4).color(rubber));
}
add('motor', latheX([[520, -2350], [600, -2200], [600, -800], [480, -650]], my, mz, 16).color(structuralSteel));
for (let x = -2100; x < -900; x += 180) add(`motor-fin-${x}`, latheX([[660, x], [660, x + 50]], my, mz, 16).color(structuralSteel));
add('motor-slide-base', blk(-2500, my - 650, 0, -500, my + 650, mz - 600).color(structuralSteel));
add('motor-terminal-box', blk(-1700, my - 300, mz + 550, -1200, my + 300, mz + 850).color(structuralSteel));

// ---- Hydraulic power unit and service deck (+Y side) ----
add('service-deck', blk(-1800, 1700, Zb, 1800, 2700, Zb + 60).color(structuralSteel));
add('hydraulic-unit', blk(-1200, 1850, Zb + 60, 0, 2550, Zb + 900).color(structuralSteel));
add('hydraulic-tank-cap', blk(-1100, 1950, Zb + 900, -100, 2450, Zb + 960).color(coatedSteel));
add('accumulator', rod(130, Zb + 60, Zb + 1100, 10).translate(500, 2200, 0).color(warn));
add('hydraulic-hose', tube([0, 1850, Zb + 500], [900, 1100, Z(500)], 30, 6).color(rubber));
for (const x of [-1750, 0, 1750]) add(`handrail-post-${x}`, rod(25, Zb + 60, Zb + 1160, 6).translate(x, 2650, 0).color(warn));
add('handrail-top', tube([-1750, 2650, Zb + 1160], [1750, 2650, Zb + 1160], 25, 6).color(warn));
add('handrail-mid', tube([-1750, 2650, Zb + 610], [1750, 2650, Zb + 610], 20, 6).color(warn));
for (const x of [1500, 1900]) add(`ladder-rail-${x}`, rod(25, 0, Zb + 1000, 6).translate(x, 2800, 0).color(warn));
for (let z = 300; z < Zb; z += 300) add(`ladder-rung-${z}`, tube([1500, 2800, z], [1900, 2800, z], 18, 4).color(warn));

// ---- Discharge chute and conveyor (towards +X) ----
add('discharge-chute', lathe([[500, 900], [900, Zb - 450]], 8).color(structuralSteel));
const cz0 = 650, cz1 = 2600, cx0 = -900, cx1 = 6500;
const slope = Math.atan2(cz1 - cz0, cx1 - cx0);
const along = (t, dz = 0) => [cx0 + (cx1 - cx0) * t, cz0 + (cz1 - cz0) * t + dz];
for (const y of [-650, 650]) {
  const [xa, za] = along(0), [xb, zb] = along(1);
  add(`conveyor-stringer-${y}`, tube([xa, y, za], [xb, y, zb], 90, 4).color(structuralSteel));
}
const len = Math.hypot(cx1 - cx0, cz1 - cz0);
add('conveyor-belt', blk(0, -550, 40, len, 550, 110).rotateY((-slope * 180) / Math.PI).translate(cx0, 0, cz0).color(rubber));
add('ore-on-belt', path().moveTo(-420, 110).lineTo(420, 110).lineTo(150, 260).lineTo(-150, 280).close()
  .extrude(len - 1300).rotateX(90).rotateZ(90).translate(1300, 0, 0).rotateY((-slope * 180) / Math.PI).translate(cx0, 0, cz0).color(rock));
add('head-pulley', latheX([[260, -300], [260, 300]], 0, 0, 12).rotateZ(90).translate(cx1, 0, cz1 + 80).color(structuralSteel));
for (const [k, t] of [0.35, 0.75].entries()) {
  const [x, z] = along(t);
  for (const y of [-650, 650]) add(`conveyor-leg-${k}-${y}`, rod(60, 0, z - 40, 6).translate(x, y, 0).color(structuralSteel));
}

return p.model();
