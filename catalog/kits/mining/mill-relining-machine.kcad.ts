// SPDX-License-Identifier: CC0-1.0
// Mill relining machine, the rail-mounted manipulator that carries worn and
// new liner plates in and out of a grinding mill through its feed opening.
// What makes one: a long box-section boom with a telescopic inner stage
// that reaches into the mill, a rotating wrist on the end with a hydraulic
// grab clamped onto a curved liner plate by its lifter bar, and a slewing
// pedestal on a wheeled carriage that runs on rails up to the mill. Around
// it: boom lift cylinders, a tail counterweight, a hydraulic power unit
// with hoses run along the boom, an operator cab with a beacon, and
// handrails round the carriage deck.
// The reach choice slides the inner boom stage; the load choice puts a
// liner plate in the grab or leaves it empty.
// Millimetres, Z up, boom pointing along +X towards the mill.
meta({
  name: "mill-relining-machine",
  license: 'CC0-1.0',
  title: "Mill relining machine",
  description: "Rail-mounted mill relining machine at about real size: wheeled carriage on two rails and sleepers, slewing ring and pedestal, 7 m box-section boom with a telescopic inner stage, two boom lift cylinders, rotating wrist and hydraulic grab holding a curved liner plate by its lifter bar, tail counterweight, hydraulic power unit with hoses run along the boom, operator cab with windows and beacon, and deck handrails. Reach choice (retracted, extended) slides the inner stage; load choice (liner, empty) fills the grab. Material controls: machine paint, frame steel, hydraulic hose and liner steel. weathered, safetyOrange and whiteFleet presets.",
  tags: ['mining', 'grinding mill', 'mill relining', 'liner handler', 'manipulator', 'maintenance', 'mineral processing'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const reach = param('reach', 'extended', { choices: ['retracted', 'extended'], label: 'Boom reach' });
const load = param('load', 'liner', { choices: ['liner', 'empty'], label: 'Grab load' });
const machinePaint = param('machinePaint', '#e3a21a', { label: 'Machine paint' });
const frameSteel = param('frameSteel', '#4f5a61', { label: 'Frame steel' });
const hose = param('hose', '#24272a', { label: 'Hydraulic hose' });
const linerSteel = param('linerSteel', '#7c7a74', { label: 'Liner steel' });
presets({
  weathered: { machinePaint: '#a98a4a', frameSteel: '#5f5b55', hose: '#33312e', linerSteel: '#7a5e48' },
  safetyOrange: { machinePaint: '#e2661c', frameSteel: '#3b4248', hose: '#202326', linerSteel: '#8a8c8d' },
  whiteFleet: { machinePaint: '#e9e9e4', frameSteel: '#2f5f8e', hose: '#26292b', linerSteel: '#6f6d68' },
});

const p = assembly("mill-relining-machine");
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
const blk = (x0, y0, z0, x1, y1, z1) => box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
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
// Closed (y, z) outline extruded along X from x0 to x1.
const prismX = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};
// Closed (x, z) outline extruded across Y from y0 to y1.
const prismY = (pts, y0, y1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [a, b] of pts.slice(1)) o = o.lineTo(a, b);
  return o.close().extrude(y1 - y0).rotateX(90).translate(0, y1, 0);
};

const concrete = '#9c978d', chrome = '#c9cdd0', glass = '#2d4655', rail = '#e8c21e';
const RY = 1000; // rail half gauge
const ZD = 900; // carriage deck top
const ZB = 2400; // boom underside at the pivot
const ext = reach.value === 'extended' ? 3600 : 900;
const XT = 4000 + ext; // inner stage tip

// ---- Track ----
for (let x = -3500, i = 0; x <= 1900; x += 700, i++) add(`sleeper-${i}`, blk(x - 150, -1350, 0, x + 150, 1350, 140).color(concrete));
for (const [k, s] of [-1, 1].entries()) {
  add(`rail-${k}`, blk(-3700, s * RY - 40, 140, 2100, s * RY + 40, 260).color(frameSteel));
  add(`rail-foot-${k}`, blk(-3700, s * RY - 80, 140, 2100, s * RY + 80, 165).color(frameSteel));
}

// ---- Carriage ----
add('carriage-frame', blk(-3200, -1250, 560, 1600, 1250, ZD).color(machinePaint));
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, x] of [-2650, 1050].entries()) {
    add(`wheel-${k}-${j}`, latheY([[250, s * RY - 70], [250, s * RY + 70]], x, 510, 14).color(frameSteel));
    const yi = s * (RY - 70), yf = s * (RY - 95);
    add(`wheel-flange-${k}-${j}`, latheY([[285, Math.min(yi, yf)], [285, Math.max(yi, yf)]], x, 510, 14).color(frameSteel));
    const yo = s * (RY + 90), yb = s * (RY + 200);
    add(`bogie-${k}-${j}`, blk(x - 420, Math.min(yo, yb), 360, x + 420, Math.max(yo, yb), 760).color(machinePaint));
  }
}

// ---- Slewing pedestal ----
add('slew-ring', rod(1000, ZD, ZD + 110, 24).translate(-300, 0, 0).color(frameSteel));
add('slew-table', rod(1080, ZD + 110, ZD + 180, 24).translate(-300, 0, 0).color(machinePaint));
add('pedestal', prismY([[-1300, ZD + 180], [700, ZD + 180], [150, ZB], [-750, ZB]], -600, 600).color(machinePaint));
add('boom-pin', latheY([[150, -720], [150, 720]], -300, ZB + 150, 12).color(chrome));

// ---- Boom ----
add('boom', blk(-3000, -380, ZB, 4000, 380, ZB + 700).color(machinePaint));
for (let x = -2000, i = 0; x <= 3000; x += 1000, i++) add(`boom-band-${i}`, blk(x - 40, -400, ZB - 20, x + 40, 400, ZB + 720).color(frameSteel));
add('boom-nose', blk(3900, -420, ZB - 40, 4100, 420, ZB + 740).color(frameSteel));
add('inner-stage', blk(3600, -290, ZB + 80, XT, 290, ZB + 620).color(frameSteel));
add('tail-counterweight', blk(-3600, -650, ZB - 450, -3000, 650, ZB + 900).color(frameSteel));
for (const [k, s] of [-1, 1].entries()) {
  // Lift cylinder: barrel from the carriage, chrome rod up to the boom.
  add(`lift-barrel-${k}`, tube([-1500, s * 520, ZD + 120], [200, s * 520, ZB - 200], 120, 10).color(machinePaint));
  add(`lift-rod-${k}`, tube([200, s * 520, ZB - 200], [1400, s * 520, ZB + 80], 70, 10).color(chrome));
  add(`lift-clevis-${k}`, blk(1250, s * 520 - 120, ZB - 80, 1550, s * 520 + 120, ZB + 40).color(frameSteel));
  add(`lift-foot-${k}`, blk(-1700, s * 520 - 140, ZD, -1300, s * 520 + 140, ZD + 260).color(frameSteel));
  // Hose pair run along the top of the boom to the wrist.
  add(`boom-hose-${k}`, tube([-1800, s * 180, ZB + 760], [XT - 200, s * 180, ZB + 760], 32, 6).color(hose));
}
for (let x = -1500, i = 0; x <= 3500; x += 1250, i++) add(`hose-clamp-${i}`, blk(x - 40, -260, ZB + 700, x + 40, 260, ZB + 800).color(frameSteel));

// ---- Wrist, grab and liner ----
const ZW = ZB + 350;
add('wrist-housing', latheX([[430, XT], [430, XT + 380]], 0, ZW, 16).color(machinePaint));
add('rotator-ring', latheX([[500, XT + 380], [500, XT + 460]], 0, ZW, 16).color(frameSteel));
add('grab-frame', blk(XT + 460, -650, ZW - 650, XT + 760, 650, ZW + 300).color(machinePaint));
add('grab-beam', blk(XT + 460, -350, ZW - 900, XT + 2000, 350, ZW - 650).color(machinePaint));
const ZL = ZW - 1850; // liner plate underside at its centre line
for (const [k, s] of [-1, 1].entries()) {
  for (const [j, x] of [XT + 800, XT + 1650].entries()) {
    add(`jaw-${k}-${j}`, blk(x - 110, s * 140, ZL + 330, x + 110, s * 300, ZW - 900).color(frameSteel));
    add(`jaw-cylinder-${k}-${j}`, tube([x, s * 520, ZW - 700], [x, s * 260, ZL + 700], 55, 8).color(chrome));
  }
}
if (load.value === 'liner') {
  // Curved shell liner: convex outer face down, lifter bar along the top.
  const R = 2800, half = 420, steps = 6;
  const outer = [], inner = [];
  for (let i = 0; i <= steps; i++) {
    const y = -half + (2 * half * i) / steps;
    const sag = R - Math.sqrt(R * R - y * y);
    outer.push([y, ZL + sag]);
    inner.push([y, ZL + sag + 130]);
  }
  add('liner-plate', prismX([...outer, ...inner.reverse()], XT + 400, XT + 2100).color(linerSteel));
  add('liner-lifter', prismX([[-110, ZL + 120], [110, ZL + 120], [80, ZL + 330], [-80, ZL + 330]], XT + 400, XT + 2100).color(linerSteel));
  for (const [j, x] of [XT + 700, XT + 1800].entries()) add(`liner-bolt-${j}`, rod(28, ZL - 90, ZL + 10, 6).translate(x, 0, 0).color(frameSteel));
}

// ---- Operator cab ----
add('cab', blk(-2300, -1300, ZD, -950, -560, ZD + 2050).color(machinePaint));
add('cab-roof', blk(-2380, -1360, ZD + 2050, -870, -500, ZD + 2140).color(frameSteel));
add('cab-window-front', blk(-950, -1240, ZD + 1050, -935, -620, ZD + 1900).color(glass));
add('cab-window-side', blk(-2220, -1315, ZD + 1050, -1030, -1300, ZD + 1900).color(glass));
add('cab-door', blk(-1900, -1318, ZD + 80, -1350, -1300, ZD + 1000).color(frameSteel));
add('beacon-base', rod(70, ZD + 2140, ZD + 2200, 8).translate(-1600, -930, 0).color(frameSteel));
add('beacon', lathe([[60, ZD + 2200], [60, ZD + 2320], [30, ZD + 2370]], 8).translate(-1600, -930, 0).color('#ff8a1e'));

// ---- Hydraulic power unit ----
add('hpu', blk(-3100, 350, ZD, -1500, 1200, ZD + 1150).color(frameSteel));
add('hpu-tank', blk(-3050, 400, ZD + 1150, -2200, 1150, ZD + 1450).color(machinePaint));
for (let i = 0; i < 6; i++) add(`hpu-grille-${i}`, blk(-1500, 450 + i * 120, ZD + 300, -1480, 500 + i * 120, ZD + 1000).color(hose));
add('hpu-motor', latheX([[230, -2150], [230, -1650]], 780, ZD + 1400, 12).color('#3d6f9a'));
add('hpu-hose-a', tube([-1700, 600, ZD + 1150], [-700, 260, ZB + 700], 38, 6).color(hose));
add('hpu-hose-b', tube([-1700, 900, ZD + 1150], [-700, -260, ZB + 700], 38, 6).color(hose));

// ---- Deck handrails ----
for (const [k, s] of [-1, 1].entries()) {
  const y = s * 1230;
  const x0 = s < 0 ? -900 : -1400;
  for (const [j, z] of [ZD + 1000, ZD + 520].entries()) add(`handrail-${k}-${j}`, tube([x0, y, z], [1550, y, z], 22, 6).color(rail));
  for (const [j, x] of [x0, (x0 + 1550) / 2, 1550].entries()) add(`handrail-post-${k}-${j}`, rod(24, ZD, ZD + 1000, 6).translate(x, y, 0).color(rail));
}
add('handrail-front-top', tube([1550, -1230, ZD + 1000], [1550, 1230, ZD + 1000], 22, 6).color(rail));
add('handrail-front-mid', tube([1550, -1230, ZD + 520], [1550, 1230, ZD + 520], 22, 6).color(rail));

return p.model();
