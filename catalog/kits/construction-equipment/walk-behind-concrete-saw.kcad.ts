// SPDX-License-Identifier: CC0-1.0
// Push saw with guarded cutting blade, compact motor and adjustable handlebar.
meta({
  name: "walk-behind-concrete-saw",
  license: 'CC0-1.0',
  title: "Walk-behind concrete saw",
  description: "Push saw with guarded cutting blade, compact motor and adjustable handlebar. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('walk-behind-concrete-saw');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('saw-wheel-0--1', cylinder(64, 100, 12).rotateX(90).translate(-161.2, -119.7, 100), tireRubberColor);
add('saw-wheel-0--1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(-161.2, -188.82, 100), structuralSteelColor);
add('saw-wheel-0--1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(-161.2, -114.58, 100), structuralSteelColor);
add('saw-wheel-0-1', cylinder(64, 100, 12).rotateX(90).translate(-161.2, 183.7, 100), tireRubberColor);
add('saw-wheel-0-1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(-161.2, 114.58, 100), structuralSteelColor);
add('saw-wheel-0-1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(-161.2, 188.82, 100), structuralSteelColor);
add('saw-wheel-1--1', cylinder(64, 100, 12).rotateX(90).translate(167.4, -119.7, 100), tireRubberColor);
add('saw-wheel-1--1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(167.4, -188.82, 100), structuralSteelColor);
add('saw-wheel-1--1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(167.4, -114.58, 100), structuralSteelColor);
add('saw-wheel-1-1', cylinder(64, 100, 12).rotateX(90).translate(167.4, 183.7, 100), tireRubberColor);
add('saw-wheel-1-1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(167.4, 114.58, 100), structuralSteelColor);
add('saw-wheel-1-1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(167.4, 188.82, 100), structuralSteelColor);
add('saw-frame', box(446.4, 300, 100, true).translate(0, 0, 230), structuralSteelColor);
add('engine-cover', box(198.4, 240, 217.6, true).translate(74.4, 0, 388.8), equipmentPaintColor);
add('blade', cylinder(42, 160, 12).translate(210.8, 0, 95), structuralSteelColor);
add('blade-guard', box(100, 260, 192, true).translate(210.8, 0, 196), structuralSteelColor);
add('push-handle', box(55, 60, 268.8, true).translate(-210.8, 0, 414.4), structuralSteelColor);

return p.model();
