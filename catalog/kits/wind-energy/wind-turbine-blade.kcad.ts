// SPDX-License-Identifier: CC0-1.0
// Wind turbine blade: one rotor blade stood on its root for inspection or
// storage. What makes it one: a round, bolted root that flares into a wide
// shoulder at maximum chord, then a long airfoil that thins and twists towards
// a narrow tip -- plus the details a blade technician looks for: the root
// flange with its ring of T-bolt studs, the pitch-zero mark, a darker
// leading-edge protection strip, the lightning receptor near the tip and the
// red warning band.
// Stylized at the wind-energy kit's reduced scene scale (about 2.1 m long),
// millimetres, Z up, leading edge towards -X.
meta({
  name: "wind-turbine-blade",
  license: 'CC0-1.0',
  title: "Wind turbine blade",
  description: "Single rotor blade standing on its bolted root: lofted, twisted airfoil from a round root through a wide shoulder to a slim tip, root flange with T-bolt studs and pitch mark, leading-edge protection strip, lightning receptor and warning tip band, on a steel root stand. Material controls: blade composite, leading-edge tape, warning paint, root steel and stand paint; weathered, highVisibility and unpaintedTip presets.",
  tags: ['wind', 'wind turbine', 'blade', 'rotor blade', 'airfoil', 'composite', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const composite = param('composite', '#f1f2ee', { label: 'Blade composite' });
const edgeTape = param('edgeTape', '#b9bdb8', { label: 'Leading-edge protection tape' });
const warningPaint = param('warningPaint', '#c9342c', { label: 'Warning paint (tip band, pitch mark)' });
const rootSteel = param('rootSteel', '#5d676b', { label: 'Root flange and studs steel' });
const standPaint = param('standPaint', '#e0a526', { label: 'Root stand paint' });

presets({
  weathered: { composite: '#d9d8cf', edgeTape: '#8f918b', warningPaint: '#9b4c42', rootSteel: '#6b6a62', standPaint: '#b48a3a' },
  highVisibility: { composite: '#ffffff', edgeTape: '#d2d6d2', warningPaint: '#ef6a1c', rootSteel: '#384146', standPaint: '#f2c21b' },
  unpaintedTip: { warningPaint: '#f1f2ee' },
});

const BLADE_TURN = -45;
const p = assembly("wind-turbine-blade");
const add = (name, shape) => p.part(name, shape.scale(scale));
// The blade is turned on its root so the broad face, not the edge, faces the viewer.
const addBlade = (name, shape) => add(name, shape.rotateZ(BLADE_TURN));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const toPath = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
const rot = (pts, deg) => {
  const a = (deg * Math.PI) / 180;
  return pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
};

// Airfoil in chord units: leading edge towards -X, thick camber on +Y.
const AIRFOIL = [[0.7, 0.01], [0.45, 0.3], [0.15, 0.5], [-0.1, 0.48], [-0.25, 0.3], [-0.3, 0], [-0.25, -0.25], [-0.1, -0.35], [0.15, -0.32], [0.45, -0.15]];
// [z, chord, thickness, twist, roundRadius]
const section = ([, chord, thick, twist, round]) => toPath(rot(round
  ? AIRFOIL.map((_, i) => [round * Math.cos((2 * Math.PI * i) / 10), round * Math.sin((2 * Math.PI * i) / 10)])
  : AIRFOIL.map(([u, v]) => [u * chord, (v * thick) / 0.5]), twist));
const loftRows = (rows) => section(rows[0]).loft(rows.slice(1).map(section), {
  planes: rows.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: false,
});

const z0 = 300;
const L = 1800;
const rows = [
  [z0, 0, 0, 0, 88],
  [z0 + 0.06 * L, 0, 0, 0, 88],
  [z0 + 0.2 * L, 360, 130, 14, 0],
  [z0 + 0.42 * L, 270, 72, 8, 0],
  [z0 + 0.7 * L, 180, 42, 3, 0],
  [z0 + 0.9 * L, 128, 28, 1, 0],
];
const tipRows = [rows[5], [z0 + 0.97 * L, 86, 18, 0, 0], [z0 + L, 40, 10, 0, 0]];
addBlade('blade', loftRows(rows).color(composite));
addBlade('tip-band', loftRows(tipRows).color(warningPaint));

// Leading-edge protection: a thin strip riding the nose of the outer blade,
// from mid-span to the start of the tip band.
const lePts = (chord, thick, twist) => rot([[-0.31 * chord - 4, 0], [-0.27 * chord, (0.22 * thick) / 0.5], [-0.27 * chord, (-0.2 * thick) / 0.5]], twist);
const leRows = rows.slice(3);
addBlade('leading-edge-tape', toPath(lePts(leRows[0][1], leRows[0][2], leRows[0][3]))
  .loft(leRows.slice(1).map(([, c, t, tw]) => toPath(lePts(c, t, tw))), {
    planes: leRows.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })),
    ruled: true,
  }).color(edgeTape));

// Lightning receptor: a small metal disc on the suction face near the tip.
addBlade('lightning-receptor', turned([[0, 0], [11, 0], [11, 6], [0, 6]]).rotateX(-90).translate(10, 18, z0 + 0.86 * L).color(rootSteel));

// Root: flange, T-bolt studs and pitch-zero mark.
add('root-flange', turned([[60, z0 - 30], [100, z0 - 30], [100, z0 + 8], [60, z0 + 8]]).color(rootSteel));
const studs = 14;
for (let i = 0; i < studs; i++) {
  const a = (2 * Math.PI * i) / studs;
  add(`stud-${i}`, turned([[0, 0], [6, 0], [6, 70], [0, 70]]).translate(80 * Math.cos(a), 80 * Math.sin(a), z0 - 100).color(rootSteel));
}
addBlade('pitch-mark', extrudePolygon([[-6, 0], [6, 0], [6, 60], [-6, 60]], 3).rotateX(90).translate(0, -88, z0 + 30).color(warningPaint));

// Root stand: a square steel frame with a ring seat the studs drop into.
add('stand-seat', turned([[70, z0 - 70], [130, z0 - 70], [130, z0 - 30], [70, z0 - 30]]).color(standPaint));
for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
  add(`stand-leg-${sx}-${sy}`, extrudePolygon([[-18, -18], [18, -18], [18, 18], [-18, 18]], z0 - 70 - 30).translate(150 * sx, 150 * sy, 30).color(standPaint));
}
add('stand-base', extrudePolygon([[-200, -200], [200, -200], [200, 200], [-200, 200]], 30).color(standPaint));
add('stand-seat-web-x', extrudePolygon([[-170, -12], [170, -12], [170, 12], [-170, 12]], 30).translate(0, 0, z0 - 100).color(standPaint));
add('stand-seat-web-y', extrudePolygon([[-12, -170], [12, -170], [12, 170], [-12, 170]], 30).translate(0, 0, z0 - 100).color(standPaint));

return p.model();
