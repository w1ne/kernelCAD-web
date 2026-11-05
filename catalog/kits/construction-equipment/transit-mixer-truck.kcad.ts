// SPDX-License-Identifier: CC0-1.0
// Concrete mixer truck with rotating-looking drum, rear discharge chute and cab.
meta({
  name: "transit-mixer-truck",
  license: 'CC0-1.0',
  title: "Transit concrete mixer truck",
  description: "Concrete mixer truck with rotating-looking drum, rear discharge chute and cab. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('transit-mixer-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('mixer-chassis', box(1394, 363.4, 150, true).translate(0, 0, 215), structuralSteelColor);
add('mixer-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-510, -229.4, 145), tireRubberColor);
add('mixer-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-510, -348.2, 145), structuralSteelColor);
add('mixer-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-510, -220.6, 145), structuralSteelColor);
add('mixer-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-510, 339.4, 145), tireRubberColor);
add('mixer-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-510, 220.6, 145), structuralSteelColor);
add('mixer-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-510, 348.2, 145), structuralSteelColor);
add('mixer-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(476, -229.4, 160), tireRubberColor);
add('mixer-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(476, -348.2, 160), structuralSteelColor);
add('mixer-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(476, -220.6, 160), structuralSteelColor);
add('mixer-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(476, 339.4, 160), tireRubberColor);
add('mixer-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(476, 220.6, 160), structuralSteelColor);
add('mixer-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(476, 348.2, 160), structuralSteelColor);
add('mixer-cab', box(425, 316, 546, true).translate(476, 0, 563), equipmentPaintColor);
add('mixer-cab-window', box(127.50, 14, 136.50, true).translate(454.75, -165.00, 704.96), cabGlassColor);
add('mixer-roof', box(459, 339.7, 45, true).translate(476, 0, 858.5), equipmentPaintColor);
add('mixing-drum', cylinder(680, 229.1, 12).rotateY(90).translate(-340, 0, 410), structuralSteelColor);
add('drum-neck', cylinder(105, 80, 10).translate(-714, 0, 400), structuralSteelColor);
add('rear-chute-support', box(85, 90, 360, true).translate(-680, 0, 430), structuralSteelColor);
add('discharge-chute-0', box(120, 88, 38, true).translate(-816, 0, 229), structuralSteelColor);
add('discharge-chute-1', box(120, 88, 38, true).translate(-886, 0, 194), structuralSteelColor);
add('discharge-chute-2', box(120, 88, 38, true).translate(-956, 0, 159), structuralSteelColor);

add('front-grille', path().moveTo(-103.74, -94.80).lineTo(103.74, -94.80).lineTo(87.36, 94.80).lineTo(-87.36, 94.80).close().extrude(16).rotateY(90).translate(693.50, 0.00, 453.80), structuralSteelColor);
add('headlamp-near', box(22, 47.40, 51.87, true).translate(698.50, -97.96, 421.04), cabGlassColor);
add('headlamp-far', box(22, 47.40, 51.87, true).translate(698.50, 97.96, 421.04), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(595.00, -195.92, 628.52), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(595.00, 195.92, 628.52), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(624.75, -214.88, 661.28), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(624.75, 214.88, 661.28), cabGlassColor);
add('cab-step', box(119.00, 54, 36, true).translate(535.50, -182.00, 333.68), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(548.25, -168.00, 552.08), structuralSteelColor);
add('cab-windshield', box(16, 195.92, 147.42, true).rotateY(-7).translate(698.50, 0.00, 633.98), cabGlassColor);
add('cab-side-glazing-far', box(127.50, 14, 136.50, true).translate(454.75, 165.00, 704.96), cabGlassColor);

return p.model();