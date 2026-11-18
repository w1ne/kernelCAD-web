// SPDX-License-Identifier: CC0-1.0
// Portable concrete vibrator with motor case, flexible shaft and immersion head.
meta({
  name: "concrete-vibrator-needle",
  license: 'CC0-1.0',
  title: "Concrete vibrator and needle",
  description: "Portable concrete vibrator with motor case, flexible shaft and immersion head. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('concrete-vibrator-needle');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('motor-base', box(357, 173.6, 85, true).translate(0, 0, 42.5), equipmentPaintColor);
add('motor-case', box(306, 154, 189, true).translate(0, 0, 179.5), equipmentPaintColor);
add('motor-shaft', cylinder(306, 48, 8).rotateY(90).translate(-153, 0, 155), structuralSteelColor);
add('flexible-shaft', box(289, 28, 28, true).translate(272, 0, 140), structuralSteelColor);
add('vibrator-head', cylinder(190, 42, 8).rotateY(90).translate(416.5, 0, 126), equipmentPaintColor);

return p.model();
