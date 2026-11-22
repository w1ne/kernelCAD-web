// SPDX-License-Identifier: CC0-1.0
// Trailing field cultivator with a three-section toolbar, rows of tines and support wheels.
meta({
  name: "field-cultivator",
  license: 'CC0-1.0',
  title: "Field cultivator",
  description: "Trailing field cultivator with a three-section toolbar, rows of tines and support wheels. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
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
const p = assembly('field-cultivator');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('main-toolbar', box(2300, 110, 94, true).translate(0, 120, 408.8), paintedSteelColor);
add('drawbar', box(135, 560, 70, true).translate(0, 430, 450.4), paintedSteelColor);
add('transport-wheel--1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(808.5, -230, 120), rubberColor);
add('transport-wheel--1-hub', cylinder(93.5, 40.8, 10).translate(804.25, -230, 120), steelColor);
add('transport-wheel-1', cylinder(85, 120, 12).rotate([0, 1, 0], 90).translate(808.5, 230, 120), rubberColor);
add('transport-wheel-1-hub', cylinder(93.5, 40.8, 10).translate(804.25, 230, 120), steelColor);
add('standard-0', box(42, 58, 415.4, true).translate(-966, 0, 237.7), steelColor);
add('cultivator-sweep-0', box(130, 170, 34, true).translate(-966, -120, 42), steelColor);
add('standard-1', box(42, 58, 415.4, true).translate(-724.5, 0, 237.7), steelColor);
add('cultivator-sweep-1', box(130, 170, 34, true).translate(-724.5, -120, 42), steelColor);
add('standard-2', box(42, 58, 415.4, true).translate(-483, 0, 237.7), steelColor);
add('cultivator-sweep-2', box(130, 170, 34, true).translate(-483, -120, 42), steelColor);
add('standard-3', box(42, 58, 415.4, true).translate(-241.5, 0, 237.7), steelColor);
add('cultivator-sweep-3', box(130, 170, 34, true).translate(-241.5, -120, 42), steelColor);
add('standard-4', box(42, 58, 415.4, true).translate(0, 0, 237.7), steelColor);
add('cultivator-sweep-4', box(130, 170, 34, true).translate(0, -120, 42), steelColor);
add('standard-5', box(42, 58, 415.4, true).translate(241.5, 0, 237.7), steelColor);
add('cultivator-sweep-5', box(130, 170, 34, true).translate(241.5, -120, 42), steelColor);
add('standard-6', box(42, 58, 415.4, true).translate(483, 0, 237.7), steelColor);
add('cultivator-sweep-6', box(130, 170, 34, true).translate(483, -120, 42), steelColor);
add('standard-7', box(42, 58, 415.4, true).translate(724.5, 0, 237.7), steelColor);
add('cultivator-sweep-7', box(130, 170, 34, true).translate(724.5, -120, 42), steelColor);
add('standard-8', box(42, 58, 415.4, true).translate(966, 0, 237.7), steelColor);
add('cultivator-sweep-8', box(130, 170, 34, true).translate(966, -120, 42), steelColor);

return p.model();
