// SPDX-License-Identifier: CC0-1.0
// Jobsite bar cutter with reinforced base, cutting head, guard and foot control.
meta({
  name: "rebar-cutting-machine",
  license: 'CC0-1.0',
  title: "Rebar cutting machine",
  description: "Jobsite bar cutter with reinforced base, cutting head, guard and foot control. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('rebar-cutting-machine');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('machine-base', box(576, 395.2, 110, true).translate(0, 0, 55), equipmentPaintColor);
add('work-table', box(720, 405.6, 80, true).translate(0, 0, 150), equipmentPaintColor);
add('motor-case', box(180, 249.6, 210.8, true).translate(-158.4, 0, 295.4), equipmentPaintColor);
add('cutting-head', box(180, 286, 297.6, true).translate(216, 0, 378.8), equipmentPaintColor);
add('blade-guard', box(120, 24, 100, true).translate(216, -156, 285.6), structuralSteelColor);

return p.model();
