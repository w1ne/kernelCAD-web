// SPDX-License-Identifier: CC0-1.0
// Electric locomotive: a modern four-axle (Bo-Bo) mainline electric. What
// makes it one: a full-width box body with a raked, chamfered cab at each end
// and big wrap-round windscreens, a roof carrying two single-arm pantographs
// on insulators with a roof busbar and main breaker between them, rows of
// ventilation grilles and a livery stripe along the sides, and two bogies
// with coil springs under a skirted underframe, buffers, screw couplings and
// a triangle of headlights at each end. No exhaust, no fuel tank.
// Generic visualization geometry at about real size (about 19 m over buffers,
// 3.0 m wide, 4.3 m body height, pantographs raised to about 5.6 m, 1.25 m
// wheels on standard gauge), millimetres, Z up, wheel flanges on z = 0
// (rail top 30 mm up).
meta({
  name: "electric-locomotive",
  license: 'CC0-1.0',
  title: "Electric locomotive",
  description: "Four-axle mainline electric locomotive at about real size: full-width body with raked, chamfered cab ends, wrap-round windscreens, cab side windows and doors, ventilation grilles and livery stripe; roof with two raised single-arm pantographs on insulators, busbar and main breaker; two bogies with side frames, coil springs, traction motors and flanged wheels; skirted underframe with transformer tank; buffers, screw couplings and a headlight triangle at each end. Material controls: rail and running gear steel, livery paint, livery stripe, glazing, bare aluminum; weathered, freshService and expressRed presets.",
  tags: ["electric locomotive", "pantograph", "Bo-Bo", "mainline locomotive", "overhead line", "railway", "train", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 10000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3f4649', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#2f7286', { label: 'Livery paint' });
const stripePaint = param('stripePaint', '#e8e4d8', { label: 'Livery stripe' });
const glass = param('glass', '#46788a', { label: 'Glazing' });
const aluminum = param('aluminum', '#a7b2b4', { label: 'Bare aluminum' });
presets({
  weathered: { railSteel: '#4d4f4c', paintedSteel: '#416f7a', stripePaint: '#c8c2b2', glass: '#3e5b66', aluminum: '#989e9b' },
  freshService: { railSteel: '#353c40', paintedSteel: '#b74734', stripePaint: '#f4f1e8', glass: '#2f566a', aluminum: '#bdc8c8' },
  expressRed: { railSteel: '#2f3436', paintedSteel: '#c8262c', stripePaint: '#f0f0ec', glass: '#273f4c', aluminum: '#c4cbcc' },
});

const p = assembly("electric-locomotive");
// Lifted so the wheel flanges (30 mm below the rail top) rest on z = 0.
const flange = 30;
const add = (name, shape) => p.part(name, shape.translate(0, 0, flange).scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
// A bent bar of width w following a centreline [[x, z], ...].
const bar = (line, w) => {
  const left = [];
  const right = [];
  line.forEach(([x, z], i) => {
    const [ax, az] = line[Math.max(0, i - 1)];
    const [bx, bz] = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    left.push([x + (nx * w) / 2, z + (nz * w) / 2]);
    right.push([x - (nx * w) / 2, z - (nz * w) / 2]);
  });
  return [...left, ...right.reverse()];
};
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Turned profile laid along +X starting at x0, on the axis (y, z).
const alongX = (pts, x0, y, z) => turned(pts).rotateY(90).translate(x0, y, z);
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
});
// Round rod between two points.
const tube = (p0, p1, r = 20, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Flanged disc wheel on an axle along Y, tread on the rail at y = s * 750.
const toSide = (shape, x, s, r) => (s > 0 ? shape.rotateX(90) : shape.rotateX(-90)).translate(x, s * 790, r);
const wheel = (name, x, s, r) => {
  add(`${name}-tyre`, toSide(turned([[r - 80, 0], [r, 0], [r, 110], [r + 30, 118], [r + 30, 140], [r - 80, 140]]), x, s, r).color(railSteel));
  add(`${name}-disc`, toSide(turned([[0, -40], [r * 0.24, -40], [r * 0.24, 20], [r - 80, 60], [r - 80, 90], [0, 90]]), x, s, r).color(railSteel));
};

// ---- Body: side outline with raked ends, chamfered in plan ----
const L = 9300;
const bodySide = [[-L, 1250], [L, 1250], [L + 150, 2300], [L, 3150], [L - 650, 4150], [-(L - 650), 4150], [-L, 3150], [-(L + 150), 2300]];
const bodyPlan = extrudePolygon([[-(L + 200), -900], [-(L - 400), -1500], [L - 400, -1500], [L + 200, -900], [L + 200, 900], [L - 400, 1500], [-(L - 400), 1500], [-(L + 200), 900]], 3200).translate(0, 0, 1100);
add('body', side(bodySide, 3000).intersect(bodyPlan).color(paintedSteel));
add('roof-cover', front([[-1400, 4140], [1400, 4140], [1200, 4300], [-1200, 4300]], 2 * (L - 700)).color(railSteel));

for (const e of [-1, 1]) {
  const tag = e > 0 ? 'a' : 'b';
  // Wrap-round windscreen on the raked face, lying just proud of it.
  const lo = [e * (L - 20), 3230];
  const hi = [e * (L - 600), 4080];
  const n = [e * 0.83, 0.56];
  const ws = [[lo[0] + n[0] * 20, lo[1] + n[1] * 20], [hi[0] + n[0] * 20, hi[1] + n[1] * 20]];
  add(`windscreen-${tag}`, side(bar(ws, 60), 2200).intersect(bodyPlan.translate(e * 30, 0, 0)).color(glass));
  add(`wiper-${tag}`, side(bar([[e * (L - 60), 3330], [e * (L - 300), 3700]], 30), 30, 300).translate(e * 40, 0, 0).color(railSteel));
  // Nose: headlight triangle, lower lamps, buffers and screw coupling.
  for (const s of [-1, 1]) {
    add(`headlight-${tag}-${s}`, alongX([[0, 0], [130, 0], [130, 30], [0, 30]], e > 0 ? L + 140 : -(L + 170), s * 750, 2400).color(aluminum));
    add(`buffer-stock-${tag}-${s}`, alongX([[0, 0], [170, 0], [150, 380], [0, 380]], e > 0 ? L : -(L + 380), s * 875, 1060).color(railSteel));
    add(`buffer-head-${tag}-${s}`, alongX([[0, 0], [230, 0], [230, 60], [0, 60]], e > 0 ? L + 380 : -(L + 440), s * 875, 1060).color(aluminum));
    add(`cab-door-${tag}-${s}`, side([[e * (L - 1700), 1500], [e * (L - 1050), 1500], [e * (L - 1050), 3500], [e * (L - 1700), 3500]], 20, s * 1505).color(railSteel));
    add(`cab-window-${tag}-${s}`, side([[e * (L - 1600), 2850], [e * (L - 1150), 2850], [e * (L - 1150), 3400], [e * (L - 1600), 3400]], 24, s * 1508).color(glass));
    add(`cab-side-window-${tag}-${s}`, side([[e * (L - 950), 2850], [e * (L - 350), 2850], [e * (L - 550), 3600], [e * (L - 950), 3600]], 20, s * 1505).color(glass));
    add(`grab-${tag}-${s}`, tube([e * (L - 1780), s * 1520, 1600], [e * (L - 1780), s * 1520, 3300], 22, 6).color(aluminum));
    add(`step-hanger-${tag}-${s}`, side([[e * (L - 1700), 450], [e * (L - 1050), 450], [e * (L - 1050), 1250], [e * (L - 1700), 1250]], 30, s * 1500).color(railSteel));
    for (const z of [450, 850]) add(`step-${tag}-${s}-${z}`, side([[e * (L - 1700), z], [e * (L - 1050), z], [e * (L - 1050), z + 50], [e * (L - 1700), z + 50]], 260, s * 1380).color(railSteel));
  }
  add(`top-light-${tag}`, alongX([[0, 0], [110, 0], [110, 30], [0, 30]], e > 0 ? L - 640 : -(L - 610), 0, 4130).color(aluminum));
  add(`headbeam-${tag}`, side(e > 0 ? [[L, 820], [L + 300, 820], [L + 300, 1300], [L, 1300]] : [[-(L + 300), 820], [-L, 820], [-L, 1300], [-(L + 300), 1300]], 2800).color(railSteel));
  add(`coupling-hook-${tag}`, side(e > 0 ? [[L + 300, 1000], [L + 600, 1000], [L + 600, 1120], [L + 300, 1120]] : [[-(L + 600), 1000], [-(L + 300), 1000], [-(L + 300), 1120], [-(L + 600), 1120]], 90).color(railSteel));
  add(`snow-plough-${tag}`, side(e > 0 ? [[L - 200, 150], [L + 250, 150], [L + 300, 700], [L - 200, 700]] : [[-(L + 300), 700], [-(L + 250), 150], [-(L - 200), 150], [-(L - 200), 700]], 2500).color(railSteel));
}

// ---- Sides: livery stripe, ventilation grilles, number panel ----
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  add(`stripe-${tag}`, side([[-(L - 300), 1900], [L - 300, 1900], [L - 300, 2150], [-(L - 300), 2150]], 16, s * 1504).color(stripePaint));
  for (let i = 0; i < 5; i++) {
    const x = -5600 + i * 2350;
    add(`grille-${tag}-${i}`, side([[x, 2700], [x + 1700, 2700], [x + 1700, 3700], [x, 3700]], 20, s * 1505).color(railSteel));
    for (let k = 1; k < 6; k++) add(`louvre-${tag}-${i}-${k}`, side([[x + 30, 2700 + k * 166 - 15], [x + 1670, 2700 + k * 166 - 15], [x + 1670, 2700 + k * 166 + 15], [x + 30, 2700 + k * 166 + 15]], 24, s * 1512).color(aluminum));
  }
  add(`skirt-${tag}`, side([[-(L - 300), 950], [L - 300, 950], [L - 300, 1260], [-(L - 300), 1260]], 30, s * 1480).color(railSteel));
}

// ---- Running gear: two bogies, springs, traction motors; transformer ----
const wheelR = 625;
for (const xc of [-5800, 5800]) {
  for (const s of [-1, 1]) {
    const tag = `${xc > 0 ? 'a' : 'b'}-${s > 0 ? 'left' : 'right'}`;
    for (const dx of [-1300, 1300]) {
      wheel(`wheel-${tag}-${dx}`, xc + dx, s, wheelR);
      add(`axlebox-${tag}-${dx}`, alongX([[0, 0], [200, 0], [200, 260], [0, 260]], xc + dx - 130, s * 960, wheelR).color(railSteel));
      add(`axle-spring-${tag}-${dx}`, turned([[0, 0], [120, 0], [120, 260], [0, 260]]).translate(xc + dx, s * 1000, 830).color(stripePaint));
    }
    add(`bogie-frame-${tag}`, side([[xc - 1900, 900], [xc - 1500, 800], [xc - 800, 800], [xc - 500, 650], [xc + 500, 650], [xc + 800, 800], [xc + 1500, 800], [xc + 1900, 900], [xc + 1900, 1150], [xc - 1900, 1150]], 180, s * 1000).color(railSteel));
    for (const dx of [-450, 450]) add(`secondary-spring-${tag}-${dx}`, turned([[0, 0], [150, 0], [150, 140], [0, 140]]).translate(xc + dx, s * 1000, 1130).color(stripePaint));
    add(`damper-${tag}`, tube([xc + 900, s * 1110, 750], [xc + 1500, s * 1110, 1100], 40, 8).color(aluminum));
  }
  for (const dx of [-650, 650]) add(`traction-motor-${xc}-${dx}`, front(circle(380, 12).map(([y, z]) => [y * 1.4, z + wheelR]), 600, xc + dx).color(railSteel));
}
add('underframe', side([[-L, 1150], [L, 1150], [L, 1300], [-L, 1300]], 2900).color(railSteel));
add('transformer-tank', front(filletPolygon([[-1300, 450], [1300, 450], [1350, 1200], [-1350, 1200]], 80), 6000, 0).color(railSteel));
for (const s of [-1, 1]) add(`air-reservoir-${s}`, alongX([[0, 0], [200, 0], [200, 2800], [0, 2800]], -1400, s * 1250, 850).color(aluminum));

// ---- Roof: two single-arm pantographs on insulators, busbar, breaker ----
const insulator = (x, y, z) => turned([[0, 0], [60, 0], [60, 40], [120, 60], [60, 90], [60, 130], [120, 150], [60, 180], [60, 220], [120, 240], [60, 270], [60, 300], [0, 300]]).translate(x, y, z);
const pantograph = (tag, x0, dir) => {
  for (const [dx, dy] of [[-500, -450], [-500, 450], [500, -450], [500, 450]]) add(`pan-insulator-${tag}-${dx}-${dy}`, insulator(x0 + dx, dy, 4300).color(aluminum));
  add(`pan-base-${tag}`, side([[x0 - 650, 4600], [x0 + 650, 4600], [x0 + 650, 4700], [x0 - 650, 4700]], 1100).color(railSteel));
  const hinge = [x0 - dir * 500, 4720];
  const knee = [x0 + dir * 900, 5200];
  const head = [x0 - dir * 300, 5620];
  for (const dy of [-280, 280]) add(`lower-arm-${tag}-${dy}`, tube([hinge[0], dy, hinge[1]], [knee[0], dy * 0.4, knee[1]], 45, 8).color(aluminum));
  add(`upper-arm-${tag}`, tube([knee[0], 0, knee[1]], [head[0], 0, head[1]], 32, 8).color(aluminum));
  add(`tie-rod-${tag}`, tube([hinge[0] + dir * 150, 0, hinge[1]], [knee[0] - dir * 80, 0, knee[1] - 60], 15, 6).color(aluminum));
  add(`lift-spring-${tag}`, tube([hinge[0] - dir * 200, 0, 4720], [hinge[0] + dir * 200, 0, 4880], 60, 8).color(railSteel));
  // Pan head: twin contact strips with downturned horns.
  for (const dx of [-150, 150]) {
    add(`strip-${tag}-${dx}`, tube([head[0] + dx, -800, head[1] + 40], [head[0] + dx, 800, head[1] + 40], 30, 6).color(aluminum));
    for (const s of [-1, 1]) add(`horn-${tag}-${dx}-${s}`, tube([head[0] + dx, s * 800, head[1] + 40], [head[0] + dx, s * 1000, head[1] - 140], 25, 6).color(aluminum));
  }
  add(`head-frame-${tag}`, tube([head[0] - 170, 0, head[1]], [head[0] + 170, 0, head[1]], 35, 6).color(aluminum));
};
pantograph('a', 5600, 1);
pantograph('b', -5600, -1);
for (const x of [-2400, 2400]) add(`busbar-insulator-${x}`, insulator(x, 0, 4300).color(aluminum));
add('roof-busbar', tube([-5600, 0, 4620], [5600, 0, 4620], 30, 8).color(aluminum));
add('main-breaker', turned([[0, 0], [150, 0], [150, 450], [90, 520], [0, 520]]).translate(0, 0, 4300).color(aluminum));
add('breaker-base', side([[-400, 4290], [400, 4290], [400, 4340], [-400, 4340]], 600).color(railSteel));

return p.model();
