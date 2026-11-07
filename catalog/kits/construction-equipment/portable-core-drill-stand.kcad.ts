// SPDX-License-Identifier: CC0-1.0
// Anchored core-drilling rig with guide column, sliding carriage and base plate.
meta({
  name: "portable-core-drill-stand",
  license: 'CC0-1.0',
  title: "Portable core drill stand",
  description: "Anchored core-drilling rig with guide column, sliding carriage and base plate. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('portable-core-drill-stand');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('drill-base', box(486, 400, 55, true).translate(0, 0, 27.5), equipmentPaintColor);
add('guide-column', box(60, 60, 1049.6, true).translate(0, 0, 579.8), equipmentPaintColor);
add('drill-carriage', box(172.8, 160, 200, true).translate(0, 0, 740), structuralSteelColor);
add('core-bit', cylinder(435.2, 48, 10).translate(0, 0, 256), equipmentPaintColor);
add('feed-handle', box(226.8, 35, 35, true).translate(-205.2, 0, 631.9), structuralSteelColor);

return p.model();
