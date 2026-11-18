// SPDX-License-Identifier: CC0-1.0
// Survey rod assembly with graduated segments, target prism and clamp mount.
meta({
  name: "grade-rod-and-prism-pole",
  license: 'CC0-1.0',
  title: "Grade rod and prism pole",
  description: "Survey rod assembly with graduated segments, target prism and clamp mount. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('grade-rod-and-prism-pole');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('rod-foot', box(108, 99, 42, true).translate(0, 0, 21), structuralSteelColor);
add('survey-pole', cylinder(1540, 26, 8).translate(0, 0, 42), equipmentPaintColor);
add('graduation-band-0', box(84, 22, 16, true).translate(0, -17.6, 103), equipmentPaintColor);
add('graduation-band-1', box(84, 22, 16, true).translate(0, -17.6, 269.25), equipmentPaintColor);
add('graduation-band-2', box(84, 22, 16, true).translate(0, -17.6, 435.5), equipmentPaintColor);
add('graduation-band-3', box(84, 22, 16, true).translate(0, -17.6, 601.75), equipmentPaintColor);
add('graduation-band-4', box(84, 22, 16, true).translate(0, -17.6, 768), equipmentPaintColor);
add('graduation-band-5', box(84, 22, 16, true).translate(0, -17.6, 934.25), equipmentPaintColor);
add('graduation-band-6', box(84, 22, 16, true).translate(0, -17.6, 1100.5), equipmentPaintColor);
add('graduation-band-7', box(84, 22, 16, true).translate(0, -17.6, 1266.75), equipmentPaintColor);
add('prism-bracket', box(156, 60, 54, true).translate(0, 0, 1514.5), structuralSteelColor);
add('prism', cylinder(86, 70, 8).translate(0, 0, 1540), equipmentPaintColor);

return p.model();
