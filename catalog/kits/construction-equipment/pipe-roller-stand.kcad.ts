// SPDX-License-Identifier: CC0-1.0
// Adjustable pipe support stand with paired rollers, screw post and tripod feet.
meta({
  name: "pipe-roller-stand",
  license: 'CC0-1.0',
  title: "Pipe roller stand",
  description: "Adjustable pipe support stand with paired rollers, screw post and tripod feet. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
add('tripod-leg-0', box(42, 42, 660, true).translate(-94.5, -85, 330), equipmentPaintColor);
add('tripod-leg-1', box(42, 42, 660, true).translate(94.5, -85, 330), equipmentPaintColor);
add('tripod-leg-2', box(42, 42, 660, true).translate(0, 90, 330), equipmentPaintColor);
add('upright-post', cylinder(220, 46, 8).translate(0, 0, 598.4), equipmentPaintColor);
add('roller-left', cylinder(189, 50, 8).rotateX(90).translate(0, -5.5, 836), structuralSteelColor);
add('roller-right', cylinder(189, 50, 8).rotateX(90).translate(0, 194.5, 836), structuralSteelColor);

return p.model();
