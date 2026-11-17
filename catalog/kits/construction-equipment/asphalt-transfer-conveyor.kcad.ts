// SPDX-License-Identifier: CC0-1.0
// Mobile inclined conveyor with feed hopper, trussed belt frame and transport axle.
meta({
  name: "asphalt-transfer-conveyor",
  license: 'CC0-1.0',
  title: "Road material transfer conveyor",
  description: "Mobile inclined conveyor with feed hopper, trussed belt frame and transport axle. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('asphalt-transfer-conveyor');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('hopper', box(374, 516, 406, true).translate(646, 0, 203), equipmentPaintColor);
add('conveyor-belt', box(1712, 270, 70, true).rotateY(29.5).translate(-105, 0, 821), tireRubberColor);
add('truss-rail--1', box(1712, 35, 45, true).rotateY(29.5).translate(-133, -132, 771), structuralSteelColor);
add('support-leg--1', box(45, 45, 907, true).translate(-374, -132, 453.5), structuralSteelColor);
add('truss-rail-1', box(1712, 35, 45, true).rotateY(29.5).translate(-133, 132, 771), structuralSteelColor);
add('support-leg-1', box(45, 45, 907, true).translate(-374, 132, 453.5), structuralSteelColor);
add('axle', box(90, 600, 40, true).translate(-340, 0, 125), structuralSteelColor);
add('transport-wheel--1', cylinder(70, 125, 12).rotateX(90).translate(-306, -217, 125), tireRubberColor);
add('transport-wheel--1-hub--1', cylinder(11.2, 47.5, 10).rotateX(90).translate(-306, -292.6, 125), structuralSteelColor);
add('transport-wheel--1-hub-1', cylinder(11.2, 47.5, 10).rotateX(90).translate(-306, -211.4, 125), structuralSteelColor);
add('transport-wheel-1', cylinder(70, 125, 12).rotateX(90).translate(-306, 287, 125), tireRubberColor);
add('transport-wheel-1-hub--1', cylinder(11.2, 47.5, 10).rotateX(90).translate(-306, 211.4, 125), structuralSteelColor);
add('transport-wheel-1-hub-1', cylinder(11.2, 47.5, 10).rotateX(90).translate(-306, 292.6, 125), structuralSteelColor);
add('discharge-chute', box(180, 240, 80, true).translate(-799, 0, 1243.5), structuralSteelColor);

return p.model();
