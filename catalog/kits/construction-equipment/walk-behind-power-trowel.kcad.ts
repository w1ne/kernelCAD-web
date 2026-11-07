// SPDX-License-Identifier: CC0-1.0
// Concrete finishing tool with circular blade guard, engine block and long control handle.
meta({
  name: "walk-behind-power-trowel",
  license: 'CC0-1.0',
  title: "Walk-behind power trowel",
  description: "Concrete finishing tool with circular blade guard, engine block and long control handle. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('walk-behind-power-trowel');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('trowel-guard', cylinder(72, 252, 12).translate(0, 0, 0), structuralSteelColor);
add('engine', cylinder(290, 125, 10).translate(0, 0, 135), equipmentPaintColor);
add('handle-post', box(55, 58, 220, true).translate(-134.4, 0, 390), structuralSteelColor);
add('control-handle', box(260, 55, 42, true).translate(-212.8, 0, 496), structuralSteelColor);
add('blade-guard', box(470.4, 470.4, 44, true).translate(0, 0, 22), structuralSteelColor);

return p.model();
