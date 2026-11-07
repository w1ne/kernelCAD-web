// SPDX-License-Identifier: CC0-1.0
// Hydraulic rescue spreader: the "jaws of life" used to force car doors and
// lift wreckage. What makes it one: a long hydraulic cylinder body, a forged
// yoke at the front carrying two long curved arms on a common pivot that open
// into a wide V, ribbed steel tips turned in toward each other, a big carry
// hoop over the body, and a rear control handle with the star-knob dead-man
// valve and the twin hose couplings.
// Generic visualization geometry at about real size (about 900 mm long, arms
// open about 600 mm at the tips), millimetres, Z up, tips along +X, lowest
// point on z = 0.
meta({
  name: "hydraulic-rescue-spreader",
  license: 'CC0-1.0',
  title: "Hydraulic rescue spreader",
  description: "Hydraulic rescue spreader: long cylinder body, forged yoke with two curved arms on a common pivot opening into a wide V, ribbed in-turned steel tips, carry hoop with rubber grip over the body, and rear control handle with star-knob valve and twin hose couplings. Material controls: tool coating, steel and aluminum, safety marking, rubber grip; weathered and highVisibility presets.",
  tags: ['rescue spreader', 'jaws of life', 'extrication', 'hydraulic rescue tool', 'fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating (powder-coated body)' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Forged steel arms and aluminium fittings' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking (pivot caps, valve knob)' });
const gripRubberColor = param('gripRubberColor', '#2a2f33', { label: 'Rubber grips' });
presets({
  weathered: { toolCoatingColor: '#956438', steelColor: '#858f92', safetyMarkingColor: '#874e49', gripRubberColor: '#3d3e3b' },
  highVisibility: { toolCoatingColor: '#e8b331', steelColor: '#c3c6b6', safetyMarkingColor: '#f0db56', gripRubberColor: '#22272a' },
});

const p = assembly("hydraulic-rescue-spreader");
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
add('yoke', plate([[-20, -60], [60, -66], [110, -34], [110, 34], [60, 66], [-20, 60]], 64).color(steelColor));
add('pivot-pin', turned([[0, -46], [24, -46], [24, 46], [0, 46]]).translate(96, 0, 0).color(steelColor));
for (const s of [-1, 1]) add(`pivot-cap-${s}`, turned([[0, 0], [30, 0], [30, 8], [0, 8]]).translate(96, 0, s > 0 ? 40 : -48).color(safetyMarkingColor));

// Arms: curved forged arms opening into a V, tips turned in.
const arm = [
  [80, 18], [150, 62], [260, 128], [380, 196], [480, 236], [560, 250], [600, 236],
  [606, 206], [560, 196], [470, 184], [370, 150], [250, 92], [140, 30], [110, 6],
];
add('arm-left', plate(arm, 68).color(steelColor));
add('arm-right', plate(mirrorY(arm), 68).color(steelColor));
// Painted arm flanks show the tool coating on both arms.
const flank = [[160, 56], [260, 124], [380, 190], [470, 228], [470, 190], [370, 156], [250, 98], [160, 40]];
for (const s of [-1, 1]) {
  add(`arm-flank-left-${s}`, plate(flank, 4).translate(0, 0, s * 35).color(toolCoatingColor));
  add(`arm-flank-right-${s}`, plate(mirrorY(flank), 4).translate(0, 0, s * 35).color(toolCoatingColor));
}
// Ribbed tips: grip teeth across the in-turned ends.
for (const s of [-1, 1]) {
  for (let i = 0; i < 4; i++) {
    add(`tip-rib-${s > 0 ? 'left' : 'right'}-${i}`, box(8, 26, 72, true).translate(566 + i * 12, s * (204 - i * 2), 0).color(steelColor));
  }
}

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
