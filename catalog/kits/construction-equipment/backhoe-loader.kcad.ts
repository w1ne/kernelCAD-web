// SPDX-License-Identifier: CC0-1.0
// Site loader with front bucket, rear digging boom, stabilizer legs and operator cab.
meta({
  name: "backhoe-loader",
  license: 'CC0-1.0',
  title: "Backhoe loader",
  description: "Site loader with front bucket, rear digging boom, stabilizer legs and operator cab. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('backhoe-loader');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('backhoe-wheel-0--1', cylinder(105, 195, 12).rotateX(90).translate(-449.5, -184.152, 195), tireRubberColor);
add('backhoe-wheel-0--1-hub--1', cylinder(16.8, 74.1, 10).rotateX(90).translate(-449.5, -297.552, 195), structuralSteelColor);
add('backhoe-wheel-0--1-hub-1', cylinder(16.8, 74.1, 10).rotateX(90).translate(-449.5, -175.752, 195), structuralSteelColor);
add('backhoe-wheel-0-1', cylinder(105, 195, 12).rotateX(90).translate(-449.5, 289.152, 195), tireRubberColor);
add('backhoe-wheel-0-1-hub--1', cylinder(16.8, 74.1, 10).rotateX(90).translate(-449.5, 175.752, 195), structuralSteelColor);
add('backhoe-wheel-0-1-hub-1', cylinder(16.8, 74.1, 10).rotateX(90).translate(-449.5, 297.552, 195), structuralSteelColor);
add('backhoe-wheel-1--1', cylinder(105, 195, 12).rotateX(90).translate(420.5, -184.152, 195), tireRubberColor);
add('backhoe-wheel-1--1-hub--1', cylinder(16.8, 74.1, 10).rotateX(90).translate(420.5, -297.552, 195), structuralSteelColor);
add('backhoe-wheel-1--1-hub-1', cylinder(16.8, 74.1, 10).rotateX(90).translate(420.5, -175.752, 195), structuralSteelColor);
add('backhoe-wheel-1-1', cylinder(105, 195, 12).rotateX(90).translate(420.5, 289.152, 195), tireRubberColor);
add('backhoe-wheel-1-1-hub--1', cylinder(16.8, 74.1, 10).rotateX(90).translate(420.5, 175.752, 195), structuralSteelColor);
add('backhoe-wheel-1-1-hub-1', cylinder(16.8, 74.1, 10).rotateX(90).translate(420.5, 297.552, 195), structuralSteelColor);
add('chassis', box(1044, 413.4, 170, true).translate(0, 0, 325), structuralSteelColor);
add('front-loader-arm', box(493, 54, 70, true).translate(551, -241.8, 455), equipmentPaintColor);
add('front-loader-arm-right', box(493, 54, 70, true).translate(551, 241.8, 455), equipmentPaintColor);
add('front-bucket', box(120, 608.4, 220, true).translate(913.5, 0, 300), equipmentPaintColor);
add('cab', box(391.5, 343.2, 504, true).translate(0, 0, 662), equipmentPaintColor);
add('cab-roof', box(449.5, 374.4, 44, true).translate(0, 0, 936), equipmentPaintColor);
add('stabilizer--1', box(48, 55, 300, true).translate(-551, -288.6, 150), equipmentPaintColor);
add('stabilizer-foot--1', box(150, 120, 35, true).translate(-551, -288.6, 17.5), structuralSteelColor);
add('stabilizer-1', box(48, 55, 300, true).translate(-551, 288.6, 150), equipmentPaintColor);
add('stabilizer-foot-1', box(150, 120, 35, true).translate(-551, 288.6, 17.5), structuralSteelColor);
add('rear-boom', box(406, 90, 95, true).translate(-623.5, 0, 667.5), equipmentPaintColor);
add('dipper', box(65, 75, 410, true).translate(-797.5, 0, 595), equipmentPaintColor);
add('digging-bucket', box(150, 190, 145, true).translate(-957, 0, 192.5), equipmentPaintColor);

add('front-grille', path().moveTo(-95.76, -102.96).lineTo(95.76, -102.96).lineTo(80.64, 102.96).lineTo(-80.64, 102.96).close().extrude(16).rotateY(90).translate(200.75, 0.00, 561.20), structuralSteelColor);
add('headlamp-near', box(22, 51.48, 47.88, true).translate(205.75, -106.39, 530.96), cabGlassColor);
add('headlamp-far', box(22, 51.48, 47.88, true).translate(205.75, 106.39, 530.96), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(109.62, -212.78, 722.48), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(109.62, 212.78, 722.48), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(137.02, -233.38, 752.72), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(137.02, 233.38, 752.72), cabGlassColor);
add('cab-step', box(109.62, 54, 36, true).translate(54.81, -195.60, 450.32), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(66.56, -181.60, 651.92), structuralSteelColor);
add('cab-windshield', box(16, 212.78, 136.08, true).rotateY(-7).translate(205.75, 0.00, 727.52), cabGlassColor);
add('cab-side-glazing-far', box(117.45, 14, 126.00, true).translate(-19.58, 178.60, 793.04), cabGlassColor);

return p.model();