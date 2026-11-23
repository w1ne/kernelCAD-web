// SPDX-License-Identifier: CC0-1.0
// Road reclamation machine with high-clearance chassis, milling chamber and long operator deck.
meta({
  name: "road-reclaimer",
  license: 'CC0-1.0',
  title: "Road reclaimer",
  description: "Road reclamation machine with high-clearance chassis, milling chamber and long operator deck. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('road-reclaimer');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('milling-wheel-0--1', cylinder(95, 190, 12).rotateX(90).translate(-528, -286.24, 190), tireRubberColor);
add('milling-wheel-0--1-hub--1', cylinder(15.2, 72.2, 10).rotateX(90).translate(-528, -388.84, 190), structuralSteelColor);
add('milling-wheel-0--1-hub-1', cylinder(15.2, 72.2, 10).rotateX(90).translate(-528, -278.64, 190), structuralSteelColor);
add('milling-wheel-0-1', cylinder(95, 190, 12).rotateX(90).translate(-528, 381.24, 190), tireRubberColor);
add('milling-wheel-0-1-hub--1', cylinder(15.2, 72.2, 10).rotateX(90).translate(-528, 278.64, 190), structuralSteelColor);
add('milling-wheel-0-1-hub-1', cylinder(15.2, 72.2, 10).rotateX(90).translate(-528, 388.84, 190), structuralSteelColor);
add('milling-wheel-1--1', cylinder(95, 190, 12).rotateX(90).translate(462, -286.24, 190), tireRubberColor);
add('milling-wheel-1--1-hub--1', cylinder(15.2, 72.2, 10).rotateX(90).translate(462, -388.84, 190), structuralSteelColor);
add('milling-wheel-1--1-hub-1', cylinder(15.2, 72.2, 10).rotateX(90).translate(462, -278.64, 190), structuralSteelColor);
add('milling-wheel-1-1', cylinder(95, 190, 12).rotateX(90).translate(462, 381.24, 190), tireRubberColor);
add('milling-wheel-1-1-hub--1', cylinder(15.2, 72.2, 10).rotateX(90).translate(462, 278.64, 190), structuralSteelColor);
add('milling-wheel-1-1-hub-1', cylinder(15.2, 72.2, 10).rotateX(90).translate(462, 388.84, 190), structuralSteelColor);
add('main-frame', box(1188, 638, 230, true).translate(0, 0, 355), structuralSteelColor);
add('engine-cover', box(627, 550, 493, true).translate(-297, 0, 716.5), equipmentPaintColor);
add('operator-deck', box(330, 418, 42, true).translate(297, 0, 471), equipmentPaintColor);
add('canopy-posts', box(32, 374, 464, true).translate(297, 0, 724), equipmentPaintColor);
add('canopy', box(594, 484, 48, true).translate(297, 0, 980), equipmentPaintColor);
add('milling-hood', box(412.5, 902, 250, true).translate(594, 0, 165), equipmentPaintColor);
add('cutter-drum', cylinder(825, 120, 12).rotateX(90).translate(643.5, 412.5, 120), structuralSteelColor);
add('cutter-drum-hub--1', cylinder(132, 45.6, 10).rotateX(90).translate(643.5, -478.5, 120), structuralSteelColor);
add('cutter-drum-hub-1', cylinder(132, 45.6, 10).rotateX(90).translate(643.5, 478.5, 120), structuralSteelColor);
add('cutting-tooth-0', box(30, 814, 30, true).translate(462, 0, 57), equipmentPaintColor);
add('cutting-tooth-1', box(30, 814, 30, true).translate(519.75, 0, 57), equipmentPaintColor);
add('cutting-tooth-2', box(30, 814, 30, true).translate(577.5, 0, 57), equipmentPaintColor);
add('cutting-tooth-3', box(30, 814, 30, true).translate(635.25, 0, 57), equipmentPaintColor);
add('cutting-tooth-4', box(30, 814, 30, true).translate(693, 0, 57), equipmentPaintColor);
add('cutting-tooth-5', box(30, 814, 30, true).translate(750.75, 0, 57), equipmentPaintColor);
add('cutting-tooth-6', box(30, 814, 30, true).translate(808.5, 0, 57), equipmentPaintColor);

return p.model();
