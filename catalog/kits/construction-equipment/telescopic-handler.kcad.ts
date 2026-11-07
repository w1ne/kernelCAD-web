// SPDX-License-Identifier: CC0-1.0
// Rough-terrain handler with long extending boom, front carriage and four-wheel chassis.
meta({
  name: "telescopic-handler",
  license: 'CC0-1.0',
  title: "Telescopic handler",
  description: "Rough-terrain handler with long extending boom, front carriage and four-wheel chassis. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('telescopic-handler');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('handler-wheel-0--1', cylinder(110, 190, 12).rotateX(90).translate(-427.8, -193.196, 190), tireRubberColor);
add('handler-wheel-0--1-hub--1', cylinder(17.6, 72.2, 10).rotateX(90).translate(-427.8, -311.996, 190), structuralSteelColor);
add('handler-wheel-0--1-hub-1', cylinder(17.6, 72.2, 10).rotateX(90).translate(-427.8, -184.396, 190), structuralSteelColor);
add('handler-wheel-0-1', cylinder(110, 190, 12).rotateX(90).translate(-427.8, 303.196, 190), tireRubberColor);
add('handler-wheel-0-1-hub--1', cylinder(17.6, 72.2, 10).rotateX(90).translate(-427.8, 184.396, 190), structuralSteelColor);
add('handler-wheel-0-1-hub-1', cylinder(17.6, 72.2, 10).rotateX(90).translate(-427.8, 311.996, 190), structuralSteelColor);
add('handler-wheel-1--1', cylinder(110, 190, 12).rotateX(90).translate(427.8, -193.196, 190), tireRubberColor);
add('handler-wheel-1--1-hub--1', cylinder(17.6, 72.2, 10).rotateX(90).translate(427.8, -311.996, 190), structuralSteelColor);
add('handler-wheel-1--1-hub-1', cylinder(17.6, 72.2, 10).rotateX(90).translate(427.8, -184.396, 190), structuralSteelColor);
add('handler-wheel-1-1', cylinder(110, 190, 12).rotateX(90).translate(427.8, 303.196, 190), tireRubberColor);
add('handler-wheel-1-1-hub--1', cylinder(17.6, 72.2, 10).rotateX(90).translate(427.8, 184.396, 190), structuralSteelColor);
add('handler-wheel-1-1-hub-1', cylinder(17.6, 72.2, 10).rotateX(90).translate(427.8, 311.996, 190), structuralSteelColor);
add('chassis', box(993.6, 436.8, 190, true).translate(0, 0, 335), structuralSteelColor);
add('cab', box(331.2, 304.2, 520, true).translate(276, -140.4, 690), equipmentPaintColor);
add('cab-glazing', box(99.36, 14, 130.00, true).translate(259.44, -299.50, 825.20), cabGlassColor);
add('telescopic-boom', box(966, 100, 120, true).translate(-110.4, 0, 530), equipmentPaintColor);
add('inner-boom', box(524.4, 75, 68, true).translate(-538.2, 0, 569), equipmentPaintColor);
add('boom-carriage', box(100, 280.8, 180, true).translate(-855.6, 0, 560), structuralSteelColor);
add('fork-tine-left', box(270, 38, 42, true).translate(-1048.8, -140.4, 131), structuralSteelColor);
add('fork-tine-right', box(270, 38, 42, true).translate(-1048.8, 140.4, 131), structuralSteelColor);

add('front-grille', path().moveTo(-98.80, -91.26).lineTo(98.80, -91.26).lineTo(83.20, 91.26).lineTo(-83.20, 91.26).close().extrude(16).rotateY(90).translate(446.60, -140.40, 586.00), structuralSteelColor);
add('headlamp-near', box(22, 45.63, 49.40, true).translate(451.60, -234.70, 554.80), cabGlassColor);
add('headlamp-far', box(22, 45.63, 49.40, true).translate(451.60, -46.10, 554.80), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(368.74, -329.00, 752.40), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(368.74, 48.20, 752.40), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(391.92, -347.26, 783.60), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(391.92, 66.46, 783.60), cabGlassColor);
add('cab-step', box(92.74, 54, 36, true).translate(322.37, -316.50, 471.60), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(332.30, -302.50, 679.60), structuralSteelColor);
add('cab-windshield', box(16, 188.60, 140.40, true).rotateY(-7).translate(451.60, -140.40, 757.60), cabGlassColor);
add('cab-side-glazing-far', box(99.36, 14, 130.00, true).translate(259.44, 18.70, 825.20), cabGlassColor);

return p.model();