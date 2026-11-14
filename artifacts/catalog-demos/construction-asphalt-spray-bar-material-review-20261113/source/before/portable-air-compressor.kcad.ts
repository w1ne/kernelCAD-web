// SPDX-License-Identifier: CC0-1.0
// Towable compressor enclosure with access panels, hose ports and single axle.
meta({
  name: "portable-air-compressor",
  license: 'CC0-1.0',
  title: "Portable site air compressor",
  description: "Towable compressor enclosure with access panels, hose ports and single axle. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('portable-air-compressor');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('trailer-wheel--1', cylinder(80, 145, 12).rotateX(90).translate(-315, -256.4, 145), tireRubberColor);
add('trailer-wheel--1-hub--1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-315, -342.8, 145), structuralSteelColor);
add('trailer-wheel--1-hub-1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-315, -250, 145), structuralSteelColor);
add('trailer-wheel-1', cylinder(80, 145, 12).rotateX(90).translate(-315, 336.4, 145), tireRubberColor);
add('trailer-wheel-1-hub--1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-315, 250, 145), structuralSteelColor);
add('trailer-wheel-1-hub-1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-315, 342.8, 145), structuralSteelColor);
add('tow-frame', box(546, 60, 55, true).translate(315, 0, 122.5), structuralSteelColor);
add('skid-base', box(945, 670.8, 65, true).translate(0, 0, 32.5), equipmentPaintColor);
add('compressor-enclosure', box(735, 530.4, 589, true).translate(-42, 0, 359.5), equipmentPaintColor);
add('vent-0', box(18, 18, 304, true).translate(-126, -273, 332), equipmentPaintColor);
add('vent-1', box(18, 18, 304, true).translate(-90, -273, 332), equipmentPaintColor);
add('vent-2', box(18, 18, 304, true).translate(-54, -273, 332), equipmentPaintColor);
add('vent-3', box(18, 18, 304, true).translate(-18, -273, 332), equipmentPaintColor);
add('vent-4', box(18, 18, 304, true).translate(18, -273, 332), equipmentPaintColor);
add('hose-reel', cylinder(95, 155, 10).translate(357, 0, 220), tireRubberColor);

return p.model();
