// SPDX-License-Identifier: CC0-1.0
// Concrete surface grinder with circular shroud, handlebar and motor enclosure.
meta({
  name: "portable-floor-grinder",
  license: 'CC0-1.0',
  title: "Portable floor grinder",
  description: "Concrete surface grinder with circular shroud, handlebar and motor enclosure. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('portable-floor-grinder');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('floor-wheel-0--1', cylinder(54, 92, 12).rotateX(90).translate(-184.8, -150.6, 92), tireRubberColor);
add('floor-wheel-0--1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-184.8, -208.92, 92), structuralSteelColor);
add('floor-wheel-0--1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-184.8, -146.28, 92), structuralSteelColor);
add('floor-wheel-0-1', cylinder(54, 92, 12).rotateX(90).translate(-184.8, 204.6, 92), tireRubberColor);
add('floor-wheel-0-1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-184.8, 146.28, 92), structuralSteelColor);
add('floor-wheel-0-1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-184.8, 208.92, 92), structuralSteelColor);
add('floor-wheel-1--1', cylinder(54, 92, 12).rotateX(90).translate(178.2, -150.6, 92), tireRubberColor);
add('floor-wheel-1--1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(178.2, -208.92, 92), structuralSteelColor);
add('floor-wheel-1--1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(178.2, -146.28, 92), structuralSteelColor);
add('floor-wheel-1-1', cylinder(54, 92, 12).rotateX(90).translate(178.2, 204.6, 92), tireRubberColor);
add('floor-wheel-1-1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(178.2, 146.28, 92), structuralSteelColor);
add('floor-wheel-1-1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(178.2, 208.92, 92), structuralSteelColor);
add('machine-frame', box(462, 336, 120, true).translate(0, 0, 220), structuralSteelColor);
add('motor-housing', box(211.2, 252, 281.2, true).translate(79.2, 0, 420.6), equipmentPaintColor);
add('handle-post', cylinder(333, 32, 8).translate(-237.6, 0, 280), structuralSteelColor);
add('handle-bar', box(250, 40, 40, true).translate(-237.6, 0, 582.4), structuralSteelColor);
add('grinding-head', cylinder(95, 180, 12).translate(0, 0, 100), equipmentPaintColor);
add('dust-shroud', box(409.2, 336, 50, true).translate(0, 0, 115), equipmentPaintColor);

return p.model();
