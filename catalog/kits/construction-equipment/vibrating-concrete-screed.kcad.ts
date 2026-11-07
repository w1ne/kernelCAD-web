// SPDX-License-Identifier: CC0-1.0
// Finishing beam with engine housing, end handles and a straight leveling blade.
meta({
  name: "vibrating-concrete-screed",
  license: 'CC0-1.0',
  title: "Vibrating concrete screed",
  description: "Finishing beam with engine housing, end handles and a straight leveling blade. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('vibrating-concrete-screed');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('screed-beam', box(70, 1550, 110, true).translate(0, 0, 55), structuralSteelColor);
add('vibrator-housing', box(190, 210, 150, true).translate(0, 0, 185), equipmentPaintColor);
add('handle-left', box(302.4, 38, 38, true).translate(-168, -558, 224), structuralSteelColor);
add('handle-right', box(302.4, 38, 38, true).translate(-168, 558, 224), structuralSteelColor);
add('eccentric-weight', cylinder(80, 58, 8).translate(0, 0, 310), equipmentPaintColor);

return p.model();
