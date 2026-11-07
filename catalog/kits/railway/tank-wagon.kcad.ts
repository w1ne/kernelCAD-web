// SPDX-License-Identifier: CC0-1.0
// Rail tank wagon: a general-service liquid tank car. What makes it one: a
// long horizontal cylindrical tank with pressed dished heads at both ends,
// tied down by bands to a short stub sill at each end rather than a full
// underframe, a top fittings housing with manway and valves in the middle
// ringed by a railed walkway platform, side ladders up to it, a bottom outlet
// valve under the belly, hazard placard boards, and two three-piece freight
// bogies with couplers.
// Generic visualization geometry at about real size (about 18 m over
// couplers, 3.1 m wide, 4.7 m tall, 2.9 m tank, 0.84 m wheels on standard
// gauge), millimetres, Z up, wheel flanges on z = 0
// (rail top 28 mm up).
meta({
  name: "tank-wagon",
  license: 'CC0-1.0',
  title: "Rail tank wagon",
  description: "General-service rail tank car at about real size: cylindrical tank with dished heads and tie-down bands on stub sills, top fittings housing with manway, valves and pressure relief, railed walkway platform with side ladders, bottom outlet valve, hazard placard boards and reflective strips, end platforms, couplers and two three-piece freight bogies with springs. Material controls: rail and running gear steel, tank paint, stainless fittings, safety marking; weathered, freshService and whiteChemical presets.",
  tags: ["tank wagon", "tank car", "rail tanker", "freight wagon", "rolling stock", "railway", "train", "low poly", "CC0"],
  kit: 'railway',
  category: 'prop',
  origin: 'base',
  compat: ['railway', 'train', 'station', 'rail-yard', 'indoor'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const railSteel = param('railSteel', '#3f4649', { label: 'Rail and running gear steel' });
const paintedSteel = param('paintedSteel', '#2c2f31', { label: 'Tank paint' });
const stainlessSteel = param('stainlessSteel', '#b8c1c2', { label: 'Stainless fittings' });
const safetyMarking = param('safetyMarking', '#f08a24', { label: 'Hazard placard and reflective marking' });
presets({
  weathered: { railSteel: '#4d4f4c', paintedSteel: '#4a4440', stainlessSteel: '#a5a9a6', safetyMarking: '#c98a46' },
  freshService: { railSteel: '#353c40', paintedSteel: '#b74734', stainlessSteel: '#cad2d1', safetyMarking: '#ff9a2a' },
  whiteChemical: { railSteel: '#2f3436', paintedSteel: '#e8e9e4', stainlessSteel: '#b0b8ba', safetyMarking: '#e2322b' },
});

const p = assembly("tank-wagon");
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
    for (const dx of [-180, 0, 180]) add(`spring-${tag}-${s}-${dx}`, turned([[0, 0], [80, 0], [80, 260], [0, 260]]).translate(xc + dx, s * 960, 390).color(stainlessSteel));
  }
  add(`bolster-${tag}`, side([[xc - 300, 650], [xc + 300, 650], [xc + 300, 900], [xc - 300, 900]], 2100).color(railSteel));
};

// ---- Bogies, stub sills, end platforms, couplers ----
const wheelR = 420;
const truck = 6300;
bogie('a', truck, wheelR);
bogie('b', -truck, wheelR);
const T = 7600; // half length of the tank shell
const tankR = 1450;
const tankZ = 2650;
for (const e of [-1, 1]) {
  const tag = e > 0 ? 'a' : 'b';
  add(`stub-sill-${tag}`, side(e > 0 ? [[truck - 1700, 800], [9000, 800], [9000, 1200], [truck - 1300, 1450]] : [[-9000, 800], [-(truck - 1700), 800], [-(truck - 1300), 1450], [-9000, 1200]], 500).color(railSteel));
  add(`head-saddle-${tag}`, front([[-1100, 900], [1100, 900], [1100, 1350], [700, 1500], [-700, 1500], [-1100, 1350]], 600, e * (truck + 200)).color(railSteel));
  add(`end-platform-${tag}`, side(e > 0 ? [[8250, 1150], [9050, 1150], [9050, 1210], [8250, 1210]] : [[-9050, 1150], [-8250, 1150], [-8250, 1210], [-9050, 1210]], 3000).color(railSteel));
  add(`coupler-${tag}`, side(e > 0 ? [[9000, 820], [9250, 820], [9250, 1000], [9000, 1000]] : [[-9250, 820], [-9000, 820], [-9000, 1000], [-9250, 1000]], 220).color(railSteel));
  add(`knuckle-${tag}`, front([[-260, 740], [160, 740], [160, 1080], [-260, 1080]], 160, e * 9300).color(railSteel));
  for (const s of [-1, 1]) {
    add(`end-step-${tag}-${s}`, side(e > 0 ? [[8400, 450], [8900, 450], [8900, 1150], [8400, 1150]] : [[-8900, 450], [-8400, 450], [-8400, 1150], [-8900, 1150]], 30, s * 1480).color(railSteel));
    add(`end-step-tread-${tag}-${s}`, side(e > 0 ? [[8420, 450], [8880, 450], [8880, 500], [8420, 500]] : [[-8880, 450], [-8420, 450], [-8420, 500], [-8880, 500]], 300, s * 1350).color(railSteel));
    add(`end-grab-${tag}-${s}`, tube([e * 9000, s * 1450, 1210], [e * 9000, s * 1450, 2100], 22, 6).color(stainlessSteel));
  }
  add(`end-rail-${tag}`, tube([e * 9000, -1450, 2100], [e * 9000, 1450, 2100], 22, 6).color(stainlessSteel));
  add(`brake-wheel-${tag}`, turned([[240, 0], [280, 0], [280, 40], [240, 40]]).rotateY(90).translate(e * (T + 650), 900, 2000).color(railSteel));
}

// ---- Tank shell with dished heads and bands ----
add('tank-shell', alongX([[0, 0], [tankR, 0], [tankR, 2 * T], [0, 2 * T]], -T, 0, tankZ).color(paintedSteel));
const head = [[0, 0], [tankR, 0], [tankR - 60, 220], [tankR - 300, 480], [tankR - 700, 640], [0, 700]];
add('tank-head-a', alongX(head, T, 0, tankZ).color(paintedSteel));
add('tank-head-b', alongX(head, T, 0, tankZ).rotateZ(180).color(paintedSteel));
for (const x of [-T + 300, -truck, truck, T - 300]) add(`tank-band-${x}`, alongX([[0, 0], [tankR + 25, 0], [tankR + 25, 120], [0, 120]], x - 60, 0, tankZ).color(railSteel));
for (const s of [-1, 1]) {
  // Reflective strips along the lower sides and a hazard placard board.
  for (const x of [-5000, -2500, 2500, 5000]) add(`reflector-${s}-${x}`, side([[x - 200, 1950], [x + 200, 1950], [x + 200, 2050], [x - 200, 2050]], 20, s * 1420).color(safetyMarking));
  add(`placard-board-${s}`, side([[3300, 2350], [4300, 2350], [4300, 3050], [3300, 3050]], 20, s * 1462).color(stainlessSteel));
  add(`placard-${s}`, side([[3800, 2420], [4140, 2700], [3800, 2980], [3460, 2700]], 20, s * 1474).color(safetyMarking));
  add(`placard-board-2-${s}`, side([[-4300, 2350], [-3300, 2350], [-3300, 3050], [-4300, 3050]], 20, s * 1462).color(stainlessSteel));
}

// ---- Top fittings: housing, manway, valves, walkway platform, ladders ----
const topZ = tankZ + tankR;
add('fittings-housing', turned([[0, 0], [700, 0], [700, 450], [640, 480], [0, 480]]).translate(0, 0, topZ - 150).color(stainlessSteel));
add('housing-cover', turned([[0, 0], [760, 0], [760, 50], [0, 50]]).translate(0, 0, topZ + 330).color(paintedSteel));
add('manway', turned([[0, 0], [300, 0], [300, 120], [0, 120]]).translate(-350, 0, topZ + 380).color(stainlessSteel));
add('relief-valve', turned([[0, 0], [110, 0], [110, 220], [150, 250], [0, 280]]).translate(380, 250, topZ + 380).color(stainlessSteel));
add('vapour-valve', turned([[0, 0], [80, 0], [80, 180], [0, 180]]).translate(380, -250, topZ + 380).color(stainlessSteel));
add('platform-deck', side([[-1400, topZ - 60], [1400, topZ - 60], [1400, topZ], [-1400, topZ]], 2600).subtract(turned([[0, -100], [720, -100], [720, 200], [0, 200]]).translate(0, 0, topZ - 100)).color(railSteel));
for (const s of [-1, 1]) {
  for (const x of [-1350, 0, 1350]) add(`platform-post-${s}-${x}`, tube([x, s * 1270, topZ], [x, s * 1270, topZ + 1000], 22, 6).color(stainlessSteel));
  add(`platform-rail-${s}`, tube([-1350, s * 1270, topZ + 1000], [1350, s * 1270, topZ + 1000], 22, 6).color(stainlessSteel));
  add(`platform-mid-rail-${s}`, tube([-1350, s * 1270, topZ + 520], [1350, s * 1270, topZ + 520], 18, 6).color(stainlessSteel));
  add(`platform-end-rail-${s}`, tube([s * 1350, -1270, topZ + 1000], [s * 1350, 1270, topZ + 1000], 22, 6).color(stainlessSteel));
  // Side ladder from the end platform level up the tank side to the walkway.
  for (const dx of [-1100, -700]) add(`ladder-rail-${s}-${dx}`, tube([dx, s * 1560, 1250], [dx, s * 1300, topZ], 22, 6).color(stainlessSteel));
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const y = s * (1560 - 260 * t);
    const z = 1250 + (topZ - 1250) * t;
    add(`ladder-rung-${s}-${i}`, tube([-1100, y, z], [-700, y, z], 16, 6).color(stainlessSteel));
  }
}

// ---- Bottom outlet valve ----
add('bottom-outlet', turned([[0, 0], [200, 0], [200, 250], [140, 300], [0, 300]]).rotateX(180).translate(0, 0, tankZ - tankR + 60).color(stainlessSteel));
add('outlet-cap', turned([[0, 0], [130, 0], [130, 120], [0, 120]]).translate(0, 0, tankZ - tankR - 360).color(safetyMarking));

return p.model();
