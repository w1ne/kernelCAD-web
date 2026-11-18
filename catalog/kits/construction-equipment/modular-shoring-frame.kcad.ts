// SPDX-License-Identifier: CC0-1.0
// Stackable shoring frame with paired standards, cross braces and foot plates.
meta({
  name: "modular-shoring-frame",
  license: 'CC0-1.0',
  title: "Modular shoring frame",
  description: "Stackable shoring frame with paired standards, cross braces and foot plates. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('modular-shoring-frame');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('standard--1--1', cylinder(1250, 48, 8).translate(-296.4, -151.2, 0), structuralSteelColor);
add('standard--1-1', cylinder(1250, 48, 8).translate(-296.4, 151.2, 0), structuralSteelColor);
add('standard-1--1', cylinder(1250, 48, 8).translate(296.4, -151.2, 0), structuralSteelColor);
add('standard-1-1', cylinder(1250, 48, 8).translate(296.4, 151.2, 0), structuralSteelColor);
add('crossbar-front-0', box(639.6, 32, 32, true).translate(0, -155.4, 76), structuralSteelColor);
add('crossbar-side-0', box(32, 319.2, 32, true).translate(-296.4, 0, 76), structuralSteelColor);
add('crossbar-front-1', box(639.6, 32, 32, true).translate(0, -155.4, 413.5), structuralSteelColor);
add('crossbar-side-1', box(32, 319.2, 32, true).translate(-296.4, 0, 413.5), structuralSteelColor);
add('crossbar-front-2', box(639.6, 32, 32, true).translate(0, -155.4, 751), structuralSteelColor);
add('crossbar-side-2', box(32, 319.2, 32, true).translate(-296.4, 0, 751), structuralSteelColor);
add('crossbar-front-3', box(639.6, 32, 32, true).translate(0, -155.4, 1088.5), structuralSteelColor);
add('crossbar-side-3', box(32, 319.2, 32, true).translate(-296.4, 0, 1088.5), structuralSteelColor);
add('head-plate', box(811.2, 394.8, 55, true).translate(0, 0, 1222.5), equipmentPaintColor);

return p.model();
