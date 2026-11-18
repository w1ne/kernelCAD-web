// SPDX-License-Identifier: CC0-1.0
// Concrete finishing machine with twin guarded rotor pans, seat and control console.
meta({
  name: "ride-on-power-trowel",
  license: 'CC0-1.0',
  title: "Ride-on power trowel",
  description: "Concrete finishing machine with twin guarded rotor pans, seat and control console. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('ride-on-power-trowel');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('operator-platform', box(680, 504, 85, true).translate(0, 0, 202.5), equipmentPaintColor);
add('rotor-guard--1', cylinder(72, 230, 12).translate(-238, 0, 0), structuralSteelColor);
add('rotor-guard-1', cylinder(72, 230, 12).translate(238, 0, 0), structuralSteelColor);
add('seat-post', box(58, 58, 230, true).translate(-68, 0, 360), equipmentPaintColor);
add('seat', box(180, 160, 70, true).translate(-68, 0, 510), equipmentPaintColor);
add('control-console', box(200, 180, 125, true).translate(170, 0, 337.5), equipmentPaintColor);

return p.model();
