// SPDX-License-Identifier: CC0-1.0
// Fog nozzle: the combination fog/straight-stream nozzle on the end of an
// attack line. What makes it one: a swivel hose coupling with rocker lugs at
// the back, a ball-valve body opened by a bail handle that arcs over the top, a
// pistol grip hanging below, and a fat pattern-selector sleeve at the front
// ending in a rubber bumper ringed with fog teeth around the centre stem.
// Generic visualization geometry at about real size (about 300 mm long,
// bumper 96 mm across), millimetres, Z up, water flows along +X, lowest
// point on z = 0.
meta({
  name: "fog-nozzle",
  license: 'CC0-1.0',
  title: "Fog fire nozzle",
  description: "Combination fog nozzle: swivel hose coupling with rocker lugs, ball-valve body with an over-the-top bail handle, pistol grip, ribbed pattern-selector sleeve and a toothed rubber bumper around the fog stem. Material controls: nozzle metal, selector finish, rubber grip; weathered and highVisibility presets.",
  tags: ['fog nozzle', 'combination nozzle', 'fire nozzle', 'attack line', 'bail handle', 'fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const nozzleMetalColor = param('nozzleMetalColor', '#aeb8ba', { label: 'Nozzle metal (anodised aluminium)' });
const selectorFinishColor = param('selectorFinishColor', '#d2ad3e', { label: 'Selector sleeve and bail finish' });
const gripRubberColor = param('gripRubberColor', '#303539', { label: 'Rubber grip and bumper' });
presets({
  weathered: { nozzleMetalColor: '#858f91', selectorFinishColor: '#9b7e37', gripRubberColor: '#41423f' },
  highVisibility: { nozzleMetalColor: '#c4c8b8', selectorFinishColor: '#eedb59', gripRubberColor: '#303539' },
});

const p = assembly("fog-nozzle");
const parts = [];
const add = (name, shape) => parts.push([name, shape]);

// Turned profile [[radius, x], ...] about the nozzle axis (X).
const turnedX = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, x] of pts.slice(1)) pb = pb.lineTo(r, x);
  return pb.close().revolve().rotateY(90);
};
// Side profile [[x, z], ...] extruded symmetrically across Y.
const sideXZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

// Coupling and valve body on the axis.
add('swivel-coupling', turnedX([[0, -120], [36, -120], [38, -112], [38, -86], [32, -80], [0, -80]]).color(nozzleMetalColor));
for (const a of [0, 120, 240]) {
  add(`rocker-lug-${a}`, box(22, 10, 14, true).translate(-100, 0, 44).rotateX(a).color(nozzleMetalColor));
}
add('valve-body', turnedX([[0, -80], [30, -80], [34, -60], [34, -10], [28, 0], [0, 0]]).color(nozzleMetalColor));
add('valve-trunnion', turnedX([[0, -42], [12, -42], [12, 42], [0, 42]]).rotateZ(90).translate(-40, 0, 0).color(nozzleMetalColor));
add('barrel', turnedX([[0, 0], [26, 0], [26, 60], [0, 60]]).color(nozzleMetalColor));

// Pattern-selector sleeve with grip ribs.
add('selector-sleeve', turnedX([[26, 40], [38, 40], [40, 52], [40, 120], [46, 132], [46, 150], [26, 150]]).color(selectorFinishColor));
for (let i = 0; i < 4; i++) {
  const x = 60 + i * 15;
  add(`selector-rib-${i}`, turnedX([[38, x], [43, x], [43, x + 6], [38, x + 6]]).color(selectorFinishColor));
}
// Rubber bumper and its fog teeth around the centre stem.
add('bumper', turnedX([[34, 150], [48, 150], [48, 180], [40, 186], [34, 186]]).color(gripRubberColor));
for (let i = 0; i < 12; i++) {
  add(`fog-tooth-${i}`, box(12, 8, 8, true).translate(190, 0, 41).rotateX(i * 30).color(gripRubberColor));
}
add('fog-stem', turnedX([[0, 140], [16, 140], [20, 176], [12, 184], [0, 184]]).color(nozzleMetalColor));

// Bail handle: two side arms off the trunnion joined by a bar over the top.
for (const s of [-1, 1]) {
  add(`bail-arm-${s}`, sideXZ([
    [-46, -8], [-34, -8], [0, 54], [40, 70], [40, 80], [-6, 66],
  ], 6).translate(0, s * 37, 0).color(selectorFinishColor));
}
add('bail-grip', turnedX([[0, -40], [10, -40], [10, 40], [0, 40]]).rotateZ(90).translate(36, 0, 75).color(gripRubberColor));

// Pistol grip hanging below and slightly back from the valve.
add('pistol-grip', sideXZ([
  [-74, -24], [-34, -24], [-30, -40], [-36, -120], [-46, -132], [-74, -130], [-82, -118], [-68, -40],
], 32).color(gripRubberColor));
add('grip-ferrule', box(48, 36, 10, true).translate(-52, 0, -28).color(nozzleMetalColor));

let lowest = Infinity;
for (const [, shape] of parts) lowest = Math.min(lowest, (await shape.boundingBox({ exact: true })).min[2]);
for (const [name, shape] of parts) p.part(name, shape.translate(0, 0, -lowest).scale(scale));

return p.model();
