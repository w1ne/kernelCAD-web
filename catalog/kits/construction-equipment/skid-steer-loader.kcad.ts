// SPDX-License-Identifier: CC0-1.0
// Compact four-wheel loader with protective operator cage, lift arms and front bucket.
meta({
  name: "skid-steer-loader",
  license: 'CC0-1.0',
  title: "Skid-steer loader",
  description: "Compact four-wheel loader with protective operator cage, lift arms and front bucket. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('skid-steer-loader');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('loader-wheel-0--1', cylinder(94, 185, 12).rotateX(90).translate(-238, -170.56, 185), tireRubberColor);
add('loader-wheel-0--1-hub--1', cylinder(15.04, 70.3, 10).rotateX(90).translate(-238, -272.08, 185), structuralSteelColor);
add('loader-wheel-0--1-hub-1', cylinder(15.04, 70.3, 10).rotateX(90).translate(-238, -163.04, 185), structuralSteelColor);
add('loader-wheel-0-1', cylinder(94, 185, 12).rotateX(90).translate(-238, 264.56, 185), tireRubberColor);
add('loader-wheel-0-1-hub--1', cylinder(15.04, 70.3, 10).rotateX(90).translate(-238, 163.04, 185), structuralSteelColor);
add('loader-wheel-0-1-hub-1', cylinder(15.04, 70.3, 10).rotateX(90).translate(-238, 272.08, 185), structuralSteelColor);
add('loader-wheel-1--1', cylinder(94, 185, 12).rotateX(90).translate(238, -170.56, 185), tireRubberColor);
add('loader-wheel-1--1-hub--1', cylinder(15.04, 70.3, 10).rotateX(90).translate(238, -272.08, 185), structuralSteelColor);
add('loader-wheel-1--1-hub-1', cylinder(15.04, 70.3, 10).rotateX(90).translate(238, -163.04, 185), structuralSteelColor);
add('loader-wheel-1-1', cylinder(94, 185, 12).rotateX(90).translate(238, 264.56, 185), tireRubberColor);
add('loader-wheel-1-1-hub--1', cylinder(15.04, 70.3, 10).rotateX(90).translate(238, 163.04, 185), structuralSteelColor);
add('loader-wheel-1-1-hub-1', cylinder(15.04, 70.3, 10).rotateX(90).translate(238, 272.08, 185), structuralSteelColor);
add('loader-chassis', box(595, 385, 210, true).translate(0, 0, 325), structuralSteelColor);
add('operator-cab', box(238, 301, 357, true).translate(-93.5, 0, 608.5), equipmentPaintColor);
add('cab-window', box(71.40, 14, 89.25, true).translate(-105.40, -157.50, 701.32), cabGlassColor);
add('lift-arm--1', box(408, 70, 80, true).translate(212.5, -231, 460), structuralSteelColor);
add('lift-pivot--1', cylinder(78, 55, 8).translate(272, -259, 460), equipmentPaintColor);
add('lift-arm-1', box(408, 70, 80, true).translate(212.5, 231, 460), structuralSteelColor);
add('lift-pivot-1', cylinder(78, 55, 8).translate(272, 259, 460), equipmentPaintColor);
add('bucket-back', box(90, 504, 230, true).translate(484.5, 0, 265), equipmentPaintColor);
add('bucket-floor', box(170, 525, 48, true).translate(535.5, 0, 104), equipmentPaintColor);
add('bucket-cutting-edge', box(50, 574, 45, true).translate(629, 0, 92.5), equipmentPaintColor);

add('front-grille', path().moveTo(-67.83, -90.30).lineTo(67.83, -90.30).lineTo(57.12, 90.30).lineTo(-57.12, 90.30).close().extrude(16).rotateY(90).translate(30.50, 0.00, 537.10), structuralSteelColor);
add('headlamp-near', box(22, 45.15, 33.91, true).translate(35.50, -93.31, 515.68), cabGlassColor);
add('headlamp-far', box(22, 45.15, 33.91, true).translate(35.50, 93.31, 515.68), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(-26.86, -186.62, 651.34), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(-26.86, 186.62, 651.34), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(-10.20, -204.68, 672.76), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(-10.20, 204.68, 672.76), cabGlassColor);
add('cab-step', box(66.64, 54, 36, true).translate(-60.18, -174.50, 458.56), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(-53.04, -160.50, 601.36), structuralSteelColor);
add('cab-windshield', box(16, 186.62, 96.39, true).rotateY(-7).translate(35.50, 0.00, 654.91), cabGlassColor);
add('cab-side-glazing-far', box(71.40, 14, 89.25, true).translate(-105.40, 157.50, 701.32), cabGlassColor);

return p.model();