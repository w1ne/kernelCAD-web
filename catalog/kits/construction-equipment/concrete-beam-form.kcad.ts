// SPDX-License-Identifier: CC0-1.0
// Raised beam shutter with paired supports, side panels and bottom soffit.
meta({
  name: "concrete-beam-form",
  license: 'CC0-1.0',
  title: "Concrete beam form",
  description: "Raised beam shutter with paired supports, side panels and bottom soffit. Material controls: equipment enamel paint, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('concrete-beam-form');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('soffit', box(1320, 357.5, 80, true).translate(0, 0, 426.4), equipmentPaintColor);
add('beam-side--1', box(1320, 45, 515.2, true).translate(0, -195, 772.8), structuralSteelColor);
add('support-leg--1--461-99999999999994', box(44, 44, 441.6, true).translate(-462, -195, 220.8), structuralSteelColor);
add('support-foot--1--461-99999999999994', box(150, 120, 36, true).translate(-462, -195, 18), structuralSteelColor);
add('support-leg--1-461-99999999999994', box(44, 44, 441.6, true).translate(462, -195, 220.8), structuralSteelColor);
add('support-foot--1-461-99999999999994', box(150, 120, 36, true).translate(462, -195, 18), structuralSteelColor);
add('beam-side-1', box(1320, 45, 515.2, true).translate(0, 195, 772.8), structuralSteelColor);
add('support-leg-1--461-99999999999994', box(44, 44, 441.6, true).translate(-462, 195, 220.8), structuralSteelColor);
add('support-foot-1--461-99999999999994', box(150, 120, 36, true).translate(-462, 195, 18), structuralSteelColor);
add('support-leg-1-461-99999999999994', box(44, 44, 441.6, true).translate(462, 195, 220.8), structuralSteelColor);
add('support-foot-1-461-99999999999994', box(150, 120, 36, true).translate(462, 195, 18), structuralSteelColor);

return p.model();
