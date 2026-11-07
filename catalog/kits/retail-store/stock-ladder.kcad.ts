// SPDX-License-Identifier: CC0-1.0
// Rolling stock ladder (warehouse / back-of-store platform ladder).
// What makes it a rolling ladder rather than a shelf: raked front stiles with
// three ribbed treads and anti-slip nosings climbing to a top platform, vertical
// rear legs, triangular side gussets, a waist-high handrail cage around the
// platform that continues down the stiles, rubber feet at the front and
// spring-loaded casters at the rear so it rolls only when tipped back.
// Generic visualization geometry at real size (about 640 mm wide, 1.0 m deep,
// 0.9 m to the platform, 1.6 m to the handrail), millimetres, Z up, steps facing
// -Y, floor on z = 0.
meta({
  name: 'stock-ladder',
  license: 'CC0-1.0',
  title: 'Stock ladder',
  description: 'Rolling stock ladder: raked front stiles with three ribbed treads and anti-slip nosings, top platform, vertical rear legs with side gussets, rubber front feet and rear casters, with a full handrail cage or as a low step stand without rails. Material controls: powder-coated frame, aluminium treads, tread nosing, rubber. Clean-store and night-restock presets.',
  tags: ['rolling ladder', 'stock ladder', 'platform ladder', 'step ladder', 'warehouse', 'retail', 'grocery', 'shop', 'low poly', 'scene prop', 'CC0'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const handrail = param('handrail', 'full', { choices: ['full', 'none'], label: 'Handrail' });
const powderCoat = param('powderCoat', '#d9a02d', { label: 'Frame (powder-coated steel)' });
const aluminium = param('aluminium', '#b9c3c5', { label: 'Ribbed aluminium treads' });
const nosing = param('nosing', '#2f3437', { label: 'Anti-slip tread nosing' });
const rubber = param('rubber', '#1f2326', { label: 'Feet, casters and grips (rubber)' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    aluminium: '#c4cdd0',
    nosing: '#f2c230',
    rubber: '#40474b',
  },
  nightRestock: {
    powderCoat: '#354750',
    aluminium: '#6b7a80',
    nosing: '#d8a12a',
    rubber: '#262b2e',
  },
});

const p = assembly('stock-ladder');
const add = (name, shape) => p.part(name, shape.scale(scale));

const orient = (shape, d, at) => {
  const len = Math.hypot(d[0], d[1], d[2]);
  return shape
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(at[0], at[1], at[2]);
};
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  return orient(extrudePolygon(circle(r, n), Math.hypot(d[0], d[1], d[2])), d, p0);
};
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Extrude a (y, z) side profile across X, centred on x0.
const side = (pts, width, x0) => extrudePolygon(pts, width).rotateX(90).rotateZ(90).translate(x0 - width / 2, 0, 0);

const X = 300;
const PZ = 900;
const FOOT = [-560, 30];
const STILE_TOP = [-150, PZ];
const REAR_Y = 330;
const stile = (u) => [FOOT[0] + (STILE_TOP[0] - FOOT[0]) * u, FOOT[1] + (STILE_TOP[1] - FOOT[1]) * u];

for (const s of [-1, 1]) {
  const x = s * X;
  // Raked front stile, vertical rear leg and the bracing between them.
  add(`stile-${s}`, rod([x, FOOT[0], FOOT[1]], [x, STILE_TOP[0], PZ], 18).color(powderCoat));
  add(`rear-leg-${s}`, rod([x, REAR_Y, 70], [x, REAR_Y, PZ], 18).color(powderCoat));
  add(`platform-rail-${s}`, rod([x, STILE_TOP[0], PZ - 10], [x, REAR_Y, PZ - 10], 16).color(powderCoat));
  add(`base-rail-${s}`, rod([x, stile(0.12)[0], stile(0.12)[1]], [x, REAR_Y, 110], 14).color(powderCoat));
  add(`diagonal-${s}`, rod([x, stile(0.45)[0], stile(0.45)[1]], [x, REAR_Y, 420], 12).color(powderCoat));
  // Triangular gusset under the platform.
  add(`gusset-${s}`, side([[REAR_Y - 200, PZ - 20], [REAR_Y, PZ - 20], [REAR_Y, PZ - 220]], 6, x).color(powderCoat));
  // Rubber foot at the front, spring caster at the rear.
  add(`foot-${s}`, side([[FOOT[0] - 50, 0], [FOOT[0] + 40, 0], [FOOT[0] + 25, 45], [FOOT[0] - 30, 45]], 50, x).color(rubber));
  add(`caster-stem-${s}`, turned([[0, 0], [16, 0], [16, 40], [0, 40]]).translate(x, REAR_Y, 45).color(powderCoat));
  add(`caster-wheel-${s}`, turned([[0, -12], [32, -12], [36, 0], [32, 12], [0, 12]]).rotateY(90).translate(x, REAR_Y, 36).color(rubber));
}
add('rear-crossbar', rod([-X, REAR_Y, 110], [X, REAR_Y, 110], 14).color(powderCoat));
add('rear-crossbar-high', rod([-X, REAR_Y, 520], [X, REAR_Y, 520], 12).color(powderCoat));

// Three ribbed treads with nosings, then the platform.
const treadDepth = 200;
const ribbed = (y0, z0, depth, tag, partName) => {
  add(partName, box(2 * X - 30, depth, 12, true).translate(0, y0 + depth / 2, z0 - 6).color(aluminium));
  for (let r = 1; r < 5; r += 1) {
    add(`${tag}-rib-${r}`, box(2 * X - 50, 8, 6, true).translate(0, y0 + 10 + (r * (depth - 20)) / 5, z0 + 3).color(aluminium));
  }
  add(`${tag}-nosing`, side([[y0 - 6, z0 - 22], [y0 + 30, z0 - 22], [y0 + 30, z0 + 4], [y0 - 6, z0 + 4]], 2 * X - 30, 0).color(nosing));
};
for (let i = 1; i <= 3; i += 1) {
  const [y, z] = stile(i / 4);
  ribbed(y - 40, z, treadDepth, `tread-${i}`, `tread-${i}`);
}
ribbed(STILE_TOP[0] - 20, PZ, REAR_Y - STILE_TOP[0] + 40, 'platform', 'top-platform');
add('platform-kick', box(2 * X, 8, 90, true).translate(0, REAR_Y + 20, PZ + 45).color(powderCoat));

// Handrail cage: rails rise from the second tread along the stiles to waist
// height, run back round the platform, with mid rails and rubber grips.
if (handrail.value === 'full') {
  const TOP = PZ + 700;
  for (const s of [-1, 1]) {
    const x = s * X;
    const start = stile(0.5);
    const bend = [x, STILE_TOP[0] - 40, TOP];
    add(`handrail-rake-${s}`, rod([x, start[0], start[1] + 10], bend, 15).color(powderCoat));
    add(`handrail-top-${s}`, rod(bend, [x, REAR_Y, TOP], 15).color(powderCoat));
    add(`handrail-post-${s}`, rod([x, REAR_Y, PZ], [x, REAR_Y, TOP], 15).color(powderCoat));
    add(`handrail-mid-${s}`, rod([x, lerp(bend, [x, start[0], start[1]], 0.45)[1], PZ + 350], [x, REAR_Y, PZ + 350], 11).color(powderCoat));
    add(`grip-${s}`, rod(lerp([x, start[0], start[1]], bend, 0.45), lerp([x, start[0], start[1]], bend, 0.85), 21).color(rubber));
  }
  add('handrail-rear', rod([-X, REAR_Y, PZ + 700], [X, REAR_Y, PZ + 700], 15).color(powderCoat));
  add('handrail-rear-mid', rod([-X, REAR_Y, PZ + 350], [X, REAR_Y, PZ + 350], 11).color(powderCoat));
}

return p.model();
