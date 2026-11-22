// SPDX-License-Identifier: CC0-1.0
// Telescoping floor support prop with top plate, screw collar and broad base plate.
meta({
  name: "adjustable-formwork-prop",
  license: 'CC0-1.0',
  title: "Adjustable formwork prop",
  description: "Telescoping floor support prop with top plate, screw collar and broad base plate. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('adjustable-formwork-prop');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('base-plate', box(324, 324, 35, true).translate(0, 0, 17.5), structuralSteelColor);
add('outer-tube', cylinder(913.5, 64, 10).translate(0, 0, 35), equipmentPaintColor);
add('inner-tube', cylinder(449.5, 45, 10).translate(0, 0, 913.5), equipmentPaintColor);
add('adjustment-collar', box(160, 150, 52, true).translate(0, 0, 896), equipmentPaintColor);
add('head-plate', box(306, 306, 38, true).translate(0, 0, 1382), equipmentPaintColor);

return p.model();
