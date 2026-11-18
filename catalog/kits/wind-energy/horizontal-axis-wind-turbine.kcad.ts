// SPDX-License-Identifier: CC0-1.0
// Horizontal-axis wind turbine: the three-blade upwind machine of an onshore
// wind farm. What makes it one: a tall, tapering white tubular steel tower on a
// round concrete foundation with a base door, a streamlined nacelle on top
// carrying a roof cooler, anemometer and red aviation lights, and a rotor
// facing into the wind -- a rounded spinner with three long, twisted, tapering
// airfoil blades with red warning tip bands.
// Stylized at the wind-energy kit's reduced scene scale (about 4.6 m to the
// blade tip, 1.5 m blades), millimetres, Z up, rotor facing -Y.
meta({
  name: "horizontal-axis-wind-turbine",
  license: 'CC0-1.0',
  title: "Horizontal-axis wind turbine",
  description: "Onshore three-blade upwind turbine: tapered tubular tower with section flanges, base door and steps on a round concrete foundation; streamlined nacelle with roof cooler, anemometer, wind vane and aviation lights; rounded spinner and three lofted, twisted airfoil blades with warning tip bands. Shape choice: blades running or feathered. Material controls: tower paint, blade and nacelle composite, warning paint, foundation concrete, fittings steel; weathered, highVisibility and unpaintedTips presets.",
  tags: ['wind', 'wind turbine', 'HAWT', 'onshore', 'energy', 'renewable', 'rotor', 'nacelle', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 9000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bladePitch = param('bladePitch', 'running', { choices: ['running', 'feathered'], label: 'Blade pitch' });
const pitch = bladePitch.value === 'feathered' ? 82 : 4;
const towerPaint = param('towerPaint', '#dfe3e1', { label: 'Tower paint' });
const composite = param('composite', '#f3f4f0', { label: 'Blade and nacelle composite' });
const warningPaint = param('warningPaint', '#c9342c', { label: 'Warning paint (tip bands, beacons)' });
const concrete = param('concrete', '#9c988e', { label: 'Foundation concrete' });
const fittings = param('fittings', '#4b5559', { label: 'Fittings steel (door, flanges, mast)' });

presets({
  weathered: { towerPaint: '#c9ccc6', composite: '#dcdcd2', warningPaint: '#9d4a40', concrete: '#86827a', fittings: '#5b605e' },
  highVisibility: { towerPaint: '#eef0ee', composite: '#ffffff', warningPaint: '#ef6a1c', concrete: '#a8a59c', fittings: '#353c40' },
  unpaintedTips: { warningPaint: '#f3f4f0' },
});

const p = assembly("horizontal-axis-wind-turbine");
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
// Section points, chord along X (leading edge towards -X), thickness along Y.
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
const R = 1500;
const root = 110;
const bladeBody = () => loftSpan([
  [root, [0, 0, 0, 62]],
  [root + 0.07 * R, [0, 0, 0, 62]],
  [root + 0.22 * R, [290, 100, 13, 0]],
  [root + 0.45 * R, [215, 54, 7, 0]],
  [root + 0.72 * R, [145, 32, 3, 0]],
  [root + 0.88 * R, [108, 22, 1, 0]],
]);
const bladeTip = () => loftSpan([
  [root + 0.88 * R, [108, 22, 1, 0]],
  [root + 0.96 * R, [76, 15, 0, 0]],
  [root + R, [36, 9, 0, 0]],
]);

// ---- Foundation and tower ----
add('foundation', turned([[0, 0], [430, 0], [430, 70], [300, 150], [215, 170], [0, 170]]).color(concrete));
const towerTop = 3420;
add('tower', turned([[0, 170], [150, 170], [146, 260], [125, 1400], [104, 2500], [84, towerTop], [0, towerTop]]).color(towerPaint));
add('base-flange', turned([[150, 170], [168, 170], [168, 200], [150, 200]]).color(fittings));
for (const [z, r] of [[1400, 125], [2500, 104]]) add(`section-flange-${z}`, turned([[r - 2, z - 10], [r + 6, z - 10], [r + 6, z + 10], [r - 2, z + 10]]).color(fittings));
// Base door on the -Y side with a short concrete stair.
add('door', side([[-55, 205], [55, 205], [55, 355], [30, 390], [-30, 390], [-55, 355]], 30, -140).color(fittings));
for (let i = 0; i < 3; i++) add(`step-${i}`, side([[-110, 0], [110, 0], [110, 200 - i * 50], [-110, 200 - i * 50]], 70, -190 - i * 70).color(concrete));

// ---- Nacelle: side outline intersected with a rounded front outline ----
const nz = towerTop - 20;
const nacelleSide = front([[-250, nz + 40], [-200, nz], [520, nz], [575, nz + 50], [585, nz + 170], [560, nz + 270], [-190, nz + 300], [-260, nz + 210]], 330);
const nacelleFront = side([[-165, nz], [165, nz], [165, nz + 220], [120, nz + 300], [-120, nz + 300], [-165, nz + 220]], 900, 160);
add('nacelle', nacelleSide.intersect(nacelleFront).color(composite));
add('yaw-ring', turned([[0, -40], [118, -40], [118, 0], [0, 0]]).translate(0, 0, nz + 10).color(fittings));
// Roof cooler: frame with vertical fins at the rear.
for (const [z0, z1] of [[nz + 255, nz + 275], [nz + 400, nz + 420]]) add(`cooler-rail-${z0}`, side([[-150, z0], [150, z0], [150, z1], [-150, z1]], 60, 470).color(fittings));
for (let i = 0; i < 6; i++) add(`cooler-fin-${i}`, side([[-130 + i * 52, nz + 270], [-108 + i * 52, nz + 270], [-108 + i * 52, nz + 405], [-130 + i * 52, nz + 405]], 70, 470).color(towerPaint));
// Met mast with cup anemometer and wind vane, and the aviation beacons.
add('met-mast', tube([0, 380, nz + 290], [0, 380, nz + 470], 7).color(fittings));
add('met-arm', tube([-110, 380, nz + 470], [110, 380, nz + 470], 6).color(fittings));
add('anemometer-hub', turned([[0, 0], [10, 0], [10, 30], [0, 30]]).translate(-110, 380, nz + 470).color(fittings));
for (const a of [0, 120, 240]) {
  const r = (a * Math.PI) / 180;
  add(`anemometer-cup-${a}`, turned([[0, 0], [14, 0], [14, 14], [0, 14]]).rotateX(90).translate(-110 + 32 * Math.cos(r), 380 + 32 * Math.sin(r), nz + 505).color(fittings));
}
add('wind-vane', side([[95, nz + 475], [160, nz + 490], [160, nz + 540], [110, nz + 520]], 6, 380).color(fittings));
for (const x of [-120, 120]) add(`aviation-light-${x}`, turned([[0, 0], [16, 0], [16, 22], [8, 34], [0, 34]]).translate(x, 300, nz + 290).color(warningPaint));

// ---- Rotor: spinner, hub and three blades ----
const hubY = -370;
const hubZ = nz + 150;
add('spinner', turned([[0, 0], [158, 0], [164, 60], [148, 150], [108, 225], [52, 268], [0, 282]]).rotateX(90).translate(0, -260, hubZ).color(composite));
add('main-shaft', turned([[0, 0], [70, 0], [70, 40], [0, 40]]).rotateX(90).translate(0, -230, hubZ).color(fittings));
for (const a of [0, 120, 240]) {
  const place = (shape) => shape.rotateY(a).translate(0, hubY, hubZ);
  add(`blade-${a}`, place(bladeBody()).color(composite));
  add(`blade-tip-${a}`, place(bladeTip()).color(warningPaint));
  add(`blade-root-ring-${a}`, place(turned([[0, root - 10], [72, root - 10], [72, root + 25], [0, root + 25]])).color(fittings));
}

return p.model();
