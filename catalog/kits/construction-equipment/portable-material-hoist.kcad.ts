// SPDX-License-Identifier: CC0-1.0
// Compact construction hoist with mast, carriage platform, winch and stabilizing feet.
meta({
  name: "portable-material-hoist",
  license: 'CC0-1.0',
  title: "Portable material hoist",
  description: "Compact construction hoist with mast, carriage platform, winch and stabilizing feet. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('portable-material-hoist');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(541.2, 557.6, 90, true).translate(0, 0, 45), structuralSteelColor);
add('mast', box(95, 95, 1480, true).translate(0, 81.6, 830), structuralSteelColor);
add('carriage', box(501.6, 60, 518, true).translate(0, -149.6, 409), structuralSteelColor);
add('winch', cylinder(150, 110, 10).translate(0, 244.8, 1332), structuralSteelColor);
add('stabilizer--1', box(858, 50, 55, true).translate(0, -353.6, 27.5), equipmentPaintColor);
add('stabilizer-1', box(858, 50, 55, true).translate(0, 353.6, 27.5), equipmentPaintColor);

return p.model();
