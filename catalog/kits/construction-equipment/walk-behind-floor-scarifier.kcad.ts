// SPDX-License-Identifier: CC0-1.0
// Surface-preparation machine with guarded drum, wheeled frame and push handle.
meta({
  name: "walk-behind-floor-scarifier",
  license: 'CC0-1.0',
  title: "Walk-behind floor scarifier",
  description: "Surface-preparation machine with guarded drum, wheeled frame and push handle. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('walk-behind-floor-scarifier');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('floor-wheel-0--1', cylinder(54, 92, 12).rotateX(90).translate(-196, -156.52, 92), tireRubberColor);
add('floor-wheel-0--1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-196, -214.84, 92), structuralSteelColor);
add('floor-wheel-0--1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-196, -152.2, 92), structuralSteelColor);
add('floor-wheel-0-1', cylinder(54, 92, 12).rotateX(90).translate(-196, 210.52, 92), tireRubberColor);
add('floor-wheel-0-1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-196, 152.2, 92), structuralSteelColor);
add('floor-wheel-0-1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(-196, 214.84, 92), structuralSteelColor);
add('floor-wheel-1--1', cylinder(54, 92, 12).rotateX(90).translate(189, -156.52, 92), tireRubberColor);
add('floor-wheel-1--1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(189, -214.84, 92), structuralSteelColor);
add('floor-wheel-1--1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(189, -152.2, 92), structuralSteelColor);
add('floor-wheel-1-1', cylinder(54, 92, 12).rotateX(90).translate(189, 210.52, 92), tireRubberColor);
add('floor-wheel-1-1-hub--1', cylinder(8.64, 34.96, 10).rotateX(90).translate(189, 152.2, 92), structuralSteelColor);
add('floor-wheel-1-1-hub-1', cylinder(8.64, 34.96, 10).rotateX(90).translate(189, 214.84, 92), structuralSteelColor);
add('machine-frame', box(490, 347.2, 120, true).translate(0, 0, 220), structuralSteelColor);
add('motor-housing', box(224, 260.4, 296.4, true).translate(84, 0, 428.2), equipmentPaintColor);
add('handle-post', cylinder(351, 32, 8).translate(-252, 0, 280), structuralSteelColor);
add('handle-bar', box(250, 40, 40, true).translate(-252, 0, 612.8), structuralSteelColor);
add('scarifier-hood', box(280, 384.4, 110, true).translate(140, 0, 155), equipmentPaintColor);
add('cutting-drum', cylinder(310, 80, 10).rotateX(90).translate(140, 155, 150), structuralSteelColor);

return p.model();
