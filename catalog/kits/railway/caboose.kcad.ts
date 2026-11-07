// SPDX-License-Identifier: CC0-1.0
// Caboose: the crew car at the tail of a North American freight train. What
// makes it one: a short boxy car body with an arched roof and a raised
// windowed cupola in the middle for the conductor to watch the train, open
// end platforms with railings, steps and a brake wheel, end doors and ladders
// up to a roof walk, a stove smoke jack, red marker lamps at the
// corners, and two three-piece freight bogies.
// Generic visualization geometry at about real size (about 11.6 m over
// couplers, 3.0 m wide, 4.75 m to the cupola roof, 0.84 m wheels on standard
// gauge), millimetres, Z up, wheel flanges on z = 0
// (rail top 28 mm up).
meta({
  name: "caboose",
  license: 'CC0-1.0',
  title: "Caboose",
  description: "North American freight caboose at about real size: car body with arched roof, belt rail and framed side windows, raised central cupola with windows on all sides, open end platforms with railings, corner steps and brake wheel, end doors with windows, end ladders to a roof walk, stove smoke jack, red marker lamps, couplers and two three-piece freight bogies with springs. Material controls: rail and running gear steel, car body paint, trim paint, glazing, marker lamp glass; weathered, freshService and safetyYellow presets.",
  tags: ["caboose", "crew car", "cupola", "freight train", "brake van", "railway", "train", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3f4649', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#a33a2c', { label: 'Car body paint' });
const trimPaint = param('trimPaint', '#e9dcae', { label: 'Trim, rail and lettering paint' });
const glass = param('glass', '#54a6bb', { label: 'Glazing' });
const markerGlass = param('markerGlass', '#d8332b', { label: 'Marker lamp glass' });
presets({
  weathered: { railSteel: '#4d4f4c', paintedSteel: '#8a4a3c', trimPaint: '#c2b892', glass: '#5a99a7', markerGlass: '#a8443a' },
  freshService: { railSteel: '#353c40', paintedSteel: '#b8392a', trimPaint: '#f5ecc6', glass: '#68b9ca', markerGlass: '#f03a2e' },
  safetyYellow: { railSteel: '#2f3436', paintedSteel: '#e4b41f', trimPaint: '#2a2a2a', glass: '#5ea2b2', markerGlass: '#3fb44a' },
});

const p = assembly("caboose");
// Lifted so the wheel flanges (28 mm below the rail top) rest on z = 0.
const flange = 28;
const add = (name, shape) => p.part(name, shape.translate(0, 0, flange).scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Front outline [[y, z], ...] extruded along X, centred on x0.
const front = (pts, t, x0 = 0) => extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0 - t / 2, 0, 0);
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
  add(`${name}-tyre`, toSide(turned([[r - 70, 0], [r, 0], [r, 110], [r + 28, 118], [r + 28, 140], [r - 70, 140]]), x, s, r).color(railSteel));
  add(`${name}-disc`, toSide(turned([[0, -40], [r * 0.26, -40], [r * 0.26, 20], [r - 70, 60], [r - 70, 90], [0, 90]]), x, s, r).color(railSteel));
};
// Three-piece freight bogie: two side frames with a bolster window and springs.
const bogie = (tag, xc, r) => {
  for (const s of [-1, 1]) {
    for (const dx of [-860, 860]) wheel(`wheel-${tag}-${s}-${dx}`, xc + dx, s, r);
    const frame = side([[xc - 1150, r - 120], [xc - 860, r - 220], [xc - 450, 250], [xc + 450, 250], [xc + 860, r - 220], [xc + 1150, r - 120], [xc + 1150, r + 160], [xc + 700, r + 160], [xc + 350, r + 380], [xc - 350, r + 380], [xc - 700, r + 160], [xc - 1150, r + 160]], 150, s * 960)
      .subtract(side([[xc - 330, 380], [xc + 330, 380], [xc + 330, 760], [xc - 330, 760]], 400, s * 960));
    add(`side-frame-${tag}-${s}`, frame.color(railSteel));
    for (const dx of [-180, 0, 180]) add(`spring-${tag}-${s}-${dx}`, turned([[0, 0], [80, 0], [80, 260], [0, 260]]).translate(xc + dx, s * 960, 390).color(trimPaint));
  }
  add(`bolster-${tag}`, side([[xc - 300, 650], [xc + 300, 650], [xc + 300, 900], [xc - 300, 900]], 2100).color(railSteel));
};

// ---- Underframe, bogies, couplers ----
const wheelR = 420;
bogie('a', 3000, wheelR);
bogie('b', -3000, wheelR);
add('underframe', side([[-5600, 900], [5600, 900], [5600, 1200], [-5600, 1200]], 2700).color(railSteel));
add('center-sill', side([[-5800, 760], [5800, 760], [5800, 1000], [-5800, 1000]], 450).color(railSteel));
for (const e of [-1, 1]) {
  add(`coupler-${e}`, side(e > 0 ? [[5800, 780], [6050, 780], [6050, 960], [5800, 960]] : [[-6050, 780], [-5800, 780], [-5800, 960], [-6050, 960]], 220).color(railSteel));
  add(`knuckle-${e}`, front([[-260, 700], [160, 700], [160, 1040], [-260, 1040]], 160, e * 6100).color(railSteel));
}
add('tool-box', side([[-1500, 500], [1500, 500], [1500, 880], [-1500, 880]], 1400).color(railSteel));

// ---- Car body with arched roof, belt rail and windows ----
const B = 4400;
add('body', side([[-B, 1200], [B, 1200], [B, 3500], [-B, 3500]], 2900).color(paintedSteel));
add('roof', front([[-1560, 3480], [1560, 3480], [1500, 3600], [1100, 3780], [500, 3860], [-500, 3860], [-1100, 3780], [-1500, 3600]], 2 * B + 160).color(paintedSteel));
for (const [x0, x1] of [[-B - 80, -1150], [1150, B + 80]]) add(`roof-walk-${x0}`, side([[x0, 3860], [x1, 3860], [x1, 3910], [x0, 3910]], 520).color(railSteel));
for (const s of [-1, 1]) {
  const tag = s > 0 ? 'left' : 'right';
  add(`belt-rail-${tag}`, side([[-B, 2050], [B, 2050], [B, 2130], [-B, 2130]], 20, s * 1455).color(trimPaint));
  add(`sill-${tag}`, side([[-B, 1200], [B, 1200], [B, 1290], [-B, 1290]], 24, s * 1460).color(trimPaint));
  for (const x of [-3200, -2200, 2200, 3200]) {
    add(`window-frame-${tag}-${x}`, side([[x - 330, 2280], [x + 330, 2280], [x + 330, 3080], [x - 330, 3080]], 20, s * 1455).color(trimPaint));
    add(`window-${tag}-${x}`, side([[x - 260, 2350], [x + 260, 2350], [x + 260, 3010], [x - 260, 3010]], 20, s * 1465).color(glass));
  }
  add(`lettering-${tag}`, side([[-1000, 1650], [1000, 1650], [1000, 1850], [-1000, 1850]], 16, s * 1455).color(trimPaint));
}

// ---- Cupola ----
add('cupola', side([[-1100, 3600], [1100, 3600], [1100, 4450], [-1100, 4450]], 2300).color(paintedSteel));
add('cupola-roof', front([[-1260, 4430], [1260, 4430], [1000, 4600], [400, 4680], [-400, 4680], [-1000, 4600]], 2400).color(paintedSteel));
add('cupola-walk', side([[-1150, 4680], [1150, 4680], [1150, 4720], [-1150, 4720]], 480).color(railSteel));
for (const s of [-1, 1]) {
  for (const x of [-550, 550]) {
    add(`cupola-window-frame-${s}-${x}`, side([[x - 380, 3830], [x + 380, 3830], [x + 380, 4330], [x - 380, 4330]], 20, s * 1155).color(trimPaint));
    add(`cupola-window-${s}-${x}`, side([[x - 320, 3880], [x + 320, 3880], [x + 320, 4280], [x - 320, 4280]], 20, s * 1165).color(glass));
  }
  add(`cupola-end-window-${s}`, front([[-500, 3880], [500, 3880], [500, 4280], [-500, 4280]], 20, s * 1110).color(glass));
  add(`cupola-grab-${s}`, tube([s * 900, -1200, 4000], [s * 900, -1200, 4350], 20, 6).color(trimPaint));
}

// ---- Smoke jack ----
add('smoke-jack', tube([-3000, 650, 3700], [-3000, 650, 4400], 90, 10).color(railSteel));
add('smoke-jack-cap', turned([[0, 0], [190, 0], [190, 60], [100, 160], [0, 160]]).translate(-3000, 650, 4400).color(railSteel));

// ---- Ends: platforms, railings, steps, doors, ladders, brake wheel, markers ----
for (const e of [-1, 1]) {
  const tag = e > 0 ? 'a' : 'b';
  const xe = e * B;
  const xo = e * 5450;
  add(`platform-${tag}`, side(e > 0 ? [[B, 1150], [5550, 1150], [5550, 1230], [B, 1230]] : [[-5550, 1150], [-B, 1150], [-B, 1230], [-5550, 1230]], 2900).color(railSteel));
  add(`end-door-${tag}`, front([[-420, 1230], [420, 1230], [420, 3200], [-420, 3200]], 30, xe + e * 15).color(trimPaint));
  add(`end-door-window-${tag}`, front([[-280, 2350], [280, 2350], [280, 3000], [-280, 3000]], 30, xe + e * 30).color(glass));
  // End railing: corner posts, top rail across with a gap at the steps.
  for (const s of [-1, 1]) {
    add(`rail-post-${tag}-${s}`, tube([xo, s * 1400, 1230], [xo, s * 1400, 2250], 28, 6).color(trimPaint));
    add(`rail-side-${tag}-${s}`, tube([xe, s * 1400, 2250], [xo, s * 1400, 2250], 24, 6).color(trimPaint));
    add(`rail-end-${tag}-${s}`, tube([xo, s * 1400, 2250], [xo, s * 700, 2250], 24, 6).color(trimPaint));
    add(`rail-mid-${tag}-${s}`, tube([xo, s * 1400, 1750], [xo, s * 700, 1750], 20, 6).color(trimPaint));
    add(`gate-post-${tag}-${s}`, tube([xo, s * 700, 1230], [xo, s * 700, 2250], 24, 6).color(trimPaint));
    // Corner steps hung under the platform.
    add(`step-hanger-${tag}-${s}`, side(e > 0 ? [[4500, 450], [5500, 450], [5500, 1150], [4500, 1150]] : [[-5500, 450], [-4500, 450], [-4500, 1150], [-5500, 1150]], 30, s * 1430).color(railSteel));
    for (const z of [450, 800]) add(`step-${tag}-${s}-${z}`, side(e > 0 ? [[4550, z], [5450, z], [5450, z + 50], [4550, z + 50]] : [[-5450, z], [-4550, z], [-4550, z + 50], [-5450, z + 50]], 300, s * 1300).color(railSteel));
    // Marker lamps on brackets at the body corners.
    add(`marker-body-${tag}-${s}`, side([[xe + e * 20 - 110, 2900], [xe + e * 20 + 110, 2900], [xe + e * 20 + 110, 3150], [xe + e * 20 - 110, 3150]], 200, s * 1570).color(railSteel));
    add(`marker-lens-${tag}-${s}`, alongX([[0, 0], [75, 0], [75, 30], [0, 30]], e > 0 ? xe + 130 : xe - 160, s * 1570, 3025).color(markerGlass));
  }
  // End ladder from platform to the roof walk.
  for (const dy of [-850, -500]) add(`ladder-rail-${tag}-${dy}`, tube([xe + e * 70, dy, 1230], [xe + e * 70, dy, 3880], 22, 6).color(trimPaint));
  for (let i = 1; i < 8; i++) add(`ladder-rung-${tag}-${i}`, tube([xe + e * 70, -850, 1230 + i * 330], [xe + e * 70, -500, 1230 + i * 330], 16, 6).color(trimPaint));
  // Brake wheel on a staff at the platform edge.
  add(`brake-staff-${tag}`, tube([xo - e * 80, 900, 1230], [xo - e * 80, 900, 2350], 22, 6).color(railSteel));
  add(`brake-wheel-${tag}`, turned([[260, 0], [300, 0], [300, 40], [260, 40]]).translate(xo - e * 80, 900, 2350).color(railSteel));
  for (const a of [0, 60, 120]) add(`brake-spoke-${tag}-${a}`, box(520, 24, 24, true).rotateZ(a).translate(xo - e * 80, 900, 2370).color(railSteel));
}

return p.model();
