// SPDX-License-Identifier: CC0-1.0
// Bunded fuel pod on a towable chassis with hose reel, pump box and filler neck.
meta({
  name: "mobile-fuel-tank",
  license: 'CC0-1.0',
  title: "Mobile site fuel tank",
  description: "Bunded fuel pod on a towable chassis with hose reel, pump box and filler neck. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('mobile-fuel-tank');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('trailer-wheel--1', cylinder(80, 145, 12).rotateX(90).translate(-336, -248.8, 145), tireRubberColor);
add('trailer-wheel--1-hub--1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-336, -335.2, 145), structuralSteelColor);
add('trailer-wheel--1-hub-1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-336, -242.4, 145), structuralSteelColor);
add('trailer-wheel-1', cylinder(80, 145, 12).rotateX(90).translate(-336, 328.8, 145), tireRubberColor);
add('trailer-wheel-1-hub--1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-336, 242.4, 145), structuralSteelColor);
add('trailer-wheel-1-hub-1', cylinder(12.8, 55.1, 10).rotateX(90).translate(-336, 335.2, 145), structuralSteelColor);
add('tow-frame', box(582.4, 60, 55, true).translate(336, 0, 122.5), structuralSteelColor);
add('skid-base', box(1008, 653.6, 65, true).translate(0, 0, 32.5), equipmentPaintColor);
add('bunded-tank', box(806.4, 494, 626.4, true).translate(0, 0, 378.2), equipmentPaintColor);
add('outer-containment', box(940.8, 592.8, 712.8, true).translate(0, 0, 421.4), equipmentPaintColor);
add('pump-box', box(257.6, 85, 180, true).translate(313.6, -319.2, 210), equipmentPaintColor);
add('filler-cap', cylinder(64, 38, 8).translate(-268.8, 0, 756), equipmentPaintColor);

return p.model();
