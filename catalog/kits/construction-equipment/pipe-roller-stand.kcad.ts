// SPDX-License-Identifier: CC0-1.0
// Illustrative pipe stand with three splayed legs and two supported, parallel
// rollers. The height adjuster is an envelope; no load rating or screw mechanism.
meta({
  name: "pipe-roller-stand",
  license: 'CC0-1.0',
  title: "Pipe roller stand",
  description: "Illustrative pipe support stand with three splayed tripod legs, a height-adjuster envelope and paired parallel rollers carried on shafts and bored brackets. No load rating or adjustment mechanism. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('pipe-roller-stand');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
// Three spread ground contacts seat on the hub underside at Z=610.
for (const [index, angle] of [90, 210, 330].entries()) {
  add(`tripod-leg-${index}`, prismSideY([[210, 0], [252, 0], [82, 610], [40, 610]], -21, 21).rotateZ(angle));
}
add('tripod-hub', cylinder(50, 94, 12).translate(0, 0, 610));
add('upright-post', cylinder(100, 46, 12).translate(0, 0, 660));
add('roller-head-plate', box(280, 200, 24).translate(-140, -100, 760));

// The pipe lies along X. Two parallel X-axis rollers at Y=±65 cradle it;
// each axle runs through two real bracket bores instead of floating in space.
for (const [side, y] of [['left', -65], ['right', 65]] as const) {
  const roller = cylinder(220, 30, 16).hole('top', { u: 0, v: 0, diameter: 20, depth: 'through' })
    .rotateY(90).translate(-110, y, 835);
  add(`roller-${side}`, roller, structuralSteelColor);
  add(`roller-${side}-axle`, cylinder(260, 10, 12).rotateY(90).translate(-130, y, 835), structuralSteelColor);
  for (const [end, x] of [['front', -130], ['rear', 110]] as const) {
    const bracket = box(20, 50, 80).hole('left', { u: 0, v: 11, diameter: 20, depth: 'through' });
    add(`roller-${side}-${end}-bracket`, bracket.translate(x, y - 25, 784));
  }
}

return p.model();
