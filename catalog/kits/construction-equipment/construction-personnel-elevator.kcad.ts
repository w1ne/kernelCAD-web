// SPDX-License-Identifier: CC0-1.0
// Temporary mast elevator cage with guide rails, mesh walls and ground frame.
meta({
  name: "construction-personnel-elevator",
  license: 'CC0-1.0',
  title: "Construction personnel elevator",
  description: "Temporary mast elevator cage with guide rails, mesh walls and ground frame. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('construction-personnel-elevator');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('ground-frame', box(639.6, 590.4, 90, true).translate(0, 0, 45), structuralSteelColor);
add('mast--1', box(65, 68, 1848, true).translate(-265.2, 187.2, 1014), structuralSteelColor);
add('cross-brace--1', box(35, 40, 1512, true).translate(-265.2, -172.8, 896), structuralSteelColor);
add('mast-1', box(65, 68, 1848, true).translate(265.2, 187.2, 1014), structuralSteelColor);
add('cross-brace-1', box(35, 40, 1512, true).translate(265.2, -172.8, 896), structuralSteelColor);
add('elevator-platform', box(561.6, 460.8, 588, true).translate(0, 0, 544), equipmentPaintColor);
add('cage-side--1', box(38, 460.8, 882, true).translate(-288.6, 0, 691), equipmentPaintColor);
add('cage-side-1', box(38, 460.8, 882, true).translate(288.6, 0, 691), equipmentPaintColor);

return p.model();
