// SPDX-License-Identifier: CC0-1.0
// Site water truck with cylindrical tank, cab, hose reel and rear spray manifold.
meta({
  name: "water-tanker-truck",
  license: 'CC0-1.0',
  title: "Construction water tanker truck",
  description: "Site water truck with cylindrical tank, cab, hose reel and rear spray manifold. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('water-tanker-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('site-truck-chassis', box(1295.6, 349.6, 150, true).translate(0, 0, 215), structuralSteelColor);
add('site-truck-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-474, -218.6, 145), tireRubberColor);
add('site-truck-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-474, -337.4, 145), structuralSteelColor);
add('site-truck-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-474, -209.8, 145), structuralSteelColor);
add('site-truck-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-474, 328.6, 145), tireRubberColor);
add('site-truck-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-474, 209.8, 145), structuralSteelColor);
add('site-truck-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-474, 337.4, 145), structuralSteelColor);
add('site-truck-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(442.4, -218.6, 160), tireRubberColor);
add('site-truck-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(442.4, -337.4, 160), structuralSteelColor);
add('site-truck-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(442.4, -209.8, 160), structuralSteelColor);
add('site-truck-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(442.4, 328.6, 160), tireRubberColor);
add('site-truck-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(442.4, 209.8, 160), structuralSteelColor);
add('site-truck-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(442.4, 337.4, 160), structuralSteelColor);
add('site-truck-cab', box(395, 304, 495.6, true).translate(442.4, 0, 537.8), equipmentPaintColor);
add('site-truck-cab-window', box(118.50, 14, 123.90, true).translate(422.65, -159.00, 666.66), cabGlassColor);
add('site-truck-roof', box(426.6, 326.8, 45, true).translate(442.4, 0, 808.1), equipmentPaintColor);
add('tank', cylinder(679.4, 205.2, 12).rotateY(90).translate(-592.5, 0, 500), equipmentPaintColor);
add('tank-saddle-a', box(70, 471.2, 70, true).translate(-320.74, 0, 325), equipmentPaintColor);
add('tank-saddle-b', box(70, 471.2, 70, true).translate(-184.86, 0, 325), equipmentPaintColor);
add('spray-bar', box(60, 1102, 45, true).translate(-758.4, 0, 132.5), equipmentPaintColor);
add('spray-nozzle-0', cylinder(28, 12, 6).translate(-758.4, -494, 72), equipmentPaintColor);
add('spray-nozzle-1', cylinder(28, 12, 6).translate(-758.4, -370.5, 72), equipmentPaintColor);
add('spray-nozzle-2', cylinder(28, 12, 6).translate(-758.4, -247, 72), equipmentPaintColor);
add('spray-nozzle-3', cylinder(28, 12, 6).translate(-758.4, -123.5, 72), equipmentPaintColor);
add('spray-nozzle-4', cylinder(28, 12, 6).translate(-758.4, 0, 72), equipmentPaintColor);
add('spray-nozzle-5', cylinder(28, 12, 6).translate(-758.4, 123.5, 72), equipmentPaintColor);
add('spray-nozzle-6', cylinder(28, 12, 6).translate(-758.4, 247, 72), equipmentPaintColor);
add('spray-nozzle-7', cylinder(28, 12, 6).translate(-758.4, 370.5, 72), equipmentPaintColor);
add('spray-nozzle-8', cylinder(28, 12, 6).translate(-758.4, 494, 72), equipmentPaintColor);
add('hose-reel', box(170, 150, 180, true).translate(-79, 235.6, 600), tireRubberColor);

add('front-grille', path().moveTo(-94.16, -91.20).lineTo(94.16, -91.20).lineTo(79.30, 91.20).lineTo(-79.30, 91.20).close().extrude(16).rotateY(90).translate(644.90, 0.00, 438.68), structuralSteelColor);
add('headlamp-near', box(22, 45.60, 47.08, true).translate(649.90, -94.24, 408.94), cabGlassColor);
add('headlamp-far', box(22, 45.60, 47.08, true).translate(649.90, 94.24, 408.94), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(553.00, -188.48, 597.27), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(553.00, 188.48, 597.27), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(580.65, -206.72, 627.01), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(580.65, 206.72, 627.01), cabGlassColor);
add('cab-step', box(110.60, 54, 36, true).translate(497.70, -176.00, 329.65), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(509.55, -162.00, 527.89), structuralSteelColor);
add('cab-windshield', box(16, 188.48, 133.81, true).rotateY(-7).translate(649.90, 0.00, 602.23), cabGlassColor);
add('cab-side-glazing-far', box(118.50, 14, 123.90, true).translate(422.65, 159.00, 666.66), cabGlassColor);

return p.model();