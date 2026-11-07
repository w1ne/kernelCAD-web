// SPDX-License-Identifier: CC0-1.0
// Offshore wind turbine: a large three-blade machine standing in the sea on a
// monopile. What makes it offshore rather than onshore: the dark steel
// monopile driven into the seabed, the bright yellow transition piece with a
// railed access platform, a boat landing with fender tubes and ladder for crew
// transfer vessels, cable J-tubes running down the pile, and a bigger rotor on
// a taller white tower with a long nacelle, helihoist-style roof cooler and
// aviation beacons.
// Stylized at the wind-energy kit's reduced scene scale (z = 0 is the mudline,
// mean sea level at z = 700, about 6.6 m to the blade tip), millimetres, Z up,
// rotor facing -Y.
meta({
  name: "offshore-wind-turbine",
  license: 'CC0-1.0',
  title: "Offshore wind turbine",
  description: "Offshore three-blade turbine on a monopile: dark marine-steel pile with cable J-tubes, yellow transition piece with railed access platform, crane davit and boat landing with fender tubes and ladder, tall tapered white tower, long nacelle with roof cooler and aviation beacons, rounded spinner and three lofted, twisted airfoil blades with warning tip bands. Shape choice: blades running or feathered. Material controls: tower paint, blade and nacelle composite, transition-piece safety yellow, marine steel, warning paint; weathered, highVisibility and unpaintedTips presets.",
  tags: ['wind', 'wind turbine', 'offshore', 'monopile', 'transition piece', 'boat landing', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene', 'marine'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bladePitch = param('bladePitch', 'running', { choices: ['running', 'feathered'], label: 'Blade pitch' });
const pitch = bladePitch.value === 'feathered' ? 82 : 4;
const towerPaint = param('towerPaint', '#e2e5e3', { label: 'Tower paint' });
const composite = param('composite', '#f3f4f0', { label: 'Blade and nacelle composite' });
const safetyYellow = param('safetyYellow', '#f1c21b', { label: 'Transition piece safety yellow' });
const marineSteel = param('marineSteel', '#2f3c43', { label: 'Marine steel (pile, landing, fittings)' });
const warningPaint = param('warningPaint', '#c9342c', { label: 'Warning paint (tip bands, beacons)' });

presets({
  weathered: { towerPaint: '#c8ccc7', composite: '#d9dad0', safetyYellow: '#c99f2a', marineSteel: '#4a4136', warningPaint: '#9d4a40' },
  highVisibility: { towerPaint: '#f0f2f0', composite: '#ffffff', safetyYellow: '#ffd21a', marineSteel: '#24313a', warningPaint: '#ef6a1c' },
  unpaintedTips: { warningPaint: '#f3f4f0' },
});

const p = assembly("offshore-wind-turbine");
const add = (name, shape) => p.part(name, shape.scale(scale));

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
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
});
// Round rod between two points.
const tube = (p0, p1, r = 10, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const toPath = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};

// ---- Blade: lofted sections from a round root to a thin twisted airfoil ----
const AIRFOIL = [[0.7, 0.01], [0.45, 0.3], [0.15, 0.5], [-0.1, 0.48], [-0.25, 0.3], [-0.3, 0], [-0.25, -0.25], [-0.1, -0.35], [0.15, -0.32], [0.45, -0.15]];
const section = (chord, thick, twist, round) => {
  const a = ((twist + pitch) * Math.PI) / 180;
  const pts = round
    ? AIRFOIL.map((_, i) => [round * Math.cos((2 * Math.PI * i) / 10), round * Math.sin((2 * Math.PI * i) / 10)])
    : AIRFOIL.map(([u, v]) => [u * chord, (v * thick) / 0.5]);
  return toPath(pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]));
};
const loftSpan = (rows) => section(...rows[0][1]).loft(rows.slice(1).map(([, s]) => section(...s)), {
  planes: rows.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: false,
});
const R = 1950;
const root = 140;
const bladeBody = () => loftSpan([
  [root, [0, 0, 0, 78]],
  [root + 0.07 * R, [0, 0, 0, 78]],
  [root + 0.22 * R, [350, 120, 13, 0]],
  [root + 0.45 * R, [255, 64, 7, 0]],
  [root + 0.72 * R, [170, 38, 3, 0]],
  [root + 0.88 * R, [125, 26, 1, 0]],
]);
const bladeTip = () => loftSpan([
  [root + 0.88 * R, [125, 26, 1, 0]],
  [root + 0.96 * R, [88, 17, 0, 0]],
  [root + R, [40, 10, 0, 0]],
]);

// ---- Monopile, J-tubes and transition piece ----
const tpBase = 950;
const deckZ = 1300;
add('monopile', turned([[0, 0], [235, 0], [235, tpBase + 120], [0, tpBase + 120]]).color(marineSteel));
add('scour-protection', turned([[0, 0], [620, 0], [420, 70], [240, 90], [0, 90]]).color(marineSteel));
for (const a of [150, 210]) {
  const r = (a * Math.PI) / 180;
  const [x, y] = [262 * Math.cos(r), 262 * Math.sin(r)];
  add(`j-tube-${a}`, tube([x, y, 60], [x, y, deckZ - 20], 16).color(marineSteel));
  add(`j-tube-bell-${a}`, turned([[0, 0], [34, 0], [20, 60], [0, 60]]).translate(x, y, 40).color(marineSteel));
}
add('transition-piece', turned([[0, tpBase], [258, tpBase], [258, deckZ], [0, deckZ]]).color(safetyYellow));
add('splash-band', turned([[0, 640], [240, 640], [240, 760], [0, 760]]).color(safetyYellow));
// Access platform: a deck ring on brackets with posts and two rails.
add('platform-deck', turned([[0, deckZ], [470, deckZ], [470, deckZ + 30], [0, deckZ + 30]]).color(marineSteel));
for (let i = 0; i < 12; i++) {
  const r = (i * 30 * Math.PI) / 180;
  const [c, s] = [Math.cos(r), Math.sin(r)];
  add(`platform-bracket-${i}`, tube([258 * c, 258 * s, deckZ - 170], [440 * c, 440 * s, deckZ], 9, 6).color(safetyYellow));
  if (i !== 9) add(`rail-post-${i}`, tube([455 * c, 455 * s, deckZ + 30], [455 * c, 455 * s, deckZ + 250], 7, 6).color(safetyYellow));
}
for (const z of [deckZ + 140, deckZ + 250]) {
  for (let i = 0; i < 12; i++) {
    if (i === 8 || i === 9) continue;
    const r0 = (i * 30 * Math.PI) / 180;
    const r1 = ((i + 1) * 30 * Math.PI) / 180;
    add(`rail-${z}-${i}`, tube([455 * Math.cos(r0), 455 * Math.sin(r0), z], [455 * Math.cos(r1), 455 * Math.sin(r1), z], 6, 6).color(safetyYellow));
  }
}
// Davit crane on the deck.
add('davit-post', tube([300, 250, deckZ + 30], [300, 250, deckZ + 420], 18).color(safetyYellow));
add('davit-jib', tube([300, 250, deckZ + 420], [430, 330, deckZ + 380], 12).color(safetyYellow));
add('davit-hook', tube([430, 330, deckZ + 380], [430, 330, deckZ + 280], 3, 6).color(marineSteel));
// Boat landing on the -Y side: two fender tubes and a ladder between them.
for (const x of [-110, 110]) {
  add(`fender-tube-${x}`, tube([x, -390, 380], [x, -390, deckZ - 40], 22).color(safetyYellow));
  for (const z of [420, deckZ - 80]) add(`fender-arm-${x}-${z}`, tube([x, -240, z], [x, -390, z], 14).color(marineSteel));
}
for (const x of [-45, 45]) add(`ladder-rail-${x}`, tube([x, -330, 380], [x, -330, deckZ + 220], 8, 6).color(marineSteel));
for (let i = 0; i < 9; i++) add(`ladder-rung-${i}`, tube([-45, -330, 460 + i * 100], [45, -330, 460 + i * 100], 5, 6).color(marineSteel));

// ---- Tower ----
const towerTop = 4500;
add('tower', turned([[0, deckZ], [205, deckZ], [200, deckZ + 120], [160, 2900], [120, towerTop], [0, towerTop]]).color(towerPaint));
add('tower-door', side([[-55, deckZ + 40], [55, deckZ + 40], [55, deckZ + 200], [-55, deckZ + 200]], 40, -195).color(marineSteel));
add('section-flange', turned([[158, 2890], [168, 2890], [168, 2910], [158, 2910]]).color(marineSteel));

// ---- Nacelle and rotor, built at the tower top ----
const nz = towerTop - 20;
const nacelleSide = front([[-300, nz + 50], [-240, nz], [700, nz], [760, nz + 60], [770, nz + 220], [740, nz + 350], [-230, nz + 380], [-310, nz + 270]], 420);
const nacelleFront = side([[-210, nz], [210, nz], [210, nz + 290], [150, nz + 380], [-150, nz + 380], [-210, nz + 290]], 1200, 230);
add('nacelle', nacelleSide.intersect(nacelleFront).color(composite));
add('yaw-ring', turned([[0, -40], [150, -40], [150, 0], [0, 0]]).translate(0, 0, nz + 10).color(marineSteel));
for (const [z0, z1] of [[nz + 330, nz + 350], [nz + 500, nz + 520]]) add(`cooler-rail-${z0}`, side([[-190, z0], [190, z0], [190, z1], [-190, z1]], 80, 620).color(marineSteel));
for (let i = 0; i < 7; i++) add(`cooler-fin-${i}`, side([[-170 + i * 55, nz + 345], [-146 + i * 55, nz + 345], [-146 + i * 55, nz + 505], [-170 + i * 55, nz + 505]], 90, 620).color(towerPaint));
add('helihoist-deck', front([[300, nz + 370], [560, nz + 370], [560, nz + 390], [300, nz + 390]], 360).color(marineSteel));
for (const [i, [x, y]] of [[-170, 300], [170, 300], [-170, 560], [170, 560]].entries()) add(`helihoist-post-${i}`, tube([x, y, nz + 390], [x, y, nz + 520], 5, 6).color(safetyYellow));
add('met-mast', tube([0, 480, nz + 370], [0, 480, nz + 560], 8).color(marineSteel));
add('met-arm', tube([-120, 480, nz + 560], [120, 480, nz + 560], 6).color(marineSteel));
for (const x of [-150, 150]) add(`aviation-light-${x}`, turned([[0, 0], [18, 0], [18, 24], [9, 38], [0, 38]]).translate(x, 380, nz + 370).color(warningPaint));

const hubY = -440;
const hubZ = nz + 190;
add('spinner', turned([[0, 0], [195, 0], [202, 70], [182, 180], [132, 270], [64, 322], [0, 338]]).rotateX(90).translate(0, -310, hubZ).color(composite));
add('main-shaft', turned([[0, 0], [90, 0], [90, 40], [0, 40]]).rotateX(90).translate(0, -280, hubZ).color(marineSteel));
for (const a of [20, 140, 260]) {
  const place = (shape) => shape.rotateY(a).translate(0, hubY, hubZ);
  add(`blade-${a}`, place(bladeBody()).color(composite));
  add(`blade-tip-${a}`, place(bladeTip()).color(warningPaint));
  add(`blade-root-ring-${a}`, place(turned([[0, root - 12], [90, root - 12], [90, root + 30], [0, root + 30]])).color(marineSteel));
}

return p.model();
