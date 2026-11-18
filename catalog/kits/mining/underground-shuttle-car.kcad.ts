// SPDX-License-Identifier: CC0-1.0
// Underground shuttle car, the low electric haul truck that ferries coal
// from the continuous miner to the feeder-breaker. What makes it one: a very
// low, wide steel tub with no tipping body. A chain conveyor runs along the
// floor of the tub, so the miner loads it over the low front end and it
// unloads itself out of the raised discharge boom at the back. Four big
// rubber tyres sit in arches cut into the side boards, the operator rides
// sideways in a canopied pocket in one side, and an electric cable reel on
// the other side pays out the trailing cable as it drives.
// Millimetres, Z up, loading end towards +X, discharge boom towards -X.
meta({
  name: "underground-shuttle-car",
  license: 'CC0-1.0',
  title: "Underground shuttle car",
  description: "Electric underground shuttle car at about real size: low wide tub with side boards cut out over four rubber tyres, chain conveyor bed with flight bars running from the low loading end up the raised discharge boom, head shaft and discharge lip, side-sitting operator pocket with seat, steering wheel and canopy on posts, cable reel with spooling guide and trailing cable, traction motor housings, hydraulic tank, bumpers and headlights at both ends. Material controls: body paint, chassis steel, conveyor wear steel and tyre rubber, plus a load choice (loaded with a coal heap, empty). weathered, joyWhite and highVisibility presets.",
  tags: ['mining', 'underground', 'coal', 'shuttle car', 'haulage', 'room and pillar', 'chain conveyor', 'mining vehicle'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'underground', 'industrial', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bodyPaint = param('bodyPaint', '#d8a531', { label: 'Body paint' });
const chassisSteel = param('chassisSteel', '#4b5459', { label: 'Chassis steel' });
const conveyorSteel = param('conveyorSteel', '#8f9491', { label: 'Conveyor wear steel' });
const tyreRubber = param('tyreRubber', '#232628', { label: 'Tyre rubber' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Load' });
presets({
  weathered: { bodyPaint: '#8f7a52', chassisSteel: '#5f625f', conveyorSteel: '#77706a', tyreRubber: '#38393a' },
  joyWhite: { bodyPaint: '#e6e2d6', chassisSteel: '#33383b', conveyorSteel: '#a3a7a4', tyreRubber: '#1f2224' },
  highVisibility: { bodyPaint: '#f08a1c', chassisSteel: '#465159', conveyorSteel: '#b0b5b2', tyreRubber: '#24282a' },
});

const p = assembly("underground-shuttle-car");
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

const coal = '#222327', coalLit = '#3d3f45', lamp = '#fff1b0', warn = '#e8c21e', seat = '#2f3436';
const OX0 = -1100, OX1 = 550; // operator pocket between the wheels
const RT = 540, WX = [-2400, 2500], YB = 1660; // tyre radius, axle x, side board centre y

// ---- Tyres and hubs: flat spot at z = 0 ----
for (const [i, x] of WX.entries()) {
  for (const [j, s] of [-1, 1].entries()) {
    const y0 = s < 0 ? -1600 : 1150, y1 = s < 0 ? -1150 : 1600;
    add(`tyre-${i}-${j}`, cylY(RT, y0, y1, x, RT - 3, 16).subtract(blk(x - 700, y0 - 10, -300, x + 700, y1 + 10, 0)).color(tyreRubber));
    for (const [t, dy] of [0.25, 0.75].entries()) {
      add(`tyre-tread-${i}-${j}-${t}`, cylY(RT + 15, y0 + (y1 - y0) * dy - 40, y0 + (y1 - y0) * dy + 40, x, RT - 3, 16).subtract(blk(x - 700, y0 - 10, -300, x + 700, y1 + 10, 5)).color(tyreRubber));
    }
    const yf0 = s < 0 ? -1760 : 1150, yf1 = s < 0 ? -1150 : 1760;
    add(`fender-${i}-${j}`, cylY(RT + 170, yf0, yf1, x, RT - 3, 16).subtract(cylY(RT + 90, yf0 - 10, yf1 + 10, x, RT - 3, 16)).subtract(blk(x - 800, yf0 - 20, -500, x + 800, yf1 + 20, RT + 150)).color(bodyPaint));
    const yh = s < 0 ? -1620 : 1580;
    add(`wheel-hub-${i}-${j}`, cylY(300, Math.min(yh, yh + 40), Math.max(yh, yh + 40), x, RT - 3, 10).color(conveyorSteel));
    add(`traction-motor-${i}-${j}`, blk(x - 450, s * 1150 - (s > 0 ? 350 : 0), 350, x + 450, s * 1150 + (s < 0 ? 350 : 0), 850).color(chassisSteel));
  }
}

// ---- Chassis ----
add('chassis', blk(-3700, -1150, 380, 3700, 1150, 860).color(chassisSteel));
for (const [k, s] of [-1, 1].entries()) {
  const x = s * 4150;
  add(`bumper-${k}`, blk(x - 150, -1500, 450, x + 150, 1500, 750).color(warn));
  for (const [j, y] of [-1100, 1100].entries()) add(`headlight-${k}-${j}`, blk(x + s * 150 - 30, y - 100, 650, x + s * 150 + 30, y + 100, 750).color(lamp));
}

// ---- Tub: side boards with wheel arches, conveyor bed and discharge boom ----
const board = [[4300, 760], [4300, 1350], [3200, 1650], [-2900, 1650], [-4300, 2250], [-4450, 2100], [-4450, 1650], [-3000, 760]];
for (const [k, s] of [-1, 1].entries()) {
  let side = profileXZ(board, 160);
  for (const x of WX) side = side.subtract(cylY(RT + 90, -200, 200, x, RT - 3, 16));
  if (s < 0) side = side.subtract(blk(OX0, -200, 1000, OX1, 200, 1800)); // operator pocket
  add(`side-board-${k}`, side.translate(0, s * YB, 0).color(bodyPaint));
  const rails = s < 0 ? [[-2900, OX0], [OX1, 3200]] : [[-2900, 3200]];
  for (const [j, [x0, x1]] of rails.entries()) add(`board-rail-${k}-${j}`, blk(x0, s * YB - 110, 1650, x1, s * YB + 110, 1720).color(bodyPaint));
}
const bed = [[4300, 860], [4300, 940], [-3000, 940], [-4400, 1780], [-4400, 1700], [-3000, 860]];
add('conveyor-bed', profileXZ(bed, 3200).color(conveyorSteel));
const bedZ = (x) => (x > -3000 ? 940 : 940 + ((1780 - 940) * (-3000 - x)) / 1400);
for (let i = 0; i < 12; i++) {
  const x = 3900 - i * 680;
  add(`flight-bar-${i}`, blk(x - 40, -1450, bedZ(x), x + 40, 1450, bedZ(x) + 50).color(chassisSteel));
}
add('head-shaft', cylY(200, -1600, 1600, -4400, 1780, 10).color(conveyorSteel));
add('discharge-lip', blk(-4520, -1500, 1650, -4400, 1500, 1900).color(chassisSteel));
add('boom-lift-cylinder', tube([-2700, -1200, 860], [-3900, -1200, 1550], 80, 8).color(conveyorSteel));
add('loading-apron', profileXZ([[4300, 860], [4600, 760], [4600, 800], [4300, 940]], 3000).color(conveyorSteel));

if (load.value === 'loaded') {
  add('coal-heap', sphere(1000).scale([3.1, 1.4, 0.62]).translate(-150, 0, 1100).color(coal));
  for (const [k, [x, y, r]] of [[1800, -600, 220], [-1700, 500, 260], [600, 900, 180], [-500, -950, 200], [2600, 300, 170]].entries()) {
    add(`coal-lump-${k}`, sphere(r).scale([1.2, 1, 0.75]).translate(x, y, 1550 + r * 0.4).color(k % 2 ? coalLit : coal));
  }
}

// ---- Operator pocket in the -Y side, between the wheels ----
add('operator-floor', blk(OX0, -1720, 900, OX1, -1150, 1000).color(chassisSteel));
add('operator-seat', blk(-650, -1450, 1000, -100, -1200, 1300).color(seat));
add('seat-back', blk(-650, -1250, 1150, -100, -1150, 1600).color(seat));
add('steering-column', tube([300, -1350, 1000], [200, -1500, 1350], 40, 6).color(chassisSteel));
add('steering-wheel', rod(220, 1350, 1390, 12).translate(200, -1500, 0).color(seat));
add('control-panel', blk(OX0 + 50, -1700, 1000, OX0 + 350, -1200, 1400).color(chassisSteel));
for (const [k, [x, y]] of [[OX0, -1700], [OX1, -1700], [OX0, -1200], [OX1, -1200]].entries()) {
  add(`canopy-post-${k}`, rod(45, 1000, 2200, 6).translate(x, y, 0).color(chassisSteel));
}
add('canopy-roof', blk(OX0 - 100, -1800, 2200, OX1 + 100, -1120, 2270).color(bodyPaint));

// ---- Cable reel on the +Y side ----
add('cable-reel-drum', cylY(620, 1720, 2020, -900, 1250, 16).color(chassisSteel));
add('cable-reel-wraps', cylY(560, 1760, 1980, -900, 1250, 16).color(tyreRubber));
add('reel-motor', cylY(260, 1720, 2100, -900, 1250, 10).color(bodyPaint));
add('spooling-guide', blk(-2300, 1720, 1050, -1700, 1950, 1250).color(chassisSteel));
add('trailing-cable', tube([-2300, 1850, 1100], [-6200, 1900, 60], 45, 6).color(tyreRubber));
add('hydraulic-tank', blk(500, 1150, 860, 1500, 1600, 1350).color(chassisSteel));
add('electrical-box', blk(2800, 1720, 900, 3800, 1900, 1350).color(chassisSteel));

return p.model();
