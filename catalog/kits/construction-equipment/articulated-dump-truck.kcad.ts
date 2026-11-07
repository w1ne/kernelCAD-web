// SPDX-License-Identifier: CC0-1.0
// Off-road articulated hauler with forward cab, rear dump body and six large tires.
meta({
  name: "articulated-dump-truck",
  license: 'CC0-1.0',
  title: "Articulated dump truck",
  description: "Off-road articulated hauler with forward cab, rear dump body and six large tires. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2800
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
const p = assembly('articulated-dump-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('hauler-chassis', box(1271, 414, 150, true).translate(0, 0, 215), structuralSteelColor);
add('hauler-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-465, -269, 145), tireRubberColor);
add('hauler-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-465, -387.8, 145), structuralSteelColor);
add('hauler-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-465, -260.2, 145), structuralSteelColor);
add('hauler-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-465, 379, 145), tireRubberColor);
add('hauler-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-465, 260.2, 145), structuralSteelColor);
add('hauler-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-465, 387.8, 145), structuralSteelColor);
add('hauler-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(434, -269, 160), tireRubberColor);
add('hauler-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(434, -387.8, 160), structuralSteelColor);
add('hauler-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(434, -260.2, 160), structuralSteelColor);
add('hauler-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(434, 379, 160), tireRubberColor);
add('hauler-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(434, 260.2, 160), structuralSteelColor);
add('hauler-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(434, 387.8, 160), structuralSteelColor);
add('hauler-cab', box(387.5, 360, 525, true).translate(434, 0, 552.5), equipmentPaintColor);
add('hauler-cab-window', box(116.25, 14, 131.25, true).translate(414.62, -187.00, 689.00), cabGlassColor);
add('hauler-roof', box(418.5, 387, 45, true).translate(434, 0, 837.5), equipmentPaintColor);
add('dump-body-floor', box(744, 576, 525, true).translate(-263.5, 0, 562.5), equipmentPaintColor);
add('dump-body-side--1', box(775, 72, 700, true).translate(-263.5, -252, 650), equipmentPaintColor);
add('dump-body-side-1', box(775, 72, 700, true).translate(-263.5, 252, 650), equipmentPaintColor);
add('dump-body-front', box(46, 594, 675, true).translate(124, 0, 637.5), equipmentPaintColor);
add('tailgate', box(42, 603, 625, true).translate(-651, 0, 612.5), equipmentPaintColor);
add('lift-ram', box(90, 75, 562.5, true).translate(-46.5, 0, 561.25), equipmentPaintColor);
add('articulation-joint', box(140, 270, 130, true).translate(93, 0, 325), equipmentPaintColor);

add('front-grille', path().moveTo(-99.75, -108.00).lineTo(99.75, -108.00).lineTo(84.00, 108.00).lineTo(-84.00, 108.00).close().extrude(16).rotateY(90).translate(632.75, 0.00, 447.50), structuralSteelColor);
add('headlamp-near', box(22, 54.00, 49.88, true).translate(637.75, -111.60, 416.00), cabGlassColor);
add('headlamp-far', box(22, 54.00, 49.88, true).translate(637.75, 111.60, 416.00), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(542.50, -223.20, 615.50), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(542.50, 223.20, 615.50), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(569.62, -244.80, 647.00), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(569.62, 244.80, 647.00), cabGlassColor);
add('cab-step', box(108.50, 54, 36, true).translate(488.25, -204.00, 332.00), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(499.88, -190.00, 542.00), structuralSteelColor);
add('cab-windshield', box(16, 223.20, 141.75, true).rotateY(-7).translate(637.75, 0.00, 620.75), cabGlassColor);
add('cab-side-glazing-far', box(116.25, 14, 131.25, true).translate(414.62, 187.00, 689.00), cabGlassColor);

const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]; const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
};
add('dump-body-lift-ram-left', hydraulicStrut([-70, -307, 255], [-315, -307, 495], 28), structuralSteelColor);
add('dump-body-lift-ram-right', hydraulicStrut([-70, 307, 255], [-315, 307, 495], 28), structuralSteelColor);
add('tailgate-hinge-left', cylinder(42, 32, 8).rotateX(90).translate(-648, -292, 288), structuralSteelColor);
add('tailgate-hinge-right', cylinder(42, 32, 8).rotateX(90).translate(-648, 292, 288), structuralSteelColor);
add('articulation-pin-near', cylinder(36, 58, 10).rotateX(90).translate(93, -229, 325), structuralSteelColor);
add('hauler-tandem-axle', cylinder(420, 42, 10).rotateX(90).translate(-105, 0, 145), structuralSteelColor);
add('hauler-tandem-wheel-near', cylinder(110, 145, 12).rotateX(90).translate(-105, -269, 145), tireRubberColor);
add('hauler-tandem-wheel-far', cylinder(110, 145, 12).rotateX(90).translate(-105, 379, 145), tireRubberColor);
add('hauler-tandem-hub-near', cylinder(17.6, 55.1, 10).rotateX(90).translate(-105, -387.8, 145), structuralSteelColor);
add('hauler-tandem-hub-far', cylinder(17.6, 55.1, 10).rotateX(90).translate(-105, 387.8, 145), structuralSteelColor);

return p.model();