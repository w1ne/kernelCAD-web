// SPDX-License-Identifier: CC0-1.0
// Pedestal rock breaker, the fixed hydraulic boom that stands beside a
// grizzly or crusher feed pocket and smashes the boulders too big to fall
// through. What makes it one: a steel pedestal bolted to a concrete plinth
// with a slewing turret on top, a tapered main boom and a stick hinged like
// an excavator arm, worked by fat hydraulic cylinders, ending in a
// hydraulic hammer whose chisel comes straight down onto the rock. The
// grizzly beside it is a row of heavy steel bars over a pit between
// concrete walls, with oversize boulders lying on the bars. A hydraulic
// power unit sits on the ground behind the plinth with the hose bundle
// running up the pedestal and along the boom.
// Two yellow warning posts are bolted through base plates into the long pit wall.
// Millimetres, Z up, grizzly towards +X.
meta({
  name: "rock-breaker-boom",
  license: 'CC0-1.0',
  title: "Pedestal rock breaker",
  description: "Pedestal rock-breaker system at about real size: concrete plinth with anchor-bolted base plate, tapered steel pedestal, slewing ring and turret with slew cylinders, tapered main boom and stick with boom, stick and tool cylinders, hydraulic hammer with chisel, hose bundle along the boom, hydraulic power unit with motor, oil cooler and tank, remote control station, and a grizzly of heavy steel bars over an ore pit between concrete walls carrying oversize boulders, one under the chisel. Two yellow warning posts stand on bolted base plates centered on the long pit wall. Material controls: boom paint, pedestal and grizzly steel, hammer steel and concrete, plus a pose choice (working with the chisel on a boulder, parked folded over the plinth). weathered, safetyYellow and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'crushing', 'rock breaker', 'hydraulic hammer', 'grizzly', 'pedestal boom', 'oversize'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const boomPaint = param('boomPaint', '#d9831f', { label: 'Boom paint' });
const steelwork = param('steelwork', '#4b5459', { label: 'Pedestal and grizzly steel' });
const hammerSteel = param('hammerSteel', '#3a3f42', { label: 'Hammer steel' });
const concrete = param('concrete', '#a9a49a', { label: 'Concrete' });
const pose = param('pose', 'working', { choices: ['working', 'parked'], label: 'Pose' });
presets({
  weathered: { boomPaint: '#8a7458', steelwork: '#5f625f', hammerSteel: '#4a4642', concrete: '#8f8a80' },
  safetyYellow: { boomPaint: '#e9b821', steelwork: '#33383b', hammerSteel: '#2b2f31', concrete: '#b5b0a6' },
  highVisibility: { boomPaint: '#f08a1c', steelwork: '#465159', hammerSteel: '#3a3f42', concrete: '#c2beb4' },
});

const p = assembly("rock-breaker-boom");
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
// Round bar along Y from y0 to y1, centred on (x, z).
const cylY = (r, y0, y1, x, z, n = 12) => rod(r, -y1, -y0, n).rotateX(90).translate(x, 0, z);
// Round bar from point a to point b.
const tube = (a, b, r, n = 8) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// (x, z) outline extruded along Y, centred on y = 0.
const profileXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
// Hydraulic cylinder from a to b: barrel for the first 55 %, rod for the rest.
const ram = (name, a, b, r) => {
  const m = [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * 0.55);
  add(`${name}-barrel`, tube(a, m, r, 10).color(boomPaint));
  add(`${name}-rod`, tube(m, b, r * 0.55, 8).color('#c9ced0'));
};

const rock = '#8a7d6c', rockDark = '#6f6457', pit = '#3b3732', hose = '#25292b', warn = '#e8c21e';
const working = pose.value === 'working';
const Z0 = 1200; // plinth and grizzly top

// ---- Concrete plinth and pedestal ----
add('plinth', blk(-1500, -1500, 0, 1500, 1500, Z0).color(concrete));
add('base-plate', blk(-900, -900, Z0, 900, 900, Z0 + 60).color(steelwork));
for (const [k, [x, y]] of [[-750, -750], [750, -750], [-750, 750], [750, 750]].entries()) {
  add(`anchor-nut-${k}`, rod(55, Z0 + 60, Z0 + 140, 6).translate(x, y, 0).color(hammerSteel));
}
add('pedestal', lathe([[620, Z0 + 60], [460, Z0 + 600], [420, Z0 + 1700]], 12).color(steelwork));
add('slew-ring', rod(620, Z0 + 1700, Z0 + 1860, 16).color(hammerSteel));
add('turret', profileXZ([[-500, Z0 + 1860], [900, Z0 + 1860], [900, Z0 + 2200], [300, Z0 + 2500], [-500, Z0 + 2500]], 900).color(boomPaint));
for (const [k, s] of [-1, 1].entries()) {
  add(`slew-cylinder-${k}`, tube([-650, s * 450, Z0 + 1750], [200, s * 650, Z0 + 1950], 80, 8).color(boomPaint));
  add(`turret-cheek-${k}`, blk(-100, s * 450 - (s > 0 ? 0 : 80), Z0 + 2200, 700, s * 450 + (s > 0 ? 80 : 0), Z0 + 2800).color(boomPaint));
}

// ---- Boom, stick and hammer ----
const F = [300, Z0 + 2600]; // boom foot pin
const LB = 4200, LS = 3000, LH = 2000;
const bA = working ? 30 : 75;
const bEnd = [F[0] + LB * Math.cos((bA * Math.PI) / 180), F[1] + LB * Math.sin((bA * Math.PI) / 180)];
// Working: the stick drops so the hammer hangs straight down onto the boulder.
const hammerTipZ = Z0 + 840;
const sA = working ? -(Math.asin((bEnd[1] - (hammerTipZ + LH)) / LS) * 180) / Math.PI : -100;
const sEnd = [bEnd[0] + LS * Math.cos((sA * Math.PI) / 180), bEnd[1] + LS * Math.sin((sA * Math.PI) / 180)];
const member = (len, h0, h1, w, ang, at) => profileXZ([[0, -h0 / 2], [len, -h1 / 2], [len, h1 / 2], [0, h0 / 2]], w).rotateY(-ang).translate(at[0], 0, at[1]);
const local = (at, ang, u, w) => {
  const a = (ang * Math.PI) / 180;
  return [at[0] + u * Math.cos(a) - w * Math.sin(a), at[1] + u * Math.sin(a) + w * Math.cos(a)];
};
add('boom', member(LB, 700, 450, 520, bA, F).color(boomPaint));
add('boom-foot-pin', cylY(130, -520, 520, F[0], F[1], 10).color(hammerSteel));
add('stick', member(LS + 600, 520, 380, 420, sA, local(bEnd, sA, -600, 0)).color(boomPaint));
add('stick-pin', cylY(110, -380, 380, bEnd[0], bEnd[1], 10).color(hammerSteel));
const bc1 = local(F, bA, 1700, -350);
ram('boom-cylinder', [700, 0, Z0 + 2050], [bc1[0], 0, bc1[1]], 130);
const sc0 = local(F, bA, 1300, 350), sc1 = local(bEnd, sA, -600, 200);
ram('stick-cylinder', [sc0[0], 0, sc0[1]], [sc1[0], 0, sc1[1]], 110);
// Hammer hangs from the stick tip on a bracket.
const hTop = sEnd[1], hx = sEnd[0];
add('hammer-bracket', blk(hx - 330, -260, hTop - 350, hx + 330, 260, hTop + 80).color(boomPaint));
add('hammer-body', blk(hx - 260, -230, hTop - 1500, hx + 260, 230, hTop - 350).color(hammerSteel));
add('hammer-front-head', lathe([[210, hTop - 1700], [230, hTop - 1500]], 10).translate(hx, 0, 0).color(hammerSteel));
add('chisel', lathe([[30, hTop - LH], [80, hTop - LH + 120], [80, hTop - 1700]], 8).translate(hx, 0, 0).color('#c9ced0'));
const tilt0 = local(bEnd, sA, LS - 900, -260);
ram('tool-cylinder', [tilt0[0], 0, tilt0[1]], [hx - 280, 0, hTop - 150], 80);
// Hose bundle from the pedestal along the boom and stick.
const hb = [local(F, bA, 200, 380), local(F, bA, LB - 200, 300), local(bEnd, sA, LS - 300, 260)];
add('hose-up-pedestal', tube([-450, 300, Z0 + 200], [-450, 300, Z0 + 2000], 60, 6).color(hose));
add('hose-to-boom', tube([-450, 300, Z0 + 2000], [hb[0][0], 300, hb[0][1]], 60, 6).color(hose));
add('hose-boom', tube([hb[0][0], 300, hb[0][1]], [hb[1][0], 300, hb[1][1]], 60, 6).color(hose));
add('hose-stick', tube([hb[1][0], 300, hb[1][1]], [hb[2][0], 300, hb[2][1]], 60, 6).color(hose));

// ---- Grizzly: heavy bars over an ore pit between concrete walls ----
const GX0 = 3800, GX1 = 9200;
for (const [k, y] of [-1600, 1600].entries()) add(`pit-wall-${k}`, blk(GX0, y - 200, 0, GX1, y + 200, Z0).color(concrete));
add('pit-end-wall', blk(GX1, -1800, 0, GX1 + 400, 1800, Z0 + 600).color(concrete));
add('pit-ore', blk(GX0, -1400, 0, GX1, 1400, 500).color(pit));
for (const [k, x] of [GX0 + 150, GX1 - 150].entries()) add(`grizzly-crossbeam-${k}`, blk(x - 150, -1600, Z0 - 300, x + 150, 1600, Z0 - 100).color(steelwork));
for (let i = 0; i < 9; i++) {
  const y = -1200 + i * 300;
  add(`grizzly-bar-${i}`, blk(GX0, y - 60, Z0 - 100, GX1, y + 60, Z0).color(steelwork));
}
add('boulder-target', sphere(560).scale([1.15, 1, 0.75]).translate(working ? hx : 6600, 0, Z0 + 420).color(rock));
add('boulder-2', sphere(420).scale([1.2, 1, 0.8]).translate(8200, -800, Z0 + 336).color(rockDark));
add('boulder-3', sphere(360).scale([1, 1.2, 0.8]).translate(5200, 900, Z0 + 288).color(rock));
const warningPostY = 1600;
for (const [k, x] of [4300, 8800].entries()) {
  add(`warning-post-base-${k}`, blk(x - 120, warningPostY - 120, Z0, x + 120, warningPostY + 120, Z0 + 60).color(steelwork));
  for (const [j, [dx, dy]] of [[-80, -80], [80, -80], [-80, 80], [80, 80]].entries()) {
    add(`warning-post-anchor-${k}-${j}`, rod(18, Z0 - 100, Z0 + 60, 6).translate(x + dx, warningPostY + dy, 0).color(hammerSteel));
    add(`warning-post-anchor-nut-${k}-${j}`, rod(28, Z0 + 60, Z0 + 95, 6).translate(x + dx, warningPostY + dy, 0).color(hammerSteel));
  }
  add(`warning-post-${k}`, rod(50, Z0 + 60, Z0 + 1600, 6).translate(x, warningPostY, 0).color(warn));
}

// ---- Hydraulic power unit and remote control station ----
add('hpu-skid', blk(-4400, -1200, 0, -1800, 1200, 150).color(steelwork));
add('hpu-tank', blk(-4200, -1000, 150, -2900, 1000, 1300).color(boomPaint));
add('hpu-motor', cylY(380, -900, 500, -2350, 650, 12).color(steelwork));
add('hpu-pump', cylY(220, 500, 900, -2350, 650, 10).color(hammerSteel));
add('oil-cooler', blk(-4300, -1100, 1300, -3000, 1100, 1450).color(hammerSteel));
add('hpu-hose', tube([-2900, 300, 900], [-1500, 300, 200], 60, 6).color(hose));
add('control-station', blk(-1300, -2600, 0, -500, -1900, 1400).color(steelwork));
add('control-window', blk(-1250, -1890, 900, -550, -1880, 1300).color('#7fa6b8'));
add('control-roof', blk(-1400, -2700, 1400, -400, -1800, 1480).color(boomPaint));

return p.model();
