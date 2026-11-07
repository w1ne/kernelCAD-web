// SPDX-License-Identifier: CC0-1.0
// Paving tanker truck with insulated tank, rear spray bar and multiple road nozzles.
meta({
  name: "asphalt-distributor-truck",
  license: 'CC0-1.0',
  title: "Asphalt distributor truck",
  description: "Paving tanker truck with insulated tank, rear spray bar and multiple road nozzles. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('asphalt-distributor-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('site-truck-chassis', box(1377.6, 358.8, 150, true).translate(0, 0, 215), structuralSteelColor);
add('site-truck-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-504, -225.8, 145), tireRubberColor);
add('site-truck-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-504, -344.6, 145), structuralSteelColor);
add('site-truck-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-504, -217, 145), structuralSteelColor);
add('site-truck-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-504, 335.8, 145), tireRubberColor);
add('site-truck-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-504, 217, 145), structuralSteelColor);
add('site-truck-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-504, 344.6, 145), structuralSteelColor);
add('site-truck-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(470.4, -225.8, 160), tireRubberColor);
add('site-truck-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(470.4, -344.6, 160), structuralSteelColor);
add('site-truck-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(470.4, -217, 160), structuralSteelColor);
add('site-truck-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(470.4, 335.8, 160), tireRubberColor);
add('site-truck-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(470.4, 217, 160), structuralSteelColor);
add('site-truck-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(470.4, 344.6, 160), structuralSteelColor);
add('site-truck-cab', box(420, 312, 504, true).translate(470.4, 0, 542), equipmentPaintColor);
add('site-truck-cab-window', box(126.00, 14, 126.00, true).translate(449.40, -163.00, 673.04), cabGlassColor);
add('site-truck-roof', box(453.6, 335.4, 45, true).translate(470.4, 0, 816.5), equipmentPaintColor);
add('tank', cylinder(722.4, 210.6, 12).rotateY(90).translate(-630, 0, 500), equipmentPaintColor);
add('tank-saddle-a', box(70, 483.6, 70, true).translate(-341.04, 0, 325), equipmentPaintColor);
add('tank-saddle-b', box(70, 483.6, 70, true).translate(-196.56, 0, 325), equipmentPaintColor);
add('spray-bar', box(60, 1131, 45, true).translate(-806.4, 0, 132.5), equipmentPaintColor);
add('spray-nozzle-0', cylinder(28, 12, 6).translate(-806.4, -507, 72), equipmentPaintColor);
add('spray-nozzle-1', cylinder(28, 12, 6).translate(-806.4, -380.25, 72), equipmentPaintColor);
add('spray-nozzle-2', cylinder(28, 12, 6).translate(-806.4, -253.5, 72), equipmentPaintColor);
add('spray-nozzle-3', cylinder(28, 12, 6).translate(-806.4, -126.75, 72), equipmentPaintColor);
add('spray-nozzle-4', cylinder(28, 12, 6).translate(-806.4, 0, 72), equipmentPaintColor);
add('spray-nozzle-5', cylinder(28, 12, 6).translate(-806.4, 126.75, 72), equipmentPaintColor);
add('spray-nozzle-6', cylinder(28, 12, 6).translate(-806.4, 253.5, 72), equipmentPaintColor);
add('spray-nozzle-7', cylinder(28, 12, 6).translate(-806.4, 380.25, 72), equipmentPaintColor);
add('spray-nozzle-8', cylinder(28, 12, 6).translate(-806.4, 507, 72), equipmentPaintColor);
add('hose-reel', box(170, 150, 180, true).translate(-84, 241.8, 600), tireRubberColor);

add('front-grille', path().moveTo(-95.76, -93.60).lineTo(95.76, -93.60).lineTo(80.64, 93.60).lineTo(-80.64, 93.60).close().extrude(16).rotateY(90).translate(685.40, 0.00, 441.20), structuralSteelColor);
add('headlamp-near', box(22, 46.80, 47.88, true).translate(690.40, -96.72, 410.96), cabGlassColor);
add('headlamp-far', box(22, 46.80, 47.88, true).translate(690.40, 96.72, 410.96), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(588.00, -193.44, 602.48), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(588.00, 193.44, 602.48), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(617.40, -212.16, 632.72), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(617.40, 212.16, 632.72), cabGlassColor);
add('cab-step', box(117.60, 54, 36, true).translate(529.20, -180.00, 330.32), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(541.80, -166.00, 531.92), structuralSteelColor);
add('cab-windshield', box(16, 193.44, 136.08, true).rotateY(-7).translate(690.40, 0.00, 607.52), cabGlassColor);
add('cab-side-glazing-far', box(126.00, 14, 126.00, true).translate(449.40, 163.00, 673.04), cabGlassColor);

return p.model();