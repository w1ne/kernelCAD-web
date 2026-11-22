// SPDX-License-Identifier: CC0-1.0
// Skid-mounted water tank with fill cap, outlet valve and protective frame.
meta({
  name: "portable-site-water-tank",
  license: 'CC0-1.0',
  title: "Portable site water tank",
  description: "Skid-mounted water tank with fill cap, outlet valve and protective frame. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('portable-site-water-tank');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('skid-base', box(846, 653.6, 65, true).translate(0, 0, 32.5), equipmentPaintColor);
add('tank-body', box(733.2, 562.4, 900, true).translate(0, 0, 515), equipmentPaintColor);
add('filler-neck', cylinder(100, 48, 8).translate(-263.2, 0, 975), equipmentPaintColor);
add('outlet-valve', cylinder(125, 34, 8).translate(394.8, 0, 425), structuralSteelColor);
add('tank-skid--1', box(902.4, 35, 82, true).translate(0, -296.4, 41), equipmentPaintColor);
add('tank-skid-1', box(902.4, 35, 82, true).translate(0, 296.4, 41), equipmentPaintColor);

return p.model();
