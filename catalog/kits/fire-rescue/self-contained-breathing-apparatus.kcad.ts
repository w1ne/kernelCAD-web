// SPDX-License-Identifier: CC0-1.0
// Self-contained breathing apparatus (SCBA): the air pack a firefighter wears
// into smoke. What makes it one: a contoured backframe with a composite air
// cylinder strapped to it valve-down, padded shoulder straps arching over the
// top of the frame and down the chest, a wide waist belt with a centre buckle,
// the first-stage regulator at the cylinder valve, a high-pressure hose up the
// right strap to the gauge console, and a low-pressure hose up the left strap
// to the second-stage regulator that clips to the facepiece.
// Generic visualization geometry at about real size (about 680 mm tall,
// cylinder 165 mm across), millimetres, Z up, wearer faces +X, lowest point on
// z = 0.
meta({
  name: "self-contained-breathing-apparatus",
  license: 'CC0-1.0',
  title: "Self-contained breathing apparatus",
  description: "Firefighter SCBA air pack: contoured backframe, valve-down composite air cylinder with retaining bands, padded shoulder straps arching over the frame, waist belt with centre buckle, first-stage regulator with handwheel, high-pressure hose to a chest gauge console, and low-pressure hose to a clipped second-stage regulator. Material controls: harness webbing, air-cylinder finish, regulator hardware, breathing hose; weathered and highVisibility presets.",
  tags: ['SCBA', 'air pack', 'breathing apparatus', 'air cylinder', 'firefighter', 'fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const harnessColor = param('harnessColor', '#333a3e', { label: 'Harness webbing and padding' });
const cylinderColor = param('cylinderColor', '#d0b53d', { label: 'Air-cylinder finish (composite wrap)' });
const regulatorMetalColor = param('regulatorMetalColor', '#aeb8ba', { label: 'Regulator hardware and buckles' });
const hoseRubberColor = param('hoseRubberColor', '#262b2f', { label: 'Breathing hose and handwheel' });
presets({
  weathered: { harnessColor: '#41413d', cylinderColor: '#aa923c', regulatorMetalColor: '#899294', hoseRubberColor: '#3c3e3b' },
  highVisibility: { harnessColor: '#353a3c', cylinderColor: '#ebd456', regulatorMetalColor: '#c6c9b7', hoseRubberColor: '#262b2f' },
});

const p = assembly("self-contained-breathing-apparatus");
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Back-view outline [[y, z], ...] extruded across X.
const backYZ = (pts, t) => extrudePolygon(pts, t).rotateY(90).rotateX(90).translate(-t / 2, 0, 0);
// Side profile [[x, z], ...] extruded symmetrically across Y.
const sideXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
const hose = (name, pts, r) => {
  for (let i = 0; i < pts.length - 1; i++) add(`${name}-${i}`, rod(pts[i], pts[i + 1], r).color(hoseRubberColor));
  for (let i = 1; i < pts.length - 1; i++) add(`${name}-bend-${i}`, sphere(r).translate(...pts[i]).color(hoseRubberColor));
};

// Backframe: contoured plate, wide at the hips, narrow at the shoulders.
add('backframe', backYZ([
  [-150, 40], [150, 40], [165, 110], [135, 330], [112, 600], [80, 650], [-80, 650], [-112, 600], [-135, 330], [-165, 110],
], 22).color(harnessColor));
add('cylinder-cradle', backYZ([[-70, 60], [70, 60], [70, 100], [-70, 100]], 40).translate(-26, 0, 0).color(regulatorMetalColor));

// Air cylinder behind the frame, valve down, with two retaining bands.
const CX = -106;
add('air-cylinder', turned([
  [0, 0], [30, 2], [62, 18], [80, 46], [83, 80], [83, 500], [76, 540], [50, 566], [0, 574],
]).translate(CX, 0, 88).color(cylinderColor));
for (const z of [250, 470]) {
  add(`cylinder-band-${z}`, turned([[83, 0], [87, 0], [87, 46], [83, 46]]).translate(CX, 0, z).color(harnessColor));
  add(`band-buckle-${z}`, box(12, 40, 36, true).translate(CX - 88, 0, z + 23).color(regulatorMetalColor));
}
add('cylinder-valve', turned([[0, 0], [24, 0], [24, 50], [0, 50]]).translate(CX, 0, 40).color(regulatorMetalColor));
add('valve-handwheel', turned([[0, 0], [34, 0], [34, 16], [0, 16]]).rotateX(90).translate(CX, -26, 62).color(hoseRubberColor));

// Shoulder straps: arch over the top of the frame and run down the chest.
for (const s of [-1, 1]) {
  add(`shoulder-strap-${s}`, sideXZ([
    [-10, 520], [10, 640], [60, 680], [120, 660], [158, 590], [166, 300], [130, 300], [122, 580], [100, 624], [60, 638], [30, 610], [16, 520],
  ], 70).translate(0, s * 92, 0).color(harnessColor));
  add(`strap-adjuster-${s}`, box(12, 54, 40, true).translate(168, s * 92, 360).color(regulatorMetalColor));
}

// Waist belt wrapping forward from the hips to a centre buckle.
const belt = [
  [-4, 170], [110, 190], [210, 160], [262, 90], [270, 12], [240, 12], [230, 80], [190, 136], [108, 160], [-4, 140],
];
add('waist-belt-left', extrudePolygon(belt, 80).translate(0, 0, 40).color(harnessColor));
add('waist-belt-right', extrudePolygon(belt.map(([x, y]) => [x, -y]).reverse(), 80).translate(0, 0, 40).color(harnessColor));
add('belt-buckle', box(30, 60, 64, true).translate(266, 0, 80).color(regulatorMetalColor));

// First-stage regulator at the valve.
add('first-stage', turned([[0, 0], [26, 0], [26, 70], [0, 70]]).rotateX(90).translate(CX + 30, 35, 40).color(regulatorMetalColor));
// High-pressure hose up the right strap to the gauge console.
hose('hp-hose', [[CX + 30, -35, 40], [20, -120, 40], [120, -118, 140], [160, -110, 300], [176, -104, 380]], 7);
add('gauge-console', turned([[0, 0], [30, 0], [30, 26], [0, 26]]).rotateY(90).translate(176, -104, 400).color(regulatorMetalColor));
add('gauge-face', turned([[0, 0], [24, 0], [24, 3], [0, 3]]).rotateY(90).translate(202, -104, 400).color(cylinderColor));
// Low-pressure hose up the left strap to the clipped second-stage regulator.
hose('lp-hose', [[CX + 30, 35, 40], [20, 130, 60], [130, 126, 180], [168, 120, 300], [182, 112, 420]], 11);
add('second-stage', sideXZ([[176, 410], [230, 404], [240, 440], [226, 476], [180, 470]], 60).translate(0, 112, 0).color(regulatorMetalColor));
add('purge-button', turned([[0, 0], [16, 0], [16, 10], [0, 10]]).rotateY(90).translate(240, 112, 440).color(hoseRubberColor));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
