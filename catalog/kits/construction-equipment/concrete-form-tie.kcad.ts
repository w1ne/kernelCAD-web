// SPDX-License-Identifier: CC0-1.0
// Reusable form tie assembly with threaded rod, bearing plates and wing nuts.
meta({
  name: "concrete-form-tie",
  license: 'CC0-1.0',
  title: "Concrete form tie",
  description: "Reusable form tie assembly with threaded rod, bearing plates and wing nuts. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('concrete-form-tie');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('tie-rod', cylinder(600, 18, 8).rotateY(90).translate(-300, 0, 18), structuralSteelColor);
add('bearing-plate--1', box(38, 140, 55, true).translate(-192, 0, 27.5), equipmentPaintColor);
add('wing-nut--1', cylinder(60, 36, 8).rotateY(90).translate(-252, 0, 36), equipmentPaintColor);
add('bearing-plate-1', box(38, 140, 55, true).translate(192, 0, 27.5), equipmentPaintColor);
add('wing-nut-1', cylinder(60, 36, 8).rotateY(90).translate(132, 0, 36), equipmentPaintColor);

return p.model();
