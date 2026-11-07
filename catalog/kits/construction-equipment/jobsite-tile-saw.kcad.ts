// SPDX-License-Identifier: CC0-1.0
// Water-cooled tile saw on a folding stand with sliding table and blade guard.
meta({
  name: "jobsite-tile-saw",
  license: 'CC0-1.0',
  title: "Jobsite tile saw",
  description: "Water-cooled tile saw on a folding stand with sliding table and blade guard. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('jobsite-tile-saw');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('tool-table', box(950, 442, 58, true).translate(0, 0, 513), equipmentPaintColor);
add('stand-leg--1', box(42, 42, 475.2, true).translate(-361, 0, 237.6), structuralSteelColor);
add('stand-leg-1', box(42, 42, 475.2, true).translate(361, 0, 237.6), structuralSteelColor);
add('motor-head', box(237.5, 325, 246.4, true).translate(-266, 0, 686.4), equipmentPaintColor);
add('sliding-carriage', box(323, 351, 48, true).translate(76, 0, 569.6), structuralSteelColor);
add('tile-blade', cylinder(45, 115, 10).translate(266, 0, 536.8), structuralSteelColor);
add('water-pan', box(836, 455, 38, true).translate(0, 0, 124.6), equipmentPaintColor);

return p.model();
