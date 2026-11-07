// SPDX-License-Identifier: CC0-1.0
// Hydraulic rescue cutter: the extrication shear used to cut roof pillars and
// door hinges. What makes it one (and not a spreader): the same long cylinder
// body, carry hoop and rear control handle, but at the front a forged yoke
// carries two short, hooked blades that cross over each other on one pivot
// bolt, their curved cutting edges forming a round C-shaped mouth that pulls
// the pillar in toward the pivot.
// Generic visualization geometry at about real size (about 850 mm long, mouth
// about 120 mm across), millimetres, Z up, blades along +X, lowest point on
// z = 0.
meta({
  name: "hydraulic-rescue-cutter",
  license: 'CC0-1.0',
  title: "Hydraulic rescue cutter",
  description: "Hydraulic rescue cutter: long cylinder body, forged yoke with two crossed hooked blades on one pivot bolt forming a round C-shaped cutting mouth, carry hoop with rubber grip over the body, and rear control handle with star-knob valve and twin hose couplings. Material controls: tool coating, steel and aluminum, safety marking, rubber grip; weathered and highVisibility presets.",
  tags: ['rescue cutter', 'hydraulic shear', 'jaws of life', 'extrication', 'hydraulic rescue tool', 'fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating (powder-coated body)' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Forged steel blades and aluminium fittings' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking (pivot nut, valve knob)' });
const gripRubberColor = param('gripRubberColor', '#2a2f33', { label: 'Rubber grips' });
presets({
  weathered: { toolCoatingColor: '#956438', steelColor: '#858f92', safetyMarkingColor: '#874e49', gripRubberColor: '#3d3e3b' },
  highVisibility: { toolCoatingColor: '#e8b331', steelColor: '#c3c6b6', safetyMarkingColor: '#f0db56', gripRubberColor: '#22272a' },
});

const p = assembly("hydraulic-rescue-cutter");
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
// The same profile turned about the tool axis (X).
const turnedX = (pts) => turned(pts).rotateY(90);
// Plan outline [[x, y], ...] extruded symmetrically in Z.
const plate = (pts, t) => extrudePolygon(pts, t).translate(0, 0, -t / 2);
const mirrorY = (pts) => pts.map(([x, y]) => [x, -y]).reverse();

// Cylinder body, rear end cap and front gland.
add('cylinder-body', turnedX([[0, -440], [46, -440], [52, -420], [52, -60], [0, -60]]).color(toolCoatingColor));
add('end-cap', turnedX([[0, -470], [36, -470], [44, -440], [0, -440]]).color(steelColor));
add('gland', turnedX([[0, -60], [56, -60], [56, -10], [0, -10]]).color(steelColor));

// Forged yoke and pivot.
add('yoke', plate([[-20, -60], [60, -66], [124, -34], [124, 34], [60, 66], [-20, 60]], 64).color(steelColor));
add('pivot-pin', turned([[0, -46], [24, -46], [24, 46], [0, 46]]).translate(110, 0, 0).color(steelColor));
const hexNut = Array.from({ length: 6 }, (_, i) => [34 * Math.cos((Math.PI * i) / 3), 34 * Math.sin((Math.PI * i) / 3)]);
add('pivot-nut', extrudePolygon(hexNut, 14).translate(110, 0, 36).color(safetyMarkingColor));
add('pivot-head', turned([[0, 0], [32, 0], [32, 10], [0, 10]]).translate(110, 0, -46).color(safetyMarkingColor));

// Blades: two hooked shear blades crossing on the pivot, stacked in Z, their
// curved cutting edges making the round mouth.
const blade = [
  [70, -34], [120, -24], [170, 40], [240, 96], [320, 118], [380, 104], [420, 64],
  [432, 18], [410, 4], [392, 30], [356, 54], [296, 62], [226, 44], [166, 6], [120, -40], [80, -52],
];
add('blade-upper', plate(blade, 34).translate(0, 0, 18).color(steelColor));
add('blade-lower', plate(mirrorY(blade), 34).translate(0, 0, -18).color(steelColor));
// Painted spines along the back of each blade.
const spine = [[180, 54], [240, 96], [320, 112], [370, 98], [358, 86], [318, 96], [244, 78], [190, 40]];
add('spine-upper', plate(spine, 4).translate(0, 0, 37).color(toolCoatingColor));
add('spine-lower', plate(mirrorY(spine), 4).translate(0, 0, -37).color(toolCoatingColor));

// Carry hoop over the body with a rubber grip on top.
add('carry-hoop', turned(circle(13, 8, 130, 0), 180).rotateX(90).translate(-230, 0, 20).color(steelColor));
add('hoop-grip', turnedX([[0, -70], [19, -70], [19, 70], [0, 70]]).translate(-230, 0, 150).color(gripRubberColor));

// Rear control handle: grip bar across the back, star-knob dead-man valve.
add('rear-handle-post', turnedX([[0, -540], [20, -540], [20, -470], [0, -470]]).color(steelColor));
add('rear-handle', turned([[0, -120], [20, -120], [20, 120], [0, 120]]).rotateX(90).translate(-560, 0, 0).color(gripRubberColor));
add('valve-block', box(70, 70, 60, true).translate(-480, 0, 60).color(steelColor));
const star = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 22 : 40;
  const a = (Math.PI * i) / 5;
  return [r * Math.cos(a), r * Math.sin(a)];
});
add('star-knob', extrudePolygon(star, 20).translate(-480, 0, 90).color(safetyMarkingColor));
for (const s of [-1, 1]) {
  add(`hose-coupling-${s}`, turned([[0, 0], [14, 0], [14, 50], [10, 56], [0, 56]]).rotateY(-90).translate(-500, s * 26, -10).color(steelColor));
}

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
