// SPDX-License-Identifier: CC0-1.0
// Towable irrigation hose reel with wide spool, support frame, crank and wheeled axle.
meta({
  name: "irrigation-hose-reel",
  license: 'CC0-1.0',
  title: "Irrigation hose reel",
  description: "Towable irrigation hose reel with wide spool, support frame, crank and wheeled axle. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'structure',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad' },
});
const p = assembly('irrigation-hose-reel');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('reel-frame', box(1250, 1900, 70, true).translate(0, 0, 35), paintedSteelColor);
add('reel-side-a', box(1100, 80, 1332, true).translate(0, -608, 1628), paintedSteelColor);
add('reel-side-b', box(1100, 80, 1332, true).translate(0, 608, 1628), paintedSteelColor);
add('reel-drum', cylinder(1258, 400, 12).translate(0, 0, 333), paintedSteelColor);
add('reel-wheel--1', cylinder(70, 120, 12).rotate([0, 1, 0], 90).translate(-35, -912, 120), rubberColor);
add('reel-wheel--1-hub', cylinder(77, 40.8, 10).translate(-38.5, -912, 120), steelColor);
add('reel-wheel-1', cylinder(70, 120, 12).rotate([0, 1, 0], 90).translate(-35, 912, 120), rubberColor);
add('reel-wheel-1-hub', cylinder(77, 40.8, 10).translate(-38.5, 912, 120), steelColor);
add('crank-handle', box(180, 40, 36, true).translate(637.5, 0, 943), paintedSteelColor);

return p.model();
