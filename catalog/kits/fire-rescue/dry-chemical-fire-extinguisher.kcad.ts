// SPDX-License-Identifier: CC0-1.0
// Dry chemical fire extinguisher: the stored-pressure ABC unit hung on every
// corridor wall and apparatus bracket. What makes it one: a red steel cylinder
// with a domed shoulder standing on a rubber foot ring, a valve head carrying a
// squeeze lever above a fixed carry handle, a tamper-sealed pull pin, a round
// pressure gauge on the side of the valve, and a short discharge hose that runs
// down the side of the cylinder to a nozzle clipped into a bracket.
// Generic visualization geometry at about real size (cylinder 130 mm across,
// about 560 mm tall), millimetres, Z up, lever pointing -X, lowest point z = 0.
meta({
  name: "dry-chemical-fire-extinguisher",
  license: 'CC0-1.0',
  title: "Dry chemical fire extinguisher",
  description: "Stored-pressure dry chemical extinguisher: domed red steel cylinder on a rubber foot ring, wrap label, valve head with squeeze lever over a fixed carry handle, tamper-sealed pull pin, side pressure gauge, and a discharge hose running down the cylinder to a nozzle in a clip. Material controls: safety band, rubber seals, steel fittings, vessel paint; weathered and highVisibility presets.",
  tags: ['fire extinguisher', 'ABC extinguisher', 'dry chemical', 'fire safety', 'fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const safetyBandColor = param('safetyBandColor', '#e5c84d', { label: 'Safety band, label and tamper seal' });
const sealRubberColor = param('sealRubberColor', '#303539', { label: 'Rubber foot, hose and nozzle' });
const steelworkColor = param('steelworkColor', '#aab5b9', { label: 'Steel valve, lever and handle' });
const vesselPaintColor = param('vesselPaintColor', '#bd3b32', { label: 'Vessel paint' });
presets({
  weathered: { safetyBandColor: '#b19e48', sealRubberColor: '#41423f', steelworkColor: '#858e91', vesselPaintColor: '#865048' },
  highVisibility: { safetyBandColor: '#f1df64', sealRubberColor: '#303539', steelworkColor: '#c4c7b7', vesselPaintColor: '#e27a24' },
});

const p = assembly("dry-chemical-fire-extinguisher");
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

const circle = (r, n, cx = 0, cy = 0) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
// Turned profile [[radius, z], ...] about Z, optionally only a sector.
const turned = (pts, angleDeg) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return angleDeg ? pb.close().revolve({ angleDeg }) : pb.close().revolve();
};
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

// Cylinder: flat-bottomed steel shell with a domed shoulder up to the neck.
add('pressure-vessel', turned([
  [0, 6], [60, 6], [65, 20], [65, 390], [62, 418], [52, 440], [36, 454], [20, 460], [0, 461],
]).color(vesselPaintColor));
add('foot-ring', turned([[52, 0], [67, 0], [68, 26], [55, 26]]).color(sealRubberColor));
// Wrap label on the front half of the cylinder, with a red instruction panel.
add('wrap-label', turned([[64.5, 160], [66.5, 160], [66.5, 330], [64.5, 330]], 150).rotateZ(-175).color(safetyBandColor));
add('label-panel', turned([[65, 200], [67.4, 200], [67.4, 290], [65, 290]], 60).rotateZ(-130).color(vesselPaintColor));

// Valve head: brass-look collar, body with forward discharge port.
add('valve-collar', turned([[0, 455], [26, 455], [26, 478], [22, 484], [0, 484]]).color(steelworkColor));
add('valve-body', sideXZ([
  [-30, 480], [32, 480], [42, 492], [62, 498], [66, 512], [40, 516], [28, 534], [-30, 534],
], 42).color(steelworkColor));
add('gauge', turned([[0, 0], [21, 0], [21, 12], [0, 12]]).rotateX(-90).translate(6, 21, 505).color(steelworkColor));
add('gauge-face', turned([[0, 0], [17, 0], [17, 2], [0, 2]]).rotateX(-90).translate(6, 32, 505).color(safetyBandColor));

// Fixed carry handle below, squeeze lever above, pivoting on the valve body.
add('carry-handle', sideXZ([
  [-20, 504], [-150, 492], [-160, 482], [-152, 474], [-30, 484],
], 26).color(steelworkColor));
add('squeeze-lever', sideXZ([
  [10, 538], [24, 548], [10, 556], [-60, 566], [-150, 556], [-158, 546], [-148, 540], [-60, 546],
], 30).color(steelworkColor));
add('pivot-pin', rod([16, -24, 544], [16, 24, 544], 5, 8).color(steelworkColor));
add('pull-pin', rod([-24, -32, 522], [-24, 30, 522], 3, 6).color(steelworkColor));
add('pull-ring', turned(circle(3, 6, 14, 0)).rotateX(90).translate(-24, -46, 522).color(safetyBandColor));
add('tamper-seal', box(8, 4, 16, true).translate(-24, -26, 530).color(safetyBandColor));

// Discharge hose: off the valve port, over the shoulder and down the side.
const hosePts = [[60, 0, 506], [84, -14, 494], [96, -28, 460], [92, -40, 380], [84, -48, 290], [80, -52, 230]];
for (let i = 0; i < hosePts.length - 1; i++) add(`hose-${i}`, rod(hosePts[i], hosePts[i + 1], 9).color(sealRubberColor));
for (let i = 1; i < hosePts.length - 1; i++) add(`hose-bend-${i}`, sphere(9).translate(...hosePts[i]).color(sealRubberColor));
add('hose-ferrule', turned([[0, 0], [12, 0], [12, 22], [0, 22]]).translate(60, 0, 488).color(steelworkColor));
// Horn nozzle pointing down, held by a clip strapped to the cylinder.
add('nozzle', turned([[0, 0], [16, 0], [12, 50], [10, 76], [0, 76]]).rotateX(180).translate(80, -52, 236).color(sealRubberColor));
add('nozzle-clip', turned([[64.5, 186], [68, 186], [68, 204], [64.5, 204]], 40).rotateZ(-56).color(steelworkColor));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
