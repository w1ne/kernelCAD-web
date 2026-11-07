// SPDX-License-Identifier: CC0-1.0
// Concrete placing truck with hopper, multi-section boom, outriggers and delivery hose.
meta({
  name: "concrete-pump-truck",
  license: 'CC0-1.0',
  title: "Concrete pump truck",
  description: "Concrete placing truck with hopper, multi-section boom, outriggers and delivery hose. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('concrete-pump-truck');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('pump-chassis', box(1476, 377.2, 150, true).translate(0, 0, 215), structuralSteelColor);
add('pump-wheel-0--1', cylinder(110, 145, 12).rotateX(90).translate(-540, -240.2, 145), tireRubberColor);
add('pump-wheel-0--1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-540, -359, 145), structuralSteelColor);
add('pump-wheel-0--1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-540, -231.4, 145), structuralSteelColor);
add('pump-wheel-0-1', cylinder(110, 145, 12).rotateX(90).translate(-540, 350.2, 145), tireRubberColor);
add('pump-wheel-0-1-hub--1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-540, 231.4, 145), structuralSteelColor);
add('pump-wheel-0-1-hub-1', cylinder(17.6, 55.1, 10).rotateX(90).translate(-540, 359, 145), structuralSteelColor);
add('pump-wheel-1--1', cylinder(110, 160, 12).rotateX(90).translate(504, -240.2, 160), tireRubberColor);
add('pump-wheel-1--1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(504, -359, 160), structuralSteelColor);
add('pump-wheel-1--1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(504, -231.4, 160), structuralSteelColor);
add('pump-wheel-1-1', cylinder(110, 160, 12).rotateX(90).translate(504, 350.2, 160), tireRubberColor);
add('pump-wheel-1-1-hub--1', cylinder(17.6, 60.8, 10).rotateX(90).translate(504, 231.4, 160), structuralSteelColor);
add('pump-wheel-1-1-hub-1', cylinder(17.6, 60.8, 10).rotateX(90).translate(504, 359, 160), structuralSteelColor);
add('pump-cab', box(450, 328, 651, true).translate(504, 0, 615.5), equipmentPaintColor);
add('pump-cab-window', box(135.00, 14, 162.75, true).translate(481.50, -171.00, 784.76), cabGlassColor);
add('pump-roof', box(486, 352.6, 45, true).translate(504, 0, 963.5), equipmentPaintColor);
const hopperProfile = (width: number, depth: number) => path()
  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)
  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();
const pumpHopper = hopperProfile(210, 255).loft([hopperProfile(324, 377)], {
  planes: [
    { plane: 'XY' as const, origin: [-450, 0, 280] as [number, number, number] },
    { plane: 'XY' as const, origin: [-450, 0, 580] as [number, number, number] },
  ], ruled: true,
});
add('pump-hopper', pumpHopper, equipmentPaintColor);
add('outrigger-beam--1', box(150, 672.4, 60, true).translate(-234, -237.8, 170), structuralSteelColor);
add('outrigger-column--1', box(75, 75, 145, true).translate(-234, -459.2, 107.5), structuralSteelColor);
add('outrigger-foot--1', box(160, 150, 35, true).translate(-234, -459.2, 17.5), structuralSteelColor);
add('outrigger-beam-1', box(150, 672.4, 60, true).translate(-234, 237.8, 170), structuralSteelColor);
add('outrigger-column-1', box(75, 75, 145, true).translate(-234, 459.2, 107.5), structuralSteelColor);
add('outrigger-foot-1', box(160, 150, 35, true).translate(-234, 459.2, 17.5), structuralSteelColor);
add('boom-base', box(130, 125, 420, true).translate(-162, 0, 500), equipmentPaintColor);
add('boom-section-a', box(648, 88, 92, true).rotateY(35).translate(-414, 0, 850), equipmentPaintColor);
add('boom-section-b', box(360, 76, 78, true).rotateY(55).translate(-782, 0, 1183), equipmentPaintColor);
add('delivery-hose', box(18, 18, 380, true).translate(-885, 0, 1140), tireRubberColor);

add('front-grille', path().moveTo(-123.69, -98.40).lineTo(123.69, -98.40).lineTo(104.16, 98.40).lineTo(-104.16, 98.40).close().extrude(16).rotateY(90).translate(734.00, 0.00, 485.30), structuralSteelColor);
add('headlamp-near', box(22, 49.20, 61.84, true).translate(739.00, -101.68, 446.24), cabGlassColor);
add('headlamp-far', box(22, 49.20, 61.84, true).translate(739.00, 101.68, 446.24), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(630.00, -203.36, 693.62), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(630.00, 203.36, 693.62), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(661.50, -223.04, 732.68), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(661.50, 223.04, 732.68), cabGlassColor);
add('cab-step', box(126.00, 54, 36, true).translate(567.00, -188.00, 342.08), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(580.50, -174.00, 602.48), structuralSteelColor);
add('cab-windshield', box(16, 203.36, 175.77, true).rotateY(-7).translate(739.00, 0.00, 700.13), cabGlassColor);
add('cab-side-glazing-far', box(135.00, 14, 162.75, true).translate(481.50, 171.00, 784.76), cabGlassColor);

const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dy = to[1] - from[1]; const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .rotateX(-Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
};
add('boom-cylinder-a', hydraulicStrut([-250, -58, 520], [-430, -58, 845], 23), structuralSteelColor);
add('boom-cylinder-b', hydraulicStrut([-650, -52, 930], [-875, -52, 1115], 20), structuralSteelColor);
add('outrigger-beam-rear', box(140, 690, 58, true).translate(310, 0, 170), structuralSteelColor);
add('outrigger-rear-column-left', box(72, 72, 145, true).translate(310, -438, 107), structuralSteelColor);
add('outrigger-rear-column-right', box(72, 72, 145, true).translate(310, 438, 107), structuralSteelColor);
add('outrigger-rear-foot-left', box(150, 145, 34, true).translate(310, -438, 17), equipmentPaintColor);
add('outrigger-rear-foot-right', box(150, 145, 34, true).translate(310, 438, 17), equipmentPaintColor);

return p.model();