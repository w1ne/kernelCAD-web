// SPDX-License-Identifier: CC0-1.0
// Reusable wall-form panel with framed face, stiffeners and corner clamps.
meta({
  name: "concrete-formwork-panel",
  license: 'CC0-1.0',
  title: "Concrete formwork panel",
  description: "Reusable wall-form panel with framed face, stiffeners and corner clamps. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
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
const p = assembly('concrete-formwork-panel');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('form-face', box(900, 45, 1550, true).translate(0, 0, 775), equipmentPaintColor);
add('vertical-strongback--1', box(45, 61.2, 1550, true).translate(-396, 75.6, 775), structuralSteelColor);
add('vertical-strongback-1', box(45, 61.2, 1550, true).translate(396, 75.6, 775), structuralSteelColor);
add('horizontal-waler-0', box(972, 42, 45, true).translate(0, 75.6, 22.5), structuralSteelColor);
add('horizontal-waler-1', box(972, 42, 45, true).translate(0, 75.6, 425.5), structuralSteelColor);
add('horizontal-waler-2', box(972, 42, 45, true).translate(0, 75.6, 828.5), structuralSteelColor);
add('horizontal-waler-3', box(972, 42, 45, true).translate(0, 75.6, 1231.5), structuralSteelColor);

return p.model();
